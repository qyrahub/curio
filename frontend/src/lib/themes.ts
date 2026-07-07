import { type ReviewCycle } from "./growth";

/* Shared theme math for Intelligence + radars + value tiles.
   Themes are dynamic: the union of every tag (canonical + AI-proposed) across a
   child's reviews. Levels are computed only from the child's OWN history —
   honest and self-relative. */

export const SECTIONS = [
  { title: "Cognitive & general learning", color: "#2EC4B6" },
  { title: "School subjects", color: "#5AA7E6" },
  { title: "Focus areas", color: "#FF7A66" },
];
export function sectionOf(theme: string): 0 | 1 | 2 {
  const a = theme.toLowerCase();
  if (/read|writ|math|spell|science|numeracy|literacy|subject|handwriting|comprehension|vocabulary|punctuation|capital|sentence/.test(a)) return 1;
  if (/focus|attention|behav|emotion|confidence|social|routine|sleep|self|memory|language|cognit|regulat|impuls|listen|organis/.test(a)) return 0;
  return 2;
}
export function normTag(t: string): string {
  const s = (t || "").trim().replace(/\s+/g, " ");
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
export function ageGroup(age: number): string {
  if (age <= 5) return "3-5";
  if (age <= 8) return "6-8";
  if (age <= 11) return "9-11";
  return "12-14";
}
const dateOf = (r: ReviewCycle) => new Date(r.created_at || r.period || Date.now()).getTime();
const clamp = (n: number, lo = 8, hi = 100) => Math.max(lo, Math.min(hi, n));

export interface ThemeStat { theme: string; level: number; strengths: number; issues: number; last: number; }

/* Per-theme level from reviews up to `asOf` (ms). More strengths → higher,
   more issues → lower, recent counts more. Returns a map keyed by theme. */
export function themeLevels(reviews: ReviewCycle[], asOf: number = Date.now()): Map<string, ThemeStat> {
  const now = asOf, DAY = 86400000;
  const m = new Map<string, ThemeStat>();
  const bump = (raw: string, kind: "s" | "i", t: number) => {
    const theme = normTag(raw); if (!theme) return;
    const w = Math.max(0.4, 1 - (now - t) / (120 * DAY));
    const e = m.get(theme) || { theme, level: 0, strengths: 0, issues: 0, last: 0 };
    if (kind === "s") e.strengths += w; else e.issues += w;
    e.last = Math.max(e.last, t);
    m.set(theme, e);
  };
  reviews.filter((r) => dateOf(r) <= asOf).forEach((r) => {
    const t = dateOf(r);
    (r.strengths || []).forEach((x) => bump(x, "s", t));
    (r.issues || []).forEach((x) => bump(x, "i", t));
  });
  m.forEach((e) => { e.level = Math.round(clamp(50 + 22 * (e.strengths - e.issues))); });
  return m;
}

/* Top-N themes (by how often they appear) for radar axes. */
export function topThemes(reviews: ReviewCycle[], n = 8): string[] {
  const count = new Map<string, number>();
  reviews.forEach((r) => [...(r.issues || []), ...(r.strengths || [])].forEach((x) => {
    const t = normTag(x); if (t) count.set(t, (count.get(t) || 0) + 1);
  }));
  return Array.from(count.entries()).sort((a, b) => b[1] - a[1]).slice(0, n).map((e) => e[0]);
}
