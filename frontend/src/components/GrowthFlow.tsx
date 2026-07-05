import { useEffect, useMemo, useState } from "react";
import { askJSON, askVisionJSON } from "../lib/ai";
import { api } from "../lib/api";
import { growth, feedBrain, NEED_STATUS, type GrowthNeed, type ReviewCycle } from "../lib/growth";
import { useGantt, newGanttItem } from "../lib/devstore";
import GanttChart from "./GanttChart";

/* Curio · Develop — the guided growth loop. One persistent flow per child:
   Overview → Needs → Review → Plan → Submit → Recap. Inputs persist across
   steps and only reset on submit or "start another"; a dirty flag warns before
   leaving mid-flow. Every submission records a dated snapshot so the Insights
   evolution chart has real history to draw. */

export interface FlowCtx {
  id: string; name: string; age: number; gender: string;
  interests: string[]; strengths: string[]; struggles: string[]; gaps: string[]; likes: string[]; dislikes: string[];
}
type Step = "overview" | "needs" | "review" | "plan" | "submit" | "recap";
const STEPS: { key: Step; label: string }[] = [
  { key: "overview", label: "Overview" }, { key: "needs", label: "Needs" }, { key: "review", label: "Review" },
  { key: "plan", label: "Plan" }, { key: "submit", label: "Submit" }, { key: "recap", label: "Insights" },
];
const AREAS = ["Focus & attention", "Reading", "Writing", "Maths", "Behaviour & emotions", "Routine & sleep", "Social skills", "Confidence", "Other"];
const NUDGES = ["Happens at homework time", "Worse when tired", "School has flagged it", "Affects the whole family", "Better with 1:1 support", "Getting worse recently", "Only in certain subjects", "Started this term"];

interface Item { point: string; implication: string; }
interface Result { summary: string; working: Item[]; watch: Item[]; recommendations: { task: string; focus: string; durationDays: number }[]; }
const DISC = "This is practical guidance to support your parenting — not a diagnosis or medical advice.";

function pImg(p: string) { return "The parent has ATTACHED A PHOTO you can see (typed/printed text = the teacher's instructions/task; handwriting = the child's own answers). Read it first; do not ask about anything already visible in it. " + p; }
function ctxLine(c: FlowCtx) {
  return `Child: ${c.name}, age ${c.age}, ${c.gender}. Interests: ${c.interests.join(", ") || "—"}. Strengths: ${c.strengths.join(", ") || "—"}. Struggles: ${c.struggles.join(", ") || "—"}. Known gaps: ${c.gaps.join(", ") || "—"}.`;
}
function fallback(area: string, c: FlowCtx): Result {
  const top = (c.interests[0] || "their favourite things").toLowerCase();
  return {
    summary: `A short, specific plan for ${c.name} around ${area.toLowerCase()}, built from small daily steps anchored to ${top}.`,
    working: [
      { point: `${c.name} responds to short, clear tasks`, implication: "Keep sessions to 10–15 minutes so effort stays available." },
      { point: `Strong interest in ${top}`, implication: "Anchor new work to it and resistance drops sharply." },
    ],
    watch: [
      { point: "Long or multi-step instructions get lost", implication: "Give one step at a time, and have them repeat it back." },
      { point: "Time feels abstract", implication: "Make it visible with a timer so focus has a finish line." },
    ],
    recommendations: [
      { task: `Daily 10-minute ${area.toLowerCase()} session tied to ${top}`, focus: area, durationDays: 14 },
      { task: "Use a visible timer; start at 10 minutes", focus: "Attention", durationDays: 14 },
      { task: "One instruction at a time; ask them to repeat it", focus: "Working memory", durationDays: 14 },
      { task: "Immediate specific praise for starting", focus: "Motivation", durationDays: 21 },
    ],
  };
}

