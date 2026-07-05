import { useEffect, useMemo, useState } from "react";
import { growth, type ReviewCycle } from "../lib/growth";

/* EvolutionChart — how a child has grown over time, from the dated score
   snapshots recorded at each Submit/Review. Rows are disciplines grouped into
   three sections (cognitive/general learning · school subjects · your focus
   areas); a shared time axis runs across the top; one click animates the lines
   drawing in. It only ever draws real recorded points — never a faked curve. */

const SECTIONS = [
  { title: "Cognitive & general learning", color: "#2EC4B6" },
  { title: "School subjects", color: "#5AA7E6" },
  { title: "Your focus areas", color: "#FF7A66" },
];
function sectionOf(area: string): 0 | 1 | 2 {
  const a = area.toLowerCase();
  if (/read|writ|math|spell|science|numeracy|literacy|subject|handwriting/.test(a)) return 1;
  if (/focus|attention|behav|emotion|confidence|social|routine|sleep|self|memory|language|cognit|regulat/.test(a)) return 0;
  return 2;
}
const dateOf = (r: ReviewCycle) => new Date(r.created_at || r.period || Date.now()).getTime();

export default function EvolutionChart({ childId, childName, accent }: { childId: string; childName: string; accent: string }) {
  const [reviews, setReviews] = useState<ReviewCycle[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [shown, setShown] = useState(false);
  const [unit, setUnit] = useState<"months" | "weeks">("months");

  useEffect(() => {
    setLoaded(false); setShown(false);
    growth.listReviews(childId).then((r) => setReviews(r)).catch(() => setReviews([])).finally(() => setLoaded(true));
  }, [childId]);

  const snaps = useMemo(() => reviews.filter((r) => r.scores && Object.keys(r.scores).length).sort((a, b) => dateOf(a) - dateOf(b)), [reviews]);

  const model = useMemo(() => {
    const disc = new Map<string, { t: number; v: number }[]>();
    snaps.forEach((r) => {
      Object.entries(r.scores || {}).forEach(([k, v]) => {
        if (typeof v !== "number") return;
        if (!disc.has(k)) disc.set(k, []);
        disc.get(k)!.push({ t: dateOf(r), v });
      });
    });
    const times = snaps.map(dateOf);
    const min = Math.min(...times), max = Math.max(...times, Date.now());
    const rows = Array.from(disc.entries()).map(([name, pts]) => ({ name, pts, sec: sectionOf(name) }));
    return { rows, min, max: max === min ? min + 86400000 : max };
  }, [snaps]);

  const W = 620, H = 46, PAD = 6;
  const x = (t: number) => ((t - model.min) / (model.max - model.min)) * W;
  const y = (v: number) => PAD + (1 - Math.max(0, Math.min(100, v)) / 100) * (H - 2 * PAD);

  const ticks = useMemo(() => {
    const out: { x: number; label: string }[] = [];
    const start = new Date(model.min), end = new Date(model.max);
    if (unit === "months") {
      const c = new Date(start.getFullYear(), start.getMonth(), 1);
      while (c <= end) { out.push({ x: x(c.getTime()), label: c.toLocaleDateString(undefined, { month: "short" }) }); c.setMonth(c.getMonth() + 1); }
    } else {
      const c = new Date(start); c.setHours(0, 0, 0, 0);
      while (c <= end) { out.push({ x: x(c.getTime()), label: c.toLocaleDateString(undefined, { day: "numeric", month: "short" }) }); c.setDate(c.getDate() + 7); }
    }
    return out.filter((tk) => tk.x >= -2 && tk.x <= W + 2).slice(0, 10);
  }, [model, unit]);

  if (!loaded) return <div className="muted">Loading {childName}'s growth…</div>;

  return (
    <div className="evo" style={{ ["--evo-accent" as string]: accent }}>
      <div className="evo-top">
        <div>
          <h3 style={{ margin: 0 }}>How {childName} has grown</h3>
          <p className="muted" style={{ margin: "2px 0 0" }}>Built from your {snaps.length} submitted review{snaps.length === 1 ? "" : "s"} — real points only, growing each cycle.</p>
        </div>
        <div className="evo-actions">
          {snaps.length >= 2 && (
            <div className="evo-unit">
              <button className={unit === "months" ? "on" : ""} onClick={() => setUnit("months")}>Months</button>
              <button className={unit === "weeks" ? "on" : ""} onClick={() => setUnit("weeks")}>Weeks</button>
            </div>
          )}
          <button className="evo-play" onClick={() => setShown((s) => !s)}>{shown ? "Replay ↻" : "▶ Show evolution"}</button>
        </div>
      </div>

      {snaps.length === 0 ? (
        <div className="evo-empty">No snapshots yet. Submit a cycle under <b>Develop → Submit</b> and a dated point appears here — the line grows every time you review.</div>
      ) : snaps.length === 1 ? (
        <div className="evo-empty">📍 Baseline set on {new Date(dateOf(snaps[0])).toLocaleDateString()}. Run another review to see the first trend line.</div>
      ) : (
        <div className={"evo-chart" + (shown ? " play" : "")}>
          <div className="evo-axis">
            <div className="evo-axlab" />
            <svg viewBox={`0 0 ${W} 16`} className="evo-axsvg" preserveAspectRatio="none">
              {ticks.map((tk, i) => <text key={i} x={tk.x} y={12} className="evo-tick">{tk.label}</text>)}
            </svg>
          </div>
          {SECTIONS.map((sec, si) => {
            const rows = model.rows.filter((r) => r.sec === si);
            if (rows.length === 0) return null;
            return (
              <div className="evo-sec" key={si}>
                <div className="evo-sectitle" style={{ color: sec.color }}><span className="evo-secdot" style={{ background: sec.color }} />{sec.title}</div>
                {rows.map((row, ri) => {
                  const line = row.pts.map((p) => `${x(p.t)},${y(p.v)}`).join(" ");
                  const last = row.pts[row.pts.length - 1], first = row.pts[0];
                  const delta = last.v - first.v;
                  return (
                    <div className="evo-row" key={row.name} style={{ ["--d" as string]: `${(si * 2 + ri) * 0.12}s` }}>
                      <div className="evo-rowlab">{row.name}</div>
                      <div className="evo-plot">
                        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="evo-svg">
                          <line x1={0} y1={y(50)} x2={W} y2={y(50)} className="evo-mid" />
                          <polyline points={line} fill="none" stroke={sec.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" className="evo-line" />
                          {row.pts.map((p, i) => <circle key={i} cx={x(p.t)} cy={y(p.v)} r={3} fill={sec.color} className="evo-pt" />)}
                        </svg>
                        <span className="evo-val" style={{ color: sec.color }}>{last.v}{delta !== 0 && <b className={delta > 0 ? "up" : "down"}>{delta > 0 ? "▲" : "▼"}{Math.abs(delta)}</b>}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
