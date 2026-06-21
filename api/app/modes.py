"""Logic for the non-child modes: parent, family (+ itinerary), brain, canvas,
books. Reads from content.py (the single source of truth) and shapes API models.

In-memory stores for brain log and books are fine for the build phase; they
swap for Mongo via store.py later without changing this interface.
"""
from __future__ import annotations

import random
import uuid

from . import content
from .models import (
    Book, BookRequest, BrainItem, CanvasTool, CanvasTools, ChildSnapshot,
    EduItem, Itinerary, ItineraryRequest, LifestyleBlock, Nudge, Outing,
    ParentOverview, Tip,
)


def _sample(seq, n):
    return random.sample(list(seq), min(n, len(seq)))


# ---------------- Landing feeds ----------------
def _by_day(seq, offset: int = 0):
    """Deterministic per-day pick: cycles through the whole list before any
    repeat, so an item won't reappear until the list has been exhausted
    (e.g. a 60+ item fact list lasts ~two months of unique days)."""
    import datetime
    doy = datetime.date.today().toordinal()
    seq = list(seq)
    return seq[(doy + offset) % len(seq)] if seq else ""


def feeds(shuffle: bool = False) -> dict:
    pick = (lambda seq, off: random.choice(list(seq))) if shuffle else _by_day
    return {
        "world": pick(content.FEED_WORLD, 0),
        "trend": pick(content.FEED_TREND, 1),
        "tools": pick(content.FEED_TOOLS, 2),
        "fact": pick(content.FEED_FACT, 3),
    }


# ---------------- Parent ----------------
def parent_overview() -> ParentOverview:
    snap = ChildSnapshot(
        plans_done=8 + random.randint(0, 19),
        loves=random.choice(["animals", "space", "dinosaurs", "numbers", "stories", "the world"]),
        streak_days=2 + random.randint(0, 8),
        summary=random.choice(content.PARENT_SUMMARIES),
    )
    nudges = [Nudge(icon=i, title=t, detail=d) for (i, t, d) in _sample(content.PARENT_NUDGES, 4)]
    tips_child = _sample(content.TIPS_CHILD, 3)
    tips_self = [Tip(kind=k, text=tx) for (k, tx) in _sample(content.TIPS_SELF, 3)]
    return ParentOverview(snapshot=snap, nudges=nudges, tips_child=tips_child, tips_self=tips_self)


_CHECKIN = {
    "loved it": "Wonderful - we'll keep the level and add more of what they love.",
    "okay": "Good to know - we'll vary it a little next time.",
    "too hard": "Thanks - we'll gently ease the difficulty.",
    "too easy": "Noted - we'll add a tougher stretch next plan.",
}


def checkin_reply(rating: str) -> str:
    return _CHECKIN.get(rating, "Thanks for the feedback.")


# ---------------- Family ----------------
def family_education() -> list[EduItem]:
    return [EduItem(icon=i, title=t, detail=d) for (i, t, d) in content.FAMILY_EDU]


def _block(row, day_label=None) -> LifestyleBlock:
    cat, color, title, activity, where, time, cost = row
    return LifestyleBlock(category=cat, color=color, title=title, activity=activity,
                          where=where, time=time, cost=cost, day_label=day_label)


_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def family_lifestyle(rng: str) -> list[LifestyleBlock]:
    if rng == "day":
        return [_block(r) for r in _sample(content.LIFESTYLE, 4)]
    if rng == "week":
        rows = _sample(content.LIFESTYLE, 7)
        return [_block(r, _DAYS[i]) for i, r in enumerate(rows)]
    # month
    out = []
    for w in range(1, 5):
        for r in _sample(content.LIFESTYLE, 3):
            out.append(_block(r, f"Week {w}"))
    return out


def itinerary(req: ItineraryRequest) -> Itinerary:
    if req.when == "events":
        events = req.events or ["Christmas"]
        items = []
        note = None
        for ev in events:
            for a in content.ITIN_EVENTS.get(ev, []):
                items.append(Outing(label=ev, title=a[0], desc=a[1], where=a[2], time=a[3], cost=a[4]))
            if ev == "Guy Fawkes":
                note = content.ITIN_GUY_FAWKES_NOTE
        return Itinerary(items=items, note=note)

    if req.scope == "local":
        pool, label = content.ITIN_AREAS[req.area]["local"], "Local"
    elif req.scope == "provincial":
        pool, label = content.ITIN_AREAS[req.area]["provincial"], "Provincial"
    elif req.scope == "national":
        pool, label = content.ITIN_NATIONAL, "National"
    else:
        pool, label = content.ITIN_INTL, "International"

    n = 5 if req.when == "week" else 3 if req.when == "weekend" else max(1, req.days)
    chosen = _sample(pool, min(n, len(pool)))
    items = [Outing(label=label, title=a[0], desc=a[1], where=a[2], time=a[3], cost=a[4]) for a in chosen]
    return Itinerary(items=items)


def itinerary_areas() -> list[str]:
    return list(content.ITIN_AREAS.keys())


def itinerary_events() -> list[str]:
    return list(content.ITIN_EVENTS.keys())


