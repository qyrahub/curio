# Curio

A family learning companion: enter a child's age, get a curated, age-appropriate,
illustrated learning plan (PDF / PPTX / Word / JPEG). Solo build by Tom (QyraTech).

This is a scaffold: the API runs end-to-end with placeholder curation and
placeholder export rendering, so the contract and the pipeline are real and
testable today. The frontend is a thin skeleton that proves the seam.

## Architecture in one line
**The `/v1` API is the seam.** Backend (curation IP, rendering, data, auth) lives
on the VPS; the frontend is a portable SPA that only speaks the JSON contract —
so it can move to Lovable later with a single `VITE_API_URL` change. See
`CLAUDE.md` for the rules that keep that door open.

## Quickstart

Backend:
```
cd api
python3 -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
cp .env.example .env
uvicorn app.main:app --reload --port 8200
```
Try it: `curl -s localhost:8200/v1/health` and
`curl -s -X POST localhost:8200/v1/plans -H 'content-type: application/json' -d '{"age":3,"size":"large"}'`

Frontend:
```
cd frontend
npm install
cp .env.example .env      # VITE_API_URL=http://localhost:8200/v1
npm run dev
```

Or containerised: `docker compose up -d --build`

## /v1 contract (current)
- `GET  /v1/health`
- `GET  /v1/meta` — selectable options (frontend stays dumb)
- `POST /v1/plans` — body: PlanRequest (age required) → Plan
- `GET  /v1/plans/{id}`
- `POST /v1/plans/{id}/exports` — body: `{ "fmt": "pptx" }` → ExportJob (async)
- `GET  /v1/exports/{id}` — poll status
- `GET  /v1/exports/{id}/download`
- `POST /v1/ask` — upload/chat/voice helper (voice captured in browser)

## What's stubbed (and where to build)
- `api/app/engine.py` — curation pipeline shape only; real (confidential) logic goes here.
- `api/app/render.py` — writes placeholder files; wire python-pptx / reportlab / python-docx / Pillow.
- `api/app/store.py` — in-memory; swap for Mongo via `CURIO_MONGO_URI`.
- `api/app/auth.py` — JWT bearer, off until `CURIO_AUTH_REQUIRED=true`.
- `frontend/src/App.tsx` — minimal; port the playful UI from `curio_preview.html`.

## v3 — expanded /v1 contract (all modes, real PPTX)
The backend is now the single source of truth for every mode. Content lives in
`api/app/content.py`; non-child logic in `api/app/modes.py`.

Endpoints added:
- `GET  /v1/feeds` — landing feeds (re-randomised per call)
- `GET  /v1/parent/overview`, `POST /v1/parent/checkin`
- `GET  /v1/family/education`, `GET /v1/family/lifestyle?range=day|week|month`
- `GET  /v1/family/itinerary/options`, `POST /v1/family/itinerary`
- `GET  /v1/canvas/tools`
- `GET  /v1/brain/log`, `POST /v1/brain/feed`
- `POST /v1/books`, `GET /v1/books/{id}`

`POST /v1/plans/{id}/exports` with `{"fmt":"pptx"}` now renders a **real deck**
(python-pptx). PDF / DOCX / JPEG remain placeholders (next increment; derivable
from PPTX via LibreOffice on the VPS).

## v4 — generated illustrations
Produced pages can carry real, style-consistent, child-safe pictures.
`api/app/images.py` is a pluggable provider with disk caching (common subjects
generated once, reused across all plans/users).

- Off by default (`CURIO_IMAGE_PROVIDER=none`) → renderer uses the emoji motif.
- Switch on with `CURIO_IMAGE_PROVIDER=openai` + `CURIO_IMAGE_API_KEY=...` on the VPS.
- Style is fixed per output (`CURIO_IMAGE_STYLE=picture_book`) so a whole deck/book looks coherent.
- Safety constraints (wholesome, age-appropriate, no text) are baked into every prompt.
- Other providers (Imagen, Stability, Replicate/fal Flux) drop in behind the same `Provider` interface.

Note: a real image API key is required to produce pictures — generation runs on the VPS, not in the build env.

## v5 — image provider fully wired (OpenAI gpt-image-1)
`app/images.py` now ships a complete, current OpenAI Images provider (not a stub):
base64 handling, retries, Pillow normalisation, prompt + style + child-safety,
disk cache, and a graceful emoji fallback. Other providers drop in behind the
same interface.

Turn on (in `api/.env`):
```
CURIO_IMAGE_PROVIDER=openai
CURIO_IMAGE_API_KEY=<key>
CURIO_IMAGE_MODEL=gpt-image-1
CURIO_IMAGE_SIZE=1024x1024
CURIO_IMAGE_QUALITY=medium      # low | medium | high
CURIO_IMAGE_BACKGROUND=transparent   # transparent frames cleanly on the panel
```
Verify the key works without rendering a whole deck:
```
cd api && source .venv/bin/activate
python scripts/gen_sample.py
```
It saves `image_cache/sample.png` or prints the real error. After that, any
`pptx` export embeds real illustrations (cached, so repeats are free).

