#!/usr/bin/env node
// Banker's Buddy rate scraper.
//
// For each product (FD, Home Loan) it fetches every configured bank page (via a
// headless browser when available), parses it with strict validation, and
// writes ../data/<out>.json. Runs on a GitHub Actions runner (open internet) on
// a schedule. Fault-tolerant: if a bank fails or its page can't be parsed into
// plausible rows, we keep the previous rows and mark that bank "stale" (or
// "error" if there was never any data) rather than dropping it or publishing
// garbage — the parser only returns rows it can validate.

const fs = require("fs");
const path = require("path");
const products = require("./products");
const { fetchHtml, close, engine } = require("./fetch");

const DATA_DIR = path.join(__dirname, "..", "data");
const TIMEOUT_MS = 45000;

function readExisting(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return { banks: [] };
  }
}

function urlsFor(bank) {
  return bank.urls || (bank.url ? [bank.url] : []);
}

async function scrapeBank(product, bank, prev) {
  const now = new Date().toISOString();
  let lastErr = "no url";
  for (const url of urlsFor(bank)) {
    try {
      const html = await fetchHtml(url, TIMEOUT_MS);
      const rates = product.parser(html, bank.match);
      if (!rates.length) {
        lastErr = "no rate rows parsed";
        continue; // try next candidate URL
      }
      console.log(`  ✓ ${bank.name}: ${rates.length} rows`);
      return {
        id: bank.id,
        name: bank.name,
        source: url,
        status: "live",
        fetchedAt: now,
        rates,
      };
    } catch (err) {
      lastErr = err.message;
    }
  }

  console.warn(`  ✗ ${bank.name}: ${lastErr} — keeping previous data`);
  return {
    id: bank.id,
    name: bank.name,
    source: urlsFor(bank)[0] || (prev && prev.source),
    status: prev && prev.rates && prev.rates.length ? "stale" : "error",
    error: lastErr,
    fetchedAt: prev ? prev.fetchedAt : now,
    rates: prev ? prev.rates || [] : [],
  };
}

async function scrapeProduct(product) {
  console.log(`\n${product.label}:`);
  const outFile = path.join(DATA_DIR, product.out);
  const existing = readExisting(outFile);
  const prevById = Object.fromEntries((existing.banks || []).map((b) => [b.id, b]));

  const results = [];
  for (const bank of product.banks) {
    results.push(await scrapeBank(product, bank, prevById[bank.id]));
    await new Promise((r) => setTimeout(r, 800)); // gentle on the sites
  }

  const out = {
    product: product.id,
    label: product.label,
    better: product.better,
    updatedAt: new Date().toISOString(),
    disclaimer: product.disclaimer,
    currency: "INR",
    banks: results,
  };

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2) + "\n");

  const live = results.filter((r) => r.status === "live").length;
  console.log(`  → ${product.out}: ${live}/${results.length} banks live.`);
}

async function main() {
  console.log(`Fetch engine: ${engine()}`);
  try {
    for (const product of products) {
      await scrapeProduct(product);
    }
  } finally {
    await close();
  }
  console.log("\nDone.");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