# ---------------- Canvas ----------------
def _tools(rows):
    return [CanvasTool(name=r[0], color=r[1], icon=r[2], title=r[3], desc=r[4]) for r in rows]


def canvas_tools() -> CanvasTools:
    return CanvasTools(education=_tools(content.CANVAS_EDU),
                       fun=_tools(content.CANVAS_FUN),
                       play=_tools(content.CANVAS_PLAY))


# ---------------- Brain (in-memory log) ----------------
_KIND_ICON = {"idea": "💡", "article": "📰", "url": "🔗", "file": "📄", "video": "🎬", "audio": "🎧"}


def _implications(label: str, kind: str) -> tuple[str, str, str]:
    """A plain-language drill-down: specific to what was fed (by topic keywords),
    generated locally (no model call) so feeding the Brain costs nothing."""
    s = label.lower()
    # bespoke implications for the seeded items
    if "play-based" in s or "play based" in s:
        return ("Plans for under-7s lean more on play, stories and hands-on tasks instead of worksheets.",
                "You'll see more 'learn through play' nudges and fewer sit-down drills suggested.",
                "Family time ideas favour games and exploring over formal lessons.")
    if "sleep" in s and "focus" in s:
        return ("Challenges are kept shorter on days a child seems tired, protecting focus.",
                "You'll get a gentle bedtime-routine nudge in your parent tips.",
                "The family rhythm suggests wind-down time before screens at night.")
    if "concrete-pictorial" in s or "cpa" in s or ("pictorial" in s and "abstract" in s):
        return ("Number pages move from real objects, to pictures, to symbols — the Singapore way.",
                "Maths nudges suggest using objects first before asking for written sums.",
                "Family maths moments (cooking, shopping) are framed as 'see it, then write it'.")
    # keyword-aware implications for anything fed in
    topics = [
        (("read", "phonics", "literacy", "english", "book"), "reading"),
        (("maths", "math", "number", "count", "arithmetic"), "maths"),
        (("focus", "attention", "concentrat", "adhd"), "focus & attention"),
        (("sleep", "bedtime", "rest"), "sleep & routines"),
        (("emotion", "feeling", "anxiety", "calm", "regulat", "behaviour", "behavior"), "emotional wellbeing"),
        (("science", "experiment", "stem"), "science"),
        (("art", "draw", "paint", "music", "creativ"), "creativity"),
        (("speak", "speech", "confiden", "social"), "confidence & speaking"),
        (("write", "writing", "handwriting", "spelling"), "writing"),
        (("nature", "outdoor", "forest", "play"), "play & nature"),
    ]
    topic = next((name for keys, name in topics if any(k in s for k in keys)), "")
    if topic:
        return (
            f"Curio can add more {topic} activities and challenges matched to your child's age.",
            f"Expect {topic}-focused plan ideas and nudges shaped by this in upcoming sessions.",
            f"Shared family activities can build in {topic} so everyone explores it together.",
        )
    src = {"url": "this link", "article": "this article", "file": "this file",
           "video": "this video", "audio": "this audio"}.get(kind, "this idea")
    return (
        f"Curio can weave themes from {src} into age-matched pages and challenges.",
        f"Look out for new plan ideas and nudges shaped by {src} in upcoming sessions.",
        f"Shared family activities may reflect {src}, so everyone explores it together.",
    )


_BRAIN_LOG: list[BrainItem] = []
for (i, t, d) in content.BRAIN_SEED:
    _fc, _fp, _ff = _implications(t, "idea")
    _BRAIN_LOG.append(BrainItem(icon=i, title=t, detail=d, kind="idea",
                                for_child=_fc, for_parent=_fp, for_family=_ff))


def brain_log() -> list[BrainItem]:
    return list(_BRAIN_LOG)


def brain_feed(text: str | None, source_name: str | None,
               url: str | None = None, kind: str | None = None) -> list[BrainItem]:
    raw = (text or "").strip() or (url or "").strip() or (source_name or "")
    if not raw:
        return brain_log()
    kind = kind or ("url" if (url and not text) else "idea")
    label = raw if len(raw) <= 60 else raw[:57] + "..."
    fc, fp, ff = _implications(label, kind)
    _BRAIN_LOG.insert(0, BrainItem(icon=_KIND_ICON.get(kind, "✨"), title=label,
                                   detail="absorbed — improving child, parent, family & Canvas",
                                   kind=kind, for_child=fc, for_parent=fp, for_family=ff))
    del _BRAIN_LOG[8:]
    return list(_BRAIN_LOG)


# ---------------- Books (Curio Press, in-memory) ----------------
_BOOKS: dict[str, Book] = {}


def make_book(req: BookRequest) -> Book:
    title = random.choice(content.BOOK_TITLES.get(req.book_type, ["My Little Book"]))
    pages = 12 if req.size == "small" else 24
    cover = content.BOOK_COVERS.get(req.book_type, "📕")
    book = Book(id=f"book_{uuid.uuid4().hex[:10]}", title=title, book_type=req.book_type,
                pages=pages, age=req.age, cover=cover)
    _BOOKS[book.id] = book
    return book


def get_book(book_id: str) -> Book | None:
    return _BOOKS.get(book_id)
