"""Curio API - the /v1 contract.

This API is the SEAM between the backend (everything that matters: curation IP,
rendering, data) and a deliberately dumb, portable frontend. Keep that boundary
clean: the frontend only ever speaks this JSON contract over HTTPS, so it can be
hosted anywhere (the VPS today, Lovable later) without backend changes."""
from __future__ import annotations

import json
import uuid
import httpx

from fastapi.responses import Response
import os
import re
from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from . import assistant, auth, bookexport, coach, engine, images, library, modes, render, uploads
from .auth import get_current_user
from .config import settings
from .models import (
    AskReply,
    AskRequest,
    AuthReply,
    Book,
    BookRequest,
    BrainFeed,
    CoachPlan,
    CoachRequest,
    FocusArea,
    Book,
    BookDetail,
    LibraryFacets,
    BrainState,
    CanvasTools,
    CheckinReply,
    CheckinRequest,
    EduItem,
    ExportJob,
    ExportRequest,
    FamilyLifestyle,
    Itinerary,
    ItineraryRequest,
    Meta,
    ParentOverview,
    Plan,
    PlanRequest,
    LoginRequest,
    ResetRequest,
    SignupRequest,
    UserPublic,
)
from .store import (get_export, get_plan, get_user_by_email, get_user_by_id,
                    save_export, save_plan, save_user,
                    coll_put, coll_get, coll_list, coll_delete, coll_purge)

import datetime as _dt


def _now() -> str:
    return _dt.datetime.now(_dt.timezone.utc).isoformat()


app = FastAPI(title="Curio API", version="0.1.0")

# CORS is what lets a frontend on another origin (incl. Lovable) call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

v1 = FastAPI(title="Curio API v1")


@v1.get("/health")
def health() -> dict:
    return {"ok": True, "service": "curio-api", "version": "0.1.0"}


@v1.get("/meta", response_model=Meta)
def meta() -> Meta:
    """Selectable options, served from the backend so the frontend stays dumb."""
    return Meta(
        interests=[
            "animals", "dinosaurs", "space", "nature & plants", "oceans",
            "transportation", "building & machines", "robots & tech",
            "science experiments", "how things work", "art & drawing",
            "music & dance", "stories & books", "numbers & puzzles",
            "cooking & food", "sports & games", "history & long ago",
            "people & cultures", "geography & maps", "body & health",
            "entertainment", "fun", "surprise me",
        ],
        subjects=[
            "Maths", "English / Language", "Science", "Biology", "Chemistry",
            "Physics", "Geography", "History", "Computing & Tech",
            "Art & Design", "Music", "Physical Education", "Life Skills",
            "Second Language",
        ],
        outcomes=[
            "spark curiosity", "school readiness", "reading & writing",
            "numeracy", "vocabulary", "confidence", "focus & attention",
            "kindness & empathy", "creativity", "problem-solving", "memory",
            "social skills", "independence", "public speaking", "growth mindset",
        ],
        sports=["soccer", "cricket", "rugby", "swimming", "athletics", "tennis", "basketball"],
        faiths=["Christianity", "Islam", "Hinduism", "Judaism", "Buddhism", "world religions"],
        formats=["pdf", "pptx", "docx", "jpeg"],
        mediums=["illustration", "text", "both"],
        sizes=["small", "medium", "large"],
        cadences=["every day", "weekdays", "weekends", "once off", "speech"],
        scopes=["my country", "my continent", "the whole world"],
        speech_audiences=["teachers", "kids", "parents", "everyone"],
        speech_places=["class", "church", "competition", "assembly"],
    )


@v1.post("/plans", response_model=Plan)
def create_plan(req: PlanRequest, user: dict = Depends(get_current_user)) -> Plan:
    plan = engine.curate(req)
    save_plan(plan)
    return plan


@v1.get("/plans/{plan_id}", response_model=Plan)
def read_plan(plan_id: str, user: dict = Depends(get_current_user)) -> Plan:
    plan = get_plan(plan_id)
    if plan is None:
        raise HTTPException(404, "Plan not found")
    return plan


@v1.post("/plans/{plan_id}/exports", response_model=ExportJob)
def create_export(
    plan_id: str,
    body: ExportRequest,
    bg: BackgroundTasks,
    user: dict = Depends(get_current_user),
) -> ExportJob:
    plan = get_plan(plan_id)
    if plan is None:
        raise HTTPException(404, "Plan not found")
    job = ExportJob(id=f"exp_{uuid.uuid4().hex[:10]}", plan_id=plan_id, fmt=body.fmt, status="queued")
    save_export(job)
    bg.add_task(render.run_export, job.id, plan)
    return job


