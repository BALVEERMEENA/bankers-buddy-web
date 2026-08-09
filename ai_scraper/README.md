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

## Choose a backend

The extractor auto-picks one:

- **Local Ollama (default)** — a model running on your own machine. No API
  key, no cloud, no per-call cost. Slower and a bit less accurate than Claude,
  but completely free and private.
- **Anthropic (Claude)** — used automatically if `ANTHROPIC_API_KEY` is set.

Force one with `BANKERS_PROVIDER=ollama` or `BANKERS_PROVIDER=anthropic`.

## Setup — local Ollama (no API key)

1. Install Ollama from **https://ollama.com** (Windows/Mac/Linux) and start it.
2. Pull a model (one time):
   ```bash
   ollama pull llama3.1
   ```
3. Install the Python deps:

   **macOS / Linux**
   ```bash
   cd ai_scraper
   python3 -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   playwright install chromium
   ```

   **Windows (CMD)** — run each line separately
   ```cmd
   cd ai_scraper
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   playwright install chromium
   ```

No key or environment variable is needed — with no `ANTHROPIC_API_KEY` set, it
uses Ollama automatically. To pick a different local model:
`set BANKERS_MODEL=qwen2.5` (Windows) / `export BANKERS_MODEL=qwen2.5`.

## Setup — Anthropic (optional)

Same install steps, plus a key (macOS/Linux `export`, Windows `set`):

```bash
export ANTHROPIC_API_KEY=sk-ant-...   # Windows: set ANTHROPIC_API_KEY=sk-ant-...
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

- **Ollama (default):** free and local. Default model `llama3.1` (8B) — a good
  balance for extraction. Larger models (e.g. `qwen2.5:14b`) are more accurate;
  smaller ones (`llama3.2`) are faster. Set `BANKERS_MODEL` to switch.
- **Anthropic:** defaults to `claude-opus-5`. Extraction is simple, so
  `BANKERS_MODEL=claude-haiku-4-5` cuts cost. Each bank is ~one short request.

## Safeguards (so you never see fake rates)

- The model is instructed to ignore unrelated tables and to **return nothing**
  when a page has no rates — rather than guessing.
- Every extracted rate is then range-checked in Python (FD `2.5–9.5%`, home
  loan `6.5–15%`); anything implausible is dropped.
- If a bank fails or yields nothing, its previous data is kept and it's marked
  `stale`/`unavailable` in the UI — never replaced with a made-up number.

> Rates are for guidance only. Always confirm with the bank before acting.
