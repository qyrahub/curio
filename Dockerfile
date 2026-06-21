# ---- stage 1: build the frontend ----
FROM node:22-slim AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN echo "VITE_API_URL=/v1" > .env && npm run build

# ---- stage 2: the API, serving the built SPA ----
FROM python:3.12-slim
WORKDIR /app
COPY api/pyproject.toml ./
COPY api/app ./app
RUN pip install --no-cache-dir .
COPY --from=web /web/dist ./spa
RUN mkdir -p /app/exports /app/image_cache
ENV CURIO_SPA_DIR=/app/spa
EXPOSE 8200
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8200"]
