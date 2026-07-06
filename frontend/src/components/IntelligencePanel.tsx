import { useEffect, useMemo, useState } from "react";
import { growth, type ReviewCycle } from "../lib/growth";
import { normTag } from "../lib/themes";

/* Intelligence — the ranked picture. Two exhaustive-but-concrete lists built
   from the canonical tags across all reviews: Issues (by impact = frequency,
   weighted to recency) and What's working. Ranked so the big picture is clear. */

const dateOf = (r: ReviewCycle) => new Date(r.created_at || r.period || Date.now()).getTime();

function rank(reviews: ReviewCycle[], key: "issues" | "strengths") {
  const now = Date.now(), DAY = 86400000;
  const agg = new Map<string, { count: number; score: number; last: number }>();
  reviews.forEach((r) => {
    const t = dateOf(r);
    const recency = Math.max(0.4, 1 - (now - t) / (120 * DAY)); // recent counts more, floor 0.4
    (r[key] as string[] | undefined)?.map(normTag).filter(Boolean).forEach((tag) => {
      const e = agg.get(tag) || { count: 0, score: 0, last: 0 };
      e.count += 1; e.score += recency; e.last = Math.max(e.last, t);
      agg.set(tag, e);
    });
  });
  const max = Math.max(1, ...Array.from(agg.values()).map((e) => e.score));
  return Array.from(agg.entries())
    .map(([tag, e]) => ({ tag, count: e.count, pct: Math.round((e.score / max) * 100), last: e.last }))
    .sort((a, b) => b.pct - a.pct || b.count - a.count);
}

export default function IntelligencePanel({ childId, childName }: { childId: string; childName: string }) {
  const [reviews, setReviews] = useState<ReviewCycle[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setLoaded(false); growth.listReviews(childId).then(setReviews).catch(() => setReviews([])).finally(() => setLoaded(true)); }, [childId]);

  const dated = useMemo(() => reviews.slice().sort((a, b) => new Date(a.created_at || a.period || 0).getTime() - new Date(b.created_at || b.period || 0).getTime()), [reviews]);
  const [idx, setIdx] = useState(-1);
  const asOf = idx < 0 ? Date.now() : new Date(dated[idx]?.created_at || dated[idx]?.period || Date.now()).getTime();
  const upto = useMemo(() => dated.filter((r) => new Date(r.created_at || r.period || 0).getTime() <= asOf), [dated, asOf]);
  const issues = useMemo(() => rank(upto, "issues"), [upto]);
  const strengths = useMemo(() => rank(upto, "strengths"), [upto]);

  if (!loaded) return <div className="muted">Loading…</div>;
  if (issues.length === 0 && strengths.length === 0)
    return <div className="evo-empty">Nothing ranked yet. As you submit reviews, {childName}'s recurring issues and strengths get ranked here by impact.</div>;

  const col = (title: string, rows: ReturnType<typeof rank>, kind: "bad" | "good") => (
    <div className="intel-col">
      <h4 className={kind === "bad" ? "intel-h bad" : "intel-h good"}>{title}</h4>
      {rows.length === 0 && <div className="muted">None yet.</div>}
      {rows.map((r) => (
        <div className="intel-row" key={r.tag}>
          <div className="intel-bar-wrap"><div className={"intel-bar " + kind} style={{ width: r.pct + "%" }} /></div>
          <div className="intel-tag">{r.tag}</div>
          <div className="intel-count">{r.count}×</div>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      {dated.length >= 2 && (
        <div className="intel-scrub">
          <span className="muted">{idx < 0 ? "Now" : "As of " + new Date(asOf).toLocaleDateString()}</span>
          <input type="range" min={-1} max={dated.length - 1} value={idx} onChange={(e) => setIdx(Number(e.target.value))} />
          <button className="rx-btn" onClick={() => setIdx(-1)} disabled={idx < 0}>Now</button>
        </div>
      )}
    <div className="intel">
      {col("⚠️ Recurring issues — by impact", issues, "bad")}
      {col("✅ What's working — by impact", strengths, "good")}
    </div>
    </div>
  );
}
