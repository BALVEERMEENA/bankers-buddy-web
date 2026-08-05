# Rate scraper

Fetches bank interest rates from public bank pages and writes them to JSON that
the web app loads. It handles multiple **products**, each defined in
[`products.js`](products.js):

| Product | Output | UI tab | "Better" is |
|---------|--------|--------|-------------|
| Fixed Deposit | [`../data/rates.json`](../data/rates.json) | FD Rates | higher |
| Home Loan | [`../data/home-loan-rates.json`](../data/home-loan-rates.json) | Home Loan | lower |

## How it runs

It is **not** run in the browser — banks don't expose CORS-friendly APIs, so a
static page can't fetch them directly. Instead the scraper runs on a schedule
via GitHub Actions (`.github/workflows/scrape-rates.yml`), which has open
internet access, and commits the refreshed `rates.json` back to the repo. The
frontend just reads that file.

```
GitHub Action (daily)  ->  node scraper  ->  data/rates.json  ->  frontend
```

## Run it locally

```bash
cd scraper
npm install
npm run scrape        # writes ../data/rates.json
```

> Note: this must run somewhere with real internet access. Sandboxes with a
> restrictive network policy (including the one this repo was scaffolded in)
> block outbound requests to bank domains, so the scrape will fail there and
> the seeded sample data is kept.

## How parsing works

`parse.js` avoids brittle per-bank CSS selectors. It scans every `<table>` on a
page, scores them (biased by the `match` keyword in `products.js`), and keeps
rows that look like a rate table. This tolerates markup changes better than
exact selectors. There are two parsers:

- **`parseRates`** (FD) — keeps rows shaped `<tenure> … <rate %> [<senior %>]`.
- **`parseHomeLoanRates`** — keeps rows shaped `<category> … <rate or range %>`,
  reducing each to `{min, max}` (e.g. `8.50% – 9.65%`). Home-loan rows are keyed
  by CIBIL band or borrower type rather than tenure.

## Adding / fixing a bank

1. Add an entry under the relevant product in `products.js` (`id`, `name`,
   `url`, and a `match` keyword seen near the rates table).
2. Run `npm run scrape` and check the row count logged for that bank.
3. If it returns **0 rows**, the page most likely renders its table with
   JavaScript. `fetch` only sees static HTML, so switch that bank to a
   headless-browser fetch (e.g. Playwright — already available in CI) that
   returns `page.content()`, then pass it to the product's parser.

To add a whole new product (e.g. car loans, credit-card APRs), add an object to
the array in `products.js` with its own `out` file, `better` direction, and
`parser`, then add a matching tab in the frontend.

## Fault tolerance

If a bank fails or yields nothing, the scraper keeps that bank's previous rows
and marks its `status` as `stale` (or `error` if there was never any data), so
the site never loses information. Statuses surface as badges in the UI:
`live`, `stale`, `unavailable`, or `sample` (the seeded starter data).

## Legal / etiquette

Scraping public pages for personal comparison is generally fine, but respect
each site's `robots.txt` and terms of use, keep the schedule gentle (this runs
once daily with a pause between banks), and always show users the source link
so they can verify against the bank directly.