## v8 — Phase 2: multi-mode React frontend (ported, builds clean)
The prototype UI is now a real, portable React+Vite+TS SPA in `frontend/`, wired
to the live `/v1` API (no logic in the client). Views: Home (feeds), Child (full
builder → plan → **Make PPTX** which triggers real illustration generation),
Parent, Family (Education / Lifestyle / Itinerary tabs), Canvas, The Brain.
Design system is the ported prototype CSS; routing is a tiny hash router (no
extra deps). `npm run build` passes.

Run locally:
```
cd frontend
cp .env.example .env        # VITE_API_URL -> your api
npm install && npm run dev  # or: npm run build  (outputs dist/)
```
Deploy: `npm run build`, serve `frontend/dist` as static files behind nginx at
`curio.qyratech.com`, set `VITE_API_URL=https://api.qyratech.com/curio/v1`.
The one-command deck helper lives at `api/scripts/make_deck.py`.

## v9 — persistence + on-screen illustrations
- **Store** is now memory-or-Mongo via `CURIO_STORE` (`memory` default | `mongo`).
  Set `CURIO_MONGO_URI` / `CURIO_MONGO_DB` to persist plans + exports. If Mongo
  is selected but unreachable, it fails soft to memory (never takes the API down).
- **On-screen pictures:** `GET /v1/plans/{id}/pages/{order}/image` lazily
  generates+caches a page's illustration; the Child view loads these per card and
  falls back to emoji when generation is off (404). Same global cache as exports.
- Fixed the export download filename (real `.pptx`, was always `.json`).

## v10 — auth + deploy config
- Real auth: `POST /v1/auth/signup` & `/login` (scrypt-hashed passwords, stdlib),
  JWT issuance, `GET /v1/auth/me`. Off by default; set `CURIO_AUTH_REQUIRED=true`
  + `CURIO_JWT_SECRET` to enforce on every route. Frontend has an Account screen,
  persists the token, and attaches it to all calls.
- `deploy/DEPLOY.md` + `deploy/nginx-curio.conf`: SPA on curio.qyratech.com, API
  proxied at api.qyratech.com/curio, certbot TLS, and the production `.env`.

## v11 — one server, one command (the whole product)
The API now serves the built SPA from the same process, so the entire product
(UI + API + images + DB) is **one server on one address** — no separate web
server, no CORS, no second domain.

- Docker (recommended): `docker compose up -d --build` → open `http://<host>:8200`.
- No Docker: the frontend is prebuilt into `frontend/dist`, so just:
      cd api && pip install -e .[dev]
      uvicorn app.main:app --host 0.0.0.0 --port 8200
  → full product on `:8200`.

To go live on a domain, point it at `:8200` (one nginx proxy line + certbot) or
expose the port. See `RUN.md`.

## v12 — restored the curio_preview_v2 look & feel
The React app's design system is now ported verbatim from `curio_preview_v2.html`
(Fredoka + Nunito, warm radial-gradient background, coral accents, rounded cards),
extended in the same aesthetic to every mode. Fixes: the age control is now a row
of age pills (the raw full-width slider that broke the layout is gone), selection
uses `aria-pressed`, branding (mark + wordmark + tagline) is restored, and the
Home hero is the two-column illustrated layout with the butterfly life-cycle card.
Verified by rendering the built pages.

## v13 — UX refinements
- Fixed Sport/Faith toggles (proper switch markup + label; pills reveal below) — no more text overlap.
- Home sample card labelled "Preview" (was "page 1").
- Every mode page now opens with an illustrated tease header (PageHero + section art): short copy left, illustration right, like the home hero.
- Sign-in is now an immersive page: sparkle background, key illustration, Sign in / Create account toggle, and a "Forgot password?" reset flow (`POST /v1/auth/reset-request` — stub; real email delivery needs SMTP, next step).

## v14 — scroll/clickability robustness
Diagnostics confirmed the page scrolls and all controls are hit-testable in a
clean build (no overlay, no scroll-lock). Hardened against real-world chrome:
- 110px bottom padding so the last control (e.g. "Plan outings") never sits under
  the browser edge / OS taskbar where it can't be clicked.
- Tighter per-page heroes so more content stays above the fold.
- Explicit min-height on html/body to guarantee free scrolling.
If controls still seem unclickable after deploy, it's almost certainly a stale
cached bundle — rebuild with --force-recreate and hard-refresh (Ctrl+Shift+R).

## v21 — voice back to American English
Reverted the read-aloud voice to prefer a US English (American) voice; the SA voice
sounded poor on the device. Selection: US female → any US → English fallback.

## v22 — flipbook read-aloud reads only the challenge
The Child flipbook 🔊 button no longer says "Try this" before the challenge — it just
reads the question/challenge itself.
