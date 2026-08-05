// Configuration for each bank source the scraper knows how to read.
//
// Each entry describes where to find a bank's fixed-deposit interest-rate page
// and a hint for locating the right table on that page. Bank sites change their
// markup often, so `match` is a lowercase keyword we expect to see near the
// rates table; the generic parser uses it to pick the correct table.
//
// To add a bank: add an object here. If a site renders rates with JavaScript
// (empty result), it needs a headless-browser fetch — see scraper/README.md.

module.exports = [
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
];
