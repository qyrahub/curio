/* Planner storage — server-backed, with a local cache so the UI stays instant.
   Reads hydrate from the API; writes go to the API and the cache together.
   Callers (Check-in, Journal, FamilyPlanner) stay simple. */
import { api } from "./api";

export type PlanType = "education" | "fun" | "break" | "walk";
export interface PlanItem { id: string; time: string; title: string; type: PlanType; done?: boolean; }
export type PlanStore = Record<string, Record<string, PlanItem[]>>; // calId -> "YYYY-MM-DD" -> items

const CACHE = "curio.planner.v2"; // same key as before: existing local plans are picked up and migrated up
const pad = (n: number) => String(n).padStart(2, "0");
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayKey = () => dayKey(new Date());

function readCache(): PlanStore {
  try { const r = localStorage.getItem(CACHE); if (r) return JSON.parse(r) as PlanStore; } catch { /* ignore */ }
  return {};
}
function writeCache(s: PlanStore) {
  try { localStorage.setItem(CACHE, JSON.stringify(s)); } catch { /* ignore */ }
}

/** Pull the server's copy. If the server is empty but we have local plans, push them up (one-time migration). */
export async function pullPlanner(): Promise<PlanStore> {
  try {
    const r = await api.plannerGet("family");
    const server = (r.store || {}) as PlanStore;
    if (Object.keys(server).length === 0) {
      const local = readCache();
      if (Object.keys(local).length > 0) { await api.plannerPut("family", local); return local; }
    }
    writeCache(server);
    return server;
  } catch {
    return readCache(); // offline / signed out: fall back to what's on this device
  }
}

/** Persist the whole store (server + cache). */
export async function pushPlanner(s: PlanStore): Promise<boolean> {
  writeCache(s);
  try { await api.plannerPut("family", s); return true; } catch { return false; }
}

/** Add one item to a calendar day. Writes through to the server. */
export async function addToPlanner(calId: string, key: string, title: string, type: PlanType = "education", time = "16:00"): Promise<boolean> {
  const s = await pullPlanner();
  const cal = s[calId] || {};
  const day = (cal[key] || []).slice();
  day.push({ id: Math.random().toString(36).slice(2), time, title: title.slice(0, 120), type });
  day.sort((a, b) => a.time.localeCompare(b.time));
  s[calId] = { ...cal, [key]: day };
  return pushPlanner(s);
}
