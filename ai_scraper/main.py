#!/usr/bin/env python3
"""AI-powered bank rate extractor — run locally on your laptop.

For each product (FD, Home Loan) and bank, it fetches the page with a headless
browser, asks Claude to extract the rates as structured rows, validates them,
and writes ../data/<out>.json — the same files the web app loads.

Usage:
    pip install -r requirements.txt
    playwright install chromium
    export ANTHROPIC_API_KEY=sk-ant-...      # or use `ant auth login`
    python main.py                            # all products
    python main.py fd                         # one product
    python main.py homeloan icici             # one bank of one product

Fault-tolerant: if a bank fails to fetch or yields no valid rows, its previous
data is kept and it's marked "stale" (or "error" if never seen), so the site
never loses data or shows fabricated numbers.
"""

import datetime
import json
import os
import sys
import time

from dotenv import load_dotenv

import config
import extract
import fetch

load_dotenv()

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def read_existing(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {"banks": []}


def validate(product, rows):
    """Drop rows whose rate falls outside the product's plausible band.
    A safeguard against the model returning an implausible figure."""
    lo, hi = product["band"]
    good = []
    for r in rows:
        vals = [v for v in (r.get("general"), r.get("senior"),
                            r.get("min"), r.get("max")) if v is not None]
        core = r.get("general", r.get("min"))
        if core is None or not (lo <= core <= hi):
            continue
        if any(v < 0 or v > 20 for v in vals):
            continue
        good.append(r)
    return good


def scrape_bank(product, bank, prev):
    extractor = extract.EXTRACTORS[product["id"]]
    last_err = "no url"
    for url in bank["urls"]:
        try:
            text = fetch.fetch_text(url)
            rows = validate(product, extractor(text, bank["name"]))
            if not rows:
                last_err = "no rates extracted"
                continue
            print(f"  ✓ {bank['name']}: {len(rows)} rows")
            return {
                "id": bank["id"], "name": bank["name"], "source": url,
                "status": "live", "fetchedAt": now_iso(), "rates": rows,
            }
        except Exception as e:  # noqa: BLE001 - report and keep going
            last_err = str(e).splitlines()[0][:120]

    print(f"  ✗ {bank['name']}: {last_err} — keeping previous data")
    have_prev = bool(prev and prev.get("rates"))
    return {
        "id": bank["id"], "name": bank["name"],
        "source": bank["urls"][0],
        "status": "stale" if have_prev else "error",
        "error": last_err,
        "fetchedAt": prev.get("fetchedAt") if prev else now_iso(),
        "rates": prev.get("rates", []) if prev else [],
    }


def scrape_product(product, only_bank=None):
    print(f"\n{product['label']}  (model: {extract.MODEL})")
    out_path = os.path.join(DATA_DIR, product["out"])
    existing = read_existing(out_path)
    prev_by_id = {b["id"]: b for b in existing.get("banks", [])}

    banks = product["banks"]
    if only_bank:
        banks = [b for b in banks if b["id"] == only_bank]

    results = []
    for bank in banks:
        results.append(scrape_bank(product, bank, prev_by_id.get(bank["id"])))
        time.sleep(0.5)

    # When scraping a single bank, keep the other banks' existing entries.
    if only_bank:
        by_id = {b["id"]: b for b in existing.get("banks", [])}
        for r in results:
            by_id[r["id"]] = r
        results = [by_id[b["id"]] for b in product["banks"] if b["id"] in by_id]

    out = {
        "product": product["id"],
        "label": product["label"],
        "better": product["better"],
        "updatedAt": now_iso(),
        "disclaimer": product["disclaimer"],
        "currency": "INR",
        "banks": results,
    }
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
        f.write("\n")

    live = sum(1 for r in results if r["status"] == "live")
    print(f"  → {product['out']}: {live}/{len(results)} banks live.")


def main(argv):
    only_product = argv[0] if len(argv) >= 1 else None
    only_bank = argv[1] if len(argv) >= 2 else None
    try:
        for product in config.PRODUCTS:
            if only_product and product["id"] != only_product:
                continue
            scrape_product(product, only_bank)
    finally:
        fetch.close()
    print("\nDone.")


if __name__ == "__main__":
    main(sys.argv[1:])
