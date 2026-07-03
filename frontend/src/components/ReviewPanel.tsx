import { useEffect, useState } from "react";
import { askJSON } from "../lib/ai";
import { growth, feedBrain, type ReviewCycle } from "../lib/growth";
import { newGanttItem, type GanttItem } from "../lib/devstore";

interface NextRec { task: string; focus: string; durationDays: number; }

export default function ReviewPanel({ childId, childName, childAge, accent, gantt, onAddGantt }: {
  childId: string; childName: string; childAge: number; accent: string; gantt: GanttItem[]; onAddGantt: (items: GanttItem[]) => void;
}) {
  const achieved = gantt.filter((g) => g.status === "done" || g.progress >= 100).map((g) => g.task);
  const outstanding = gantt.filter((g) => !(g.status === "done" || g.progress >= 100)).map((g) => g.task);

  const [improvements, setImprovements] = useState("");
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [next, setNext] = useState<NextRec[]>([]);
  const [summary, setSummary] = useState("");
  const [added, setAdded] = useState<number[]>([]);
  const [past, setPast] = useState<ReviewCycle[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => { growth.listReviews(childId).then(setPast).catch(() => {}); }, [childId]);

  const save = async (sum: string, nx: NextRec[]) => {
    try {
      await growth.putReview({ child_id: childId, period, summary: sum, achieved, not_achieved: outstanding, improvements: improvements ? [improvements] : [], next: nx.map((n) => n.task) });
      feedBrain(`Review for ${childName} (${period}): ${achieved.length} achieved, ${outstanding.length} outstanding. ${sum}`, "Growth · review");
      growth.listReviews(childId).then(setPast).catch(() => {});
    } catch { setErr("Saved to the plan, but couldn't store the review — check you're signed in."); }
  };

  const run = async () => {
    setErr(""); setBusy(true); setNext([]); setAdded([]);
    const prompt = `A parent is reviewing progress for ${childName}, age ${childAge}.\nCompleted recently: ${achieved.join("; ") || "none yet"}.\nStill outstanding: ${outstanding.join("; ") || "none"}.\nParent's note on what improved: "${improvements || "(none given)"}".\nPropose the next small round of trackable recommendations that build on progress and tackle what's outstanding. Return ONLY JSON: {"summary": string, "next": [{"task": string, "focus": string, "durationDays": number}]}. 3-5 recommendations, concrete and doable.`;
    const j = await askJSON<{ summary: string; next: NextRec[] }>(prompt);
    setBusy(false);
    if (!j || !Array.isArray(j.next)) {
      const s = `Cycle logged for ${childName}. ${achieved.length} done, ${outstanding.length} outstanding.`;
      setSummary(s); setNext([]); await save(s, []); return;
    }
    setSummary(j.summary || ""); setNext(j.next); await save(j.summary || "", j.next);
  };

  const addNext = (i: number) => { onAddGantt([newGanttItem(next[i].task, next[i].focus, next[i].durationDays)]); setAdded((a) => [...a, i]); };
  const addAll = () => { onAddGantt(next.filter((_, i) => !added.includes(i)).map((n) => newGanttItem(n.task, n.focus, n.durationDays))); setAdded(next.map((_, i) => i)); };

  return (
    <div className="pt" style={{ ["--pt-accent" as string]: accent }}>
      <div className="pt-ey">Review · close the loop</div>
      <h3>How did this cycle go for {childName}?</h3>
      <div className="rv-tally"><span className="rv-done">✅ {achieved.length} done</span><span className="rv-out">◻ {outstanding.length} outstanding</span></div>
      <label className="rv-lab">Date of this review</label>
      <input className="pt-ta" style={{ minHeight: 0 }} type="date" value={period} onChange={(e) => setPeriod(e.target.value)} />
      <label className="rv-lab">What improved, or what you noticed</label>
      <textarea className="pt-ta" rows={3} value={improvements} onChange={(e) => setImprovements(e.target.value)} placeholder={`e.g. ${childName} started homework without a battle twice this week…`} />
      <button className="pt-go" style={{ marginTop: 12 }} disabled={busy} onClick={run}>{busy ? "Reviewing…" : "Log review & get next steps →"}</button>
      {err && <div className="needs-err" style={{ marginTop: 10 }}>{err}</div>}

      {summary && <div className="pt-summary" style={{ marginTop: 16 }}>{summary}</div>}
      {next.length > 0 && (
        <>
          <div className="pt-rechead"><h4>Next steps</h4><button className="pt-ghost" onClick={addAll} disabled={added.length === next.length}>Add all to Gantt</button></div>
          <div className="pt-recs">
            {next.map((r, i) => (
              <div className="pt-rec" key={i}>
                <div className="pt-recbody"><div className="pt-rectask">{r.task}</div><div className="pt-recmeta"><span className="pt-focus">{r.focus}</span><span className="pt-dur">≈ {r.durationDays} days</span></div></div>
                <button className={"pt-add" + (added.includes(i) ? " done" : "")} disabled={added.includes(i)} onClick={() => addNext(i)}>{added.includes(i) ? "✓ Added" : "＋ Add to Gantt"}</button>
              </div>
            ))}
          </div>
        </>
      )}

      {past.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <h4 style={{ margin: "0 0 8px" }}>Cycle history</h4>
          <div className="ev-history">
            {past.map((c) => (
              <div className="ev-item" key={c.id}>
                <div className="ev-when">{c.period || (c.created_at || "").slice(0, 10)}</div>
                <div><b>{c.achieved.length} done · {c.not_achieved.length} outstanding</b><div className="muted" style={{ fontSize: ".9rem" }}>{c.summary}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
