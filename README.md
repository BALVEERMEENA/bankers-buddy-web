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
- Switch display currency (₹ INR, $ USD, £ GBP, € EUR).

## Tech

Plain HTML, CSS, and vanilla JavaScript — no dependencies, no build step, no
tracking. `index.html`, `styles.css`, and `app.js` are all you need.

> Figures are estimates for guidance only and are not financial advice.
