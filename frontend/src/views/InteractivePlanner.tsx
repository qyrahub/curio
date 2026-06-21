import { useState, useEffect, useMemo, type CSSProperties } from "react";
import { useProfile, THEMES, type ThemeKey } from "../lib/profile";

/* Curio · Interactive Planner — the web twin of the weekly planner.
   Per-child + Family scopes, themed, with clickable checkboxes, live-filling
   rings/bars, and editable priorities, tasks, schedule, notes and reflections.
   State persists locally; once the Brain feeds real completion it can drive
   the rings instead of manual ticks. */

interface Task { id: string; text: string; done: boolean; }
interface Slot { id: string; time: string; text: string; done: boolean; }
interface Day { intent: string; priorities: string[]; tasks: Task[]; schedule: Slot[]; notes: string[]; well: string[]; grateful: string[]; }
interface Habit { id: string; name: string; days: boolean[]; }
interface Data { startDate: string; theme: string; habits: Habit[]; days: Day[]; }

const uid = () => Math.random().toString(36).slice(2);
const DAYNAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DLET = ["M", "T", "W", "T", "F", "S", "S"];
type Pal = { light: string; acc: string };
interface PTheme { key: string; name: string; group: string; days: Pal[]; }
const PLANNER_THEMES: PTheme[] = [
  { key: "blossom", name: "Blossom", group: "Pink", days: [
    { light: "#FFE3EE", acc: "#F25CA2" }, { light: "#FFE7EE", acc: "#EC6FA8" }, { light: "#FCE0EC", acc: "#E83E8C" },
    { light: "#FFE0EA", acc: "#F06AA0" }, { light: "#FBE2F0", acc: "#D94F9E" }, { light: "#FFE6F0", acc: "#F25C9C" }, { light: "#FDE0EA", acc: "#E84E92" }] },
  { key: "berry", name: "Berry", group: "Pink", days: [
    { light: "#FCE0EC", acc: "#E83E8C" }, { light: "#F6E0F2", acc: "#C84BC4" }, { light: "#EFE0F7", acc: "#9B3DD0" },
    { light: "#FBE0EA", acc: "#D63384" }, { light: "#FCE4EF", acc: "#E0529E" }, { light: "#F3E0F4", acc: "#B83DBE" }, { light: "#FDE2EC", acc: "#E84E92" }] },
  { key: "rainbow", name: "Rainbow", group: "Bright", days: [
    { light: "#DCE6FF", acc: "#2E6BE6" }, { light: "#FCE0EC", acc: "#E83E8C" }, { light: "#ECE0FB", acc: "#8B3DDB" },
    { light: "#DCF5E5", acc: "#1FA968" }, { light: "#FFF1D6", acc: "#E89400" }, { light: "#D7F2F5", acc: "#0FA8B5" }, { light: "#FFE2DA", acc: "#FF5A36" }] },
  { key: "tropical", name: "Tropical", group: "Bright", days: [
    { light: "#DCEFFF", acc: "#1E90FF" }, { light: "#DBF7E8", acc: "#10C77E" }, { light: "#FFF0D6", acc: "#FF9F1C" },
    { light: "#FFE2DE", acc: "#FF4E50" }, { light: "#E5E0FF", acc: "#7B5CFF" }, { light: "#D7F7F5", acc: "#06C7C7" }, { light: "#FCE4F4", acc: "#FF3DA6" }] },
  { key: "sand", name: "Sand", group: "Neutral", days: [
    { light: "#EDE6DA", acc: "#A07E55" }, { light: "#E9E3D6", acc: "#8C7B5A" }, { light: "#EFE8DC", acc: "#B08A57" },
    { light: "#E6E8DC", acc: "#7E8A6A" }, { light: "#EFE6D8", acc: "#A8895C" }, { light: "#E8E4DA", acc: "#8E8470" }, { light: "#EDE7DB", acc: "#9C8560" }] },
  { key: "slate", name: "Slate", group: "Neutral", days: [
    { light: "#E6E9EF", acc: "#5B6B85" }, { light: "#E4E8EF", acc: "#566784" }, { light: "#E8E9EE", acc: "#6B6F86" },
    { light: "#E3E8EE", acc: "#4F6276" }, { light: "#E7E9EF", acc: "#646E88" }, { light: "#E5E9F0", acc: "#58698A" }, { light: "#E6E8ED", acc: "#6A7088" }] },
];
const INTENTS = ["Begin with clarity", "Take inspired action", "Stay grounded & grateful", "Learn something new", "Celebrate small wins", "Nourish yourself", "Rest & reflect"];
const PRIOS = [
  ["Set clear goals for the week", "Top work / school task", "Plan meals & schedule"],
  ["Make progress on a key project", "Learn a new skill", "Mindful movement break"],
  ["Deep work on a priority", "Reach out to a friend", "Review & adjust goals"],
  ["Finish pending work", "Prep for tomorrow", "Tidy the workspace"],
  ["Wrap up the week strong", "Celebrate a win", "Plan the weekend"],
  ["Quality family time", "Do something restful", "A little adventure"],
  ["Rest & reset", "Prep for the week", "Connect with someone"],
];
const TASKS = [
  ["Inbox to zero", "Morning workout", "Read 20 minutes", "Tidy the kitchen", "Plan tomorrow"],
  ["Project milestone", "Groceries", "Stretch 10 min", "Water the plants", "Journal"],
  ["Team check-in", "Walk 30 min", "Meal prep", "Practice an instrument", "Review budget"],
  ["Finish the report", "Laundry", "Run 5km", "Declutter desk", "Read a chapter"],
  ["Weekly review", "Family night", "Back up files", "Bake something", "Early night"],
  ["Park / outdoors", "Brunch", "Board games", "Garden time", "Family walk"],
  ["Sleep in", "Meal prep", "Long read", "Call a friend", "Plan the week"],
];
const PCHK = [
  [1, 1, 1, 0, 0], [1, 1, 0, 0, 1], [1, 0, 1, 1, 0], [1, 1, 0, 0, 1], [1, 1, 1, 0, 0], [1, 1, 1, 1, 0], [1, 1, 0, 1, 0],
];
const SCHED = ["7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];
const HABITS_SEED: [string, number[]][] = [
  ["Get morning sunlight ☀️", [1, 1, 0, 1, 1, 1, 1]], ["Move my body 🏃", [0, 1, 0, 1, 0, 1, 0]],
  ["Call family 📞", [0, 0, 1, 0, 0, 1, 0]], ["Take vitamins 💊", [1, 1, 1, 1, 0, 1, 1]],
  ["Drink water 💧", [1, 1, 1, 1, 1, 1, 1]], ["8 hours sleep 😴", [0, 1, 0, 0, 1, 0, 1]],
  ["Read 📖", [1, 1, 1, 1, 1, 1, 1]], ["Gratitude 🙏", [0, 1, 0, 1, 1, 0, 1]],
];

function seed(): Data {
  return {
    startDate: new Date().toISOString().slice(0, 10),
    theme: "rainbow",
    habits: HABITS_SEED.map(([name, d]) => ({ id: uid(), name, days: d.map(Boolean) })),
    days: DAYNAMES.map((_, i) => ({
      intent: INTENTS[i],
      priorities: PRIOS[i].slice(),
      tasks: TASKS[i].map((t, j) => ({ id: uid(), text: t, done: !!PCHK[i][j] })),
      schedule: SCHED.map((tm) => ({ id: uid(), time: tm, text: "", done: false })),
      notes: ["", "", ""], well: ["", "", ""], grateful: ["", "", ""],
    })),
  };
}

const PKEY = "curio.iplanner.v1";
function loadAll(): Record<string, Data> { try { const r = localStorage.getItem(PKEY); if (r) return JSON.parse(r); } catch { /* */ } return {}; }

function Donut({ pct, color, size = 116 }: { pct: number; color: string; size?: number }) {
  const r = size / 2 - 11, C = 2 * Math.PI * r;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="ip-donut" style={{ width: size, height: size }}>
      <circle cx={size / 2} cy={size / 2} r={r} className="ip-donut-bg" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="13" strokeLinecap="round"
        strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} className="ip-donut-fg" />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="ip-donut-t" fill={color}>{pct}%</text>
    </svg>
  );
}

