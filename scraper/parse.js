// Generic, resilient parser for bank FD-rate tables.
//
// Rather than hard-coding fragile CSS selectors per bank (which break whenever
// a site is redesigned), this scans every <table> on the page and keeps rows
// that look like "<tenure text> ... <rate %> [<senior rate %>]". A `match`
// keyword biases selection toward the table whose header mentions e.g.
// "tenure"/"period"/"maturity". This tolerates markup changes far better than
// exact selectors, at the cost of occasionally needing a tweak per-bank hint.

const cheerio = require("cheerio");

// Matches a percentage-like number: 6.5, 6.50, 7, 7.00% ...
const RATE_RE = /(\d{1,2}(?:\.\d{1,2})?)\s*%?/;

// A cell is "rate-like" if it is essentially just a percentage figure.
function asRate(text) {
  const t = String(text).trim();
  if (!t) return null;
  // Reject things that are clearly tenures/dates, keep short numeric cells.
  if (/[a-z]{4,}/i.test(t) && !/%/.test(t)) return null;
  const m = t.match(/^\s*(\d{1,2}(?:\.\d{1,2})?)\s*%?\s*$/);
  if (!m) return null;
  const v = parseFloat(m[1]);
  return v > 0 && v < 20 ? v : null; // sane FD range guard
}

// A cell is "tenure-like" if it mentions a time unit or a range.
function isTenure(text) {
  const t = String(text).toLowerCase();
  return /(day|days|month|months|year|years|yr|d\b)/.test(t) && /\d/.test(t);
}

function tableScore($, table, match) {
  const header = $(table).find("th").text().toLowerCase();
  const body = $(table).text().toLowerCase();
  let score = 0;
  if (match && header.includes(match)) score += 5;
  if (match && body.includes(match)) score += 1;
  if (/%/.test(body)) score += 1;
  if (/(interest|rate)/.test(body)) score += 1;
  score += Math.min(4, $(table).find("tr").length / 5); // prefer real tables
  return score;
}

function parseTable($, table) {
  const rows = [];
  $(table)
    .find("tr")
    .each((_, tr) => {
      const cells = $(tr)
        .find("td")
        .map((__, td) => $(td).text().replace(/\s+/g, " ").trim())
        .get();
      if (cells.length < 2) return;

      const tenureCell = cells.find(isTenure);
      if (!tenureCell) return;

      const rates = cells.map(asRate).filter((v) => v !== null);
      if (!rates.length) return;

      rows.push({
        tenure: tenureCell,
        general: rates[0],
        // Heuristic: a second, higher figure is usually the senior-citizen rate.
        senior: rates.length > 1 && rates[1] >= rates[0] ? rates[1] : null,
      });
    });
  return rows;
}

/**
 * Parse FD rates out of a page's HTML.
 * @param {string} html
 * @param {string} [match] lowercase keyword hint for the right table
 * @returns {Array<{tenure:string, general:number, senior:number|null}>}
 */
function parseRates(html, match) {
  const $ = cheerio.load(html);
  const tables = $("table").toArray();
  if (!tables.length) return [];

  tables.sort((a, b) => tableScore($, b, match) - tableScore($, a, match));

  // Try tables best-first until one yields plausible rows.
  for (const table of tables) {
    const rows = parseTable($, table);
    if (rows.length >= 2) return rows;
  }
  return [];
}

module.exports = { parseRates, asRate, isTenure };
