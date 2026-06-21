"""Illustration generation for Curio.

Real, style-consistent, child-safe pictures that align to each page's text are
core to the product's value. A page becomes an image via a PLUGGABLE provider,
with disk caching so common subjects (butterfly, elephant...) are generated once
and reused across every plan and user - the main cost lever.

Default provider is "none" -> the renderer falls back to the emoji motif, so the
app runs with no key. On the VPS set CURIO_IMAGE_PROVIDER=openai + a key to turn
on real generation. Style is fixed per output so a whole deck/book is coherent.

The OpenAI provider is fully wired to the current Images API (gpt-image-1):
POST /v1/images/generations, Bearer auth, base64 in data[0].b64_json, sizes
1024x1024 | 1536x1024 | 1024x1536, quality low|medium|high, moderation auto
(age-appropriate), optional transparent background.
"""
from __future__ import annotations

import base64
import hashlib
import io
import os
import time

from .config import settings

CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "image_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

# Fixed styles -> consistency across a whole deck/book.
STYLES = {
    "picture_book": ("soft warm children's picture-book illustration, gentle rounded shapes, "
                     "friendly characters, bright but not harsh colours, flat vector style, "
                     "simple uncluttered composition, centred subject"),
    "watercolour": ("gentle children's watercolour illustration, soft edges, warm pastel palette, "
                    "storybook feel, simple composition, centred subject"),
    "paper_cut": ("cute paper-cut collage illustration for children, layered shapes, warm palette, "
                  "clean simple composition, centred subject"),
}
# Child-safety is non-negotiable; baked into every prompt.
SAFETY = ("wholesome and child-safe, non-violent, non-scary, "
          "no text or words or letters in the image, no logos")


def _age_band(age: int) -> tuple[str, str]:
    """Returns (audience phrase, maturity cue) so visuals suit the child's age
    instead of looking babyish for an older child."""
    if age <= 6:
        return ("a young child", "cute and simple, big friendly shapes")
    if age <= 9:
        return ("a primary-school child", "clear and lively, a little more detail, not babyish")
    if age <= 12:
        return ("a pre-teen", "clean and modern, informative, age-appropriate, not childish")
    return ("a teenager", "mature, sleek modern infographic style, sophisticated and not childish")


def build_prompt(topic: str, anchor_desc: str, style_id: str, transparent: bool, age: int = 9) -> str:
    style = STYLES.get(style_id, STYLES["picture_book"])
    subject = anchor_desc or topic
    audience, maturity = _age_band(age)
    bg = "on a transparent background" if transparent else "on a plain very light background"
    return (f"{subject}. A single clear illustration that visually explains '{topic}' for {audience}. "
            f"{style}, {maturity}, {bg}. {SAFETY}.")


def _cache_path(prompt: str, fingerprint: str) -> str:
    h = hashlib.sha256(f"{fingerprint}|{prompt}".encode("utf-8")).hexdigest()[:24]
    return os.path.join(CACHE_DIR, f"{h}.png")


def _normalise(raw: bytes, path: str) -> None:
    """Save as PNG, downscaled a touch to keep decks light and embeds fast.
    Preserves alpha so transparent backgrounds frame cleanly in the panel."""
    from PIL import Image
    img = Image.open(io.BytesIO(raw))
    if max(img.size) > 1024:
        img.thumbnail((1024, 1024))
    img.save(path, "PNG")


# ---------------- providers ----------------
class Provider:
    def generate(self, prompt: str) -> bytes | None:  # pragma: no cover
        raise NotImplementedError


class NullProvider(Provider):
    """No key / disabled -> renderer uses the emoji fallback."""
    def generate(self, prompt: str) -> bytes | None:
        return None


