"""Generate a full illustrated deck in one command (plan -> export -> download).

Usage (from api/, .venv active, server NOT required - runs in-process):
    python scripts/make_deck.py            # age 6, small
    python scripts/make_deck.py 8 medium   # age 8, medium

Triggers real image generation per page (slow first time, cached after).
Saves the .pptx next to this script's working dir.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from app import engine, render          # noqa: E402
from app.models import PlanRequest, ExportJob  # noqa: E402
from app.store import save_export       # noqa: E402

age = int(sys.argv[1]) if len(sys.argv) > 1 else 6
size = sys.argv[2] if len(sys.argv) > 2 else "small"

plan = engine.curate(PlanRequest(age=age, size=size, interests=["space", "animals"]))
print(f"Plan {plan.id}: {len(plan.pages)} pages. Generating illustrations + rendering...")
job = ExportJob(id="local", plan_id=plan.id, fmt="pptx", status="queued")
save_export(job)
render.run_export("local", plan)
src = render.export_path(plan.id, "pptx")
out = f"curio-{plan.id}.pptx"
os.replace(src, out)
print("Done ->", os.path.abspath(out))
