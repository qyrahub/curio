import { useEffect, useState } from "react";
import { askJSON } from "../lib/ai";
import { growth, feedBrain, type Evaluation } from "../lib/growth";
import { newGanttItem, type GanttItem } from "../lib/devstore";

interface Result { summary: string; working: string[]; watch: string[]; recommendations: { task: string; focus: string; durationDays: number }[]; }

export default function EvaluatePanel({ childId, childName, childAge, accent, onAddGantt }: {
  childId: string; childName: string; childAge: number; accent: string; onAddGantt: (items: GanttItem[]) => void;
}) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [added, setAdded] = useState<number[]>([]);
  const [err, setErr] = useState("");
  const [past, setPast] = useState<Evaluation[]>([]);

  useEffect(() => { growth.listEvals(childId).then(setPast).catch(() => {}); }, [childId]);

  const run = async () => {
    if (text.trim().length < 10) { setErr("Paste at least a sentence or two of the work / what you saw."); return; }
    setErr(""); setBusy(true); setRes(null); setAdded([]);
    const prompt = `You are helping a parent understand a piece of their child's school work or a described observation. This is supportive guidance, not a formal assessment. Child: ${childName}, age ${childAge}.\nWork / observation:\n"""${text.slice(0, 4000)}"""\nRead it carefully and return ONLY JSON: {"summary": string, "working": [string], "watch": [string], "recommendations": [{"task": string, "focus": string, "durationDays": number}]}. "working" = specific strengths visible in the work; "watch" = specific issues or gaps to work on; 3-5 each; 3-6 concrete, trackable recommendations.`;
    const j = await askJSON<Result>(prompt);
    setBusy(false);
    if (!j || !Array.isArray(j.recommendations)) { setErr("The analyser is unavailable right now — try again shortly, or add needs manually under Needs."); return; }
    setRes(j);
    try {
      await growth.putEval({ child_id: childId, title: title.trim() || "Evaluation", source_text: text.slice(0, 4000), summary: j.summary, working: j.working || [], watch: j.watch || [], recommendations: j.recommendations });
      feedBrain(`Evaluation of ${childName}'s work: ${j.summary}`, "Growth · evaluation");
      growth.listEvals(childId).then(setPast).catch(() => {});
    } catch { /* best-effort */ }
  };

  const addRec = (i: number) => { if (!res) return; const r = res.recommendations[i]; onAddGantt([newGanttItem(r.task, r.focus, r.durationDays)]); setAdded((a) => [...a, i]); };
  const addAll = () => { if (!res) return; onAddGantt(res.recommendations.filter((_, i) => !added.includes(i)).map((r) => newGanttItem(r.task, r.focus, r.durationDays))); setAdded(res.recommendations.map((_, i) => i)); };

  return (
    <div className="pt" style={{ ["--pt-accent" as string]: accent }}>
      <div className="pt-ey">Evaluate</div>
      <h3>Understand a piece of {childName}'s work</h3>
      <p className="muted" style={{ marginTop: 0 }}>Paste the text of a worksheet, a story they wrote, or describe what you saw. You'll get a summary, what's working vs what to watch, and a plan you can track.</p>
      <input className="pt-ta" style={{ minHeight: 0, marginBottom: 10 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g. Maths worksheet, 12 May)" />
      <textarea className="pt-ta" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder={`Paste ${childName}'s work or describe the observation…`} />
      {err && <div className="needs-err" style={{ marginTop: 10 }}>{err}</div>}
      <button className="pt-go" style={{ marginTop: 12 }} disabled={busy} onClick={run}>{busy ? "Reading…" : "Evaluate →"}</button>
      <p className="muted" style={{ fontSize: ".8rem", marginTop: 8 }}>📷 Photo upload arrives once the vision endpoint is wired — text works fully today.</p>

      {res && (
        <div className="pt-result" style={{ marginTop: 18 }}>
          <div className="pt-summary">{res.summary}</div>
          <div className="pt-board">
            <div className="pt-col pt-good"><h4>✅ What's working</h4><ul>{res.working.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
            <div className="pt-col pt-bad"><h4>⚠️ What to watch</h4><ul>{res.watch.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
          </div>
          <div className="pt-rechead"><h4>Recommendations</h4><button className="pt-ghost" onClick={addAll} disabled={added.length === res.recommendations.length}>Add all to Gantt</button></div>
          <div className="pt-recs">
            {res.recommendations.map((r, i) => (
              <div className="pt-rec" key={i}>
                <div className="pt-recbody"><div className="pt-rectask">{r.task}</div><div className="pt-recmeta"><span className="pt-focus">{r.focus}</span><span className="pt-dur">≈ {r.durationDays} days</span></div></div>
                <button className={"pt-add" + (added.includes(i) ? " done" : "")} disabled={added.includes(i)} onClick={() => addRec(i)}>{added.includes(i) ? "✓ Added" : "＋ Add to Gantt"}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <h4 style={{ margin: "0 0 8px" }}>Past evaluations</h4>
          <div className="ev-history">
            {past.map((e) => (
              <div className="ev-item" key={e.id}>
                <div className="ev-when">{(e.created_at || "").slice(0, 10)}</div>
                <div><b>{e.title}</b><div className="muted" style={{ fontSize: ".9rem" }}>{e.summary}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
