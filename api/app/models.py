from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

Cadence = Literal["every day", "weekdays", "weekends", "once off", "speech"]
Scope = Literal["my country", "my continent", "the whole world"]
Detail = Literal["summary", "detailed"]
Medium = Literal["illustration", "text", "both"]
Size = Literal["small", "medium", "large"]
Fmt = Literal["pptx", "pdf", "epub", "txt", "md"]
Archetype = Literal["focused", "fun"]


class PlanRequest(BaseModel):
    # age is the ONLY required field. Everything else has a sensible default.
    age: int = Field(..., ge=1, le=18)
    gender: Optional[str] = None
    interests: list[str] = []          # may include "surprise me" (random pick)
    subjects: list[str] = []           # optional school-subject focus
    outcomes: list[str] = []
    cadence: Cadence = "every day"
    scope: Scope = "the whole world"
    place: Optional[str] = None
    # Speech mode (only meaningful when cadence == "speech"):
    speech_length: Optional[str] = None        # e.g. "2 min", "90 seconds"
    speech_audience: list[str] = []            # teachers / kids / parents / everyone
    speech_place: Optional[str] = None         # class / church / competition / custom
    include_sport: bool = False
    sports: list[str] = []
    sport_custom: Optional[str] = None
    include_faith: bool = False
    faiths: list[str] = []
    faith_custom: Optional[str] = None
    detail: Detail = "summary"
    medium: Medium = "both"            # illustration / text / both
    size: Size = "medium"
    fmt: Fmt = "pdf"


class Page(BaseModel):
    id: str
    order: int
    archetype: Archetype
    domain: str
    topic: str
    anchor_visual: str          # concept/description of the single anchor illustration
    guideline: str              # short parent-readable instruction beside the visual
    challenge: str              # one age-appropriate task
    answer: str = ""            # reveal-able answer/hint for the interactive view
    bloom_level: str


class Plan(BaseModel):
    id: str
    request: PlanRequest
    pages: list[Page]
    created_at: datetime


class ExportRequest(BaseModel):
    fmt: Fmt


class ExportJob(BaseModel):
    id: str
    plan_id: str
    fmt: Fmt
    status: Literal["queued", "running", "done", "error"]
    download_url: Optional[str] = None
    error: Optional[str] = None


class AskRequest(BaseModel):
    message: str
    plan_id: Optional[str] = None
    mode: Optional[str] = None  # chat | homework


class AskReply(BaseModel):
    reply: str


class Meta(BaseModel):
    interests: list[str]
    subjects: list[str]
    outcomes: list[str]
    sports: list[str]
    faiths: list[str]
    formats: list[str]
    mediums: list[str]
    sizes: list[str]
    cadences: list[str]
    scopes: list[str]
    speech_audiences: list[str]
    speech_places: list[str]


# ===================== Parent =====================
class Nudge(BaseModel):
    icon: str
    title: str
    detail: str


class Tip(BaseModel):
    kind: Literal["child", "adopt", "avoid"]
    text: str


class ChildSnapshot(BaseModel):
    plans_done: int
    loves: str
    streak_days: int
    summary: str


class ParentOverview(BaseModel):
    snapshot: ChildSnapshot
    nudges: list[Nudge]
    tips_child: list[str]
    tips_self: list[Tip]


class CheckinRequest(BaseModel):
    rating: Literal["loved it", "okay", "too hard", "too easy"]


class CheckinReply(BaseModel):
    reply: str


# ===================== Family =====================
class EduItem(BaseModel):
    icon: str
    title: str
    detail: str


class LifestyleBlock(BaseModel):
    category: str
    color: str
    title: str
    activity: str
    where: str
    time: str
    cost: str
    day_label: Optional[str] = None


class FamilyLifestyle(BaseModel):
    range: Literal["day", "week", "month"]
    blocks: list[LifestyleBlock]


ItinScope = Literal["local", "provincial", "national", "international"]
ItinWhen = Literal["week", "weekend", "duration", "events"]


class ItineraryRequest(BaseModel):
    area: str
    scope: ItinScope = "local"
    when: ItinWhen = "week"
    days: int = 2
    events: list[str] = []


class Outing(BaseModel):
    label: str
    title: str
    desc: str
    where: str
    time: str
    cost: str


class Itinerary(BaseModel):
    items: list[Outing]
    note: Optional[str] = None


# ===================== Brain =====================
class BrainItem(BaseModel):
    icon: str
    title: str
    detail: str
    kind: str = "idea"
    for_child: str = ""
    for_parent: str = ""
    for_family: str = ""


class BrainFeed(BaseModel):
    text: Optional[str] = None
    source_name: Optional[str] = None
    url: Optional[str] = None
    kind: Optional[str] = None  # idea | article | url | file | video | audio


class BrainState(BaseModel):
    log: list[BrainItem]


# ===================== Canvas =====================
class CanvasTool(BaseModel):
    name: str
    color: str
    icon: str
    title: str
    desc: str


class CanvasTools(BaseModel):
    education: list[CanvasTool]
    fun: list[CanvasTool]
    play: list[CanvasTool]


# ===================== Books (Curio Press) =====================
BookType = Literal["Sleep-time", "Literacy", "English", "Maths", "Science", "History stories"]
BookSize = Literal["small", "medium"]
BookAge = Literal["toddler", "early", "primary"]


class BookRequest(BaseModel):
    book_type: BookType = "Sleep-time"
    size: BookSize = "small"
    age: BookAge = "early"


class Book(BaseModel):
    id: str
    title: str
    book_type: str
    pages: int
    age: str
    cover: str


# ===================== Auth =====================
class SignupRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class UserPublic(BaseModel):
    id: str
    email: str
    created_at: str


class AuthReply(BaseModel):
    token: str
    user: UserPublic


class ResetRequest(BaseModel):
    email: str


# ===================== Athena (coach) =====================
class FocusArea(BaseModel):
    id: str
    label: str
    icon: str


class CoachRequest(BaseModel):
    age: int
    focus: str
    concern: Optional[str] = None
    weeks: int = 4


class CoachAction(BaseModel):
    text: str
    measure: str


class CoachPhase(BaseModel):
    week: int
    week_label: str
    theme: str
    actions: list[CoachAction]


class CoachPlan(BaseModel):
    focus: str
    focus_label: str
    icon: str
    age: int
    weeks: int
    concern: str = ""
    goal: str
    phases: list[CoachPhase]
    midpoint_week: int
    midpoint: str
    nudges: list[str]
    indicators: list[str]
    gaps: list[str]
    professional: str
    disclaimer: str


# ===================== Library =====================
class Book(BaseModel):
    id: str
    title: str
    blurb: str
    category: str
    category_label: str
    discipline: str
    subject: str
    topic: str
    genre: str
    mood: str
    interests: list[str] = []
    age_min: int
    age_max: int
    pages: int = 10
    emoji: str
    color: str


class BookPage(BaseModel):
    title: str
    text: str
    challenge: str = ""
    answer: str = ""


class BookDetail(Book):
    book_pages: list[BookPage] = []
    full_text: str = ""


class LibraryFacets(BaseModel):
    categories: list[dict]
    disciplines: list[str]
    subjects: list[str]
    genres: list[str]
    moods: list[str]
    age_bands: list[str]
    total: int
