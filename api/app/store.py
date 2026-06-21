"""Data store. In-memory by default; switch to MongoDB by setting
CURIO_STORE=mongo (+ CURIO_MONGO_URI / CURIO_MONGO_DB). The interface (these
four functions) is stable, so the rest of the app never changes.

Mongo uses pymongo (sync) - the API handlers are sync defs, so that's the simple
correct fit. If Mongo is selected but unreachable, we fail soft to memory and
log once, so a bad URI never takes the whole service down.
"""
from __future__ import annotations

from .config import settings
from .models import ExportJob, Plan


class MemoryStore:
    def __init__(self) -> None:
        self._plans: dict[str, Plan] = {}
        self._exports: dict[str, ExportJob] = {}
        self._users: dict[str, dict] = {}

    def save_plan(self, plan: Plan) -> None:
        self._plans[plan.id] = plan

    def get_plan(self, plan_id: str) -> Plan | None:
        return self._plans.get(plan_id)

    def save_export(self, job: ExportJob) -> None:
        self._exports[job.id] = job

    def get_export(self, export_id: str) -> ExportJob | None:
        return self._exports.get(export_id)

    def save_user(self, user: dict) -> None:
        self._users[user["id"]] = user

    def get_user_by_email(self, email: str) -> dict | None:
        return next((u for u in self._users.values() if u["email"] == email), None)

    def get_user_by_id(self, uid: str) -> dict | None:
        return self._users.get(uid)


class MongoStore:
    def __init__(self, uri: str, db: str) -> None:
        from pymongo import MongoClient
        self._c = MongoClient(uri, serverSelectionTimeoutMS=3000)
        self._c.admin.command("ping")  # fail fast if unreachable
        self._db = self._c[db]
        self._db.plans.create_index("id", unique=True)
        self._db.exports.create_index("id", unique=True)
        self._db.users.create_index("id", unique=True)
        self._db.users.create_index("email", unique=True)

    @staticmethod
    def _clean(doc: dict) -> dict:
        doc.pop("_id", None)
        return doc

    def save_plan(self, plan: Plan) -> None:
        self._db.plans.replace_one({"id": plan.id}, plan.model_dump(), upsert=True)

    def get_plan(self, plan_id: str) -> Plan | None:
        doc = self._db.plans.find_one({"id": plan_id})
        return Plan(**self._clean(doc)) if doc else None

    def save_export(self, job: ExportJob) -> None:
        self._db.exports.replace_one({"id": job.id}, job.model_dump(), upsert=True)

    def get_export(self, export_id: str) -> ExportJob | None:
        doc = self._db.exports.find_one({"id": export_id})
        return ExportJob(**self._clean(doc)) if doc else None

    def save_user(self, user: dict) -> None:
        self._db.users.replace_one({"id": user["id"]}, user, upsert=True)

    def get_user_by_email(self, email: str) -> dict | None:
        doc = self._db.users.find_one({"email": email})
        return self._clean(doc) if doc else None

    def get_user_by_id(self, uid: str) -> dict | None:
        doc = self._db.users.find_one({"id": uid})
        return self._clean(doc) if doc else None


def _build_store():
    if (settings.store_backend or "memory").lower() == "mongo":
        try:
            store = MongoStore(settings.mongo_uri, settings.mongo_db)
            print(f"[curio] store: mongo ({settings.mongo_db})")
            return store
        except Exception as exc:  # noqa: BLE001
            print(f"[curio] store: mongo unavailable ({exc}); falling back to memory")
    else:
        print("[curio] store: memory")
    return MemoryStore()


_store = _build_store()


def save_plan(plan: Plan) -> None:
    _store.save_plan(plan)


def get_plan(plan_id: str) -> Plan | None:
    return _store.get_plan(plan_id)


def save_export(job: ExportJob) -> None:
    _store.save_export(job)


def get_export(export_id: str) -> ExportJob | None:
    return _store.get_export(export_id)


def save_user(user: dict) -> None:
    _store.save_user(user)


def get_user_by_email(email: str) -> dict | None:
    return _store.get_user_by_email(email)


def get_user_by_id(uid: str) -> dict | None:
    return _store.get_user_by_id(uid)
