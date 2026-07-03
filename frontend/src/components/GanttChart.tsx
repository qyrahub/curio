import { useState } from "react";
import { type GanttItem, type GStatus, G_STATUS } from "../lib/devstore";

/* Gantt: columns 1-6 are editable (Task, Focus Area, Start, End, Progress,
   Status); column 7 is the bar track. Above the track a header shows the days
   of the viewed month with weekday letters beneath. Bars are drawn from each
   item's start/end, clipped to the visible month. Everything is editable and
   changes flow up via onChange so the parent persists them. */

const WD = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_W = 26;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); };

function statusColor(it: GanttItem): string {
  return (G_STATUS.find((s) => s.key === it.status) || G_STATUS[0]).color;
}

export default function GanttChart({ items, onChange, accent = "#5AA7E6" }: {
  items: GanttItem[]; onChange: (items: GanttItem[]) => void; accent?: string;
}) {
  const now = new Date();
  const [ym, setYm] = useState<{ y: number; m: number }>({ y: now.getFullYear(), m: now.getMonth() });
  const monthStart = new Date(ym.y, ym.m, 1);
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
  const monthLabel = monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(ym.y, ym.m, i + 1);
    return { num: i + 1, wd: WD[d.getDay()], weekend: d.getDay() === 0 || d.getDay() === 6, today: iso(d) === iso(now) };
  });
  const trackW = daysInMonth * DAY_W;

  const patch = (id: string, p: Partial<GanttItem>) => onChange(items.map((it) => (it.id === id ? { ...it, ...p } : it)));
  const remove = (id: string) => onChange(items.filter((it) => it.id !== id));
  const addRow = () => {
    const s = new Date(ym.y, ym.m, Math.min(now.getDate(), daysInMonth));
    const e = new Date(s); e.setDate(e.getDate() + 6);
    onChange([...items, { id: Math.random().toString(36).slice(2), task: "New task", focus: "", start: iso(s), end: iso(e), progress: 0, status: "todo" }]);
  };

  const barFor = (it: GanttItem) => {
    const s = parse(it.start), e = parse(it.end);
    const mStart = new Date(ym.y, ym.m, 1), mEnd = new Date(ym.y, ym.m, daysInMonth);
    if (e < mStart || s > mEnd) return null; // not in this month
    const from = Math.max(1, s <= mStart ? 1 : s.getDate());
    const to = Math.min(daysInMonth, e >= mEnd ? daysInMonth : e.getDate());
    const left = (from - 1) * DAY_W;
    const width = Math.max(DAY_W * 0.6, (to - from + 1) * DAY_W);
    return { left, width, clipL: s < mStart, clipR: e > mEnd };
  };

  return (
    <div className="gantt" style={{ ["--g-accent" as string]: accent }}>
      <div className="gantt-top">
        <div className="gantt-month">{monthLabel}</div>
        <div className="gantt-nav">
          <button onClick={() => setYm(({ y, m }) => (m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }))} aria-label="Previous month">‹</button>
          <button onClick={() => setYm({ y: now.getFullYear(), m: now.getMonth() })}>Today</button>
          <button onClick={() => setYm(({ y, m }) => (m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }))} aria-label="Next month">›</button>
        </div>
      </div>

      <div className="gantt-scroll">
        <div className="gantt-inner" style={{ minWidth: 800 + trackW }}>
          {/* header */}
          <div className="gantt-hrow">
            <div className="gantt-meta gantt-metahead">
              <span>Task description</span><span>Focus area</span><span>Start</span><span>End</span><span>Progress</span><span>Status</span>
            </div>
            <div className="gantt-days" style={{ width: trackW }}>
              {days.map((d, i) => (
                <div key={i} className={"gantt-dh" + (d.weekend ? " wknd" : "") + (d.today ? " today" : "")} style={{ width: DAY_W }}>
                  <b>{d.num}</b><span>{d.wd}</span>
                </div>
              ))}
            </div>
          </div>

          {/* rows */}
          {items.length === 0 && <div className="gantt-empty">No Gantt tasks yet. Add recommendations from Plan &amp; Tracker, or add a row.</div>}
          {items.map((it) => {
            const bar = barFor(it);
            return (
              <div className="gantt-row" key={it.id}>
                <div className="gantt-meta">
                  <span className="gantt-task">
                    <button className="gantt-x" title="Remove" onClick={() => remove(it.id)}>✕</button>
                    <input value={it.task} onChange={(e) => patch(it.id, { task: e.target.value })} placeholder="Task" />
                  </span>
                  <input className="gantt-focus" value={it.focus} onChange={(e) => patch(it.id, { focus: e.target.value })} placeholder="Focus" />
                  <input type="date" value={it.start} onChange={(e) => patch(it.id, { start: e.target.value })} />
                  <input type="date" value={it.end} onChange={(e) => patch(it.id, { end: e.target.value })} />
                  <span className="gantt-prog">
                    <input type="range" min={0} max={100} step={5} value={it.progress} onChange={(e) => patch(it.id, { progress: Number(e.target.value) })} />
                    <b>{it.progress}%</b>
                  </span>
                  <select value={it.status} onChange={(e) => patch(it.id, { status: e.target.value as GStatus })}>
                    {G_STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div className="gantt-track" style={{ width: trackW }}>
                  {days.map((d, i) => <div key={i} className={"gantt-cell" + (d.weekend ? " wknd" : "") + (d.today ? " today" : "")} style={{ width: DAY_W }} />)}
                  {bar && (
                    <div className="gantt-bar" title={`${it.task}: ${it.start} → ${it.end}`}
                      style={{ left: bar.left, width: bar.width, background: statusColor(it) + "33", borderColor: statusColor(it),
                        borderTopLeftRadius: bar.clipL ? 0 : 8, borderBottomLeftRadius: bar.clipL ? 0 : 8,
                        borderTopRightRadius: bar.clipR ? 0 : 8, borderBottomRightRadius: bar.clipR ? 0 : 8 }}>
                      <span className="gantt-fill" style={{ width: it.progress + "%", background: statusColor(it) }} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button className="gantt-add" onClick={addRow}>＋ Add a row</button>
    </div>
  );
}
