// Products the scraper collects. Each lists the bank pages to read, which
// parser to use, where to write the JSON, and whether a "better" rate is higher
// (deposits) or lower (loans) — the frontend uses this to sort.
//
// `urls` may list several candidate pages per bank; the scraper tries each in
// order and keeps the first that yields validated rows. This makes a single
// changed/wrong URL non-fatal. `match` is a lowercase keyword expected near the
// rates table, used to disambiguate when a page has several tables.

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
        urls: [
          "https://www.sbi.co.in/web/interest-rates/deposit-rates/retail-domestic-term-deposits",
        ],
        match: "tenors",
      },
      {
        id: "hdfc",
        name: "HDFC Bank",
        urls: [
          "https://www.hdfcbank.com/personal/save/deposits/fixed-deposit-interest-rate",
        ],
        match: "period",
      },
      {
        id: "icici",
        name: "ICICI Bank",
        urls: [
          "https://www.icicibank.com/personal-banking/deposits/fixed-deposit/fd-interest-rates",
        ],
        match: "maturity",
      },
      {
        id: "axis",
        name: "Axis Bank",
        urls: [
          "https://www.axisbank.com/interest-rate-on-deposits",
          "https://www.axisbank.com/retail/deposits/fixed-deposits/fixed-deposit-interest-rate",
          "https://www.axisbank.com/retail/deposits/fixed-deposits/fd-interest-rate",
        ],
        match: "tenure",
      },
      {
        id: "kotak",
        name: "Kotak Mahindra Bank",
        urls: [
          "https://www.kotak.com/en/personal-banking/deposits/fixed-deposit/fixed-deposit-interest-rate.html",
        ],
        match: "tenure",
      },
      {
        id: "pnb",
        name: "Punjab National Bank",
        urls: ["https://www.pnbindia.in/interest-rates-deposit.html"],
        match: "period",
      },
      {
        id: "bob",
        name: "Bank of Baroda",
        urls: [
          "https://www.bankofbaroda.in/interest-rate-and-service-charges/deposits-interest-rates",
          "https://www.bankofbaroda.in/personal-banking/accounts/deposits/fixed-deposit",
        ],
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
        urls: [
          "https://sbi.co.in/web/personal-banking/loans/home-loans/interest-rates",
          "https://homeloans.sbi/products/view/regular-home-loan",
          "https://sbi.co.in/web/personal-banking/loans/home-loans/home-loan",
        ],
        match: "cibil",
      },
      {
        id: "hdfc",
        name: "HDFC Bank",
        urls: [
          "https://www.hdfcbank.com/personal/borrow/popular-loans/home-loan/home-loan-interest-rates",
        ],
        match: "rate",
      },
      {
        id: "icici",
        name: "ICICI Bank",
        urls: [
          "https://www.icicibank.com/personal-banking/loans/home-loan/interest-rates",
        ],
        match: "rate",
      },
      {
        id: "axis",
        name: "Axis Bank",
        urls: [
          "https://www.axisbank.com/retail/loans/home-loan/interest-rate",
          "https://www.axisbank.com/retail/loans/home-loan/axis-bank-home-loan/interest-rate-and-charges",
        ],
        match: "rate",
      },
      {
        id: "kotak",
        name: "Kotak Mahindra Bank",
        urls: [
          "https://www.kotak.com/en/personal-banking/loans/home-loan.html",
          "https://www.kotak.com/en/personal-banking/loans/home-loan/interest-rates-and-charges.html",
        ],
        match: "rate",
      },
      {
        id: "pnbhousing",
        name: "PNB Housing Finance",
        urls: ["https://www.pnbhousing.com/home-loan-interest-rates/"],
        match: "rate",
      },
      {
        id: "lichf",
        name: "LIC Housing Finance",
        urls: [
          "https://www.lichousing.com/home-loan-interest-rate",
          "https://www.lichousing.com/fixed-deposit-interest-rate",
        ],
        match: "cibil",
      },
      {
        id: "bob",
        name: "Bank of Baroda",
        urls: [
          "https://www.bankofbaroda.in/interest-rate-and-service-charges/loans-advances-interest-rate",
          "https://www.bankofbaroda.in/personal-banking/loans/home-loan",
        ],
        match: "rate",
      },
    ],
  },
];
