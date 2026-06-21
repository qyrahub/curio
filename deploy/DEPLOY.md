# Curio deploy (curio.qyratech.com + api.qyratech.com/curio)

Backend and frontend dirs are the Claude-Code autonomous zone; nginx, certs and
docker remain manual-sudo. `qtbackup` before structural changes.

## 1. Backend (curio-api) on :8200
    cd /home/hyperai/curio/api
    source .venv/bin/activate
    pip install -e .[dev]
    # run under tmux so it survives SSH drops:
    tmux new -s curio
    uvicorn app.main:app --reload --reload-dir app --port 8200

For production, prefer a systemd unit or the included docker-compose instead of
--reload. Set production env in api/.env (see below).

## 2. Frontend build
    cd /home/hyperai/curio/frontend
    echo 'VITE_API_URL=https://api.qyratech.com/curio/v1' > .env
    npm install
    npm run build          # outputs frontend/dist

## 3. nginx (sudo)
- Add the curio.qyratech.com server block (see nginx-curio.conf).
- Add the /curio/ location to the existing api.qyratech.com server block.
    sudo nginx -t && sudo systemctl reload nginx

## 4. TLS (sudo)
    sudo certbot --nginx -d curio.qyratech.com
    # api.qyratech.com already has a cert; no change needed there.

## 5. Production env (api/.env)
    CURIO_AUTH_REQUIRED=true
    CURIO_JWT_SECRET=<long random string>     # REQUIRED when auth is on
    CURIO_STORE=mongo
    CURIO_MONGO_DB=curio
    CURIO_CORS_ORIGINS=https://curio.qyratech.com
    CURIO_PUBLIC_BASE=https://api.qyratech.com/curio/v1
    CURIO_IMAGE_PROVIDER=openai
    CURIO_IMAGE_API_KEY=<key>
    CURIO_IMAGE_QUALITY=medium
    CURIO_IMAGE_BACKGROUND=transparent

Generate a secret:  openssl rand -hex 32
