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


# ----- transcription (OpenAI Whisper) -----
# Voice dictation and audio-file transcription for the Journal (and, later,
# anywhere else that wants speech-to-text). Requires OPENAI_API_KEY. The
# frontend records via MediaRecorder and posts the blob here — see
# frontend/src/lib/dictation.ts for the client side.
_TRANSCRIBE_MAX_BYTES = 25 * 1024 * 1024  # OpenAI Whisper hard limit


@v1.post("/transcribe")
async def transcribe(file: UploadFile = File(...),
                     user: dict = Depends(get_current_user)) -> dict:
    from .transcribe import openai_transcribe  # local import: avoids startup cost if unused
    from . import errorlog
    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(400, "Please attach an audio recording.")
    audio = await file.read()
    if len(audio) == 0:
        raise HTTPException(400, "No audio was captured.")
    if len(audio) > _TRANSCRIBE_MAX_BYTES:
        raise HTTPException(413, "Recording is too long. Try a shorter clip.")
    try:
        text = await openai_transcribe(audio, file.filename or "audio.webm", file.content_type)
        return {"text": text}
    except HTTPException as e:
        # Log the full server-side detail (redacted), but return a generic
        # user-facing message so upstream errors like OpenAI's "Incorrect API
        # key sk-..." never surface to end users.
        upstream = str(e.detail) if e.detail else ""
        errorlog.log_error(
            endpoint="/v1/transcribe",
            status=e.status_code,
            kind="upstream_openai" if e.status_code in (401, 402, 403, 429, 502) else "transcribe",
            message=_public_transcribe_message(e.status_code),
            upstream=upstream,
            user_id=str(user.get("id") or user.get("email") or ""),
        )
        # Rewrite the exception detail to the generic message before it goes back.
        raise HTTPException(status_code=e.status_code, detail=_public_transcribe_message(e.status_code))
    except Exception as e:
        errorlog.log_error(
            endpoint="/v1/transcribe",
            status=500,
            kind="transcribe_internal",
            message="Internal error while transcribing.",
            upstream=f"{type(e).__name__}: {e}",
            user_id=str(user.get("id") or user.get("email") or ""),
        )
        raise HTTPException(500, "We couldn't finish transcribing that. Try again in a moment.")


def _public_transcribe_message(status: int) -> str:
    """Turn any upstream failure into copy that never mentions keys, providers,
    URLs, models, or account IDs. Used as the response detail returned to the
    browser; the full upstream text is separately captured in admin_errors."""
    if status in (401, 402, 403):
        return "Voice transcription isn't set up correctly on this server. Ask the admin to check the configuration."
    if status == 413:
        return "That recording is too long. Try a shorter clip."
    if status == 429:
        return "The transcription service is temporarily rate-limited. Try again in a minute."
    if status == 504:
        return "Transcription took too long to respond. Try a shorter clip."
    if status >= 500:
        return "The transcription service is unavailable right now. Try again shortly."
    return "We couldn't transcribe that. Try again."


# ----- URL fetch pipeline -----
# Fetch a URL server-side and return extracted text. Used by Curate chat so
# the URL input actually pulls page content into the AI context rather than
# just noting the link. See urlfetch.py for SSRF protections.
@v1.post("/url-fetch")
async def url_fetch(body: dict, user: dict = Depends(get_current_user)) -> dict:
    from .urlfetch import fetch_url
    from . import errorlog
    url = str(body.get("url") or "").strip()
    if not url:
        raise HTTPException(400, "No URL provided.")
    try:
        result = await fetch_url(url)
        return result
    except HTTPException as e:
        # Log full detail (redacted) server-side; return a sanitized message.
        errorlog.log_error(
            endpoint="/v1/url-fetch",
            status=e.status_code,
            kind="urlfetch_upstream" if e.status_code in (502, 504) else "urlfetch",
            message=_public_urlfetch_message(e.status_code),
            upstream=str(e.detail) if e.detail else "",
            user_id=str(user.get("id") or user.get("email") or ""),
            extra={"url_host": _url_host_for_log(url)},
        )
        raise HTTPException(status_code=e.status_code, detail=_public_urlfetch_message(e.status_code))
    except Exception as e:
        errorlog.log_error(
            endpoint="/v1/url-fetch",
            status=500,
            kind="urlfetch_internal",
            message="Internal error while fetching URL.",
            upstream=f"{type(e).__name__}: {e}",
            user_id=str(user.get("id") or user.get("email") or ""),
            extra={"url_host": _url_host_for_log(url)},
        )
        raise HTTPException(500, "Couldn't read that URL. Try another one.")


