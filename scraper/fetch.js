// Page fetcher. Prefers a real headless browser (Playwright) so JavaScript-
// rendered rate tables actually appear and requests look like a genuine browser
// (which gets past many 403/406 bot blocks). Falls back to plain `fetch` when
// Playwright isn't installed (e.g. a restricted sandbox), so the scraper still
// runs, just without JS rendering.

let mode = null; // "pw" | "fetch"
let browserPromise = null;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const HEADERS = {
  "User-Agent": UA,
  "Accept-Language": "en-IN,en;q=0.9",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

function resolveMode() {
  if (mode) return mode;
  try {
    require.resolve("playwright");
    mode = "pw";
  } catch {
    mode = "fetch";
  }
  return mode;
}

async function getBrowser() {
  if (!browserPromise) {
    const { chromium } = require("playwright");
    browserPromise = chromium.launch({ args: ["--no-sandbox"] });
  }
  return browserPromise;
}

async function viaPlaywright(url, timeoutMs) {
  const browser = await getBrowser();
  const ctx = await browser.newContext({
    userAgent: UA,
    locale: "en-IN",
    extraHTTPHeaders: { "Accept-Language": "en-IN,en;q=0.9" },
  });
  const page = await ctx.newPage();
  try {
    const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    if (resp && resp.status() >= 400) throw new Error("HTTP " + resp.status());
    // Rate data is almost always in a <table>; wait briefly for it to render.
    await page.waitForSelector("table", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1200); // let late JS settle
    return await page.content();
  } finally {
    await ctx.close();
  }
}

async function viaFetch(url, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: "follow", headers: HEADERS });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchHtml(url, timeoutMs) {
  return resolveMode() === "pw"
    ? viaPlaywright(url, timeoutMs)
    : viaFetch(url, timeoutMs);
}

async function close() {
  if (browserPromise) {
    const b = await browserPromise;
    await b.close();
    browserPromise = null;
  }
}

module.exports = { fetchHtml, close, engine: resolveMode };
