# Run Curio (the whole product, one command)

Prereq: Docker + Docker Compose on the host.

1. Put your settings in `api/.env` (at minimum, to enable real pictures):
       CURIO_IMAGE_PROVIDER=openai
       CURIO_IMAGE_API_KEY=sk-...
       CURIO_IMAGE_BACKGROUND=transparent
       CURIO_AUTH_REQUIRED=true
       CURIO_JWT_SECRET=<openssl rand -hex 32>
   (Mongo is wired automatically by compose — no URI needed.)

2. Start everything:
       docker compose up -d --build

3. Open it:
       http://<host>:8200      # the full app (UI + API + images + storage)

That's it. UI, API, illustrations and database are one stack. To go live on a
domain, point it at port 8200 (your existing nginx + certbot, one proxy line) —
or expose 8200 directly. Logs: `docker compose logs -f curio`.
