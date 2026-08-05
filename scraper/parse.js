// Resilient parsers for bank rate tables, with strict validation.
//
// Bank pages are built very differently, so instead of hard-coded selectors we
// analyse every <table> column-by-column and pick the column that actually
// looks like a rate: values clustered inside a plausible band, not a
// serial-number column, preferably with decimals. Anything that doesn't clear
// the bar yields no rows, so the caller marks the bank unavailable rather than
// publishing wrong numbers. This is the safeguard against "fetched but
// mis-parsed" data (e.g. a 0.5% increment table or a 1..N serial column being
// mistaken for interest rates).

const cheerio = require("cheerio");

// Plausible rate bands per product (annual %, general public).
const BANDS = {
  fd: { lo: 2.5, hi: 9.5 },
  homeloan: { lo: 6.5, hi: 15 },
};

function clean(s) {
  return String(s).replace(/\s+/g, " ").trim();
}

// Parse a lone numeric/percentage cell into a number, else null.
function toNumber(text) {
  const m = clean(text).match(/^(\d{1,2}(?:\.\d{1,2})?)\s*%?$/);
  return m ? parseFloat(m[1]) : null;
}

// Does a cell describe a tenure (has a digit and a time unit)?
function isTenure(text) {
  const t = clean(text).toLowerCase();
  return /\d/.test(t) && /(day|days|month|months|year|years|yr|mth|mos)/.test(t);
}

// Extract a table as a grid of trimmed <td> strings (skips header-only rows).
function grid($, table) {
  const rows = [];
  $(table)
    .find("tr")
    .each((_, tr) => {
      const cells = $(tr)
        .find("td")
        .map((__, td) => clean($(td).text()))
        .get();
      if (cells.length) rows.push(cells);
    });
  return rows;
}

// A column that is a consecutive-integer run (1,2,3,…) is a serial/index
// column, never a rate column.
function looksSerial(nums) {
  const ints = nums.filter((n) => Number.isInteger(n));
  if (ints.length < Math.max(4, nums.length * 0.7)) return false;
  const s = [...ints].sort((a, b) => a - b);
  let consec = 0;
  for (let i = 1; i < s.length; i++) if (s[i] - s[i - 1] === 1) consec++;
  return consec >= (s.length - 1) * 0.6;
}

function columnNumbers(g, col) {
  const nums = [];
  for (const r of g) {
    if (col < r.length) {
      const n = toNumber(r[col]);
      if (n != null) nums.push(n);
    }
  }
  return nums;
}

// Score a column as a candidate rate column for a band.
function rateColumnScore(g, col, band) {
  const nums = columnNumbers(g, col);
  if (!nums.length || looksSerial(nums)) return { score: -1, nums };
  const inBand = nums.filter((n) => n >= band.lo && n <= band.hi).length;
  if (inBand / nums.length < 0.5) return { score: -1, nums };
  const hasDecimal = nums.some((n) => !Number.isInteger(n));
  return { score: inBand + (hasDecimal ? 2 : 0), nums };
}

function ncols(g) {
  return g.reduce((m, r) => Math.max(m, r.length), 0);
}

function tableMentions($, table, match) {
  return match ? $(table).text().toLowerCase().includes(match) : false;
}

// ---------------------------------------------------------------------------
// Fixed deposit: rows are <tenure> + <general %> [+ <senior %>].
function parseRates(html, match) {
  const $ = cheerio.load(html);
  const band = BANDS.fd;
  let best = null;

  for (const table of $("table").toArray()) {
    const g = grid($, table);
    if (g.length < 3) continue;
    const cols = ncols(g);

    // Tenure column = the one with the most tenure-like cells.
    let tenureCol = -1;
    let tenureHits = 0;
    for (let c = 0; c < cols; c++) {
      let s = 0;
      for (const r of g) if (c < r.length && isTenure(r[c])) s++;
      if (s > tenureHits) {
        tenureHits = s;
        tenureCol = c;
      }
    }
    if (tenureCol < 0 || tenureHits < 3) continue;

    // General rate column = best-scoring rate column that isn't the tenure col.
    let genCol = -1;
    let genScore = 2;
    for (let c = 0; c < cols; c++) {
      if (c === tenureCol) continue;
      const { score } = rateColumnScore(g, c, band);
      if (score > genScore) {
        genScore = score;
        genCol = c;
      }
    }
    if (genCol < 0) continue;

    // Senior column = next-best rate column (optional).
    let senCol = -1;
    let senScore = 0;
    for (let c = 0; c < cols; c++) {
      if (c === tenureCol || c === genCol) continue;
      const { score } = rateColumnScore(g, c, band);
      if (score > senScore) {
        senScore = score;
        senCol = c;
      }
    }

    const rows = [];
    for (const r of g) {
      if (tenureCol >= r.length || genCol >= r.length) continue;
      if (!isTenure(r[tenureCol])) continue;
      const gen = toNumber(r[genCol]);
      if (gen == null || gen < band.lo || gen > band.hi) continue;
      let sen = null;
      if (senCol >= 0 && senCol < r.length) {
        const sv = toNumber(r[senCol]);
        if (sv != null && sv >= band.lo && sv <= band.hi) sen = sv;
      }
      rows.push({ tenure: r[tenureCol], general: gen, senior: sen });
    }

    if (rows.length < 3) continue;
    const score = rows.length + (tableMentions($, table, match) ? 3 : 0);
    if (!best || score > best.score) best = { rows, score };
  }

  return best ? best.rows : [];
}

// ---------------------------------------------------------------------------
// Home loan: rows are <category> + one or more <rate %> (a range → min/max).
function parseHomeLoanRates(html, match) {
  const $ = cheerio.load(html);
  const band = BANDS.homeloan;
  let best = null;

  for (const table of $("table").toArray()) {
    const g = grid($, table);
    if (!g.length) continue;
    const cols = ncols(g);

    // Category column = the one with the most text (non-rate) cells.
    let catCol = -1;
    let catHits = 0;
    for (let c = 0; c < cols; c++) {
      let s = 0;
      for (const r of g)
        if (c < r.length && r[c] && /[a-z]/i.test(r[c]) && toNumber(r[c]) == null) s++;
      if (s > catHits) {
        catHits = s;
        catCol = c;
      }
    }

    const rows = [];
    for (const r of g) {
      const rates = [];
      for (let c = 0; c < r.length; c++) {
        if (c === catCol) continue;
        const n = toNumber(r[c]);
        if (n != null && n >= band.lo && n <= band.hi) rates.push(n);
      }
      if (!rates.length) continue;
      let cat = catCol >= 0 && catCol < r.length ? r[catCol] : null;
      if (!cat) cat = r.find((x) => x && toNumber(x) == null) || r[0];
      if (!cat) continue;
      rows.push({
        category: clean(cat),
        min: Math.min.apply(null, rates),
        max: Math.max.apply(null, rates),
      });
    }

    if (!rows.length) continue;
    if (looksSerial(rows.map((x) => x.min))) continue; // reject serial garbage
    const score = rows.length + (tableMentions($, table, match) ? 3 : 0);
    if (!best || score > best.score) best = { rows, score };
  }

  return best ? best.rows : [];
}

module.exports = { parseRates, parseHomeLoanRates, toNumber, isTenure, looksSerial };
