/* Shared access to the Planner's local store, so other pages (Check-in, Journal)
   can add items to a real calendar day. Mirrors views/FamilyPlanner.tsx exactly. */

export type PlanType = "education" | "fun" | "break" | "walk";
export interface PlanItem { id: string; time: string; title: string; type: PlanType; done?: boolean; }
type Store = Record<string, Record<string, PlanItem[]>>; // calId -> "YYYY-MM-DD" -> items

const PKEY = "curio.planner.v2";
const pad = (n: number) => String(n).padStart(2, "0");
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayKey = () => dayKey(new Date());

function read(): Store {
  try { const r = localStorage.getItem(PKEY); if (r) return JSON.parse(r) as Store; } catch { /* ignore */ }
  return {};
}

/** Add an item to a calendar (calId = a child's id, or "family") on a given day. */
export function addToPlanner(calId: string, key: string, title: string, type: PlanType = "education", time = "16:00"): boolean {
  try {
    const s = read();
    const cal = s[calId] || {};
    const day = cal[key] || [];
    day.push({ id: Math.random().toString(36).slice(2), time, title: title.slice(0, 120), type });
    day.sort((a, b) => a.time.localeCompare(b.time));
    s[calId] = { ...cal, [key]: day };
    localStorage.setItem(PKEY, JSON.stringify(s));
    return true;
  } catch { return false; }
}

/** How many items sit on a calendar day. */
export function countOn(calId: string, key: string): number {
  const s = read();
  return (s[calId]?.[key] || []).length;
}
