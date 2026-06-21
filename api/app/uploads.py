"""Workbench uploads — admin-fed images for Canvas sections (colouring, search & find).

Images are stored on disk under uploads/ with a JSON index, so they survive restarts
via the curio_uploads volume. Metadata: id, name, section, items[], file, created.
Access-control (admin vs normal user) is intended to layer on top later.
"""
from __future__ import annotations

import json
import os
import time
import uuid

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
INDEX = os.path.join(UPLOAD_DIR, "index.json")
SECTIONS = {"coloring", "searchfind", "painting"}


def _load() -> list[dict]:
    try:
        with open(INDEX) as f:
            return json.load(f)
    except Exception:
        return []


def _save(items: list[dict]) -> None:
    with open(INDEX, "w") as f:
        json.dump(items, f)


def list_assets(section: str | None = None) -> list[dict]:
    items = _load()
    if section:
        items = [a for a in items if a.get("section") == section]
    return items


def add_asset(name: str, section: str, items_list: list[str], filename: str, data: bytes) -> dict:
    if section not in SECTIONS:
        section = "coloring"
    ext = os.path.splitext(filename or "")[1].lower()
    if ext not in (".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"):
        ext = ".png"
    aid = uuid.uuid4().hex[:12]
    fn = aid + ext
    with open(os.path.join(UPLOAD_DIR, fn), "wb") as f:
        f.write(data)
    rec = {"id": aid, "name": name or "Untitled", "section": section,
           "items": items_list, "file": fn, "created": time.time()}
    alli = _load()
    alli.insert(0, rec)
    _save(alli)
    return rec


def asset_path(aid: str):
    for a in _load():
        if a["id"] == aid:
            return os.path.join(UPLOAD_DIR, a["file"]), a
    return None, None


def delete_asset(aid: str) -> bool:
    alli = _load()
    rec = next((a for a in alli if a["id"] == aid), None)
    if not rec:
        return False
    try:
        os.remove(os.path.join(UPLOAD_DIR, rec["file"]))
    except Exception:
        pass
    _save([a for a in alli if a["id"] != aid])
    return True
