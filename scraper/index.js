#!/usr/bin/env node
// Banker's Buddy rate scraper.
//
// Fetches each configured bank's FD-rate page, parses it, and writes
// ../data/rates.json. Designed to run on a GitHub Actions runner (open
// internet) on a schedule. It is deliberately fault-tolerant: if a bank fails
// or yields nothing, we keep the previous known rows and mark that bank
// "stale" instead of dropping it, so the site never loses data.

const fs = require("fs");
const path = require("path");
const banks = require("./banks");
const { parseRates } = require("./parse");

const OUT = path.join(__dirname, "..", "data", "rates.json");
const TIMEOUT_MS = 20000;
const UA =
  "Mozilla/5.0 (compatible; BankersBuddyBot/1.0; +https://github.com/BALVEERMEENA/bankers-buddy-web)";

function readExisting() {
  try {
    return JSON.parse(fs.readFileSync(OUT, "utf8"));
  } catch {
    return { banks: [] };
  }
}

async function fetchHtml(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "User-Agent": UA, Accept: "text/html,*/*" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function scrapeBank(bank, prev) {
  const now = new Date().toISOString();
  try {
    const html = await fetchHtml(bank.url);
    const rates = parseRates(html, bank.match);
    if (!rates.length) throw new Error("no rate rows parsed");
    console.log(`✓ ${bank.name}: ${rates.length} rows`);
    return {
      id: bank.id,
      name: bank.name,
      source: bank.url,
      status: "live",
      fetchedAt: now,
      rates,
    };
  } catch (err) {
    console.warn(`✗ ${bank.name}: ${err.message} — keeping previous data`);
    return {
      id: bank.id,
      name: bank.name,
      source: bank.url,
      status: prev && prev.rates && prev.rates.length ? "stale" : "error",
      error: err.message,
      fetchedAt: prev ? prev.fetchedAt : now,
      rates: prev ? prev.rates || [] : [],
    };
  }
}

async function main() {
  const existing = readExisting();
  const prevById = Object.fromEntries((existing.banks || []).map((b) => [b.id, b]));

  const results = [];
  for (const bank of banks) {
    // Sequential + a small pause: gentle on the sites, avoids rate-limiting.
    results.push(await scrapeBank(bank, prevById[bank.id]));
    await new Promise((r) => setTimeout(r, 800));
  }

  const out = {
    updatedAt: new Date().toISOString(),
    disclaimer:
      "Rates are scraped from public bank pages for general public deposits and may lag the bank's live figures. Always confirm with the bank before acting.",
    currency: "INR",
    banks: results,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");

  const live = results.filter((r) => r.status === "live").length;
  console.log(`\nWrote ${OUT} — ${live}/${results.length} banks live.`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