@v1.get("/exports/{export_id}", response_model=ExportJob)
def read_export(export_id: str, user: dict = Depends(get_current_user)) -> ExportJob:
    job = get_export(export_id)
    if job is None:
        raise HTTPException(404, "Export not found")
    return job


@v1.get("/exports/{export_id}/download")
def download_export(export_id: str, user: dict = Depends(get_current_user)):
    job = get_export(export_id)
    if job is None or job.status != "done":
        raise HTTPException(404, "Export not ready")
    path = render.export_path(job.plan_id, job.fmt)
    return FileResponse(path, filename=render.download_name(job.plan_id, job.fmt))


@v1.get("/plans/{plan_id}/pages/{order}/image")
def page_image(plan_id: str, order: int, user: dict = Depends(get_current_user)):
    """Lazy on-screen illustration: generate (or return cached) the picture for
    one page. 404 when generation is off, so the frontend falls back to emoji."""
    plan = get_plan(plan_id)
    if plan is None:
        raise HTTPException(404, "Plan not found")
    page = next((p for p in plan.pages if p.order == order), None)
    if page is None:
        raise HTTPException(404, "Page not found")
    _, _, desc = page.anchor_visual.partition("|")
    path = images.image_for_page(page.topic, desc, age=plan.request.age)
    if not path:
        raise HTTPException(404, "No illustration (generation disabled)")
    return FileResponse(path, media_type="image/png")


@v1.post("/ask", response_model=AskReply)
def ask(req: AskRequest, user: dict = Depends(get_current_user)) -> AskReply:
    """Homework / chat / voice helper. Calls the assistant when a key is configured;
    spelling and simple maths are handled locally in the browser at no cost."""
    return AskReply(reply=assistant.ask(req.message, req.mode))


# ----- landing feeds -----
@v1.get("/feeds")
def feeds(shuffle: bool = False, user: dict = Depends(get_current_user)) -> dict:
    """Daily by default (stable, non-repeating); ?shuffle=true gives a fresh
    random pick, which is what the landing-page Refresh button uses."""
    return modes.feeds(shuffle)


# ----- parent -----
@v1.get("/parent/overview", response_model=ParentOverview)
def parent_overview(user: dict = Depends(get_current_user)) -> ParentOverview:
    return modes.parent_overview()


@v1.post("/parent/checkin", response_model=CheckinReply)
def parent_checkin(req: CheckinRequest, user: dict = Depends(get_current_user)) -> CheckinReply:
    return CheckinReply(reply=modes.checkin_reply(req.rating))


# ----- family -----
@v1.get("/family/education", response_model=list[EduItem])
def family_education(user: dict = Depends(get_current_user)) -> list[EduItem]:
    return modes.family_education()


@v1.get("/family/lifestyle", response_model=FamilyLifestyle)
def family_lifestyle(range: str = "week", user: dict = Depends(get_current_user)) -> FamilyLifestyle:
    if range not in ("day", "week", "month"):
        raise HTTPException(400, "range must be day, week or month")
    return FamilyLifestyle(range=range, blocks=modes.family_lifestyle(range))


@v1.get("/family/itinerary/options")
def itinerary_options(user: dict = Depends(get_current_user)) -> dict:
    return {"areas": modes.itinerary_areas(), "events": modes.itinerary_events()}


@v1.post("/family/itinerary", response_model=Itinerary)
def family_itinerary(req: ItineraryRequest, user: dict = Depends(get_current_user)) -> Itinerary:
    if req.when != "events" and req.area not in modes.itinerary_areas():
        raise HTTPException(400, "unknown area")
    return modes.itinerary(req)


# ----- canvas -----
@v1.get("/canvas/tools", response_model=CanvasTools)
def canvas_tools(user: dict = Depends(get_current_user)) -> CanvasTools:
    return modes.canvas_tools()


# ----- the brain -----
@v1.get("/brain/log", response_model=BrainState)
def brain_log(user: dict = Depends(get_current_user)) -> BrainState:
    return BrainState(log=modes.brain_log())


