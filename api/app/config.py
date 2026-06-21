import os


def _load_env_file() -> None:
    """Load api/.env into the environment so the server and scripts share one
    config source. Uses setdefault, so real env vars (e.g. Docker env_file or a
    shell export) take precedence. Strips surrounding quotes — a quoted value
    like KEY="sk-..." is a common footgun that otherwise breaks auth."""
    path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if not os.path.exists(path):
        return
    try:
        for raw in open(path, encoding="utf-8"):
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k, v = k.strip(), v.strip()
            if len(v) >= 2 and v[0] == v[-1] and v[0] in ("'", '"'):
                v = v[1:-1]
            os.environ.setdefault(k, v)
    except Exception:
        pass


_load_env_file()


class Settings:
    cors_origins = [
        o.strip()
        for o in os.getenv("CURIO_CORS_ORIGINS", "http://localhost:5173").split(",")
        if o.strip()
    ]
    auth_required = os.getenv("CURIO_AUTH_REQUIRED", "false").lower() == "true"
    jwt_secret = os.getenv("CURIO_JWT_SECRET", "")
    jwt_alg = os.getenv("CURIO_JWT_ALG", "HS256")
    mongo_uri = os.getenv("CURIO_MONGO_URI", "")  # empty => in-memory store
    llm_api_key = os.getenv("CURIO_LLM_API_KEY", "")
    ask_model = os.getenv("CURIO_ASK_MODEL", "claude-3-5-haiku-20241022")
    public_base = os.getenv("CURIO_PUBLIC_BASE", "http://localhost:8200/v1")
    image_provider = os.getenv("CURIO_IMAGE_PROVIDER", "none")   # none | openai | ...
    image_api_key = os.getenv("CURIO_IMAGE_API_KEY", "")
    image_model = os.getenv("CURIO_IMAGE_MODEL", "")
    image_style = os.getenv("CURIO_IMAGE_STYLE", "picture_book")
    image_size = os.getenv("CURIO_IMAGE_SIZE", "1024x1024")
    image_quality = os.getenv("CURIO_IMAGE_QUALITY", "medium")
    image_background = os.getenv("CURIO_IMAGE_BACKGROUND", "opaque")  # opaque | transparent
    store_backend = os.getenv("CURIO_STORE", "memory")  # memory | mongo
    mongo_uri = os.getenv("CURIO_MONGO_URI", "mongodb://localhost:27017")
    mongo_db = os.getenv("CURIO_MONGO_DB", "curio")


settings = Settings()
