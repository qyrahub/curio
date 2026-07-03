import { useState, useEffect } from "react";

/* Shared store for the per-child Gantt. Lives inside the same key Develop uses
   (curio.develop.v1) under [childId].gantt, so Develop (which writes plans there)
   and Family (which reads the Gantt beside the planners) stay in sync. Writes are
   merge-based and broadcast an event so any open view refreshes. */

export type GStatus = "todo" | "active" | "done" | "blocked";
export interface GanttItem {
  id: string;
  task: string;
  focus: string;
  start: string; // yyyy-mm-dd
  end: string;   // yyyy-mm-dd
  progress: number; // 0-100
  status: GStatus;
}

export const G_STATUS: { key: GStatus; label: string; color: string }[] = [
  { key: "todo", label: "To do", color: "#8A8AA0" },
  { key: "active", label: "In progress", color: "#5AA7E6" },
  { key: "done", label: "Done", color: "#5BBF8A" },
  { key: "blocked", label: "Blocked", color: "#FF7A66" },
];

const DKEY = "curio.develop.v1";
const EVT = "curio-dev-store";

type Store = Record<string, { gantt?: GanttItem[] } & Record<string, unknown>>;

function readStore(): Store {
  try { return JSON.parse(localStorage.getItem(DKEY) || "{}") as Store; } catch { return {}; }
}
export function readGantt(childId: string): GanttItem[] {
  const s = readStore();
  return (s[childId]?.gantt as GanttItem[]) || [];
}
export function writeGantt(childId: string, items: GanttItem[]) {
  try {
    const s = readStore();
    s[childId] = { ...(s[childId] || {}), gantt: items };
    localStorage.setItem(DKEY, JSON.stringify(s));
    window.dispatchEvent(new Event(EVT));
  } catch { /* ignore */ }
}

export function newGanttItem(task: string, focus: string, durationDays = 7): GanttItem {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + Math.max(1, durationDays) - 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { id: Math.random().toString(36).slice(2), task, focus, start: iso(start), end: iso(end), progress: 0, status: "todo" };
}

export function useGantt(childId: string) {
  const [items, setItems] = useState<GanttItem[]>(() => readGantt(childId));
  useEffect(() => { setItems(readGantt(childId)); }, [childId]);
  useEffect(() => {
    const h = () => setItems(readGantt(childId));
    window.addEventListener(EVT, h);
    window.addEventListener("storage", h);
    return () => { window.removeEventListener(EVT, h); window.removeEventListener("storage", h); };
  }, [childId]);
  const update = (next: GanttItem[]) => { setItems(next); writeGantt(childId, next); };
  return [items, update] as const;
}
