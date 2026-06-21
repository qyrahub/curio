"""Verify image generation works with your configured key.

Usage (from api/, with .venv active and CURIO_IMAGE_* set in .env or shell):
    python scripts/gen_sample.py
    python scripts/gen_sample.py "a friendly red tractor on a farm"

Loads api/.env if present, generates one image, prints the saved path.
On failure it prints the real error so you can fix the key/settings.
"""
import os
import sys

# config._load_env_file() (triggered on import below) loads api/.env for us,
# with quote stripping — so the script and the server read identical settings.
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from app import images  # noqa: E402

prompt = sys.argv[1] if len(sys.argv) > 1 else None
try:
    path = images.generate_sample(prompt)
    print("OK - sample image saved to:", path)
    print("Provider:", type(images.get_provider()).__name__)
except Exception as exc:
    print("FAILED:", exc)
    sys.exit(1)
