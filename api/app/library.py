"""Curio Library — a browsable catalogue of 200+ downloadable books across
school subjects and world disciplines.

The catalogue is generated deterministically from a taxonomy (category × topic ×
age-band), so ids are stable. A book's actual pages are produced on demand by the
curation engine, then serialised to text/markdown for download or read-aloud — no
token cost.
"""
from __future__ import annotations

from .models import (
    Book, BookDetail, BookPage, LibraryFacets, PlanRequest,
)
from . import engine

GENRES = ["Adventure", "Explainer", "Story", "Activity", "Reference", "Mystery", "Biography", "Discovery"]
MOODS = ["Curious", "Calm", "Excited", "Cozy", "Brave", "Playful"]
AGE_BANDS = [(3, 6), (7, 9), (10, 13)]

# (key, label, emoji, color, discipline, subject, [topics])
_CATS: list[tuple] = [
    ("animals", "Animals", "🐾", "5BBF8A", "Natural Science", "science",
     ["Big Cats", "Ocean Animals", "Insects", "Birds of the World", "Reptiles", "Endangered Animals"]),
    ("dinosaurs", "Dinosaurs", "🦕", "C0894A", "Palaeontology", "science",
     ["T-Rex & Friends", "Plant-Eaters", "Fossils", "The Age of Dinosaurs"]),
    ("space", "Space", "🚀", "5AA7E6", "Astronomy", "science",
     ["The Planets", "The Moon", "Stars & Galaxies", "Rockets", "Life of an Astronaut"]),
    ("nature", "Nature & Plants", "🌳", "5BBF8A", "Botany", "science",
     ["Mighty Trees", "Flowers", "Seeds & Growing", "Forests", "Gardens"]),
    ("oceans", "Oceans", "🌊", "2EC4B6", "Marine Science", "geography",
     ["Coral Reefs", "The Deep Sea", "Whales & Dolphins", "Tides & Waves"]),
    ("transport", "Transportation", "🚗", "FF7A66", "Engineering", "technology",
     ["Cars", "Planes", "Trains", "Boats & Ships", "Space Travel"]),
    ("building", "Building & Machines", "🏗️", "6C7AE0", "Engineering", "technology",
     ["Bridges", "Robots", "Simple Machines", "Skyscrapers"]),
    ("experiments", "Science Experiments", "🧪", "3FA79E", "Science", "science",
     ["Water", "Air & Wind", "Light & Colour", "Sound", "Magnets"]),
    ("howthings", "How Things Work", "⚙️", "6C7AE0", "Technology", "technology",
     ["Electricity", "Engines", "Computers", "The Internet"]),
    ("art", "Art & Drawing", "🎨", "E0699B", "Visual Arts", "arts",
     ["Colours", "Famous Artists", "Cartooning", "Sculpture"]),
    ("music", "Music & Dance", "🎵", "9B6DD6", "Performing Arts", "arts",
     ["Instruments", "Rhythm & Beat", "Music Around the World", "Great Composers"]),
    ("stories", "Stories & Books", "📚", "9B6DD6", "Literature", "language",
     ["Fairy Tales", "Myths & Legends", "Poems", "Writing Your Own Story"]),
    ("numbers", "Numbers & Puzzles", "🔢", "5AA7E6", "Mathematics", "maths",
     ["Counting", "Shapes", "Patterns", "Times Tables", "Brain Puzzles"]),
    ("cooking", "Cooking & Food", "🍳", "FFC94D", "Life Skills", "health",
     ["Healthy Food", "Baking Basics", "Food Around the World", "Where Food Comes From"]),
    ("sports", "Sports & Games", "⚽", "FF7A66", "Physical Education", "health",
     ["Soccer", "The Olympics", "Team Games", "Staying Fit"]),
    ("history", "History & Long Ago", "🏛️", "C0894A", "History", "history",
     ["Ancient Egypt", "Castles & Knights", "Great Explorers", "Inventions That Changed Us"]),
    ("cultures", "People & Cultures", "🌍", "2EC4B6", "Social Studies", "geography",
     ["Countries of the World", "Festivals", "Languages", "Communities"]),
    ("geography", "Geography & Maps", "🗺️", "2EC4B6", "Geography", "geography",
     ["The Continents", "Volcanoes", "Weather", "Rivers & Mountains"]),
    ("body", "Body & Health", "💪", "FF7A66", "Health", "health",
     ["The Human Body", "The Five Senses", "Feelings", "Staying Healthy"]),
    ("lifeskills", "Life Skills", "🧠", "9B6DD6", "Life Skills", "language",
     ["Money Basics", "Kindness", "Telling Time", "Solving Problems"]),
]

