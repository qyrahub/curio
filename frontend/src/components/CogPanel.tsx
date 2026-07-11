import { useEffect, useMemo, useState } from "react";
import { growth, type ReviewCycle, type CogBench } from "../lib/growth";
import { PHASES, byPhase, fnStats, phaseScore, ranked, band, type Phase, type FnStat } from "../lib/feuerstein";
import "./cogPanel.css";

/* Ring-fenced cognitive-functions view (Feuerstein). Real data only: a function with
   no observations is shown as "not yet observed", never scored at zero. */
export default function CogPanel({ childId, childName }: { childId: string; childName: string }) {
  const [reviews, setReviews] = useState<ReviewCycle[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<"summary" | Phase>("summary");
  const [bench, setBench] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    setLoaded(false);
    growth.listReviews(childId).then(setReviews).catch(() => setReviews([])).finally(() => setLoaded(true));
    growth.cogbench().then((bs: CogBench[]) => { const m = new Map<string, number>(); bs.forEach((b) => m.set(b.fn_id, b.value)); setBench(m); }).catch(() => setBench(new Map()));
  }, [childId]);

  const stats = useMemo(() => fnStats(reviews), [reviews]);
  const observedCount = stats.size;

  const phaseInfo = useMemo(() => PHASES.map((p) => ({ ...p, ...phaseScore(stats, p.id) })), [stats]);
  const rankedAll = useMemo(() => ranked(stats), [stats]);

  if (!loaded) return <div className="muted">Loading…</div>;

  if (observedCount === 0) {
    return (
      <div className="cog-empty">
        No cognitive-function observations yet. Submit a Review in <b>Develop</b> — each one assesses {childName} against
        Feuerstein's Input, Elaboration and Output functions, but only where the work gives real evidence. Nothing is guessed.
      </div>
    );
  }

  return (
    <div className="cog">
      <div className="cog-tabs">
        <button className={view === "summary" ? "on" : ""} onClick={() => setView("summary")}>Summary</button>
        {PHASES.map((p) => (
          <button key={p.id} className={view === p.id ? "on" : ""} onClick={() => setView(p.id)}
            style={view === p.id ? { background: p.color, borderColor: p.color, color: "#fff" } : undefined}>{p.label}</button>
        ))}
        <span className="cog-obs">{observedCount} of 28 functions observed</span>
      </div>

      {view === "summary" && (
        <>
          {/* phase summary */}
          <div className="cog-phases">
            {phaseInfo.map((p) => (
              <div className="cog-phase" key={p.id} style={{ ["--pc" as string]: p.color }}>
                <div className="cog-p-head"><b>{p.label}</b><span className="muted">{p.sub}</span></div>
                {p.observed === 0 ? <div className="cog-none">Not yet observed</div> : (
                  <>
                    <div className="cog-score">{p.score}<span>/100</span></div>
                    <div className="cog-bar"><i style={{ width: `${p.score}%`, background: p.color }} /></div>
                    <div className="cog-meta">{p.observed} of {p.total} functions seen · {band(p.score)}</div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* the checklist across all three phases */}
          <h4 className="cog-h">The checklist — what's been seen</h4>
          <div className="cog-check">
            {PHASES.map((p) => (
              <div className="cog-col" key={p.id}>
                <div className="cog-col-h" style={{ color: p.color }}>{p.label}</div>
                {byPhase(p.id).map((f) => {
                  const st = stats.get(f.id);
                  return (
                    <div className={"cog-row" + (st ? "" : " unseen")} key={f.id} title={st ? f.fn : "Not yet observed"}>
                      <span className="cog-tick" style={st ? { borderColor: p.color, background: p.color } : undefined}>{st ? "✓" : ""}</span>
                      <span className="cog-name">{f.name}</span>
                      {st ? <span className="cog-v" style={{ color: p.color }}>{st.latest}</span> : <span className="cog-v muted">—</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* ranked table */}
          <h4 className="cog-h">How {childName} stacks up — ranked</h4>
          <table className="cog-table">
            <thead>
              <tr><th>#</th><th>Cognitive function</th><th>Phase</th><th>Now</th><th>Typical</th><th>Trend</th><th>Seen</th></tr>
            </thead>
            <tbody>
              {rankedAll.map((s, i) => {
                const pc = PHASES.find((p) => p.id === s.fn.phase)!;
                return (
                  <tr key={s.fn.id}>
                    <td className="r-n">{i + 1}</td>
                    <td className="r-fn"><b>{s.fn.name}</b><span>{band(s.latest)}</span></td>
                    <td><span className="r-phase" style={{ background: pc.color }}>{pc.label}</span></td>
                    <td className="r-now"><span className="r-bar"><i style={{ width: `${s.latest}%`, background: pc.color }} /></span>{s.latest}</td>
                    <td className="r-bench">{bench.has(s.fn.id) ? bench.get(s.fn.id) : "—"}</td>
                    <td className={"r-d " + (s.delta > 0 ? "up" : s.delta < 0 ? "down" : "")}>{s.n < 2 ? "—" : s.delta > 0 ? `▲ ${s.delta}` : s.delta < 0 ? `▼ ${Math.abs(s.delta)}` : "—"}</td>
                    <td className="r-seen">{s.n}×</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="cog-disc">Scores come only from reviews where the work gave real evidence. Functions not yet observed are left blank, never scored zero. “Typical” is an admin-approved typical-for-age reference — not a measured percentile, and blank where none is approved. Guidance, not diagnosis.</p>
        </>
      )}

      {view !== "summary" && <PhaseDetail phase={view} stats={stats} childName={childName} />}
    </div>
  );
}

function PhaseDetail({ phase, stats, childName }: { phase: Phase; stats: Map<string, FnStat>; childName: string }) {
  const p = PHASES.find((x) => x.id === phase)!;
  const fns = byPhase(phase);
  const seen = ranked(stats, phase);

  return (
    <div className="cog-detail">
      <div className="cog-d-head" style={{ borderColor: p.color }}>
        <b style={{ color: p.color }}>{p.label}</b> — {p.sub}
      </div>

      {seen.length === 0 && <div className="cog-none">Nothing observed in this phase yet.</div>}

      {seen.map((s) => (
        <div className="cog-fn" key={s.fn.id}>
          <div className="cog-fn-top">
            <div>
              <b>{s.fn.name}</b>
              <span className="cog-fn-def">{s.fn.fn}</span>
            </div>
            <div className="cog-fn-num" style={{ color: p.color }}>{s.latest}<small>/100</small></div>
          </div>
          {/* sparkline over time */}
          <Spark points={s.points} color={p.color} />
          <div className="cog-fn-meta">
            <span>{band(s.latest)}</span>
            <span>{s.n} observation{s.n === 1 ? "" : "s"}</span>
            {s.n >= 2 && <span className={s.delta > 0 ? "up" : s.delta < 0 ? "down" : ""}>{s.delta > 0 ? `▲ up ${s.delta} since first seen` : s.delta < 0 ? `▼ down ${Math.abs(s.delta)} since first seen` : "steady"}</span>}
          </div>
          {s.latest < 55 && <div className="cog-growth"><span>Growth area</span>{s.fn.growth}</div>}
        </div>
      ))}

      {/* not yet observed */}
      {fns.filter((f) => !stats.get(f.id)).length > 0 && (
        <div className="cog-unseen">
          <b>Not yet observed for {childName}:</b>{" "}
          {fns.filter((f) => !stats.get(f.id)).map((f) => f.name).join(", ")}.
          <span className="muted"> These simply haven't come up in the work reviewed — not a weakness.</span>
        </div>
      )}
    </div>
  );
}

function Spark({ points, color }: { points: { t: number; v: number }[]; color: string }) {
  if (points.length < 2) return <div className="cog-spark-none">One observation — a line appears once there are two.</div>;
  const W = 100, H = 26;
  const ts = points.map((p) => p.t);
  const min = Math.min(...ts), max = Math.max(...ts), span = max - min || 1;
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${((p.t - min) / span) * W},${H - (p.v / 100) * H}`).join(" ");
  return (
    <svg className="cog-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {points.map((p, i) => (
        <circle key={i} cx={((p.t - min) / span) * W} cy={H - (p.v / 100) * H} r="1.6" fill={color} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}