def _public_urlfetch_message(status: int) -> str:
    """Sanitized user-facing copy for URL-fetch errors."""
    if status == 400:
        return "That URL doesn't look right. Check it's a full https:// address."
    if status == 403:
        return "That page requires sign-in — we can't read pages behind a login."
    if status == 404:
        return "That page wasn't found."
    if status == 413:
        return "That page is too large to read (2 MB limit)."
    if status == 415:
        return "We can only read HTML or plain-text pages. For a PDF or document, use the attach button instead."
    if status == 422:
        return "Couldn't find readable text on that page. It may need JavaScript to load, or the content sits behind a paywall."
    if status == 504:
        return "That page took too long to load. Try again or a lighter page."
    if status >= 500:
        return "Couldn't reach that URL right now. Try again in a moment."
    return "Couldn't read that URL."


def _url_host_for_log(url: str) -> str:
    """Extract only the hostname for the admin log — avoids logging query
    strings, paths (which can contain tokens), or credentials."""
    try:
        from urllib.parse import urlparse
        return urlparse(url).hostname or ""
    except Exception:
        return ""


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


# ----- admin: technical errors -----
# (Defined here rather than up next to /transcribe so require_admin is already
# in scope by the time these decorators evaluate.)
@v1.get("/admin/errors")
def admin_errors_list(limit: int = 200, user: dict = Depends(require_admin)) -> dict:
    from . import errorlog
    _ = user  # touched by Depends, unused here
    return {"errors": errorlog.list_errors(limit=max(1, min(500, int(limit))))}


@v1.post("/admin/errors/purge")
def admin_errors_purge(older_than_days: int = 2, user: dict = Depends(require_admin)) -> dict:
    from . import errorlog
    _ = user
    n = errorlog.purge_old(retain_days=max(0, int(older_than_days)))
    return {"deleted": n}


@v1.delete("/admin/errors")
def admin_errors_clear(user: dict = Depends(require_admin)) -> dict:
    from . import errorlog
    _ = user
    return {"deleted": errorlog.purge_all()}


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


KNOWLEDGE_SEED = [
    {"title": "Nurturing Early Learners (Singapore)", "tradition": "Singapore / MOE",
     "summary": "Singapore's national early-years framework balances academic readiness with holistic social, emotional and physical development. It centres the joy of learning, purposeful play, values and social-emotional competencies, and a strong teacher-family partnership, viewing children as curious, active and competent learners.",
     "source": "Singapore Ministry of Education / ECDA", "tags": ["holistic", "purposeful play", "social-emotional", "family partnership"]},
    {"title": "Finnish / Nordic educare", "tradition": "Nordic / Finland",
     "summary": "Play is treated as serious learning, with a strong emphasis on child agency, outdoor and nature-based exploration, and the whole child over academic pressure. Young children are not graded or tested; instead teachers observe, keep portfolios and reflect on each child's progress over time.",
     "source": "Finnish National Core Curriculum; Nordic social pedagogy", "tags": ["play-based", "outdoor learning", "child agency", "observation over grading"]},
    {"title": "Reggio Emilia approach", "tradition": "Italy",
     "summary": "Built on the image of the child as competent, curious and capable, the hundred languages (the many ways children express understanding), and the environment as the third teacher. Documentation makes each child's growth and learning visible to the child, educators and parents.",
     "source": "Reggio Emilia (Loris Malaguzzi)", "tags": ["image of the child", "documentation", "project-based", "environment"]},
    {"title": "Montessori method", "tradition": "Italy / global",
     "summary": "Self-paced mastery in a carefully prepared environment, practical-life skills that build independence, and materials sequenced from concrete to abstract with control of error so children can self-correct. Respect for the child as an individual is central.",
     "source": "Maria Montessori", "tags": ["self-paced", "prepared environment", "independence", "self-correction"]},
    {"title": "Executive function & serve-and-return", "tradition": "Developmental science",
     "summary": "Executive-function and self-regulation skills (working memory, attention, inhibitory control) are not innate but are built through practice and responsive serve-and-return interaction. Early self-regulation underpins later planning, problem-solving and school success.",
     "source": "Harvard Center on the Developing Child", "tags": ["executive function", "self-regulation", "serve and return", "attention"]},
]


