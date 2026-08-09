"""Fetch a bank page with a headless browser and reduce it to compact text.

A real browser (Playwright/Chromium) runs the page's JavaScript, so
client-rendered rate tables actually appear, and it looks like a genuine
browser — which, from a laptop's residential IP, gets past most bot blocks.
We then strip the page down to the text that matters (tables first) so the
model sees the rates without paying for navigation, scripts, or styling.
"""

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
_MAX_CHARS = 40000  # keep the prompt affordable; rate pages fit comfortably

_playwright = None
_browser = None


def _browser_instance():
    global _playwright, _browser
    if _browser is None:
        _playwright = sync_playwright().start()
        _browser = _playwright.chromium.launch(args=["--no-sandbox"])
    return _browser


def _reduce(html: str) -> str:
    """Keep the page title plus the text of every table; fall back to body
    text when a page has no tables. Truncate to a sane size."""
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript", "svg"]):
        tag.decompose()

    title = soup.title.get_text(" ", strip=True) if soup.title else ""
    tables = soup.find_all("table")
    if tables:
        chunks = [t.get_text(" | ", strip=True) for t in tables]
        body = "\n\n".join(c for c in chunks if c)
    else:
        body = soup.get_text("\n", strip=True)

    text = (f"PAGE TITLE: {title}\n\n{body}").strip()
    return text[:_MAX_CHARS]


def fetch_text(url: str, timeout_ms: int = 45000) -> str:
    """Return reduced page text, or raise on HTTP >= 400 / navigation error."""
    browser = _browser_instance()
    ctx = browser.new_context(
        user_agent=_UA,
        locale="en-IN",
        extra_http_headers={"Accept-Language": "en-IN,en;q=0.9"},
    )
    page = ctx.new_page()
    try:
        resp = page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
        if resp is not None and resp.status >= 400:
            raise RuntimeError(f"HTTP {resp.status}")
        try:
            page.wait_for_selector("table", timeout=8000)
        except Exception:
            pass  # some pages render rates without a <table>; use what we have
        page.wait_for_timeout(1200)  # let late JS settle
        return _reduce(page.content())
    finally:
        ctx.close()


def close():
    global _playwright, _browser
    if _browser is not None:
        _browser.close()
        _browser = None
    if _playwright is not None:
        _playwright.stop()
        _playwright = None