@v1.post("/brain/feed", response_model=BrainState)
def brain_feed(req: BrainFeed, user: dict = Depends(get_current_user)) -> BrainState:
    return BrainState(log=modes.brain_feed(req.text, req.source_name, req.url, req.kind))


# ----- Athena (coach) -----
@v1.get("/coach/focus-areas", response_model=list[FocusArea])
def coach_focus_areas(user: dict = Depends(get_current_user)) -> list[FocusArea]:
    return coach.focus_areas()


@v1.post("/coach/plan", response_model=CoachPlan)
def coach_plan(req: CoachRequest, user: dict = Depends(get_current_user)) -> CoachPlan:
    return coach.build_plan(req)


# ----- Library -----
@v1.get("/library/facets", response_model=LibraryFacets)
def library_facets(user: dict = Depends(get_current_user)) -> LibraryFacets:
    return library.facets()


@v1.get("/library/catalog")
def library_catalog(category: str | None = None, discipline: str | None = None,
                    subject: str | None = None, genre: str | None = None,
                    mood: str | None = None, age: int | None = None,
                    q: str | None = None, limit: int = 60, offset: int = 0,
                    user: dict = Depends(get_current_user)) -> dict:
    total, items = library.catalog(category, discipline, subject, genre, mood, age, q, limit, offset)
    return {"total": total, "items": [b.model_dump() for b in items]}


@v1.get("/library/{book_id}", response_model=BookDetail)
def library_book(book_id: str, user: dict = Depends(get_current_user)) -> BookDetail:
    d = library.get_book(book_id)
    if not d:
        raise HTTPException(status_code=404, detail="book not found")
    return d


@v1.get("/library/{book_id}/download")
def library_download(book_id: str, fmt: str = "pdf", user: dict = Depends(get_current_user)):
    d = library.get_book(book_id)
    if not d:
        raise HTTPException(status_code=404, detail="book not found")
    if fmt not in bookexport.MEDIA:
        raise HTTPException(status_code=400, detail="bad format")
    meta = bookexport.book_meta(d)
    data = bookexport.render_doc(meta, fmt)
    return Response(content=data, media_type=bookexport.MEDIA[fmt],
                    headers={"Content-Disposition": f'attachment; filename="{bookexport.filename(meta, fmt)}"'})


# ----- Workbench (admin-fed Canvas assets) -----
@v1.get("/workbench/assets")
def workbench_list(section: str | None = None, user: dict = Depends(get_current_user)) -> dict:
    return {"assets": uploads.list_assets(section)}


@v1.post("/workbench/assets")
async def workbench_add(file: UploadFile = File(...), name: str = Form(""),
                        section: str = Form("coloring"), items: str = Form(""),
                        user: dict = Depends(get_current_user)) -> dict:
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="image too large (max 8MB)")
    item_list = [s.strip() for s in items.replace(",", "\n").splitlines() if s.strip()]
    return uploads.add_asset(name, section, item_list, file.filename or "image.png", data)


@v1.get("/workbench/assets/{aid}/image")
def workbench_image(aid: str):
    path, _rec = uploads.asset_path(aid)
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail="not found")
    return FileResponse(path)


@v1.delete("/workbench/assets/{aid}")
def workbench_delete(aid: str, user: dict = Depends(get_current_user)) -> dict:
    return {"deleted": uploads.delete_asset(aid)}


# ----- books (Curio Press) -----
@v1.post("/books", response_model=Book)
def make_book(req: BookRequest, user: dict = Depends(get_current_user)) -> Book:
    return modes.make_book(req)


@v1.get("/books/{book_id}", response_model=Book)
def read_book(book_id: str, user: dict = Depends(get_current_user)) -> Book:
    book = modes.get_book(book_id)
    if book is None:
        raise HTTPException(404, "Book not found")
    return book


# ----- auth -----
@v1.post("/auth/signup", response_model=AuthReply)
def signup(req: SignupRequest) -> AuthReply:
    email = req.email.strip().lower()
    if "@" not in email or len(req.password) < 8:
        raise HTTPException(400, "Valid email and a password of 8+ characters required")
    if get_user_by_email(email):
        raise HTTPException(409, "An account with that email already exists")
    user = {"id": f"user_{uuid.uuid4().hex[:12]}", "email": email,
            "password_hash": auth.hash_password(req.password),
            "created_at": _now()}
    save_user(user)
    return AuthReply(token=auth.create_token(user["id"], email),
                     user=UserPublic(id=user["id"], email=email, created_at=user["created_at"]))