export default function InteractivePlanner({ embedded }: { embedded?: boolean }) {
  const { mode, children, activeChild } = useProfile();
  const scopes = useMemo(() => {
    if (mode === "child") return activeChild ? [{ id: activeChild.id, name: activeChild.name, theme: activeChild.theme as ThemeKey | null }] : [];
    return [{ id: "family", name: "Family", theme: null as ThemeKey | null }, ...children.map((c) => ({ id: c.id, name: c.name, theme: c.theme as ThemeKey | null }))];
  }, [mode, children, activeChild]);

  const [calId, setCalId] = useState(scopes[0]?.id || "family");
  const [all, setAll] = useState<Record<string, Data>>(loadAll);
  useEffect(() => { try { localStorage.setItem(PKEY, JSON.stringify(all)); } catch { /* */ } }, [all]);
  useEffect(() => { if (!scopes.find((s) => s.id === calId) && scopes[0]) setCalId(scopes[0].id); }, [scopes, calId]);
  useEffect(() => { if (calId && !all[calId]) setAll((p) => ({ ...p, [calId]: seed() })); }, [calId, all]);

  const scope = scopes.find((s) => s.id === calId) || scopes[0];
  const data = all[calId] || seed();
  const TH = PLANNER_THEMES.find((x) => x.key === (data.theme || "rainbow")) || PLANNER_THEMES[2];
  const DAYCOL = TH.days;
  const t = scope?.theme ? THEMES[scope.theme] : null;
  const accent = t?.accent || "#2E6BE6"; const deep = t?.deep || "#1E50B8";

  const patch = (fn: (d: Data) => Data) => setAll((p) => ({ ...p, [calId]: fn(p[calId] || seed()) }));
  const patchDay = (di: number, fn: (d: Day) => Day) => patch((d) => ({ ...d, days: d.days.map((x, i) => (i === di ? fn(x) : x)) }));

  const dayStat = (d: Day) => { const tot = d.tasks.length; const done = d.tasks.filter((x) => x.done).length; return { tot, done, pct: tot ? Math.round((done / tot) * 100) : 0 }; };
  const overall = useMemo(() => { let tot = 0, done = 0; data.days.forEach((d) => { tot += d.tasks.length; done += d.tasks.filter((x) => x.done).length; }); return { tot, done, pct: tot ? Math.round((done / tot) * 100) : 0 }; }, [data]);
  const maxDone = Math.max(1, ...data.days.map((d) => d.tasks.filter((x) => x.done).length));

  const startDate = new Date(data.startDate + "T00:00:00");
  const dayDate = (i: number) => { const x = new Date(startDate); x.setDate(x.getDate() + i); return x.toLocaleDateString(undefined, { month: "short", day: "numeric" }); };

  const dl = (blob: Blob, name: string) => { const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1500); };
  const esc = (s: string) => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const td = (s: string, bg?: string, bold?: boolean, color?: string) => `<td style="${bg ? `background:${bg};` : ""}${bold ? "font-weight:700;" : ""}${color ? `color:${color};` : ""}padding:4px 8px;border:1px solid #e7e0d2">${esc(s)}</td>`;
  const blank = `<tr><td colspan="9" style="height:16px;border:none"></td></tr>`;

  const downloadExcel = () => {
    if (!scope) return;
    let h = `<table style="border-collapse:collapse;font-family:Arial;font-size:12px">`;
    h += blank; // blank line before the table
    h += `<tr><td colspan="9" style="font-size:18px;font-weight:700;color:#2C2A4A;padding:6px">Weekly Planner — ${esc(scope.name)} · ${overall.pct}% complete · ${overall.done}/${overall.tot} tasks done</td></tr>`;
    h += `<tr><td colspan="9" style="height:8px"></td></tr>`;
    h += `<tr><td colspan="9" style="background:${accent};color:#fff;font-weight:700;padding:5px 8px">DAILY HABITS</td></tr>`;
    h += `<tr>${td("Habit", accent + "22", true)}${["M", "T", "W", "T", "F", "S", "S"].map((d) => td(d, accent + "22", true)).join("")}${td("%", accent + "22", true)}</tr>`;
    data.habits.forEach((hb) => { const done = hb.days.filter(Boolean).length; h += `<tr>${td(hb.name)}${hb.days.map((on) => td(on ? "✓" : "", undefined, false, accent)).join("")}${td(Math.round((done / 7) * 100) + "%")}</tr>`; });
    h += `<tr><td colspan="9" style="height:10px"></td></tr>`;
    data.days.forEach((d, i) => {
      const col = DAYCOL[i]; const st = dayStat(d);
      h += `<tr><td colspan="9" style="background:${col.acc};color:#fff;font-weight:700;padding:5px 8px">${DAYNAMES[i]} — ${dayDate(i)} · ${st.pct}% · ${esc(d.intent)}</td></tr>`;
      h += `<tr>${td("Top 3 Priorities", col.light, true)}<td colspan="8" style="border:none"></td></tr>`;
      d.priorities.forEach((p, j) => { h += `<tr>${td(`${j + 1}. ${p}`)}<td colspan="8" style="border:none"></td></tr>`; });
      h += `<tr>${td("Tasks", col.light, true)}${td("Done", col.light, true)}<td colspan="7" style="border:none"></td></tr>`;
      d.tasks.forEach((tk) => { h += `<tr>${td(tk.text)}${td(tk.done ? "✓" : "", undefined, false, col.acc)}<td colspan="7" style="border:none"></td></tr>`; });
      h += `<tr>${td(`Completed: ${st.done}`, col.light, true)}${td(`Outstanding: ${st.tot - st.done}`, col.light, true)}<td colspan="7" style="border:none"></td></tr>`;
      h += `<tr>${td("Daily Schedule", col.light, true)}<td colspan="8" style="border:none"></td></tr>`;
      d.schedule.forEach((s) => { h += `<tr>${td(s.time)}${td(s.text)}${td(s.done ? "✓" : "", undefined, false, col.acc)}<td colspan="6" style="border:none"></td></tr>`; });
      ([["Notes", "notes"], ["What went well today?", "well"], ["What am I grateful for?", "grateful"]] as const).forEach(([label, key]) => {
        h += `<tr>${td(label, col.light, true)}<td colspan="8" style="border:none"></td></tr>`;
        (d[key] as string[]).forEach((line, li) => { h += `<tr>${td(`${li + 1}. ${line}`)}<td colspan="8" style="border:none"></td></tr>`; });
      });
      h += `<tr><td colspan="9" style="height:8px"></td></tr>`;
    });
    h += `</table>`;
    dl(new Blob([`<html><head><meta charset="utf-8"></head><body>${h}</body></html>`], { type: "application/vnd.ms-excel" }), `${scope.name.replace(/\s+/g, "_")}_Weekly_Planner.xls`);
  };

  const downloadPDF = () => {
    document.body.classList.add("ip-printing");
    const done = () => { document.body.classList.remove("ip-printing"); window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    window.print();
  };

  if (!scope) return <div className={embedded ? "" : "view"}><p className="muted">Add a child profile to start planning.</p></div>;
  const style = { "--ip-accent": accent, "--ip-deep": deep } as CSSProperties;

  return (
    <div className={embedded ? "ip" : "view ip"} style={style}>
      {!embedded && (
        <div className="adm-hero"><div className="adm-eyebrow">Interactive Planner</div>
          <h1 className="adm-title">A weekly planner that <em>fills itself in</em></h1>
          <p className="adm-tease muted">Tick things off and the rings, bars and counts move in real time.</p></div>
      )}

      {scopes.length > 1 && (
        <div className="cal-switch">
          {scopes.map((s) => { const ct = s.theme ? THEMES[s.theme] : null; const on = s.id === calId;
            return (
              <button key={s.id} className={"cal-tab" + (on ? " on" : "")} onClick={() => setCalId(s.id)}
                style={on ? { borderColor: ct?.accent || "#2E6BE6", background: `${ct?.accent || "#2E6BE6"}1a` } : undefined}>
                <span className="cal-tab-av" style={{ background: ct ? `linear-gradient(140deg,${ct.accent},${ct.deep})` : "linear-gradient(140deg,#2E6BE6,#1E50B8)" }}>{ct ? ct.emoji : "👪"}</span>
                {s.name}
              </button>
            ); })}
        </div>
      )}

      <div className="ip-themes">
        <span className="ip-themes-l">Theme</span>
        {PLANNER_THEMES.map((pt) => (
          <button key={pt.key} className={"ip-theme" + (pt.key === (data.theme || "rainbow") ? " on" : "")} title={`${pt.name} · ${pt.group}`}
            onClick={() => patch((d) => ({ ...d, theme: pt.key }))}>
            <span className="ip-theme-sw">{pt.days.map((p, i) => <i key={i} style={{ background: p.acc }} />)}</span>
            {pt.name}
          </button>
        ))}
      </div>

      <div className="ip-toolbar">
        <button className="ip-dl" onClick={downloadExcel} title="Download as Excel">⤓ Excel</button>
        <button className="ip-dl" onClick={downloadPDF} title="Download as PDF">⤓ PDF</button>
      </div>

      {/* top dashboard */}
      <div className="ip-top">
        <div className="ip-panel ip-title">
          <h2>{scope.name === "Family" ? "Family" : `${scope.name}'s`} week</h2>
          <p className="muted">Plan with purpose · tick as you go</p>
          <label className="ip-start">Start date
            <input type="date" value={data.startDate} onChange={(e) => patch((d) => ({ ...d, startDate: e.target.value }))} />
          </label>
          <p className="ip-tip muted">Tick ✓ as you go — your rings, bars and counts fill in automatically.</p>
        </div>

        <div className="ip-panel ip-overall">
          <div className="ip-panel-h" style={{ background: accent }}>Overall progress</div>
          <div className="ip-overall-body">
            <div className="ip-bars">
              {data.days.map((d, i) => { const done = d.tasks.filter((x) => x.done).length;
                return <div key={i} className="ip-bar-col"><div className="ip-bar-track"><div className="ip-bar-fill" style={{ height: `${(done / maxDone) * 100}%`, background: DAYCOL[i].acc }} /></div><span>{DOW[i]}</span></div>; })}
            </div>
            <div className="ip-overall-ring">
              <Donut pct={overall.pct} color={accent} size={120} />
              <b style={{ color: accent }}>{overall.done} / {overall.tot} tasks done</b>
            </div>
          </div>
        </div>

        <div className="ip-panel ip-habits">
          <div className="ip-panel-h" style={{ background: deep }}>Daily habits</div>
          <div className="ip-habit-grid">
            <div className="ip-habit-head"><span>Habit</span>{DLET.map((d, i) => <span key={i} className="ip-hd">{d}</span>)}<span className="ip-hp">Progress</span></div>
            {data.habits.map((h, hi) => { const done = h.days.filter(Boolean).length; const pct = Math.round((done / 7) * 100);
              return (
                <div className="ip-habit-row" key={h.id}>
                  <input className="ip-habit-name" value={h.name} onChange={(e) => patch((d) => ({ ...d, habits: d.habits.map((x, i) => (i === hi ? { ...x, name: e.target.value } : x)) }))} />
                  {h.days.map((on, di) => (
                    <button key={di} className={"ip-hcheck" + (on ? " on" : "")} style={on ? { background: accent, borderColor: accent } : undefined}
                      onClick={() => patch((d) => ({ ...d, habits: d.habits.map((x, i) => (i === hi ? { ...x, days: x.days.map((v, j) => (j === di ? !v : v)) } : x)) }))}>{on ? "✓" : ""}</button>
                  ))}
                  <span className="ip-hbar"><span className="ip-hbar-fill" style={{ width: `${pct}%`, background: accent }} /><b>{pct}%</b></span>
                </div>
              ); })}
          </div>
        </div>
      </div>

      {/* day cards */}
      <div className="ip-cards">
        {data.days.map((d, i) => {
          const col = DAYCOL[i]; const st = dayStat(d);
          return (
            <div className="ip-card" key={i} style={{ borderColor: col.acc }}>
              <div className="ip-card-h" style={{ background: col.light }}>{DAYNAMES[i]}<span className="ip-card-date">{dayDate(i)}</span></div>
              <input className="ip-intent" value={d.intent} style={{ color: col.acc }} onChange={(e) => patchDay(i, (x) => ({ ...x, intent: e.target.value }))} />
              <div className="ip-card-ring"><Donut pct={st.pct} color={col.acc} size={104} /><span className="ip-dp">Daily Progress</span></div>

              <div className="ip-sec" style={{ background: col.light }}>Top 3 Priorities</div>
              {d.priorities.map((p, pi) => (
                <div className="ip-prio" key={pi}><b style={{ color: col.acc }}>{pi + 1}</b>
                  <input value={p} onChange={(e) => patchDay(i, (x) => ({ ...x, priorities: x.priorities.map((v, j) => (j === pi ? e.target.value : v)) }))} /></div>
              ))}

              <div className="ip-sec" style={{ background: col.light }}>Tasks</div>
              {d.tasks.map((tk) => (
                <div className={"ip-task" + (tk.done ? " done" : "")} key={tk.id}>
                  <button className={"ip-check" + (tk.done ? " on" : "")} style={tk.done ? { background: col.acc, borderColor: col.acc } : undefined}
                    onClick={() => patchDay(i, (x) => ({ ...x, tasks: x.tasks.map((v) => (v.id === tk.id ? { ...v, done: !v.done } : v)) }))}>{tk.done ? "✓" : ""}</button>
                  <input value={tk.text} onChange={(e) => patchDay(i, (x) => ({ ...x, tasks: x.tasks.map((v) => (v.id === tk.id ? { ...v, text: e.target.value } : v)) }))} />
                  <button className="ip-x" onClick={() => patchDay(i, (x) => ({ ...x, tasks: x.tasks.filter((v) => v.id !== tk.id) }))}>✕</button>
                </div>
              ))}
              <button className="ip-add" style={{ color: col.acc }} onClick={() => patchDay(i, (x) => ({ ...x, tasks: [...x.tasks, { id: uid(), text: "", done: false }] }))}>＋ Add task</button>

              <div className="ip-counts">
                <span style={{ background: col.light }}>Completed <b style={{ color: col.acc }}>{st.done}</b></span>
                <span style={{ background: col.light }}>Outstanding <b>{st.tot - st.done}</b></span>
              </div>

              <div className="ip-sec" style={{ background: col.light }}>Daily Schedule</div>
              {d.schedule.map((s) => (
                <div className={"ip-slot" + (s.done ? " done" : "")} key={s.id}>
                  <input className="ip-time" value={s.time} onChange={(e) => patchDay(i, (x) => ({ ...x, schedule: x.schedule.map((v) => (v.id === s.id ? { ...v, time: e.target.value } : v)) }))} />
                  <input className="ip-slot-text" value={s.text} placeholder="…" onChange={(e) => patchDay(i, (x) => ({ ...x, schedule: x.schedule.map((v) => (v.id === s.id ? { ...v, text: e.target.value } : v)) }))} />
                  <button className={"ip-check" + (s.done ? " on" : "")} style={s.done ? { background: col.acc, borderColor: col.acc } : undefined}
                    onClick={() => patchDay(i, (x) => ({ ...x, schedule: x.schedule.map((v) => (v.id === s.id ? { ...v, done: !v.done } : v)) }))}>{s.done ? "✓" : ""}</button>
                </div>
              ))}
              <button className="ip-add" style={{ color: col.acc }} onClick={() => patchDay(i, (x) => ({ ...x, schedule: [...x.schedule, { id: uid(), time: "", text: "", done: false }] }))}>＋ Add slot</button>

              {([["Notes", "notes"], ["What went well today?", "well"], ["What am I grateful for?", "grateful"]] as const).map(([label, key]) => (
                <div key={key}>
                  <div className="ip-sec" style={{ background: col.light }}>{label}</div>
                  {(d[key] as string[]).map((line, li) => (
                    <div className="ip-line" key={li}><b>{li + 1}</b>
                      <input value={line} onChange={(e) => patchDay(i, (x) => ({ ...x, [key]: (x[key] as string[]).map((v, j) => (j === li ? e.target.value : v)) }))} /></div>
                  ))}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