def _seed_knowledge():
    if not coll_list("knowledge", {}):
        for e in KNOWLEDGE_SEED:
            d = dict(e)
            d.update({"id": f"kb_{uuid.uuid4().hex[:12]}", "status": "approved", "source_type": "seed",
                      "created_at": _now(), "updated_at": _now()})
            coll_put("knowledge", d)


@v1.get("/cogbench")
def cogbench_list(user: dict = Depends(get_current_user)) -> list[dict]:
    return coll_list("cogbench", {"status": "approved"})


@v1.get("/admin/cogbench")
def admin_cogbench(user: dict = Depends(require_admin)) -> list[dict]:
    return coll_list("cogbench", {})


@v1.post("/admin/cogbench")
def admin_cogbench_put(body: dict, user: dict = Depends(require_admin)) -> dict:
    doc = dict(body or {})
    if not doc.get("fn_id") or doc.get("value") is None:
        raise HTTPException(400, "fn_id and value are required")
    doc.setdefault("id", f"cb_{uuid.uuid4().hex[:12]}")
    doc.setdefault("age_group", "")
    doc.setdefault("status", "approved")
    doc.setdefault("created_at", _now())
    doc["updated_at"] = _now()
    coll_put("cogbench", doc)
    return doc


@v1.patch("/admin/cogbench/{cid}")
def admin_cogbench_patch(cid: str, body: dict, user: dict = Depends(require_admin)) -> dict:
    doc = coll_get("cogbench", {"id": cid})
    if not doc:
        raise HTTPException(404, "not found")
    for k in ("fn_id", "age_group", "value", "status", "note"):
        if k in (body or {}):
            doc[k] = body[k]
    doc["updated_at"] = _now()
    coll_put("cogbench", doc)
    return doc


@v1.delete("/admin/cogbench/{cid}")
def admin_cogbench_del(cid: str, user: dict = Depends(require_admin)) -> dict:
    return {"deleted": coll_delete("cogbench", {"id": cid})}


@v1.post("/admin/cogbench/suggest")
def admin_cogbench_suggest(body: dict, user: dict = Depends(require_admin)) -> dict:
    age = (body or {}).get("age_group") or ""
    fns = (body or {}).get("functions") or []
    if not age or not fns:
        raise HTTPException(400, "age_group and functions are required")
    prompt = (
        f"For a typical child aged {age}, estimate a TYPICAL-FOR-AGE reference level (0-100) for each of these "
        f"Feuerstein cognitive functions. These are developmental reference points for parents, NOT measured percentiles "
        f"and NOT a ranking of any individual child. Be conservative and developmentally realistic.\n"
        f"Functions: {json.dumps(fns)}\n"
        f'Return ONLY JSON: {{"values": {{"<fn_id>": <0-100>, ...}}}}'
    )
    reply = assistant.ask(prompt, "develop")
    try:
        a, z = reply.find("{"), reply.rfind("}")
        data = json.loads(reply[a:z + 1]) if a >= 0 and z > a else {}
    except Exception:
        raise HTTPException(502, "could not draft benchmarks")
    made = []
    for fid, val in (data.get("values") or {}).items():
        try:
            v = max(0, min(100, int(val)))
        except Exception:
            continue
        doc = {"id": f"cb_{uuid.uuid4().hex[:12]}", "fn_id": fid, "age_group": age, "value": v,
               "status": "suggested", "created_at": _now(), "updated_at": _now()}
        coll_put("cogbench", doc)
        made.append(doc)
    return {"created": len(made), "items": made}


