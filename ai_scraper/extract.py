"""AI extraction of interest rates from a bank page's text, via Claude.

An LLM reads the messy page text and returns clean, structured rows — it
handles wrong tables, rate ranges, CIBIL bands, and differing layouts far
more reliably than heuristic table parsing. We use the Anthropic SDK's
structured-output support (`messages.parse` with a Pydantic schema) so the
result is guaranteed to match the shape the web app expects.
"""

import os
from typing import List, Optional

import anthropic
from pydantic import BaseModel

# Default to Claude Opus 5. Override with BANKERS_MODEL for a cheaper run,
# e.g. BANKERS_MODEL=claude-haiku-4-5 — the extraction is simple enough that
# a smaller model is usually fine.
MODEL = os.environ.get("BANKERS_MODEL", "claude-opus-5")

# Created lazily so importing this module doesn't require an API key.
_client: Optional[anthropic.Anthropic] = None


def _client_instance() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY
    return _client


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

PAGE TEXT:
{text}
"""


def _parse(prompt: str, schema):
    resp = _client_instance().messages.parse(
        model=MODEL,
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}],
        output_format=schema,
    )
    if resp.stop_reason == "refusal" or resp.parsed_output is None:
        return []
    return resp.parsed_output.rates


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
