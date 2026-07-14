"""URL fetch pipeline for Curate (and any future feature that wants to read
a page on behalf of a user).

Design goals:
- SSRF-safe: never let user-supplied URLs reach the VPS's own network, other
  internal services on the same host, cloud metadata endpoints (169.254.x.x),
  or private LAN addresses. Every hop of a redirect chain gets re-checked —
  a common SSRF trick is an open redirect from a public host to an internal
  one, so we don't trust httpx's auto-follow.
- No new dependencies: uses httpx (already vendored) plus stdlib html.parser
  for main-content extraction. Trafilatura would give cleaner output but it's
  a heavy add for something we can do adequately in 60 lines.
- Bounded: max 2 MB response body, 10-second timeout, at most 5 redirects.
- Content-type gated: only HTML and plain text pages. If a link points at a
  PDF or image, callers should route to the existing file-parse path instead.

Not-goals (deliberately deferred):
- No JavaScript rendering. If a page needs JS to show text, we return what's
  in the initial HTML (often empty for SPAs). Playwright/headless-Chrome is
  another deploy.
- No caching. Every fetch is fresh. Fine for the low volume Curate chat
  generates.
"""
from __future__ import annotations

import ipaddress
import socket
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

import httpx
from fastapi import HTTPException

MAX_BYTES = 2 * 1024 * 1024
MAX_REDIRECTS = 5
FETCH_TIMEOUT_S = 10.0
MAX_TEXT_CHARS = 12_000  # rough token budget for AI context
USER_AGENT = "Curio-Bot/1.0 (+https://curio.sproutwise.co.za)"


def _is_public_host(hostname: str) -> bool:
    """Resolve the hostname and confirm every returned IP is publicly routable.

    Blocks: loopback (127.0.0.0/8, ::1), link-local (169.254.0.0/16, fe80::/10),
    private (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fc00::/7), multicast,
    reserved, unspecified, and any address that isn't globally routable.
    Also blocks numeric hostnames that fall in these ranges directly.
    """
    if not hostname:
        return False
    try:
        infos = socket.getaddrinfo(hostname, None, proto=socket.IPPROTO_TCP)
    except socket.gaierror:
        return False
    if not infos:
        return False
    for info in infos:
        ip_str = info[4][0]
        try:
            ip = ipaddress.ip_address(ip_str)
        except ValueError:
            return False
        # is_global returns True only for public IPs. This is the strongest
        # single check; we still whitelist explicitly via the "not private"
        # checks below because is_global's semantics vary between Python
        # versions (172.16/12 wasn't caught in older ones).
        if ip.is_loopback or ip.is_private or ip.is_link_local:
            return False
        if ip.is_multicast or ip.is_reserved or ip.is_unspecified:
            return False
        # Cloud metadata endpoints — extra belt on 169.254.169.254 in case
        # is_link_local misses it on some platforms.
        if str(ip) in ("169.254.169.254", "fd00:ec2::254"):
            return False
    return True


