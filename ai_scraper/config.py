"""Bank sources and per-product settings for the AI rate extractor.

Mirrors scraper/products.js (the Node scraper) so both produce the same
data/*.json files the web app reads. `urls` lists candidate pages tried in
order; `better` tells the frontend which direction is best (higher for
deposits, lower for loans).
"""

PRODUCTS = [
    {
        "id": "fd",
        "label": "Fixed Deposit",
        "out": "rates.json",
        "better": "higher",
        # Plausible general-public FD rate band (annual %). Used to drop
        # anything the model returns that clearly isn't an interest rate.
        "band": (2.5, 9.5),
        "disclaimer": (
            "FD rates are extracted from public bank pages for general-public "
            "deposits and may lag the bank's live figures. Always confirm with "
            "the bank before acting."
        ),
        "banks": [
            {"id": "sbi", "name": "State Bank of India",
             "urls": ["https://www.sbi.co.in/web/interest-rates/deposit-rates/retail-domestic-term-deposits"]},
            {"id": "hdfc", "name": "HDFC Bank",
             "urls": ["https://www.hdfcbank.com/personal/save/deposits/fixed-deposit-interest-rate"]},
            {"id": "icici", "name": "ICICI Bank",
             "urls": ["https://www.icicibank.com/personal-banking/deposits/fixed-deposit/fd-interest-rates"]},
            {"id": "axis", "name": "Axis Bank",
             "urls": ["https://www.axisbank.com/interest-rate-on-deposits",
                      "https://www.axisbank.com/retail/deposits/fixed-deposits/fixed-deposit-interest-rate"]},
            {"id": "kotak", "name": "Kotak Mahindra Bank",
             "urls": ["https://www.kotak.com/en/personal-banking/deposits/fixed-deposit/fixed-deposit-interest-rate.html"]},
            {"id": "pnb", "name": "Punjab National Bank",
             "urls": ["https://www.pnbindia.in/interest-rates-deposit.html"]},
            {"id": "bob", "name": "Bank of Baroda",
             "urls": ["https://www.bankofbaroda.in/interest-rate-and-service-charges/deposits-interest-rates"]},
        ],
    },
    {
        "id": "homeloan",
        "label": "Home Loan",
        "out": "home-loan-rates.json",
        "better": "lower",
        "band": (6.5, 15.0),
        "disclaimer": (
            "Home-loan rates are extracted from public bank pages; the "
            "applicable rate depends on your CIBIL score, loan amount, and "
            "profile. Confirm the exact rate with the bank."
        ),
        "banks": [
            {"id": "sbi", "name": "State Bank of India",
             "urls": ["https://sbi.co.in/web/personal-banking/loans/home-loans/interest-rates",
                      "https://homeloans.sbi/products/view/regular-home-loan"]},
            {"id": "hdfc", "name": "HDFC Bank",
             "urls": ["https://www.hdfcbank.com/personal/borrow/popular-loans/home-loan/home-loan-interest-rates"]},
            {"id": "icici", "name": "ICICI Bank",
             "urls": ["https://www.icicibank.com/personal-banking/loans/home-loan/interest-rates"]},
            {"id": "axis", "name": "Axis Bank",
             "urls": ["https://www.axisbank.com/retail/loans/home-loan/interest-rate",
                      "https://www.axisbank.com/retail/loans/home-loan/axis-bank-home-loan/interest-rate-and-charges"]},
            {"id": "kotak", "name": "Kotak Mahindra Bank",
             "urls": ["https://www.kotak.com/en/personal-banking/loans/home-loan.html"]},
            {"id": "pnbhousing", "name": "PNB Housing Finance",
             "urls": ["https://www.pnbhousing.com/home-loan-interest-rates/"]},
            {"id": "lichf", "name": "LIC Housing Finance",
             "urls": ["https://www.lichousing.com/home-loan-interest-rate"]},
            {"id": "bob", "name": "Bank of Baroda",
             "urls": ["https://www.bankofbaroda.in/personal-banking/loans/home-loan"]},
        ],
    },
]
