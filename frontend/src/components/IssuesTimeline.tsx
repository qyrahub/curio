import { useEffect, useMemo, useState } from "react";
import { growth, type ReviewCycle } from "../lib/growth";

/* Issues over time — for each canonical issue tag, when it appeared across
   submitted reviews, and whether it recurs. Surfaces patterns, not just scores. */

const dateOf = (r: ReviewCycle) => new Date(r.created_at || r.period || Date.now()).getTime();

export default function IssuesTimeline({ childId, childName, accent }: { childId: string; childName: string; accent: string }) {
  const [reviews, setReviews] = useState<ReviewCycle[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setLoaded(false); growth.listReviews(childId).then(setReviews).catch(() => setReviews([])).finally(() => setLoaded(true)); }, [childId]);

  const model = useMemo(() => {
    const snaps = reviews.filter((r) => Array.isArray(r.issues) && r.issues!.length).sort((a, b) => dateOf(a) - dateOf(b));
    const tags = new Map<string, number[]>();
    snaps.forEach((r) => (r.issues || []).forEach((t) => { if (!tags.has(t)) tags.set(t, []); tags.get(t)!.push(dateOf(r)); }));
    const times = snaps.map(dateOf);
    const min = Math.min(...times), max = Math.max(...times, Date.now());
    const rows = Array.from(tags.entries()).map(([tag, ds]) => ({ tag, ds, n: ds.length })).sort((a, b) => b.n - a.n);
    return { rows, min, max: max === min ? min + 86400000 : max, count: snaps.length };
  }, [reviews]);

  if (!loaded) return <div className="muted">Loading…</div>;
  if (model.count === 0) return <div className="evo-empty">No issue history yet. Submit a Review (or a schoolwork scan) and each identified issue is tracked here over time.</div>;

  const x = (t: number) => ((t - model.min) / (model.max - model.min)) * 100;
  return (
    <div className="itl" style={{ ["--itl-accent" as string]: accent }}>
      <p className="muted" style={{ marginTop: 0 }}>Across {model.count} review{model.count === 1 ? "" : "s"} for {childName}. Repeated dots = a recurring issue.</p>
      {model.rows.map((row) => (
        <div className="itl-row" key={row.tag}>
          <div className="itl-tag">{row.tag}</div>
          <div className="itl-track">
            {row.ds.map((d, i) => <span key={i} className="itl-dot" style={{ left: x(d) + "%" }} title={new Date(d).toLocaleDateString()} />)}
          </div>
          <div className={"itl-badge" + (row.n >= 2 ? " recur" : "")}>{row.n >= 2 ? `↻ ${row.n}×` : "1×"}</div>
        </div>
      ))}
    </div>
  );
}
