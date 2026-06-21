import { useState, useEffect, useMemo, type CSSProperties } from "react";
import { useProfile, THEMES, type ThemeKey } from "../lib/profile";

/* Curio · Planner — a friendly block calendar, one per child plus a Family one.
   In child mode a child sees only their own; in parent/admin mode you switch
   between Family and each child. Weekdays auto-slot that child's learning;
   weekends suggest fun. Tick items off — the rings track the month. Gets
   smarter as the Brain learns each child's needs. */

type ItemType = "education" | "fun" | "break" | "walk";
interface Item { id: string; time: string; title: string; type: ItemType; done?: boolean; }
type Store = Record<string, Record<string, Item[]>>; // calId → dayKey → items

const TYPE_COLOR: Record<ItemType, string> = { education: "#5AA7E6", fun: "#FF7A66", break: "#5BBF8A", walk: "#2EC4B6" };
const TYPE_LABEL: Record<ItemType, string> = { education: "Learning", fun: "Fun", break: "Break", walk: "Walk" };
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]; // Monday-start
const COL = ["#F7A399", "#F9C49A", "#FCE08A", "#B9E0A5", "#9FD9D2", "#A8CBEC", "#C3B3E8"]; // rainbow per weekday
const SUBJECTS = ["Reading", "Numeracy", "Science", "Creativity", "Review & free choice"]; // Mon..Fri
const FUN_CHILD = ["Drawing & making", "Build something", "Imaginative play", "Outdoor explore", "Music & dancing"];
const FUN_FAM = ["Park & playground", "Family baking", "Bike ride", "Museum trip", "Board-game hour", "Swimming", "Nature walk"];
const uid = () => Math.random().toString(36).slice(2);
const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const colIdx = (y: number, m: number, d: number) => (new Date(y, m, d).getDay() + 6) % 7; // Mon=0..Sun=6

const PKEY = "curio.planner.v2";
function load(): Store { try { const r = localStorage.getItem(PKEY); if (r) return JSON.parse(r) as Store; } catch { /* ignore */ } return {}; }

interface Cal { id: string; name: string; theme: ThemeKey | null; kind: "family" | "child"; interest?: string; }

