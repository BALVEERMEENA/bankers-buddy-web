// Products the scraper knows how to collect. Each product lists the bank pages
// to read, which parser to use, where to write the JSON, and whether a "better"
// rate is higher (deposits) or lower (loans) — the frontend uses this to sort.
//
// Bank sites change markup often, so `match` is a lowercase keyword expected
// near the rates table; the generic parser uses it to pick the right table.
// If a site renders rates with JavaScript, it needs a headless fetch — see
// scraper/README.md.

const { parseRates, parseHomeLoanRates } = require("./parse");

module.exports = [
  {
    id: "fd",
    label: "Fixed Deposit",
    out: "rates.json",
    better: "higher",
    parser: parseRates,
    disclaimer:
      "FD rates are scraped from public bank pages for general-public deposits and may lag the bank's live figures. Always confirm with the bank before acting.",
    banks: [
      {
        id: "sbi",
        name: "State Bank of India",
        url: "https://www.sbi.co.in/web/interest-rates/deposit-rates/retail-domestic-term-deposits",
        match: "tenors",
      },
      {
        id: "hdfc",
        name: "HDFC Bank",
        url: "https://www.hdfcbank.com/personal/save/deposits/fixed-deposit-interest-rate",
        match: "period",
      },
      {
        id: "icici",
        name: "ICICI Bank",
        url: "https://www.icicibank.com/personal-banking/deposits/fixed-deposit/fd-interest-rates",
        match: "maturity",
      },
      {
        id: "axis",
        name: "Axis Bank",
        url: "https://www.axisbank.com/retail/deposits/fixed-deposits/fd-interest-rate",
        match: "tenure",
      },
      {
        id: "kotak",
        name: "Kotak Mahindra Bank",
        url: "https://www.kotak.com/en/personal-banking/deposits/fixed-deposit/fixed-deposit-interest-rate.html",
        match: "tenure",
      },
      {
        id: "pnb",
        name: "Punjab National Bank",
        url: "https://www.pnbindia.in/interest-rates-deposit.html",
        match: "period",
      },
      {
        id: "bob",
        name: "Bank of Baroda",
        url: "https://www.bankofbaroda.in/interest-rate-and-service-charges/deposits-interest-rates",
        match: "tenors",
      },
    ],
  },
  {
    id: "homeloan",
    label: "Home Loan",
    out: "home-loan-rates.json",
    better: "lower",
    parser: parseHomeLoanRates,
    disclaimer:
      "Home-loan rates are scraped from public bank pages; the applicable rate depends on your CIBIL score, loan amount, and profile. Confirm the exact rate with the bank.",
    banks: [
      {
        id: "sbi",
        name: "State Bank of India",
        url: "https://sbi.co.in/web/personal-banking/loans/home-loans/home-loan",
        match: "cibil",
      },
      {
        id: "hdfc",
        name: "HDFC Bank",
        url: "https://www.hdfcbank.com/personal/borrow/popular-loans/home-loan/home-loan-interest-rates",
        match: "rate",
      },
      {
        id: "icici",
        name: "ICICI Bank",
        url: "https://www.icicibank.com/personal-banking/loans/home-loan/interest-rates",
        match: "rate",
      },
      {
        id: "axis",
        name: "Axis Bank",
        url: "https://www.axisbank.com/retail/loans/home-loan/axis-bank-home-loan/interest-rate-and-charges",
        match: "rate",
      },
      {
        id: "kotak",
        name: "Kotak Mahindra Bank",
        url: "https://www.kotak.com/en/personal-banking/loans/home-loan/interest-rates-and-charges.html",
        match: "rate",
      },
      {
        id: "pnbhousing",
        name: "PNB Housing Finance",
        url: "https://www.pnbhousing.com/home-loan-interest-rates/",
        match: "rate",
      },
      {
        id: "lichf",
        name: "LIC Housing Finance",
        url: "https://www.lichousing.com/home-loan-interest-rate",
        match: "cibil",
      },
      {
        id: "bob",
        name: "Bank of Baroda",
        url: "https://www.bankofbaroda.in/personal-banking/loans/home-loan",
        match: "rate",
      },
    ],
  },
];
