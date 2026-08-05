# Banker's Buddy 🏦

Your everyday banking calculators — for loans, deposits, and SIP investments.
Everything runs entirely in your browser, so nothing you type is ever sent anywhere.

## 🔗 Link to access

Once GitHub Pages is enabled for this repository (Settings → Pages → Build from
the `main` branch / GitHub Actions), the app is available at:

**https://balveermeena.github.io/bankers-buddy-web/**

You can also open it locally — no build step needed:

```bash
# Just open the file
open index.html          # macOS
xdg-open index.html      # Linux

# ...or serve it
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Features

- **Loan / EMI** — monthly EMI, total interest, and total payment for any loan.
- **Deposit** — compound-interest maturity value for fixed/recurring deposits,
  with yearly, half-yearly, quarterly, or monthly compounding.
- **SIP** — projected value of a monthly recurring investment.
- **FD Rates** — compare fixed-deposit interest rates across major banks, with a
  best-rate leaderboard and a general/senior-citizen toggle.
- Switch display currency (₹ INR, $ USD, £ GBP, € EUR).

## Live bank rates

The **FD Rates** tab reads [`data/rates.json`](data/rates.json). Because banks
don't offer CORS-friendly APIs, the browser can't fetch them directly — instead
a small Node scraper (see [`scraper/`](scraper/)) runs daily on **GitHub
Actions**, parses each bank's rates page, and commits an updated `rates.json`.
The site then just loads that file.

The repo ships with **sample data** (marked `SAMPLE` in the UI) so the tab works
immediately; real figures appear once the scheduled scraper runs. To refresh on
demand, trigger the *"Scrape bank FD rates"* workflow, or run it locally:

```bash
cd scraper && npm install && npm run scrape
```

> The FD Rates tab uses `fetch`, which is blocked on `file://`. Serve the site
> (`python3 -m http.server`) to view that tab locally.

## Tech

Plain HTML, CSS, and vanilla JavaScript for the site — no dependencies, no build
step, no tracking. The optional scraper is a small Node script (`cheerio`).
`index.html`, `styles.css`, and `app.js` are all the app itself needs.

> Figures are estimates for guidance only and are not financial advice.
