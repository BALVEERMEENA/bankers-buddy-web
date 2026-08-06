# AI rate extractor (Python, runs locally)

An **AI-powered** version of the rate scraper that you run on your own laptop.
Instead of heuristic table parsing, it fetches each bank page with a headless
browser and asks **Claude** to read the page and return clean, structured
rates. An LLM handles the messy, differently-built bank pages — wrong tables,
rate ranges, CIBIL bands — far more reliably than rule-based parsing.

It writes the same [`../data/rates.json`](../data/rates.json) and
[`../data/home-loan-rates.json`](../data/home-loan-rates.json) the web app
reads, so the site picks up the results with no other changes.

## Why run it locally?

Bank sites often block requests from datacenter IPs (like GitHub's servers) but
allow a normal laptop on a home/office connection. Running here uses **your**
IP and a **real browser**, so more banks succeed than in CI.

## Setup

```bash
cd ai_scraper
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium          # one-time browser download

# Provide your Anthropic API key (either works):
cp .env.example .env                 # then edit .env, OR:
export ANTHROPIC_API_KEY=sk-ant-...  # OR: ant auth login
```

## Run

```bash
python main.py                 # all banks, both products
python main.py fd              # just fixed-deposit rates
python main.py homeloan icici  # just ICICI home loan (quick test)
```

Then view the site (from the repo root):

```bash
cd .. && python3 -m http.server 8000   # open http://localhost:8000
```

## How it works

| File | Role |
|------|------|
| `config.py` | Bank list + per-product settings (mirrors `scraper/products.js`) |
| `fetch.py` | Headless-browser fetch → reduces the page to just the relevant text |
| `extract.py` | Sends the text to Claude with a **structured-output schema** (Pydantic) so the result always matches the app's shape |
| `main.py` | Orchestrates, validates, and writes `../data/*.json` |

## Model & cost

Defaults to **`claude-opus-5`**. Extraction is a simple task, so a cheaper
model is usually fine — set `BANKERS_MODEL=claude-haiku-4-5` (in `.env` or the
environment) to cut cost. Each bank is roughly one short request.

## Safeguards (so you never see fake rates)

- The model is instructed to ignore unrelated tables and to **return nothing**
  when a page has no rates — rather than guessing.
- Every extracted rate is then range-checked in Python (FD `2.5–9.5%`, home
  loan `6.5–15%`); anything implausible is dropped.
- If a bank fails or yields nothing, its previous data is kept and it's marked
  `stale`/`unavailable` in the UI — never replaced with a made-up number.

> Rates are for guidance only. Always confirm with the bank before acting.