class OpenAIImageProvider(Provider):
    """Lean by design: send only params proven to work (model, prompt, size,
    quality), rely on the API's default moderation (already 'auto', the
    age-appropriate one) and default png output. The transparent background is
    attempted, then automatically dropped if the account/model rejects it -
    so it never hard-fails on an optional flourish. Errors surface the response
    body so failures explain themselves."""

    def __init__(self, key: str, model: str, size: str, quality: str, background: str):
        self.key = key
        self.model = model or "gpt-image-1"
        self.size = size or "1024x1024"
        self.quality = quality or "medium"
        self.background = background or "opaque"

    def _payload(self, prompt: str, with_background: bool) -> dict:
        if self.model.startswith("dall-e"):
            return {"model": self.model, "prompt": prompt, "size": self.size,
                    "response_format": "b64_json", "n": 1}
        body = {"model": self.model, "prompt": prompt, "size": self.size,
                "quality": self.quality, "n": 1}
        if with_background and self.background and self.background != "opaque":
            body["background"] = self.background
        return body

    def _decode(self, r) -> bytes | None:
        import httpx
        d = r.json()["data"][0]
        if d.get("b64_json"):
            return base64.b64decode(d["b64_json"])
        if d.get("url"):
            return httpx.get(d["url"], timeout=180).content
        return None

    def generate(self, prompt: str) -> bytes | None:
        import httpx
        headers = {"Authorization": f"Bearer {self.key}", "Content-Type": "application/json"}
        url = "https://api.openai.com/v1/images/generations"
        # try with the (optional) background first, then a bare payload as fallback
        payloads = [self._payload(prompt, True)]
        if "background" in payloads[0]:
            payloads.append(self._payload(prompt, False))
        last = None
        for body in payloads:
            for attempt in range(2):
                try:
                    r = httpx.post(url, headers=headers, json=body, timeout=180)
                    if r.status_code == 200:
                        return self._decode(r)
                    if r.status_code >= 500:
                        last = RuntimeError(f"server {r.status_code}: {r.text[:200]}")
                        time.sleep(1.5 * (attempt + 1))
                        continue
                    last = RuntimeError(f"{r.status_code}: {r.text[:300]}")
                    break  # 4xx: don't retry same body; try next payload
                except httpx.HTTPError as exc:
                    last = exc
                    time.sleep(1.5 * (attempt + 1))
        raise RuntimeError(f"image generation failed: {last}")


def get_provider() -> Provider:
    p = (settings.image_provider or "none").lower()
    if p == "openai" and settings.image_api_key:
        return OpenAIImageProvider(
            settings.image_api_key, settings.image_model, settings.image_size,
            settings.image_quality, settings.image_background,
        )
    return NullProvider()


def image_for_page(topic: str, anchor_desc: str, style_id: str | None = None, age: int = 9) -> str | None:
    """Return a local PNG path for this page, or None to use the emoji fallback.
    Cached by prompt + settings so repeats are free. Never raises into the
    renderer - a failure just falls back to emoji."""
    provider = get_provider()
    if isinstance(provider, NullProvider):
        return None
    style_id = style_id or settings.image_style or "picture_book"
    transparent = settings.image_background == "transparent"
    prompt = build_prompt(topic, anchor_desc, style_id, transparent, age)
    fingerprint = f"{settings.image_model}|{settings.image_size}|{settings.image_quality}|{settings.image_background}"
    path = _cache_path(prompt, fingerprint)
    if os.path.exists(path):
        return path
    try:
        raw = provider.generate(prompt)
        if not raw:
            return None
        _normalise(raw, path)
        return path
    except Exception:
        return None


def generate_sample(prompt: str | None = None) -> str:
    """Used by scripts/gen_sample.py to verify a key. Raises on failure so the
    operator sees the real error (unlike image_for_page, which falls back)."""
    provider = get_provider()
    if isinstance(provider, NullProvider):
        raise RuntimeError("No image provider configured. Set CURIO_IMAGE_PROVIDER=openai and CURIO_IMAGE_API_KEY.")
    transparent = settings.image_background == "transparent"
    prompt = prompt or build_prompt("The Butterfly",
                                    "egg, caterpillar, chrysalis and a butterfly on one branch",
                                    settings.image_style or "picture_book", transparent)
    raw = provider.generate(prompt)
    if not raw:
        raise RuntimeError("Provider returned no image.")
    out = os.path.join(CACHE_DIR, "sample.png")
    _normalise(raw, out)
    return out