@v1.post("/auth/login", response_model=AuthReply)
def login(req: LoginRequest) -> AuthReply:
    email = req.email.strip().lower()
    user = get_user_by_email(email)
    if not user or not auth.verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Incorrect email or password")
    return AuthReply(token=auth.create_token(user["id"], email),
                     user=UserPublic(id=user["id"], email=email, created_at=user["created_at"]))


@v1.post("/auth/reset-request")
def reset_request(req: ResetRequest) -> dict:
    """Password reset. Always responds the same way (never reveals whether an
    email exists). Real delivery needs SMTP - wired as the next step; for now
    this acknowledges the request so the flow exists end to end."""
    return {"message": "If an account exists for that email, we'll send reset instructions."}


@v1.get("/auth/me", response_model=UserPublic)
def me(claims: dict = Depends(get_current_user)) -> UserPublic:
    if claims.get("anonymous"):
        raise HTTPException(401, "Not signed in")
    user = get_user_by_id(claims.get("sub", ""))
    if not user:
        raise HTTPException(404, "User not found")
    return UserPublic(id=user["id"], email=user["email"], created_at=user["created_at"])




GROWTH_KINDS = {"needs": "growth_needs", "reviews": "growth_reviews", "evaluations": "growth_evaluations", "portraits": "brain_portraits"}


def _uid(user: dict) -> str:
    # Real user id when signed in; a shared "anonymous" bucket otherwise.
    # Never blocks — auth-on still isolates real families by their token sub.
    return user.get("sub") or "anonymous"


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if (user.get("email") or "").lower() not in settings.admin_emails:
        raise HTTPException(403, "Admins only")
    return user


@v1.get("/growth/{kind}")
def growth_list(kind: str, child_id: str | None = None, user: dict = Depends(get_current_user)) -> list[dict]:
    coll = GROWTH_KINDS.get(kind)
    if not coll:
        raise HTTPException(404, "unknown growth kind")
    flt = {"user_id": _uid(user)}
    if child_id:
        flt["child_id"] = child_id
    return coll_list(coll, flt)


@v1.post("/growth/{kind}")
def growth_put(kind: str, body: dict, user: dict = Depends(get_current_user)) -> dict:
    coll = GROWTH_KINDS.get(kind)
    if not coll:
        raise HTTPException(404, "unknown growth kind")
    uid = _uid(user)
    doc = dict(body or {})
    if not doc.get("child_id"):
        raise HTTPException(400, "child_id is required")
    doc["user_id"] = uid
    doc.setdefault("id", f"g_{uuid.uuid4().hex[:12]}")
    doc.setdefault("created_at", _now())
    doc["updated_at"] = _now()
    coll_put(coll, doc)
    return doc


@v1.delete("/growth/{kind}/{item_id}")
def growth_delete(kind: str, item_id: str, user: dict = Depends(get_current_user)) -> dict:
    coll = GROWTH_KINDS.get(kind)
    if not coll:
        raise HTTPException(404, "unknown growth kind")
    return {"deleted": coll_delete(coll, {"user_id": _uid(user), "id": item_id})}


@v1.post("/feedback")
def feedback_submit(body: dict, user: dict = Depends(get_current_user)) -> dict:
    uid = _uid(user)
    b = body or {}
    kind = b.get("kind")
    if kind not in ("feedback", "feature"):
        raise HTTPException(400, "kind must be 'feedback' or 'feature'")
    msg = (b.get("message") or "").strip()
    if len(msg) < 2:
        raise HTTPException(400, "message is required")
    doc = {
        "id": f"fb_{uuid.uuid4().hex[:12]}", "user_id": uid,
        "email": (b.get("email") or user.get("email") or "").lower(),
        "kind": kind, "message": msg[:4000],
        "status": "new" if kind == "feature" else "received",
        "admin_note": "", "notified": False, "created_at": _now(), "updated_at": _now(),
    }
    coll_put("feedback", doc)
    if kind == "feedback":
        try:
            modes.brain_feed(msg, "Parent feedback", None, "feedback")
        except Exception:
            pass
    return {"ok": True, "id": doc["id"]}


@v1.get("/feedback/mine")
def feedback_mine(user: dict = Depends(get_current_user)) -> list[dict]:
    return coll_list("feedback", {"user_id": _uid(user), "kind": "feature"})