export default function FamilyPlanner({ embedded }: { embedded?: boolean }) {
  const { mode, children, activeChild } = useProfile();
  const calendars: Cal[] = useMemo(() => {
    if (mode === "child") return activeChild ? [{ id: activeChild.id, name: activeChild.name, theme: activeChild.theme, kind: "child", interest: activeChild.interests[0] }] : [];
    return [{ id: "family", name: "Family", theme: null, kind: "family" },
    ...children.map((c) => ({ id: c.id, name: c.name, theme: c.theme, kind: "child" as const, interest: c.interests[0] }))];
  }, [mode, children, activeChild]);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [calId, setCalId] = useState(calendars[0]?.id || "family");
  const [store, setStore] = useState<Store>(load);
  const [sel, setSel] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ time: string; title: string; type: ItemType }>({ time: "16:00", title: "", type: "fun" });
  useEffect(() => { try { localStorage.setItem(PKEY, JSON.stringify(store)); } catch { /* ignore */ } }, [store]);
  useEffect(() => { if (!calendars.find((c) => c.id === calId) && calendars[0]) setCalId(calendars[0].id); }, [calendars, calId]);

  const cal = calendars.find((c) => c.id === calId) || calendars[0];
  const monthData = store[calId] || {};
  const daysIn = new Date(year, month + 1, 0).getDate();

  const buildMonth = (c: Cal, y: number, m: number): Record<string, Item[]> => {
    const out: Record<string, Item[]> = {};
    const dim = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= dim; d++) {
      const dow = new Date(y, m, d).getDay(); const k = keyOf(y, m, d); const items: Item[] = [];
      if (c.kind === "child") {
        if (dow >= 1 && dow <= 5) {
          const subj = SUBJECTS[dow - 1]; const tag = c.interest && dow - 1 !== 4 ? ` · ${c.interest.toLowerCase()}` : "";
          items.push({ id: uid(), time: "16:00", title: `${subj}${tag}`, type: "education" });
          items.push({ id: uid(), time: "16:45", title: "Movement break", type: "break" });
          if (dow === 3) items.push({ id: uid(), time: "17:15", title: "Afternoon walk", type: "walk" });
        } else {
          items.push({ id: uid(), time: "10:00", title: FUN_CHILD[(d + dow) % FUN_CHILD.length], type: "fun" });
        }
      } else {
        if (dow === 0 || dow === 6) {
          items.push({ id: uid(), time: "10:00", title: FUN_FAM[(d + dow) % FUN_FAM.length], type: "fun" });
          if (dow === 0) items.push({ id: uid(), time: "16:00", title: "Wind-down family walk", type: "walk" });
        } else if (dow === 5) {
          items.push({ id: uid(), time: "18:30", title: "Family movie night", type: "fun" });
        }
      }
      out[k] = items;
    }
    return out;
  };

  useEffect(() => {
    if (!cal) return;
    const hasAny = Object.keys(monthData).some((k) => k.startsWith(`${year}-${pad(month + 1)}-`));
    if (!hasAny) setStore((s) => ({ ...s, [cal.id]: { ...(s[cal.id] || {}), ...buildMonth(cal, year, month) } }));
    // eslint-disable-line react-hooks/exhaustive-deps
  }, [calId, year, month, children.length]);

  const writeMonth = (fn: (cur: Record<string, Item[]>) => Record<string, Item[]>) => setStore((s) => ({ ...s, [calId]: fn(s[calId] || {}) }));
  const autofill = () => { if (cal) setStore((s) => ({ ...s, [calId]: { ...(s[calId] || {}), ...buildMonth(cal, year, month) } })); };
  const clearMonth = () => writeMonth((cur) => { const n = { ...cur }; Object.keys(n).forEach((k) => { if (k.startsWith(`${year}-${pad(month + 1)}-`)) delete n[k]; }); return n; });
  const dayItems = (k: string) => (monthData[k] || []).slice().sort((a, b) => a.time.localeCompare(b.time));
  const toggleDone = (k: string, id: string) => writeMonth((cur) => ({ ...cur, [k]: (cur[k] || []).map((x) => (x.id === id ? { ...x, done: !x.done } : x)) }));
  const removeItem = (k: string, id: string) => writeMonth((cur) => ({ ...cur, [k]: (cur[k] || []).filter((x) => x.id !== id) }));
  const addItem = () => {
    if (!sel || !draft.title.trim()) return;
    writeMonth((cur) => ({ ...cur, [sel]: [...(cur[sel] || []), { id: uid(), time: draft.time, title: draft.title.trim(), type: draft.type }] }));
    setDraft({ ...draft, title: "" });
  };

  const cells = useMemo(() => {
    const lead = colIdx(year, month, 1); const arr: (number | null)[] = [];
    for (let i = 0; i < lead; i++) arr.push(null);
    for (let d = 1; d <= daysIn; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [year, month, daysIn]);

  const prev = () => { setSel(null); if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const next = () => { setSel(null); if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1); };

  // completion rings for the visible month
  const ringFor = (id: string) => {
    const md = store[id] || {}; let tot = 0, done = 0;
    Object.keys(md).forEach((k) => { if (k.startsWith(`${year}-${pad(month + 1)}-`)) md[k].forEach((it) => { if (it.type === "education" || it.type === "fun") { tot++; if (it.done) done++; } }); });
    return { pct: tot ? Math.round((done / tot) * 100) : 0, done, tot };
  };

  const t = cal?.theme ? THEMES[cal.theme] : null;
  const accent = t?.accent || "#FF7A66"; const deep = t?.deep || "#F2563D";
  const themeStyle = { "--cal-accent": accent, "--cal-deep": deep } as CSSProperties;

  if (!cal) return <div className={embedded ? "" : "view"}><p className="muted">Add a child profile to start planning.</p></div>;

  return (
    <div className={embedded ? "plan" : "view plan"} style={themeStyle}>
      {!embedded && (
        <div className="adm-hero">
          <div className="adm-eyebrow">Planner</div>
          <h1 className="adm-title">{mode === "child" ? <>My <em>calendar</em></> : <>A calendar for <em>everyone</em></>}</h1>
          <p className="adm-tease muted">Weekday learning is slotted in, weekends suggest fun, breaks are dropped in — all editable. Tick things off as you go.</p>
        </div>
      )}

      {calendars.length > 1 && (
        <div className="cal-switch">
          {calendars.map((c) => {
            const ct = c.theme ? THEMES[c.theme] : null;
            const on = c.id === calId;
            return (
              <button key={c.id} className={"cal-tab" + (on ? " on" : "")} onClick={() => { setCalId(c.id); setSel(null); }}
                style={on ? { borderColor: ct?.accent || "#FF7A66", background: `${ct?.accent || "#FF7A66"}1a` } : undefined}>
                <span className="cal-tab-av" style={{ background: ct ? `linear-gradient(140deg,${ct.accent},${ct.deep})` : "linear-gradient(140deg,#FF7A66,#F2563D)" }}>{ct ? ct.emoji : "👪"}</span>
                {c.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="cal-card">
        <div className="cal-confetti">{COL.concat(COL).map((c, i) => <i key={i} style={{ background: c, left: `${(i * 6.6 + (i % 3) * 2) % 100}%`, top: `${(i % 4) * 5 + 4}px` }} />)}</div>
        <div className="cal-head">
          <div className="cal-title">
            <span className="cal-title-av" style={{ background: t ? `linear-gradient(140deg,${t.accent},${t.deep})` : "linear-gradient(140deg,#FF7A66,#F2563D)" }}>{t ? t.emoji : "👪"}</span>
            <div><div className="cal-name">{cal.kind === "family" ? "Family" : `${cal.name}'s`} calendar</div><div className="cal-sub muted">{MONTHS[month]} {year}</div></div>
          </div>
          <div className="cal-nav"><button onClick={prev} aria-label="Previous">‹</button><button onClick={next} aria-label="Next">›</button></div>
        </div>

        {/* at-a-glance rings */}
        <div className="cal-rings">
          {(mode === "child" ? calendars : [{ id: "family", name: "Family", theme: null as ThemeKey | null, kind: "family" as const }, ...children.map((c) => ({ id: c.id, name: c.name, theme: c.theme, kind: "child" as const }))]).map((c) => {
            const r = ringFor(c.id); const ct = c.theme ? THEMES[c.theme] : null; const col = ct?.accent || "#FF7A66";
            const C = 2 * Math.PI * 22;
            return (
              <button key={c.id} className={"cal-ring" + (c.id === calId ? " on" : "")} onClick={() => { setCalId(c.id); setSel(null); }}>
                <svg viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" className="ring-bg" />
                  <circle cx="28" cy="28" r="22" fill="none" stroke={col} strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - r.pct / 100)} transform="rotate(-90 28 28)" />
                  <text x="28" y="32" textAnchor="middle" className="ring-t">{r.pct}%</text>
                </svg>
                <span className="cal-ring-l">{c.name}<span className="muted"> {r.done}/{r.tot}</span></span>
              </button>
            );
          })}
        </div>

        <div className="cal-actions">
          <button className="cal-btn ghost" onClick={autofill}>↻ Auto-fill {MONTHS[month]}</button>
          <button className="cal-btn danger" onClick={clearMonth}>Clear month</button>
        </div>

        <div className="cal-grid">
          {DOW.map((d, i) => <div className="cal-dow" key={d} style={{ background: COL[i] }}>{d}</div>)}
          {cells.map((d, i) => {
            if (d === null) return <div className="cal-cell empty" key={i} />;
            const k = keyOf(year, month, d); const items = dayItems(k); const ci = colIdx(year, month, d);
            const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            return (
              <button className={"cal-cell" + (sel === k ? " sel" : "") + (isToday ? " today" : "")} key={i} onClick={() => { setSel(k); setDraft((dr) => ({ ...dr, type: cal.kind === "family" ? "fun" : "education" })); }}>
                <span className="cal-num" style={{ background: COL[ci] }}>{d}</span>
                <div className="cal-chips">
                  {items.slice(0, 3).map((it) => {
                    const col = it.type === "education" ? accent : TYPE_COLOR[it.type];
                    return <span key={it.id} className={"cal-chip" + (it.done ? " done" : "")}><i style={{ background: col }} />{it.title}</span>;
                  })}
                  {items.length > 3 && <span className="cal-more">+{items.length - 3}</span>}
                </div>
              </button>
            );
          })}
        </div>

        <div className="cal-legend">
          {(Object.keys(TYPE_LABEL) as ItemType[]).map((ty) => <span key={ty}><i style={{ background: ty === "education" ? accent : TYPE_COLOR[ty] }} />{TYPE_LABEL[ty]}</span>)}
        </div>
      </div>

      {sel && (
        <div className="cal-day">
          <div className="cal-day-head">
            <h3>{(() => { const [y, m, d] = sel.split("-").map(Number); return `${DOW[colIdx(y, m - 1, d)]} ${d} ${MONTHS[m - 1]}`; })()}</h3>
            <button className="cal-btn ghost sm" onClick={() => setSel(null)}>Close</button>
          </div>
          <div className="cal-day-list">
            {dayItems(sel).length === 0 && <p className="muted" style={{ margin: "6px 0" }}>Nothing planned. Add something below.</p>}
            {dayItems(sel).map((it) => {
              const col = it.type === "education" ? accent : TYPE_COLOR[it.type];
              return (
                <div className={"cal-day-item" + (it.done ? " done" : "")} key={it.id}>
                  <button className={"cal-check" + (it.done ? " on" : "")} style={it.done ? { background: col, borderColor: col } : undefined} onClick={() => toggleDone(sel, it.id)}>{it.done ? "✓" : ""}</button>
                  <span className="cal-pill" style={{ background: col + "22", color: col }}>{TYPE_LABEL[it.type]}</span>
                  <b style={{ width: 50 }}>{it.time}</b>
                  <span style={{ flex: 1 }}>{it.title}</span>
                  <button className="cal-x" onClick={() => removeItem(sel, it.id)} aria-label="Remove">✕</button>
                </div>
              );
            })}
          </div>
          <div className="cal-add">
            <input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} />
            <input placeholder="Add a plan…" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addItem()} />
            <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as ItemType })}>{(Object.keys(TYPE_LABEL) as ItemType[]).map((ty) => <option key={ty} value={ty}>{TYPE_LABEL[ty]}</option>)}</select>
            <button className="cal-btn" onClick={addItem}>＋ Add</button>
          </div>
        </div>
      )}

      <p className="cal-note muted">Each child gets their own themed calendar; the Family one is shared. Suggestions come from each child's profile and a sensible rhythm — once the itinerary and the Brain's per-child signals are wired, weekends pull from real outings and weekday blocks target exactly what each child needs.</p>
    </div>
  );
}
