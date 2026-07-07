import { useState } from "react";
import { api } from "../lib/api";
import { type GanttItem, newGanttItem } from "../lib/devstore";

/* Plan & Tracker — a real, multi-step assistant for a parent.
   Step 1  input the need (optional Deep Thinking = progressive clarifying Qs)
   Step 2  reflect back what was asked → refine or proceed
   Step 3  synthesise: summary + green(working)/red(watch) board + recommendations
   Step 4  add any recommendation to the child's Gantt (start/end dates)
   Live via api.ask; if that fails or returns unparseable output, an
   evidence-informed fallback library is used so it always produces something real. */

export interface ChildCtx {
  id: string; name: string; age: number; gender: string;
  interests: string[]; strengths: string[]; struggles: string[]; gaps: string[]; likes: string[]; dislikes: string[];
}
interface Rec { task: string; focus: string; durationDays: number; }
interface Result { summary: string; working: string[]; watch: string[]; recommendations: Rec[]; professional: string; }
type Phase = "intro" | "clarify" | "reflect" | "result";

const DISCLAIMER = "Practical guidance to support your parenting — not a diagnosis or medical advice.";

function ctxLine(c: ChildCtx) {
  return `Child: ${c.name}, age ${c.age}, ${c.gender}. Interests: ${(c.interests || []).join(", ") || "—"}. Strengths: ${(c.strengths || []).join(", ") || "—"}. Struggles: ${(c.struggles || []).join(", ") || "—"}. Known gaps: ${(c.gaps || []).join(", ") || "—"}.`;
}
function grabJSON<T>(reply: string): T | null {
  try {
    const a = reply.indexOf("{"), b = reply.lastIndexOf("}");
    if (a < 0 || b < 0) return null;
    return JSON.parse(reply.slice(a, b + 1)) as T;
  } catch { return null; }
}