@v1.get("/admin/feedback")
def admin_feedback(user: dict = Depends(require_admin)) -> list[dict]:
    return coll_list("feedback", {})


@v1.patch("/admin/feedback/{fid}")
def admin_feedback_update(fid: str, body: dict, user: dict = Depends(require_admin)) -> dict:
    doc = coll_get("feedback", {"id": fid})
    if not doc:
        raise HTTPException(404, "not found")
    for k in ("status", "admin_note", "notified"):
        if k in (body or {}):
            doc[k] = body[k]
    doc["updated_at"] = _now()
    coll_put("feedback", doc)
    return doc


@v1.get("/admin/release")
def admin_release(user: dict = Depends(require_admin)) -> list[dict]:
    return coll_list("release_items", {})


@v1.post("/admin/release")
def admin_release_put(body: dict, user: dict = Depends(require_admin)) -> dict:
    doc = dict(body or {})
    doc.setdefault("id", f"rel_{uuid.uuid4().hex[:12]}")
    doc.setdefault("created_at", _now())
    doc["updated_at"] = _now()
    coll_put("release_items", doc)
    return doc


@v1.delete("/admin/release/{rid}")
def admin_release_delete(rid: str, user: dict = Depends(require_admin)) -> dict:
    return {"deleted": coll_delete("release_items", {"id": rid})}


_PURGEABLE = set(GROWTH_KINDS.values()) | {"feedback", "release_items"}


@v1.get("/admin/data/stats")
def admin_data_stats(user: dict = Depends(require_admin)) -> dict:
    return {c: len(coll_list(c, {})) for c in sorted(_PURGEABLE)}


@v1.post("/admin/data/purge")
def admin_data_purge(body: dict, user: dict = Depends(require_admin)) -> dict:
    b = body or {}
    coll = b.get("collection")
    if coll not in _PURGEABLE:
        raise HTTPException(400, "unknown collection")
    flt: dict = {}
    if b.get("status"):
        flt["status"] = b["status"]
    before = None
    days = b.get("older_than_days")
    if days:
        before = (_dt.datetime.now(_dt.timezone.utc) - _dt.timedelta(days=int(days))).isoformat()
    return {"collection": coll, "purged": coll_purge(coll, flt, before)}


BENCH_FREQS = {"off", "weekly", "monthly", "quarterly"}


@v1.get("/benchmarks")
def benchmarks_list(scope: str | None = None, country: str | None = None, age_group: str | None = None, user: dict = Depends(get_current_user)) -> list[dict]:
    flt: dict = {"status": "approved"}
    if scope:
        flt["scope"] = scope
    if country:
        flt["country"] = country
    if age_group:
        flt["age_group"] = age_group
    return coll_list("benchmarks", flt)


@v1.get("/admin/benchmarks")
def admin_benchmarks(user: dict = Depends(require_admin)) -> list[dict]:
    return coll_list("benchmarks", {})


@v1.post("/admin/benchmarks")
def admin_bench_put(body: dict, user: dict = Depends(require_admin)) -> dict:
    doc = dict(body or {})
    if not all(doc.get(k) for k in ("scope", "age_group", "theme")):
        raise HTTPException(400, "scope, age_group and theme are required")
    doc.setdefault("id", f"bm_{uuid.uuid4().hex[:12]}")
    doc.setdefault("status", "approved")
    doc.setdefault("source", "admin")
    doc.setdefault("created_at", _now())
    doc["updated_at"] = _now()
    try:
        doc["value"] = max(0, min(100, int(doc.get("value", 50))))
    except Exception:
        doc["value"] = 50
    if doc.get("scope") == "world":
        doc["country"] = ""
    coll_put("benchmarks", doc)
    return doc


@v1.patch("/admin/benchmarks/{bid}")
def admin_bench_patch(bid: str, body: dict, user: dict = Depends(require_admin)) -> dict:
    doc = coll_get("benchmarks", {"id": bid})
    if not doc:
        raise HTTPException(404, "not found")
    for k in ("value", "status", "theme", "age_group", "country", "scope"):
        if k in (body or {}):
            doc[k] = body[k]
    doc["updated_at"] = _now()
    coll_put("benchmarks", doc)
    return doc


@v1.delete("/admin/benchmarks/{bid}")
def admin_bench_del(bid: str, user: dict = Depends(require_admin)) -> dict:
    return {"deleted": coll_delete("benchmarks", {"id": bid})}