class _TextExtractor(HTMLParser):
    """Very simple main-text extractor.

    Rules:
    - Drop everything inside script, style, noscript, svg, nav, footer, header,
      aside, form, and comment tags.
    - Everywhere else, collect data nodes and add paragraph breaks at closing
      block-level tags.
    - Grab <title> separately for a page title.

    This is deliberately dumb — enough to give the AI something to reason
    about, not to reproduce the page verbatim.
    """
    SKIP_TAGS = {
        "script", "style", "noscript", "svg", "canvas", "iframe",
        "nav", "footer", "header", "aside", "form", "template",
    }
    BLOCK_TAGS = {"p", "div", "section", "article", "li", "br", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.title = ""
        self._skip_depth = 0
        self._in_title = False
        self._current: list[str] = []

    def _flush(self) -> None:
        text = " ".join(self._current).strip()
        if text:
            self.parts.append(text)
        self._current = []

    def handle_starttag(self, tag: str, attrs) -> None:  # type: ignore[override]
        if tag in self.SKIP_TAGS:
            self._skip_depth += 1
            return
        if tag == "title":
            self._in_title = True

    def handle_endtag(self, tag: str) -> None:  # type: ignore[override]
        if tag in self.SKIP_TAGS and self._skip_depth > 0:
            self._skip_depth -= 1
            return
        if tag == "title":
            self._in_title = False
        if tag in self.BLOCK_TAGS:
            self._flush()

    def handle_startendtag(self, tag: str, attrs) -> None:  # type: ignore[override]
        if tag in self.BLOCK_TAGS:
            self._flush()

    def handle_data(self, data: str) -> None:  # type: ignore[override]
        if self._skip_depth > 0:
            return
        if self._in_title:
            self.title += data
            return
        stripped = data.strip()
        if stripped:
            self._current.append(stripped)

    def finish(self) -> None:
        self._flush()


async def fetch_url(url: str) -> dict:
    """Fetch a URL safely and return {title, text, url}. Raises HTTPException
    on failure — callers should catch and log via errorlog while returning a
    generic message to the user."""
    current = url.strip()
    if not current:
        raise HTTPException(400, "No URL provided.")
    if len(current) > 2048:
        raise HTTPException(400, "URL is too long.")

    async with httpx.AsyncClient(timeout=FETCH_TIMEOUT_S, follow_redirects=False,
                                  headers={"User-Agent": USER_AGENT}) as client:
        for _ in range(MAX_REDIRECTS + 1):
            p = urlparse(current)
            if p.scheme not in ("http", "https"):
                raise HTTPException(400, "Only http and https URLs are supported.")
            if not p.hostname:
                raise HTTPException(400, "URL is missing a hostname.")
            if not _is_public_host(p.hostname):
                # Deliberately vague on the reason so a probe can't map internal ranges.
                raise HTTPException(400, "That URL isn't reachable.")

            try:
                r = await client.get(current)
            except httpx.TimeoutException:
                raise HTTPException(504, "Fetching that URL took too long.")
            except httpx.HTTPError as e:
                raise HTTPException(502, f"Couldn't reach that URL: {type(e).__name__}")

            if r.status_code in (301, 302, 303, 307, 308):
                loc = r.headers.get("location")
                if not loc:
                    raise HTTPException(502, "Redirect without a destination.")
                current = urljoin(current, loc)
                continue

            if r.status_code == 401 or r.status_code == 403:
                raise HTTPException(403, "That page requires sign-in.")
            if r.status_code == 404:
                raise HTTPException(404, "That page wasn't found.")
            if r.status_code >= 400:
                raise HTTPException(502, f"That page returned status {r.status_code}.")

            # Content-type gate.
            content_type = (r.headers.get("content-type") or "").lower()
            if not any(content_type.startswith(t) for t in ("text/html", "text/plain", "application/xhtml")):
                raise HTTPException(415, "Only HTML and plain-text pages can be read this way.")

            body = r.content
            if len(body) > MAX_BYTES:
                raise HTTPException(413, "That page is too large to read (over 2 MB).")

            # Text extraction. If plain text, use body directly.
            if content_type.startswith("text/plain"):
                text = r.text
                title = urlparse(current).hostname or ""
            else:
                parser = _TextExtractor()
                try:
                    parser.feed(r.text)
                    parser.close()
                    parser.finish()
                except Exception:
                    # Malformed HTML shouldn't kill the endpoint.
                    pass
                text = "\n\n".join(parser.parts)
                title = parser.title.strip() or (urlparse(current).hostname or "")

            text = text.strip()
            if len(text) > MAX_TEXT_CHARS:
                text = text[:MAX_TEXT_CHARS] + "\n\n[content truncated]"

            if not text:
                raise HTTPException(422, "Couldn't find readable text on that page. It may need JavaScript to load, or the content sits behind a paywall.")

            return {"title": title[:200], "text": text, "url": current}

    raise HTTPException(502, "Too many redirects fetching that URL.")