/* ---------- evidence-informed fallback library ---------- */
function detect(text: string): string {
  const t = text.toLowerCase();
  if (/adhd|attention|focus|concentrat|hyperactiv|impuls|fidget|distract|restless|sit still/.test(t)) return "adhd";
  if (/read|literacy|phonic|dyslex|decod/.test(t)) return "reading";
  if (/math|number|count|times.?table|numeracy|arithmetic/.test(t)) return "maths";
  if (/writ|spell|hand.?writing|dysgraph/.test(t)) return "writing";
  if (/anger|emotion|melt.?down|anxious|anxiety|behav|frustrat|social|friend/.test(t)) return "emotions";
  if (/sleep|bed.?time|routine|morning|transition/.test(t)) return "routine";
  return "general";
}
function fallback(kind: string, c: ChildCtx): Result {
  const top = c.interests[0] || "their favourite things";
  const lib: Record<string, Result> = {
    adhd: {
      summary: `A short, predictable routine to help ${c.name} focus, follow through and feel successful — built from small steps, visible time, movement and immediate encouragement.`,
      working: [
        `${c.name} does best with short, clear tasks — keep them 10–15 minutes.`,
        `Interests like ${top.toLowerCase()} are strong motivators — anchor new tasks to them.`,
        `Movement and hands-on activity help attention reset.`,
        `Immediate, specific praise ("you started straight away") reinforces effort.`,
      ],
      watch: [
        `Long or multi-step instructions get lost — give one step at a time.`,
        `Transitions are hard — signal changes about 5 minutes ahead.`,
        `Distractions derail focus — clear the workspace before starting.`,
        `Time feels abstract — make it visible with a timer or visual schedule.`,
        `Frustration can build fast — plan an easy win before a harder task.`,
      ],
      recommendations: [
        { task: "Set up a visual daily routine (pictures + words)", focus: "Routine", durationDays: 14 },
        { task: "Use a visible timer for each task (start at 10 min)", focus: "Attention", durationDays: 14 },
        { task: "Give one instruction at a time; have them repeat it back", focus: "Working memory", durationDays: 14 },
        { task: "Add a 3-minute movement break between tasks", focus: "Self-regulation", durationDays: 14 },
        { task: "Catch-and-praise: name one thing done well, immediately", focus: "Motivation", durationDays: 21 },
        { task: "Chunk homework into 2–3 mini-steps with a tick box each", focus: "Follow-through", durationDays: 14 },
      ],
      professional: `If focus, impulsivity or restlessness are affecting daily life at home and school, ask your GP or a paediatrician about an ADHD assessment — this plan supports, but doesn't replace, professional guidance.`,
    },
    reading: {
      summary: `A gentle daily reading habit for ${c.name}, anchored to ${top.toLowerCase()}, that builds stamina and confidence without it feeling like work.`,
      working: [`Interest-led books lower resistance.`, `Short daily sessions beat long weekly ones.`, `Reading aloud together builds fluency.`],
      watch: [`Longer texts may overwhelm — keep sessions short.`, `Watch for specific tricky sounds and target them.`, `Pressure kills motivation — keep it playful.`],
      recommendations: [
        { task: `Bedtime read-aloud about ${top.toLowerCase()} (10 min)`, focus: "Stamina", durationDays: 21 },
        { task: "Two-minute daily sound hunt for tricky letters", focus: "Phonics", durationDays: 14 },
        { task: "Re-read a favourite aloud for fluency", focus: "Fluency", durationDays: 14 },
        { task: "Predict-the-ending before finishing a story", focus: "Comprehension", durationDays: 14 },
      ],
      professional: `If reading is a persistent struggle despite daily practice, ask the school or a specialist about a literacy/dyslexia screen.`,
    },
    maths: {
      summary: `Short, playful number practice for ${c.name} that closes a specific gap while leaning on their confidence with counting.`,
      working: [`Games make number practice feel like play.`, `Skip-counting stretches an existing strength.`, `Tiny daily doses beat cramming.`],
      watch: [`Times-table recall needs spaced repetition.`, `Abstract numbers land better with objects.`, `End on a win to protect confidence.`],
      recommendations: [
        { task: "3-a-day times-table cards (spaced repetition)", focus: "Recall", durationDays: 21 },
        { task: "Count/skip-count to 20 before bed", focus: "Number sense", durationDays: 14 },
        { task: "One real-world maths moment (cooking, shopping)", focus: "Application", durationDays: 14 },
      ],
      professional: `If number work is consistently distressing, ask about a dyscalculia screen.`,
    },
    writing: {
      summary: `Bridge ${c.name} from a strength they enjoy into low-friction writing, one short step at a time.`,
      working: [`Drawing/comics can lead into writing.`, `Short bursts reduce resistance.`, `Praising ideas (not neatness) keeps them going.`],
      watch: [`Editing is hard — separate ideas from tidying.`, `Handwriting fatigue is real — keep it brief.`, `Perfectionism can freeze them.`],
      recommendations: [
        { task: "Turn one drawing into 3 written sentences", focus: "Composition", durationDays: 14 },
        { task: "Dictate a story aloud, then copy one line", focus: "Ideas→text", durationDays: 14 },
        { task: "Fix just one thing when editing (not everything)", focus: "Editing", durationDays: 14 },
      ],
      professional: `If handwriting or spelling remains very hard, ask about an occupational-therapy or dysgraphia assessment.`,
    },
    emotions: {
      summary: `Small daily habits to help ${c.name} name feelings, steady big moments and build calmer routines.`,
      working: [`Naming feelings out loud builds regulation.`, `Predictable routines lower anxiety.`, `Calm connection beats correction in the moment.`],
      watch: [`Big feelings need a plan before they hit.`, `Transitions can trigger overwhelm.`, `Model the calm you want to see.`],
      recommendations: [
        { task: "Name one feeling at dinner (everyone shares)", focus: "Emotional vocabulary", durationDays: 21 },
        { task: "Agree a 'calm-down corner' and how to use it", focus: "Self-regulation", durationDays: 14 },
        { task: "Preview the day each morning (what's coming)", focus: "Predictability", durationDays: 14 },
      ],
      professional: `If anxiety or big feelings are affecting daily life, speak to your GP or a child psychologist.`,
    },
    routine: {
      summary: `A calmer daily rhythm for ${c.name} with visible steps and gentle transitions.`,
      working: [`Visual schedules reduce battles.`, `Consistent timing builds habit.`, `Warnings before change help.`],
      watch: [`Mornings and bedtimes need structure.`, `Too many steps overwhelm.`, `Screens near bedtime disrupt sleep.`],
      recommendations: [
        { task: "Build a picture morning routine (3–4 steps)", focus: "Independence", durationDays: 14 },
        { task: "Wind-down routine, screens off 45 min before bed", focus: "Sleep", durationDays: 21 },
        { task: "Give a 5-minute warning before transitions", focus: "Transitions", durationDays: 14 },
      ],
      professional: `If sleep problems persist, mention them to your GP.`,
    },
    general: {
      summary: `A balanced, interest-led week for ${c.name} that leans on their strengths and gently stretches one gap at a time.`,
      working: [`${c.name} learns in short bursts.`, `Interests like ${top.toLowerCase()} boost engagement.`, `Wins build confidence to try harder things.`],
      watch: [`Longer tasks lose them — keep it short.`, `One gap at a time, low pressure.`, `Consistency matters more than intensity.`],
      recommendations: [
        { task: `Daily 10-minute session tied to ${top.toLowerCase()}`, focus: "Habit", durationDays: 21 },
        { task: "One hands-on 'experiment of the week'", focus: "Curiosity", durationDays: 14 },
        { task: "Teach a parent today's idea (explaining cements it)", focus: "Consolidation", durationDays: 14 },
      ],
      professional: DISCLAIMER,
    },
  };
  return lib[kind] || lib.general;
}