def _fetch_url_text(url: str, limit: int = 6000) -> str:
    if not re.match(r"^https?://", url or ""):
        raise HTTPException(400, "a valid http(s) URL is required")
    try:
        r = httpx.get(url, timeout=20, follow_redirects=True, headers={"User-Agent": "Mozilla/5.0 (CurioBot)"})
        html = r.text[:200000]
    except Exception:
        raise HTTPException(400, "couldn't fetch that URL")
    text = re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>", " ", html)
    text = re.sub(r"(?s)<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:limit]


@v1.post("/knowledge/feed")
def knowledge_feed(body: dict, user: dict = Depends(get_current_user)) -> dict:
    """Feed the shared Brain for real: general/family learning goes into the DURABLE
    knowledge base as a suggested entry (pending admin approval), so it can genuinely
    inform guidance for every family. Content is summarised in ORIGINAL words."""
    b = body or {}
    content = (b.get("text") or "").strip()
    url = (b.get("url") or "").strip()
    source_name = (b.get("source_name") or "").strip()
    if not content and not url:
        raise HTTPException(400, "text or url is required")
    if url and not content:
        try:
            content = _fetch_url_text(url)
        except Exception:
            raise HTTPException(502, "could not read that link")
    content = content[:14000]
    prompt = (
        "The following material was contributed to a child-development knowledge base that informs parenting "
        "guidance for every family. Write an ORIGINAL summary in your own words - do NOT quote or reproduce the "
        "source text. If the material is not about child learning or development, say so in the summary.\n"
        f"Material:\n{content}\n"
        'Return ONLY JSON: {"title": string, "tradition": string, "summary": string, "tags": [string]}. '
        "summary is 2-3 sentences; tradition is the approach/theory it belongs to (e.g. Metacognition, "
        "Cognitive science) or the empty string; tags are 2-5 short lowercase keywords."
    )
    reply = assistant.ask(prompt, "develop")
    try:
        a, z = reply.find("{"), reply.rfind("}")
        data = json.loads(reply[a:z + 1]) if a >= 0 and z > a else {}
    except Exception:
        raise HTTPException(502, "could not summarise that material")
    doc = {"id": f"kb_{uuid.uuid4().hex[:12]}",
           "title": data.get("title") or source_name or "Contributed material",
           "tradition": data.get("tradition", ""),
           "summary": data.get("summary", ""),
           "source": source_name or url or "Contributed by a parent",
           "tags": data.get("tags", []) or [],
           "status": "suggested", "source_type": "feed",
           "created_at": _now(), "updated_at": _now()}
    coll_put("knowledge", doc)
    return doc


@v1.get("/knowledge")
def knowledge_list(user: dict = Depends(get_current_user)) -> list[dict]:
    _seed_knowledge()
    return coll_list("knowledge", {"status": "approved"})


@v1.get("/admin/knowledge")
def admin_knowledge(user: dict = Depends(require_admin)) -> list[dict]:
    _seed_knowledge()
    return coll_list("knowledge", {})


@v1.post("/admin/knowledge")
def admin_knowledge_put(body: dict, user: dict = Depends(require_admin)) -> dict:
    doc = dict(body or {})
    if not doc.get("title") or not doc.get("summary"):
        raise HTTPException(400, "title and summary are required")
    doc.setdefault("id", f"kb_{uuid.uuid4().hex[:12]}")
    doc.setdefault("status", "approved")
    doc.setdefault("source_type", "admin")
    doc.setdefault("tags", [])
    doc.setdefault("created_at", _now())
    doc["updated_at"] = _now()
    coll_put("knowledge", doc)
    return doc


@v1.patch("/admin/knowledge/{kid}")
def admin_knowledge_patch(kid: str, body: dict, user: dict = Depends(require_admin)) -> dict:
    doc = coll_get("knowledge", {"id": kid})
    if not doc:
        raise HTTPException(404, "not found")
    for k in ("title", "summary", "tradition", "source", "status", "tags"):
        if k in (body or {}):
            doc[k] = body[k]
    doc["updated_at"] = _now()
    coll_put("knowledge", doc)
    return doc


@v1.delete("/admin/knowledge/{kid}")
def admin_knowledge_del(kid: str, user: dict = Depends(require_admin)) -> dict:
    return {"deleted": coll_delete("knowledge", {"id": kid})}


@v1.post("/admin/knowledge/suggest")
def admin_knowledge_suggest(body: dict, user: dict = Depends(require_admin)) -> dict:
    topic = ((body or {}).get("topic") or "").strip()
    if not topic:
        raise HTTPException(400, "topic is required")
    prompt = (
        f"Summarise the child-development approach or tradition '{topic}' for a curated knowledge base that informs "
        f"parenting guidance. Write an ORIGINAL 2-3 sentence summary in your own words; do NOT quote copyrighted text. "
        f'Return ONLY JSON: {{"title": string, "tradition": string, "summary": string, "tags": [string]}}'
    )
    reply = assistant.ask(prompt, "develop")
    try:
        a, z = reply.find("{"), reply.rfind("}")
        data = json.loads(reply[a:z + 1]) if a >= 0 and z > a else {}
    except Exception:
        raise HTTPException(502, "could not draft a summary")
    doc = {"id": f"kb_{uuid.uuid4().hex[:12]}", "title": data.get("title") or topic, "tradition": data.get("tradition", ""),
           "summary": data.get("summary", ""), "source": "AI-drafted (pending review)", "tags": data.get("tags", []) or [],
           "status": "suggested", "source_type": "ai", "created_at": _now(), "updated_at": _now()}
    coll_put("knowledge", doc)
    return doc


@v1.get("/admin/knowledge/config")
def admin_knowledge_config_get(user: dict = Depends(require_admin)) -> dict:
    return coll_get("knowledge_config", {"id": "config"}) or {"id": "config", "frequency": "monthly"}


@v1.post("/admin/knowledge/config")
def admin_knowledge_config_set(body: dict, user: dict = Depends(require_admin)) -> dict:
    freq = (body or {}).get("frequency", "monthly")
    if freq not in BENCH_FREQS:
        raise HTTPException(400, "invalid frequency")
    doc = {"id": "config", "frequency": freq, "updated_at": _now()}
    coll_put("knowledge_config", doc)
    return doc


JOURNAL_SCOPES = {"child", "family", "general"}


@v1.get("/journal")
def journal_list(scope: str | None = None, child_id: str | None = None, user: dict = Depends(get_current_user)) -> list[dict]:
    flt: dict = {"user_id": _uid(user)}
    if scope:
        flt["scope"] = scope
    if child_id:
        flt["child_id"] = child_id
    return coll_list("journal", flt)


@v1.post("/journal")
def journal_put(body: dict, user: dict = Depends(get_current_user)) -> dict:
    uid = _uid(user)
    b = body or {}
    text = (b.get("text") or "").strip()
    if not text:
        raise HTTPException(400, "text is required")
    scope = b.get("scope") or "family"
    if scope not in JOURNAL_SCOPES:
        raise HTTPException(400, "invalid scope")
    if scope == "child" and not b.get("child_id"):
        raise HTTPException(400, "child_id is required for child entries")
    entry_date = (b.get("entry_date") or "")[:10] or _now()[:10]
    doc = {"id": f"jr_{uuid.uuid4().hex[:12]}", "user_id": uid, "scope": scope,
           "child_id": b.get("child_id") if scope == "child" else "",
           "text": text[:4000], "mood": (b.get("mood") or "")[:24],
           "entry_date": entry_date, "planned_for": (b.get("planned_for") or "")[:10],
           "created_at": _now(), "updated_at": _now()}
    coll_put("journal", doc)
    return doc


@v1.patch("/journal/{jid}")
def journal_patch(jid: str, body: dict, user: dict = Depends(get_current_user)) -> dict:
    doc = coll_get("journal", {"user_id": _uid(user), "id": jid})
    if not doc:
        raise HTTPException(404, "not found")
    for k in ("text", "mood", "entry_date", "planned_for"):
        if k in (body or {}):
            doc[k] = body[k]
    doc["updated_at"] = _now()
    coll_put("journal", doc)
    return doc


@v1.delete("/journal/{jid}")
def journal_del(jid: str, user: dict = Depends(get_current_user)) -> dict:
    return {"deleted": coll_delete("journal", {"user_id": _uid(user), "id": jid})}


@v1.post("/journal/patterns")
def journal_patterns(body: dict, user: dict = Depends(get_current_user)) -> dict:
    uid = _uid(user)
    b = body or {}
    flt: dict = {"user_id": uid}
    if b.get("scope"):
        flt["scope"] = b["scope"]
    if b.get("child_id"):
        flt["child_id"] = b["child_id"]
    entries = sorted(coll_list("journal", flt), key=lambda e: e.get("created_at", ""))
    if len(entries) < 2:
        return {"summary": "Add a couple more entries and patterns will appear here.", "themes": [], "watch": []}
    who = b.get("who") or "the child/family"
    joined = "\n".join(f"- {(e.get('created_at') or '')[:10]}: {e.get('text', '')}" for e in entries[-40:])
    prompt = (
        f"You are analysing a parent's journal entries about {who} over time. Identify honest, specific patterns and "
        f"how things are trending. Base everything ONLY on the entries; if the picture is thin, say so plainly.\n"
        f"Entries (oldest first):\n{joined}\n"
        f'Return ONLY JSON: {{"summary": string, "themes": [{{"theme": string, "trend": string}}], "watch": [string]}}. '
        f"summary is 2-3 warm, plain sentences; themes are 3-6 recurring topics with a short trend note; watch is 0-3 gentle flags."
    )
    reply = assistant.ask(prompt, "develop")
    try:
        a, z = reply.find("{"), reply.rfind("}")
        data = json.loads(reply[a:z + 1]) if a >= 0 and z > a else {}
    except Exception:
        return {"summary": "Could not read the patterns just now — try again.", "themes": [], "watch": []}
    return {"summary": data.get("summary", ""), "themes": data.get("themes", []) or [], "watch": data.get("watch", []) or [], "count": len(entries)}


PLANNER_KINDS = {"family", "interactive"}


@v1.get("/planner/{kind}")
def planner_get(kind: str, user: dict = Depends(get_current_user)) -> dict:
    if kind not in PLANNER_KINDS:
        raise HTTPException(404, "unknown planner")
    doc = coll_get("planner", {"user_id": _uid(user), "kind": kind})
    return {"kind": kind, "store": (doc or {}).get("store") or {}, "updated_at": (doc or {}).get("updated_at", "")}


@v1.post("/planner/{kind}")
def planner_put(kind: str, body: dict, user: dict = Depends(get_current_user)) -> dict:
    if kind not in PLANNER_KINDS:
        raise HTTPException(404, "unknown planner")
    store = (body or {}).get("store")
    if not isinstance(store, dict):
        raise HTTPException(400, "store must be an object")
    uid = _uid(user)
    doc = coll_get("planner", {"user_id": uid, "kind": kind}) or {"id": f"pl_{uuid.uuid4().hex[:12]}", "user_id": uid, "kind": kind, "created_at": _now()}
    doc["store"] = store
    doc["updated_at"] = _now()
    coll_put("planner", doc)
    return {"ok": True, "updated_at": doc["updated_at"]}


@v1.post("/journal/summary")
def journal_summary(body: dict, user: dict = Depends(get_current_user)) -> dict:
    """Synthesise what the journal has taught us over a period. Honest: derived only
    from real entries; if there is too little, say so rather than invent."""
    uid = _uid(user)
    b = body or {}
    since = (b.get("since") or "")[:10]
    entries = coll_list("journal", {"user_id": uid})
    if since:
        entries = [e for e in entries if (e.get("entry_date") or e.get("created_at", "")[:10]) >= since]
    entries.sort(key=lambda e: e.get("entry_date") or e.get("created_at", ""))
    if len(entries) < 3:
        return {"enough": False, "child": "", "parent": "", "family": "", "count": len(entries)}
    lines = []
    for e in entries[-80:]:
        who = "child" if e.get("scope") == "child" else e.get("scope", "family")
        lines.append(f"- [{e.get('entry_date') or e.get('created_at','')[:10]}] ({who}) {e.get('text','')}")
    joined = "\n".join(lines)
    prompt = (
        "These are a parent's journal entries over a period. Say honestly what has been LEARNT and where things "
        "have IMPROVED (or not). Base everything ONLY on the entries. Write plainly and warmly, 2-3 sentences per "
        "area. If an area has too little to say, say so rather than inventing.\n"
        f"Entries (oldest first):\n{joined}\n"
        'Return ONLY JSON: {"child": string, "parent": string, "family": string}. '
        "child = what we have learnt about the children and how they have improved. "
        "parent = what the parent has learnt about themselves and their approach. "
        "family = what has been learnt about the family as a whole."
    )
    reply = assistant.ask(prompt, "develop")
    try:
        a, z = reply.find("{"), reply.rfind("}")
        data = json.loads(reply[a:z + 1]) if a >= 0 and z > a else {}
    except Exception:
        return {"enough": False, "child": "", "parent": "", "family": "", "count": len(entries)}
    return {"enough": True, "count": len(entries),
            "child": data.get("child", ""), "parent": data.get("parent", ""), "family": data.get("family", "")}


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
    return {"text": _fetch_url_text(url)}


app.mount("/v1", v1)

# Serve the built frontend from the SAME process, so the whole product is one
# server on one address: no separate web server, no CORS, no second domain.
# (Hash routing means the browser only ever requests "/" + /assets, so static
# serving with html=True is all that's needed.)
import os as _os  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402


@app.middleware("http")
async def _spa_cache_headers(request, call_next):
    resp = await call_next(request)
    path = request.url.path
    if path == "/" or path.endswith("/index.html"):
        resp.headers["Cache-Control"] = "no-cache, must-revalidate"
    elif "/assets/" in path:
        resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    return resp


_spa_dir = _os.getenv("CURIO_SPA_DIR") or _os.path.join(
    _os.path.dirname(_os.path.dirname(__file__)), "..", "frontend", "dist"
)
if _os.path.isdir(_spa_dir):
    app.mount("/", StaticFiles(directory=_spa_dir, html=True), name="spa")
    print(f"[curio] serving SPA from {_spa_dir}")
else:
    print(f"[curio] SPA not built yet ({_spa_dir}); API only. Run: npm run build in frontend/")