_TITLE = {
    "Adventure": "The Great {t} Adventure",
    "Explainer": "How {t} Work" ,
    "Story": "A Story About {t}",
    "Activity": "{t}: Things to Try",
    "Reference": "All About {t}",
    "Mystery": "The Mystery of {t}",
    "Biography": "Heroes of {t}",
    "Discovery": "Let's Discover {t}",
}


def _build() -> list[Book]:
    books: list[Book] = []
    n = 0
    for ci, (key, label, emoji, color, discipline, subject, topics) in enumerate(_CATS):
        for ti, topic in enumerate(topics):
            for bi, (lo, hi) in enumerate(AGE_BANDS):
                k = ci + ti + bi
                genre = GENRES[k % len(GENRES)]
                mood = MOODS[k % len(MOODS)]
                title = _TITLE[genre].format(t=topic)
                n += 1
                books.append(Book(
                    id=f"bk{n:04d}",
                    title=title,
                    blurb=f"A {mood.lower()} {genre.lower()} about {topic.lower()} for ages {lo}-{hi}.",
                    category=key, category_label=label, discipline=discipline, subject=subject,
                    topic=topic, genre=genre, mood=mood, interests=[key],
                    age_min=lo, age_max=hi, pages=10, emoji=emoji, color=color,
                ))
    return books


_CATALOG: list[Book] = _build()
_BY_ID = {b.id: b for b in _CATALOG}


def facets() -> LibraryFacets:
    cats = []
    seen = set()
    for (key, label, emoji, color, discipline, subject, _t) in _CATS:
        if key in seen:
            continue
        seen.add(key)
        cats.append({"key": key, "label": label, "emoji": emoji, "color": color, "count": sum(1 for b in _CATALOG if b.category == key)})
    return LibraryFacets(
        categories=cats,
        disciplines=sorted({b.discipline for b in _CATALOG}),
        subjects=sorted({b.subject for b in _CATALOG}),
        genres=sorted({b.genre for b in _CATALOG}),
        moods=sorted({b.mood for b in _CATALOG}),
        age_bands=[f"{lo}-{hi}" for (lo, hi) in AGE_BANDS],
        total=len(_CATALOG),
    )


def catalog(category=None, discipline=None, subject=None, genre=None, mood=None,
            age=None, q=None, limit=60, offset=0):
    items = _CATALOG
    if category:
        items = [b for b in items if b.category == category]
    if discipline:
        items = [b for b in items if b.discipline == discipline]
    if subject:
        items = [b for b in items if b.subject == subject]
    if genre:
        items = [b for b in items if b.genre == genre]
    if mood:
        items = [b for b in items if b.mood == mood]
    if age is not None:
        items = [b for b in items if b.age_min <= age <= b.age_max]
    if q:
        ql = q.lower()
        items = [b for b in items if ql in b.title.lower() or ql in b.topic.lower() or ql in b.blurb.lower()]
    total = len(items)
    return total, items[offset:offset + limit]


def get_book(book_id: str) -> BookDetail | None:
    b = _BY_ID.get(book_id)
    if not b:
        return None
    # Produce real pages on demand via the curation engine, seeded by the book.
    age = (b.age_min + b.age_max) // 2
    req = PlanRequest(age=age, interests=b.interests, subjects=[b.subject])
    plan = engine.curate(req)
    pages = []
    for pg in plan.pages[:b.pages]:
        if pg.archetype == "fun":
            continue
        pages.append(BookPage(title=pg.topic, text=pg.guideline, challenge=pg.challenge, answer=pg.answer or ""))
    full = [f"{b.title}", b.blurb, ""]
    for i, p in enumerate(pages, 1):
        full += [f"Chapter {i}: {p.title}", p.text, f"Try this: {p.challenge}", ""]
    return BookDetail(**b.model_dump(), book_pages=pages, full_text="\n".join(full))
