"""AI extraction of interest rates from a bank page's text.

An LLM reads the messy page text and returns clean, structured rows — it
handles wrong tables, rate ranges, CIBIL bands, and differing layouts far
more reliably than heuristic table parsing.

Two backends, chosen automatically:

* **ollama**  — a local model on your own machine, no API key or cloud.
* **anthropic** — Claude via the Anthropic API (needs ANTHROPIC_API_KEY).

Selection: BANKERS_PROVIDER=ollama|anthropic overrides; otherwise it's
"anthropic" when ANTHROPIC_API_KEY is set, else "ollama". Model is
BANKERS_MODEL, defaulting to a sensible per-provider choice. Both backends
use JSON-schema structured output so the result matches the app's shape.
"""

import os
from typing import List, Optional

from pydantic import BaseModel

PROVIDER = os.environ.get("BANKERS_PROVIDER", "").strip().lower()
if not PROVIDER:
    PROVIDER = "anthropic" if os.environ.get("ANTHROPIC_API_KEY") else "ollama"

MODEL = os.environ.get("BANKERS_MODEL") or (
    "claude-opus-5" if PROVIDER == "anthropic" else "llama3.1"
)

_anthropic_client = None


# ---- Structured output schemas ---------------------------------------------
class FDRow(BaseModel):
    tenure: str
    general: float
    senior: Optional[float] = None


class FDResult(BaseModel):
    rates: List[FDRow]


class HomeLoanRow(BaseModel):
    category: str
    min: float
    max: float


class HomeLoanResult(BaseModel):
    rates: List[HomeLoanRow]


_FD_PROMPT = """You are reading text extracted from {bank}'s website.

Extract the FIXED DEPOSIT (term deposit) interest rates for the GENERAL PUBLIC.
Return one row per tenure slab:
- tenure: the period as written (e.g. "1 year to less than 2 years")
- general: the general-public annual interest rate as a number (percent)
- senior: the senior-citizen annual rate as a number, or null if not shown

Rules:
- Only extract actual fixed-deposit interest rates. Ignore recurring-deposit,
  loan, NRI-only, bulk (>= 2-3 crore), and service-charge tables.
- Rates are annual percentages, typically 2.5%-9%. Do not return row numbers,
  serial numbers, tenure day-counts, or 0.5%/1% "additional rate" increments.
- If the text contains no general-public FD rate table, return an empty list.
- Do not invent values. Only return what is present in the text.

Return ONLY JSON matching the schema: {{"rates": [{{"tenure": str, "general": number, "senior": number or null}}]}}

PAGE TEXT:
{text}
"""

_HL_PROMPT = """You are reading text extracted from {bank}'s website.

Extract the HOME LOAN interest rates. Return one row per borrower category:
- category: the segment as written (e.g. "CIBIL 800 and above", "Salaried")
- min: the lowest annual interest rate for that category (percent)
- max: the highest annual rate for that category (equal to min if a single rate)

Rules:
- Only extract home-loan interest rates. Ignore processing fees, other loan
  types (personal, car, education), and unrelated tables.
- Rates are annual percentages, typically 8%-13%. Do not return loan amounts,
  tenures, EMI figures, or CIBIL score numbers as rates.
- If a category shows a single rate, set min and max to that same value.
- If the text contains no home-loan rate table, return an empty list.
- Do not invent values. Only return what is present in the text.

Return ONLY JSON matching the schema: {{"rates": [{{"category": str, "min": number, "max": number}}]}}

PAGE TEXT:
{text}
"""


def _parse_anthropic(prompt, schema):
    global _anthropic_client
    import anthropic

    if _anthropic_client is None:
        _anthropic_client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY
    resp = _anthropic_client.messages.parse(
        model=MODEL,
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}],
        output_format=schema,
    )
    if resp.stop_reason == "refusal" or resp.parsed_output is None:
        return None
    return resp.parsed_output


def _parse_ollama(prompt, schema):
    import ollama

    resp = ollama.chat(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        # Structured output: constrain the reply to our JSON schema.
        format=schema.model_json_schema(),
        options={"temperature": 0},
    )
    msg = getattr(resp, "message", None)
    content = msg.content if msg is not None else resp["message"]["content"]
    try:
        return schema.model_validate_json(content)
    except Exception:
        return None


def _parse(prompt, schema):
    obj = (
        _parse_anthropic(prompt, schema)
        if PROVIDER == "anthropic"
        else _parse_ollama(prompt, schema)
    )
    return obj.rates if obj else []


def extract_fd(text: str, bank: str):
    """Return a list of {tenure, general, senior} dicts."""
    rows = _parse(_FD_PROMPT.format(bank=bank, text=text), FDResult)
    return [
        {"tenure": r.tenure, "general": r.general, "senior": r.senior}
        for r in rows
    ]


def extract_home_loan(text: str, bank: str):
    """Return a list of {category, min, max} dicts."""
    rows = _parse(_HL_PROMPT.format(bank=bank, text=text), HomeLoanResult)
    return [
        {"category": r.category, "min": r.min, "max": r.max}
        for r in rows
    ]


EXTRACTORS = {"fd": extract_fd, "homeloan": extract_home_loan}