export default function GrowthFlow({ ctx, accent, onGoInsights }: { ctx: FlowCtx; accent: string; onGoInsights: () => void }) {
  const [step, setStep] = useState<Step>("overview");
  const [items, setItems] = useGantt(ctx.id);

  // needs input (persists across steps)
  const [text, setText] = useState("");
  const [area, setArea] = useState(AREAS[0]);
  const [areaOther, setAreaOther] = useState("");
  const [deep, setDeep] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [clarifs, setClarifs] = useState<{ q: string; a: string }[]>([]);
  const [pendingQ, setPendingQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [phase, setPhase] = useState<"compose" | "clarify">("compose");
  const [inputMode, setInputMode] = useState<"type" | "url" | "photo">("type");
  const [url, setUrl] = useState("");
  const [imgData, setImgData] = useState("");
  const [imgType, setImgType] = useState("image/jpeg");
  const [imgName, setImgName] = useState("");
  const onFile = (f: File) => {
    setImgName(f.name); setErr("");
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      const maxDim = 1568;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
      const cx = canvas.getContext("2d"); if (cx) cx.drawImage(img, 0, 0, w, h);
      const durl = canvas.toDataURL("image/jpeg", 0.85);
      URL.revokeObjectURL(url);
      setImgData(durl.split(",")[1] || ""); setImgType("image/jpeg");
    };
    img.onerror = () => { URL.revokeObjectURL(url); setErr("Couldn't read that image - try another photo."); };
    img.src = url;
  };

  const [review, setReview] = useState<Result | null>(null);
  const [chosen, setChosen] = useState<Set<number>>(new Set());
  const [addedCount, setAddedCount] = useState(0);
  const [addedAreas, setAddedAreas] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [needs, setNeeds] = useState<GrowthNeed[]>([]);
  const [lastReview, setLastReview] = useState<ReviewCycle | null>(null);
  useEffect(() => {
    growth.listNeeds(ctx.id).then(setNeeds).catch(() => {});
    growth.listReviews(ctx.id).then((r) => setLastReview(r[0] || null)).catch(() => {});
  }, [ctx.id, submitted]);

  const areaValue = area === "Other" ? (areaOther.trim() || "General") : area;
  const dirty = (text.trim().length > 0 || !!review) && !submitted;
  useEffect(() => {
    (window as unknown as { __curioFlowDirty?: boolean }).__curioFlowDirty = dirty;
    const warn = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => { window.removeEventListener("beforeunload", warn); (window as unknown as { __curioFlowDirty?: boolean }).__curioFlowDirty = false; };
  }, [dirty]);

  const areasToConsider = useMemo(() => {
    const open = needs.filter((n) => n.status !== "achieved").map((n) => n.area);
    return Array.from(new Set([...ctx.gaps, ...ctx.struggles, ...open].filter(Boolean))).slice(0, 8);
  }, [needs, ctx.gaps, ctx.struggles]);

  const addGantt = (task: string, focus: string, days = 14) => setItems([...items, newGanttItem(task, focus, days)]);

  // ---- Needs → Review ----
  async function nextClarify(history: { q: string; a: string }[]) {
    setBusy(true);
    const p = `You are helping a parent. ${ctxLine(ctx)}\nParent's need (area: ${areaValue}): "${text}". Context flags: ${picked.join(", ") || "none"}.\nAlready answered: ${history.map((h) => `Q:${h.q} A:${h.a}`).join(" | ") || "none"}.\nAsk the single most useful next question to make the plan specific. If you have enough, set enough=true, question="". Return ONLY JSON: {"question": string, "enough": boolean}`;
    const isPhoto = inputMode === "photo" && !!imgData;
    const j = isPhoto ? await askVisionJSON<{ question: string; enough: boolean }>(pImg(p), imgData, imgType) : await askJSON<{ question: string; enough: boolean }>(p);
    setBusy(false);
    if (!j || j.enough || !j.question.trim() || history.length >= 4) { analyze(history); return; }
    setPendingQ(j.question.trim()); setAnswer(""); setPhase("clarify");
  }
  async function analyze(history: { q: string; a: string }[]) {
    setBusy(true); setErr("");
    const isPhoto = inputMode === "photo" && !!imgData;
    let material = text.trim();
    if (inputMode === "url" && url.trim()) {
      try { const r = await api.fetchUrl(url.trim()); material = `${text}\n\nContent fetched from ${url}:\n${r.text}`.trim(); }
      catch { setErr("Couldn't fetch that URL — check it and try again."); setBusy(false); return; }
    }
    const src = isPhoto ? "The parent has attached a PHOTO of the child's school work. IMPORTANT: typed/printed text in the image is the TEACHER's instructions/task; handwritten text is the CHILD's own answers. Read BOTH carefully, judge how well the child actually followed each instruction - cite specifics of what they did well and exactly where they went wrong - and base the working/watch/recommendations on that concrete evidence, not generalities." : "";
    const p = `You are a paediatric learning & development planning assistant helping a PARENT. This is guidance, not diagnosis. ${ctxLine(ctx)}\nLikes: ${ctx.likes.join(", ") || "—"}. Dislikes: ${ctx.dislikes.join(", ") || "—"}.\n${src}\nNeed (area: ${areaValue}): "${material || "(see attached image)"}". Context flags: ${picked.join(", ") || "none"}. Clarifications: ${history.map((h) => `${h.q} → ${h.a}`).join(" | ") || "none"}.\nProduce a SPECIFIC, tailored plan (avoid generic filler; use evidence-based strategies). Return ONLY JSON: {"summary": string, "working": [{"point": string, "implication": string}], "watch": [{"point": string, "implication": string}], "recommendations": [{"task": string, "focus": string, "durationDays": number}]}. 2-4 items in working and watch (implication = why it matters / the benefit); 4-6 recommendations.`;
    const j = isPhoto ? await askVisionJSON<Result>(p, imgData, imgType) : await askJSON<Result>(p);
    setBusy(false);
    const r = j && Array.isArray(j.recommendations) && j.recommendations.length ? j : fallback(areaValue, ctx);
    setReview(r); setChosen(new Set(r.recommendations.map((_, i) => i))); setStep("review");
  }

  const startNeeds = () => {
    const hasInput = (inputMode === "type" && text.trim()) || (inputMode === "url" && url.trim()) || (inputMode === "photo" && imgData);
    if (!hasInput) { setErr(inputMode === "photo" ? "Upload a photo first." : inputMode === "url" ? "Paste a URL first." : "Describe the need first."); return; }
    if (deep) nextClarify([]); else analyze([]);
  };
  const submitClarify = (skip: boolean) => { const h = [...clarifs, { q: pendingQ, a: skip ? "(skipped)" : answer.trim() || "(skipped)" }]; setClarifs(h); nextClarify(h); };

  const toggleRec = (i: number) => setChosen((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const addChosen = () => {
    if (!review) return;
    const recs = review.recommendations.filter((_, i) => chosen.has(i));
    setItems([...items, ...recs.map((r) => newGanttItem(r.task, r.focus, r.durationDays))]);
    setAddedCount(recs.length); setStep("plan");
  };

  // ---- Submit ----
  const doneItems = items.filter((g) => g.status === "done" || g.progress >= 100);
  const scores = useMemo(() => {
    const m: Record<string, number> = {};
    const rank: Record<string, number> = { emerging: 25, working: 50, improving: 75, achieved: 100 };
    needs.forEach((n) => { m[n.area] = rank[n.status] ?? 40; });
    m[areaValue] = Math.max(m[areaValue] || 0, items.length ? Math.round((doneItems.length / items.length) * 100) : 20);
    return m;
  }, [needs, items, areaValue]);

  const submit = async () => {
    setBusy(true); setErr("");
    try {
      await growth.putNeed({ child_id: ctx.id, title: text.slice(0, 140), area: areaValue, status: "working" });
      await growth.putReview({
        child_id: ctx.id, period: new Date().toISOString().slice(0, 10),
        summary: review?.summary || text.slice(0, 200),
        achieved: doneItems.map((g) => g.task), not_achieved: items.filter((g) => !doneItems.includes(g)).map((g) => g.task),
        improvements: [], next: (review?.recommendations || []).map((r) => r.task), scores,
      } as Parameters<typeof growth.putReview>[0]);
      feedBrain(`New development need submitted for ${ctx.name} (${areaValue}): ${text}. ${review?.summary || ""}`, "Growth · submission");
      setSubmitted(true); setStep("recap");
    } catch { setErr("Couldn't submit — check you're signed in."); }
    finally { setBusy(false); }
  };

  const reset = () => {
    setText(""); setArea(AREAS[0]); setAreaOther(""); setDeep(false); setPicked([]); setClarifs([]); setPendingQ(""); setAnswer("");
    setPhase("compose"); setReview(null); setChosen(new Set()); setAddedCount(0); setSubmitted(false); setErr(""); setStep("overview");
  };

  const canGo = (s: Step) => {
    const order = STEPS.map((x) => x.key); const cur = order.indexOf(step); const t = order.indexOf(s);
    if (t <= cur) return true;
    if (s === "review") return !!review;
    if (s === "plan") return !!review;
    if (s === "submit") return !!review;
    if (s === "recap") return submitted;
    return false;
  };

  return (
    <div className="gf" style={{ ["--gf-accent" as string]: accent }}>
      <div className="gf-steps">
        {STEPS.map((s, i) => (
          <button key={s.key} className={"gf-step" + (step === s.key ? " on" : "") + (canGo(s.key) ? "" : " off")}
            disabled={!canGo(s.key)} onClick={() => canGo(s.key) && setStep(s.key)}>
            <span className="gf-num">{i + 1}</span>{s.label}
          </button>
        ))}
      </div>

      {/* ---------- OVERVIEW ---------- */}
      {step === "overview" && (
        <div className="gf-card">
          <div className="spine">
            <div className="spine-card"><div className="spine-n">{needs.filter((n) => n.status !== "achieved").length}</div><div className="spine-l">Active needs</div></div>
            <div className="spine-card"><div className="spine-n" style={{ color: "#5BBF8A" }}>{needs.filter((n) => n.status === "achieved").length}</div><div className="spine-l">Achieved</div></div>
            <div className="spine-card"><div className="spine-n">{items.length ? Math.round((doneItems.length / items.length) * 100) : 0}%</div><div className="spine-l">Plan progress</div></div>
            <div className="spine-card spine-wide"><div className="spine-l">Last review</div><div className="spine-rev">{lastReview ? `${lastReview.period} — ${lastReview.summary}` : "None yet — submit a need to start."}</div></div>
          </div>

          <h3 className="gf-h">Where {ctx.name} is right now</h3>
          <p className="muted" style={{ marginTop: 0 }}>Strengths: {ctx.strengths.join(", ") || "—"}. Watching: {ctx.gaps.join(", ") || "—"}.</p>

          {needs.length > 0 && (
            <div className="gf-needlist">
              {needs.slice(0, 6).map((n) => {
                const st = NEED_STATUS.find((s) => s.key === n.status) || NEED_STATUS[0];
                return <div className="gf-needrow" key={n.id}><span className="gf-dot" style={{ background: st.color }} /><b>{n.title || n.area}</b><span className="gf-needarea">{n.area}</span><span className="gf-needst" style={{ color: st.color }}>{st.label}</span></div>;
              })}
            </div>
          )}

          <h3 className="gf-h">Areas to consider</h3>
          <p className="muted" style={{ marginTop: 0 }}>Tap to add straight to the plan, or describe a need below for a full analysis.</p>
          <div className="gf-areas">
            {areasToConsider.length === 0 && <span className="muted">No flagged areas yet.</span>}
            {areasToConsider.map((a) => {
              const done = addedAreas.includes(a);
              return (
                <button key={a} className={"gf-areachip" + (done ? " added" : "")} disabled={done}
                  onClick={() => { addGantt(`Work on: ${a}`, a, 14); setAddedAreas((x) => [...x, a]); }}>
                  {done ? "✓ Added" : "＋ " + a}
                </button>
              );
            })}
          </div>
          {addedAreas.length > 0 && <div className="gf-added">✓ Added {addedAreas.length} to {ctx.name}'s plan — see them under <b>Plan</b>, or open them in Family → Gantt.</div>}

          <button className="gf-go" style={{ marginTop: 18 }} onClick={() => setStep("needs")}>Describe a need →</button>
        </div>
      )}

      {/* ---------- NEEDS ---------- */}
      {step === "needs" && (
        <div className="gf-card">
          {phase === "compose" ? (
            <>
              <div className="gf-ey">Needs · describe the problem</div>
              <h3 className="gf-h">What do you need help with for {ctx.name}?</h3>
              <p className="muted" style={{ marginTop: 0 }}>Be specific — the real situation. e.g. "can't sit still for homework, we end up in tears every evening."</p>
              <div className="gf-imode">
                {(["type", "url", "photo"] as const).map((m) => (
                  <button key={m} className={inputMode === m ? "on" : ""} onClick={() => setInputMode(m)}>{m === "type" ? "✍ Type" : m === "url" ? "🔗 URL" : "📷 Photo"}</button>
                ))}
              </div>
              {inputMode === "type" && <textarea className="gf-ta" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder={`Help me with ${ctx.name}…`} />}
              {inputMode === "url" && <>
                <input className="gf-ta" style={{ minHeight: 0 }} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… (a report, article or worksheet page)" />
                <textarea className="gf-ta" rows={2} style={{ marginTop: 8 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Optional: what should I look for?" />
              </>}
              {inputMode === "photo" && <>
                <label className="gf-file">
                  <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
                  <span>{imgName ? `📎 ${imgName}` : "📷 Choose a photo of the work / situation"}</span>
                </label>
                <textarea className="gf-ta" rows={2} style={{ marginTop: 8 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Optional: what should I look for?" />
              </>}
              <div className="gf-frow">
                <div className="gf-field"><label>Area</label>
                  <select value={area} onChange={(e) => setArea(e.target.value)}>{AREAS.map((a) => <option key={a}>{a}</option>)}</select>
                </div>
                {area === "Other" && <div className="gf-field"><label>Describe the area</label><input value={areaOther} onChange={(e) => setAreaOther(e.target.value)} placeholder="e.g. Handwriting" /></div>}
              </div>
              <label className="gf-toggle"><input type="checkbox" checked={deep} onChange={(e) => setDeep(e.target.checked)} /><span><b>Deep Thinking</b> — I'll ask a few questions and show extra context options to make the plan much sharper</span></label>
              {deep && (
                <div className="gf-nudges">
                  <div className="gf-ey" style={{ marginBottom: 6 }}>Add context (optional)</div>
                  {NUDGES.map((nu) => <button key={nu} className={"gf-nchip" + (picked.includes(nu) ? " on" : "")} onClick={() => setPicked((p) => p.includes(nu) ? p.filter((x) => x !== nu) : [...p, nu])}>{nu}</button>)}
                </div>
              )}
              {err && <div className="gf-err">{err}</div>}
              {busy
                ? <div className="gf-busy"><span className="gf-spin" /> Preparing {ctx.name}'s plan…</div>
                : <button className="gf-go" style={{ marginTop: 14 }} onClick={startNeeds}>{deep ? "Start questions →" : "Analyse →"}</button>}
            </>
          ) : (
            <>
              <div className="gf-ey">Deep Thinking · question {clarifs.length + 1}</div>
              <h3 className="gf-h">{pendingQ}</h3>
              <textarea className="gf-ta" rows={2} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your answer (or skip)…" disabled={busy} />
              {busy
                ? <div className="gf-busy"><span className="gf-spin" /> Preparing {ctx.name}'s plan…</div>
                : <div className="gf-brow">
                    <button className="gf-go" onClick={() => submitClarify(false)}>Answer →</button>
                    <button className="gf-ghost" onClick={() => submitClarify(true)}>Skip</button>
                    <button className="gf-ghost" onClick={() => analyze(clarifs)}>Enough — analyse →</button>
                  </div>}
              {clarifs.length > 0 && <div className="gf-hist">{clarifs.map((c, i) => <div key={i}><b>{c.q}</b> — {c.a}</div>)}</div>}
            </>
          )}
        </div>
      )}

      {/* ---------- REVIEW ---------- */}
      {step === "review" && review && (
        <div className="gf-card">
          <div className="gf-ey">Review · what we found</div>
          <div className="gf-summary">{review.summary}</div>
          <div className="pt-board">
            <div className="pt-col pt-good"><h4>✅ Working / strengths</h4><ul>{review.working.map((it, i) => <li key={i}><b>{it.point}.</b> {it.implication}</li>)}</ul></div>
            <div className="pt-col pt-bad"><h4>⚠️ To work on / be aware of</h4><ul>{review.watch.map((it, i) => <li key={i}><b>{it.point}.</b> {it.implication}</li>)}</ul></div>
          </div>
          <div className="pt-rechead"><h4>Recommendations</h4><span className="muted">Tick the ones to add</span></div>
          <div className="pt-recs">
            {review.recommendations.map((r, i) => (
              <label className={"gf-rec" + (chosen.has(i) ? " on" : "")} key={i}>
                <input type="checkbox" checked={chosen.has(i)} onChange={() => toggleRec(i)} />
                <div className="pt-recbody"><div className="pt-rectask">{r.task}</div><div className="pt-recmeta"><span className="pt-focus">{r.focus}</span><span className="pt-dur">≈ {r.durationDays} days</span></div></div>
              </label>
            ))}
          </div>
          <div className="gf-pro">👩‍⚕️ {DISC}</div>
          <div className="gf-brow" style={{ marginTop: 14 }}>
            <button className="gf-go" disabled={chosen.size === 0} onClick={addChosen}>Add {chosen.size} to plan →</button>
            <button className="gf-ghost" onClick={() => setStep("needs")}>Back</button>
          </div>
        </div>
      )}

      {/* ---------- PLAN ---------- */}
      {step === "plan" && (
        <div className="gf-card">
          <div className="gf-ey">Plan · what you're committing to</div>
          <h3 className="gf-h">{ctx.name}'s plan {addedCount > 0 && <span className="muted">· {addedCount} just added</span>}</h3>
          <GanttChart items={items} onChange={setItems} accent={accent} />
          <div className="gf-brow" style={{ marginTop: 14 }}>
            <button className="gf-go" onClick={() => setStep("submit")}>Continue →</button>
            <button className="gf-ghost" onClick={() => setStep(review ? "review" : "needs")}>Back</button>
          </div>
        </div>
      )}

      {/* ---------- SUBMIT ---------- */}
      {step === "submit" && (
        <div className="gf-card">
          <div className="gf-ey">Submit · save this cycle</div>
          <h3 className="gf-h">Ready to submit</h3>
          <div className="gf-submitbox">
            <div><b>Need:</b> {text || "(from Overview areas)"}</div>
            <div><b>Area:</b> {areaValue}</div>
            <div><b>Plan:</b> {items.length} task{items.length === 1 ? "" : "s"} tracked</div>
          </div>
          <p className="muted">Submitting records this cycle for {ctx.name}, updates the Brain, and captures a dated snapshot so you can see progress over time in Insights.</p>
          {err && <div className="gf-err">{err}</div>}
          <div className="gf-brow" style={{ marginTop: 8 }}>
            <button className="gf-go" disabled={busy} onClick={submit}>{busy ? "Submitting…" : "Submit this cycle ✓"}</button>
            <button className="gf-ghost" onClick={() => setStep("plan")}>Back</button>
          </div>
        </div>
      )}

      {/* ---------- RECAP ---------- */}
      {step === "recap" && (
        <div className="gf-card">
          <div className="gf-ey">Submitted 🎉</div>
          <h3 className="gf-h">Here's what you just did</h3>
          <div className="gf-summary">{review?.summary || `You logged a ${areaValue.toLowerCase()} need for ${ctx.name}.`}</div>
          <div className="gf-recap">
            <div>➕ Added <b>{addedCount || items.length}</b> tracked task{(addedCount || items.length) === 1 ? "" : "s"} focused on <b>{areaValue}</b>.</div>
            <div>📈 {ctx.name} now has <b>{needs.filter((n) => n.status !== "achieved").length}</b> active need{needs.filter((n) => n.status !== "achieved").length === 1 ? "" : "s"} and a plan at <b>{items.length ? Math.round((doneItems.length / items.length) * 100) : 0}%</b>.</div>
            <div>🧠 This fed the Brain — future recommendations will build on it.</div>
          </div>
          <p className="muted">Tick tasks off on the plan (also under Family → Gantt) as you go. Come back and run a Review to close the loop.</p>
          <div className="gf-brow" style={{ marginTop: 8 }}>
            <button className="gf-go" onClick={onGoInsights}>Go to Insights →</button>
            <button className="gf-ghost" onClick={reset}>Start another need</button>
          </div>
        </div>
      )}
    </div>
  );
}