export default function PlanTracker({ child, accent = "#5AA7E6", onAdd }: {
  child: ChildCtx; accent?: string; onAdd: (items: GanttItem[]) => void;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [deep, setDeep] = useState(false);
  const [problem, setProblem] = useState("");
  const [clarifs, setClarifs] = useState<{ q: string; a: string }[]>([]);
  const [pendingQ, setPendingQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [reflect, setReflect] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<number[]>([]);
  const [usedFallback, setUsedFallback] = useState(false);

  const clarText = () => clarifs.map((c) => `Q: ${c.q} A: ${c.a}`).join(" | ") || "none";

  async function nextQuestion(history: { q: string; a: string }[]) {
    setBusy(true);
    try {
      const prompt = `You are a paediatric learning & development planning assistant helping a parent. ${ctxLine(child)}\nThe parent's need: "${problem}".\nQuestions already answered: ${history.map((c) => `Q:${c.q} A:${c.a}`).join(" | ") || "none"}.\nAsk the SINGLE most useful next clarifying question to sharpen a practical plan. Keep it short and concrete. If you already have enough for a strong, specific plan, set enough=true and question="".\nReturn ONLY JSON: {"question": string, "enough": boolean}`;
      const r = await api.ask(prompt, { mode: "develop" });
      const j = grabJSON<{ question: string; enough: boolean }>(r.reply);
      if (!j || j.enough || !j.question.trim() || history.length >= 5) { await runReflect(history); return; }
      setPendingQ(j.question.trim()); setAnswer(""); setPhase("clarify");
    } catch { await runReflect(history); }
    finally { setBusy(false); }
  }

  async function runReflect(history: { q: string; a: string }[]) {
    setBusy(true);
    try {
      const prompt = `Summarise back to the parent, in 2-3 warm plain sentences, what they're asking help with and the kind of support they need. Do not give advice yet. ${ctxLine(child)}\nNeed: "${problem}". Clarifications: ${history.map((c) => `${c.q} → ${c.a}`).join(" | ") || "none"}.\nReturn ONLY JSON: {"summary": string}`;
      const r = await api.ask(prompt, { mode: "develop" });
      const j = grabJSON<{ summary: string }>(r.reply);
      setReflect(j?.summary?.trim() || `You're looking for practical help with: "${problem}". I'll build a specific, trackable plan for ${child.name} around that.`);
    } catch {
      setReflect(`You're looking for practical help with: "${problem}". I'll build a specific, trackable plan for ${child.name} around that.`);
    } finally { setBusy(false); setPhase("reflect"); }
  }

  async function runSynth() {
    setBusy(true); setUsedFallback(false);
    const prompt = `You are helping a parent support their child with practical, evidence-informed strategies. This is guidance, not diagnosis. ${ctxLine(child)}\nLikes: ${child.likes.join(", ") || "—"}. Dislikes: ${child.dislikes.join(", ") || "—"}.\nParent's need: "${problem}". Clarifications: ${clarText()}.\nProduce a real, specific plan. Use approaches supported by child-development evidence (for attention/ADHD-type needs: predictable routines, externalised/visible time, one instruction at a time, task chunking, movement breaks, immediate specific praise, reduced distractions).\nReturn ONLY JSON: {"summary": string, "working": [string], "watch": [string], "recommendations": [{"task": string, "focus": string, "durationDays": number}], "professional": string}. 3-5 items in working and watch; 4-6 recommendations.`;
    try {
      const r = await api.ask(prompt, { mode: "develop" });
      const j = grabJSON<Result>(r.reply);
      if (j && Array.isArray(j.recommendations) && j.recommendations.length && Array.isArray(j.working) && Array.isArray(j.watch)) {
        setResult({ summary: j.summary || "", working: j.working, watch: j.watch, recommendations: j.recommendations, professional: j.professional || DISCLAIMER });
      } else { setResult(fallback(detect(problem + " " + clarText()), child)); setUsedFallback(true); }
    } catch { setResult(fallback(detect(problem + " " + clarText()), child)); setUsedFallback(true); }
    finally { setBusy(false); setAdded([]); setPhase("result"); }
  }

  const start = () => { if (!problem.trim()) return; if (deep) nextQuestion([]); else runReflect([]); };
  const submitAnswer = (skip: boolean) => {
    const h = [...clarifs, { q: pendingQ, a: skip ? "(skipped)" : answer.trim() || "(skipped)" }];
    setClarifs(h); nextQuestion(h);
  };
  const reset = () => { setPhase("intro"); setProblem(""); setClarifs([]); setPendingQ(""); setAnswer(""); setReflect(""); setResult(null); setAdded([]); };

  const addRec = (rec: Rec, i: number) => { onAdd([newGanttItem(rec.task, rec.focus, rec.durationDays)]); setAdded((a) => [...a, i]); };
  const addAll = () => {
    if (!result) return;
    onAdd(result.recommendations.filter((_, i) => !added.includes(i)).map((r) => newGanttItem(r.task, r.focus, r.durationDays)));
    setAdded(result.recommendations.map((_, i) => i));
  };

  return (
    <div className="pt" style={{ ["--pt-accent" as string]: accent }}>
      {phase === "intro" && (
        <div className="pt-intro">
          <div className="pt-ey">Plan &amp; Tracker</div>
          <h3>What do you need help with?</h3>
          <p className="muted" style={{ marginTop: 0 }}>Describe the real problem — e.g. "{child.name} can't sit still for homework and we end up in tears every evening." I'll turn it into a specific, trackable plan.</p>
          <textarea className="pt-ta" rows={3} value={problem} onChange={(e) => setProblem(e.target.value)} placeholder={`Help me with ${child.name}…`} />
          <label className="pt-toggle">
            <input type="checkbox" checked={deep} onChange={(e) => setDeep(e.target.checked)} />
            <span><b>Deep Thinking</b> — ask me a few questions first to make the plan much sharper</span>
          </label>
          <button className="pt-go" disabled={!problem.trim() || busy} onClick={start}>{busy ? "Thinking…" : deep ? "Start →" : "Build the plan →"}</button>
        </div>
      )}

      {phase === "clarify" && (
        <div className="pt-step">
          <div className="pt-ey">Deep Thinking · question {clarifs.length + 1}</div>
          <h3 className="pt-q">{pendingQ}</h3>
          <textarea className="pt-ta" rows={2} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your answer (or skip)…" />
          <div className="pt-row">
            <button className="pt-go" disabled={busy} onClick={() => submitAnswer(false)}>{busy ? "…" : "Answer →"}</button>
            <button className="pt-ghost" disabled={busy} onClick={() => submitAnswer(true)}>Skip</button>
            <button className="pt-ghost" disabled={busy} onClick={() => runReflect(clarifs)}>I've said enough →</button>
          </div>
          {clarifs.length > 0 && <div className="pt-hist">{clarifs.map((c, i) => <div key={i}><b>{c.q}</b> — {c.a}</div>)}</div>}
        </div>
      )}

      {phase === "reflect" && (
        <div className="pt-step">
          <div className="pt-ey">Here's what I heard</div>
          <div className="pt-reflect">{reflect}</div>
          <div className="pt-row">
            <button className="pt-go" disabled={busy} onClick={runSynth}>{busy ? "Building…" : "That's right — build the plan →"}</button>
            <button className="pt-ghost" disabled={busy} onClick={() => { setPhase("intro"); }}>Refine</button>
          </div>
        </div>
      )}

      {phase === "result" && result && (
        <div className="pt-result">
          <div className="pt-ey">Plan for {child.name}{usedFallback ? " · offline library" : ""}</div>
          <div className="pt-summary">{result.summary}</div>
          <div className="pt-board">
            <div className="pt-col pt-good">
              <h4>✅ What's working — keep doing</h4>
              <ul>{result.working.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
            <div className="pt-col pt-bad">
              <h4>⚠️ Work on / be aware of</h4>
              <ul>{result.watch.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          </div>
          <div className="pt-rechead">
            <h4>Recommendations</h4>
            <button className="pt-ghost" onClick={addAll} disabled={added.length === result.recommendations.length}>Add all to Gantt</button>
          </div>
          <div className="pt-recs">
            {result.recommendations.map((rec, i) => (
              <div className="pt-rec" key={i}>
                <div className="pt-recbody">
                  <div className="pt-rectask">{rec.task}</div>
                  <div className="pt-recmeta"><span className="pt-focus">{rec.focus}</span><span className="pt-dur">≈ {rec.durationDays} days</span></div>
                </div>
                <button className={"pt-add" + (added.includes(i) ? " done" : "")} disabled={added.includes(i)} onClick={() => addRec(rec, i)}>
                  {added.includes(i) ? "✓ Added" : "＋ Add to Gantt"}
                </button>
              </div>
            ))}
          </div>
          <div className="pt-pro"><b>👩‍⚕️ When to get extra help:</b> {result.professional}</div>
          <div className="pt-disc">{DISCLAIMER}</div>
          <button className="pt-ghost" style={{ marginTop: 12 }} onClick={reset}>Start a new plan</button>
        </div>
      )}
    </div>
  );
}