@v1.post("/admin/benchmarks/suggest")
def admin_bench_suggest(body: dict, user: dict = Depends(require_admin)) -> list[dict]:
    b = body or {}
    scope = b.get("scope", "world")
    country = b.get("country", "") if scope == "country" else ""
    age = b.get("age_group", "6-8")
    themes = b.get("themes") or []
    if not themes:
        raise HTTPException(400, "themes are required")
    where = f"in {country}" if country else "worldwide"
    prompt = (
        f"You are an expert in child development. For children aged {age} {where}, give a TYPICAL target "
        f"proficiency level from 0-100 (100 = fully age-appropriate mastery) for each theme below. These are "
        f"typical-for-age expectations, NOT population percentiles. Themes: {', '.join(str(t) for t in themes)}. "
        f'Return ONLY JSON: {{"values": [{{"theme": string, "value": number}}]}}'
    )
    reply = assistant.ask(prompt, "develop")
    out: list[dict] = []
    try:
        a, z = reply.find("{"), reply.rfind("}")
        data = json.loads(reply[a:z + 1]) if a >= 0 and z > a else {"values": []}
        for it in data.get("values", []):
            th = str(it.get("theme", "")).strip()
            if not th:
                continue
            try:
                val = max(0, min(100, int(it.get("value", 50))))
            except Exception:
                val = 50
            doc = {"id": f"bm_{uuid.uuid4().hex[:12]}", "scope": scope, "country": country, "age_group": age,
                   "theme": th, "value": val, "status": "suggested", "source": "ai",
                   "created_at": _now(), "updated_at": _now()}
            coll_put("benchmarks", doc)
            out.append(doc)
    except Exception:
        pass
    return out


@v1.get("/admin/benchmarks/config")
def admin_bench_config_get(user: dict = Depends(require_admin)) -> dict:
    return coll_get("bench_config", {"id": "config"}) or {"id": "config", "frequency": "monthly"}


@v1.post("/admin/benchmarks/config")
def admin_bench_config_set(body: dict, user: dict = Depends(require_admin)) -> dict:
    freq = (body or {}).get("frequency", "monthly")
    if freq not in BENCH_FREQS:
        raise HTTPException(400, "invalid frequency")
    doc = {"id": "config", "frequency": freq, "updated_at": _now()}
    coll_put("bench_config", doc)
    return doc


@v1.post("/ask-vision")
def ask_vision_ep(body: dict, user: dict = Depends(get_current_user)) -> dict:
    img = (body or {}).get("image") or ""
    media = (body or {}).get("media_type") or "image/jpeg"
    if img.startswith("data:") and "," in img:
        head, img = img.split(",", 1)
        m = re.match(r"data:([^;]+)", head)
        if m:
            media = m.group(1)
    if not img:
        raise HTTPException(400, "image is required")
    return {"reply": assistant.ask_vision((body or {}).get("message") or "", img, media, (body or {}).get("mode"))}


@v1.post("/fetch-url")
def fetch_url_ep(body: dict, user: dict = Depends(get_current_user)) -> dict:
    url = ((body or {}).get("url") or "").strip()
    if not re.match(r"^https?://", url):
        raise HTTPException(400, "a valid http(s) URL is required")
    try:
        r = httpx.get(url, timeout=20, follow_redirects=True, headers={"User-Agent": "Mozilla/5.0 (CurioBot)"})
        html = r.text[:200000]
    except Exception:
        raise HTTPException(400, "couldn't fetch that URL")
    text = re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>", " ", html)
    text = re.sub(r"(?s)<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return {"text": text[:6000]}


app.mount("/v1", v1)

# Serve the built frontend from the SAME process, so the whole product is one
# server on one address: no separate web server, no CORS, no second domain.
# (Hash routing means the browser only ever requests "/" + /assets, so static
# serving with html=True is all that's needed.)
import os as _os  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402

_spa_dir = _os.getenv("CURIO_SPA_DIR") or _os.path.join(
    _os.path.dirname(_os.path.dirname(__file__)), "..", "frontend", "dist"
)
if _os.path.isdir(_spa_dir):
    app.mount("/", StaticFiles(directory=_spa_dir, html=True), name="spa")
    print(f"[curio] serving SPA from {_spa_dir}")
else:
    print(f"[curio] SPA not built yet ({_spa_dir}); API only. Run: npm run build in frontend/")
