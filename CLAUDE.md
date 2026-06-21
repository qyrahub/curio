# CLAUDE.md — Curio

Operational guide for Claude Code running on the VPS. Read this first.

## What Curio is
A family learning companion. A parent enters their child's **age** (the only
required input) plus optional touches, presses one button, and gets a curated,
age-appropriate, illustrated learning plan exportable as PDF / PPTX / Word /
JPEG. See `Curio_PRD.md` for the full spec. Pre-build phase.

## The one architectural rule: the API is the seam
The backend holds everything that matters (curation IP, rendering, data, auth).
The frontend is a deliberately dumb, portable SPA that talks to the backend
**only** through the `/v1` JSON contract over HTTPS. This is what lets the
frontend later move to Lovable (or anywhere) with no backend change.

Never break this seam. Concretely, the **6 portability rules** (hard):
1. Frontend reads its backend URL from `VITE_API_URL` — never hardcode, never assume same-origin.
2. API keeps a CORS allow-list (`CURIO_CORS_ORIGINS`); add a new frontend origin there, not in code.
3. Auth is JWT **bearer tokens** in the `Authorization` header — never same-origin cookies.
4. **Zero secrets in the frontend.** LLM keys, curation logic, rendering: server-side only.
5. The `/v1` contract is the product boundary — version it, keep `src/types.ts` in sync with `api/app/models.py`.
6. No SSR, no backend-templated HTML, no relative same-origin path tricks in the frontend.

## Repo layout
```
curio/
  api/                 FastAPI "curio-api" — the backend (port 8200)
    app/
      main.py          /v1 routes + CORS mount
      models.py        the /v1 contract (Pydantic)
      engine.py        child curation engine — CONFIDENTIAL IP lives here
      content.py       source-of-truth content for all modes
      modes.py         parent / family / itinerary / brain / canvas / books logic
      render.py        real PPTX renderer (pdf/docx/jpeg next)
      images.py        pluggable illustration generation (provider + cache + safety)
  frontend/          portable React+Vite+TS SPA (Phase 2)
    src/App.tsx        nav + hash router
    src/lib/api.ts     the ONLY backend touchpoint (VITE_API_URL)
    src/views/         Home, Child, Parent, Family, Canvas, Brain
      render.py        async export jobs (pptx/pdf/docx/jpeg)
      store.py         in-memory now; Mongo (motor) drop-in
      auth.py          JWT bearer dependency (off by default)
      config.py        env-driven settings
  frontend/            React + Vite + TS + Tailwind SPA (Lovable's stack)
    src/lib/api.ts     THE SEAM — only coupling to the backend
    src/types.ts       mirror of models.py
  deploy/nginx-curio.conf   reference only (nginx is manual-sudo)
  docker-compose.yml
```

## Autonomous zone vs manual-sudo
- **Autonomous (Claude Code edits freely):** everything under `/home/hyperai/curio` — the `api/` and `frontend/` source.
- **Manual-sudo (do NOT touch autonomously):** nginx config, certbot/certs, Docker daemon, the gateway, any root-owned service. Propose changes; Tom applies them.

## Ports
- `curio-api`: **8200** (avoids the qyra-ingest 8108 collision).

## Running it
Backend (dev):
```
cd /home/hyperai/curio/api
python3 -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
cp .env.example .env
uvicorn app.main:app --host 0.0.0.0 --port 8200 --reload
```
Frontend (dev):
```
cd /home/hyperai/curio/frontend
npm install
cp .env.example .env
npm run dev
```
Containerised:
```
cd /home/hyperai/curio
docker compose up -d --build
docker compose logs -f curio-api
```
Note: if a port bind fails after a stop/remove, the kernel may not have released
the port. Use a `sleep 4` between `docker rm` and `docker run`, and remember
`docker start` on a failed-bind container does NOT re-establish port mappings —
do a full `docker rm` + `docker run`.

Run long sessions inside `tmux new -s qyra` so they survive SSH disconnects.

## IP discipline (read before editing engine.py)
The real staging weights, domain-mix scoring, pacing/rhythm methodology, and
content-selection model are **confidential** and stay server-side. Do not commit
detailed methodology to any shared/public repo. `engine.py` currently exposes
only the pipeline shape with placeholder logic — keep public-facing descriptions
deliberately vague, consistent with the ΩSCORE discipline.

## Child-safety (non-negotiable)
This is a children's product. The `safety_pass` in `engine.py` and the `/ask`
helper must filter for age-appropriateness, factual accuracy, and sensitivity
before anything is returned. No frightening/violent/sexual/commercial/manipulative
content. Faith content is descriptive and respectful, never proselytising.
Privacy by design: collect the minimum, no child PII required, POPIA-aware.

## Terminal & file conventions
- Batch 5–15 related commands in one newline-separated block. No `&&` chaining. No inline comments. Single-command blocks are unacceptable.
- File delivery from the workspace: download via `present_files`, then Tom SCPs: `scp $env:USERPROFILE\Downloads\<file> qyratech:/tmp/`. No heredocs for non-trivial files; multi-line edits to existing files use a Python script with match-count assertions or regex with capture groups.
- Confirm before destructive ops (`rm`, dropping containers, `sed -i` without backup, dropping collections, force-push).
- `qtbackup` before any major change — and include the `qtbackup` reminder in handover documents.

## Secrets handling
- Never run commands whose stdout could contain credential values. For env/config, show key names only (`cut -d= -f1` / `awk -F= '{print $1}'`).
- Never ask Tom to `cat` `.env`, `.git-credentials`, or `.pypirc` — ask him to check locally and report yes/no.
- `.claudeignore` excludes `.env*`, keys/certs, credentials, `exports/`, `node_modules/`, `.venv/`. Keep it current.
- Git PAT hygiene: `> ~/.git-credentials` before switching repos; revoke any leaked token immediately.
- Python: `.venv/` per repo, gitignored. Tech email for signups/certs: `tech@qyrafund.com`.

## Build order (suggested)
1. Flesh `engine.py` (real staging + mix + content) and `safety_pass`.
2. Wire real renderers in `render.py` using the document skills (python-pptx, reportlab, python-docx, Pillow); add deps to `pyproject.toml`.
3. Port the playful UI from `curio_preview.html` onto `src/App.tsx` + the api client.
4. Wire `/ask` to the model. Then Mongo persistence. Then flip auth on.
5. Part 2: development tracking (stable ids are already in the model).
