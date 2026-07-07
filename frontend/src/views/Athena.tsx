import { useEffect, useMemo, useState } from "react";
import { brand } from "../lib/brand";
import PageHero from "../components/PageHero";
import AskCurio from "../components/AskCurio";
import { AgePills, Seg } from "../components/ui";
import { api } from "../lib/api";
import { speak, speechSupported } from "../lib/speech";
import type { CoachPlan, FocusArea } from "../types";

export default function Athena() {
  const [tab, setTab] = useState<"plan" | "homework" | "spelling">("plan");
  const [areas, setAreas] = useState<FocusArea[]>([]);
  const [age, setAge] = useState(7);
  const [focus, setFocus] = useState("");
  const [concern, setConcern] = useState("");
  const [weeks, setWeeks] = useState(4);
  const [plan, setPlan] = useState<CoachPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => { api.coachFocusAreas().then((a) => { setAreas(a); setFocus(a[0]?.id ?? ""); }).catch(() => {}); }, []);

  const sig = plan ? `athena:${plan.focus}:${plan.age}:${plan.weeks}` : "";
  useEffect(() => {
    if (!plan) return;
    try { setDone(JSON.parse(localStorage.getItem(sig) || "{}")); } catch { setDone({}); }
  }, [sig, plan]);

  const totalActions = plan ? plan.phases.reduce((n, p) => n + p.actions.length, 0) : 0;
  const doneCount = useMemo(() => Object.values(done).filter(Boolean).length, [done]);
  const pct = totalActions ? Math.round((doneCount / totalActions) * 100) : 0;

  const toggle = (key: string) => {
    setDone((d) => { const next = { ...d, [key]: !d[key] }; try { localStorage.setItem(sig, JSON.stringify(next)); } catch { /* ignore */ } return next; });
  };

  const generate = () => {
    if (!focus) return;
    setBusy(true);
    api.coachPlan({ age, focus, concern, weeks }).then((p) => { setPlan(p); setDone({}); }).catch(() => {}).finally(() => setBusy(false));
  };

  return (
    <div className="view">
      <PageHero kind="coach" eyebrow="Coach" title={<>A <em>bespoke plan</em> for one real need</>}
        tease="Tell Coach what your child is finding hard. It builds a clear, measurable, step-by-step plan you can track — and flags when to get extra help." />

      <div className="seg" style={{ marginBottom: 18 }}>
        <button className={tab === "plan" ? "on" : ""} aria-pressed={tab === "plan"} onClick={() => setTab("plan")}>📋 Plan</button>
        <button className={tab === "homework" ? "on" : ""} aria-pressed={tab === "homework"} onClick={() => setTab("homework")}>📚 Homework help</button>
        <button className={tab === "spelling" ? "on" : ""} aria-pressed={tab === "spelling"} onClick={() => setTab("spelling")}>🔤 Spelling & voice</button>
      </div>

      {tab === "homework" && <Homework />}
      {tab === "spelling" && (
        <div className="panel">
          <div className="eyebrow">🔤 Spelling & voice helper</div>
          <p className="muted" style={{ marginBottom: 4 }}>Tap the mic and say “spell elephant”, or ask a question — {brand.name} types it out <em>and</em> reads it aloud. Say “slower” to hear a word spelled slowly.</p>
          <AskCurio />
        </div>
      )}

      {tab === "plan" && (<>
      {!plan && (
        <div className="panel coach-form">
          <div className="step"><div className="step-h"><span className="step-num">1</span><h3>How old is your child?</h3></div>
            <AgePills value={age} onChange={setAge} /></div>
          <div className="step"><div className="step-h"><span className="step-num">2</span><h3>What would you like help with?</h3></div>
            <div className="pills">
              {areas.map((a) => (
                <button key={a.id} type="button" className="pill" aria-pressed={focus === a.id} onClick={() => setFocus(a.id)}>
                  <span className="emo">{a.icon}</span>{a.label}
                </button>
              ))}
            </div></div>
          <div className="step"><div className="step-h"><span className="step-num">3</span><h3>Tell us a bit more</h3><span className="opt">optional</span></div>
            <textarea className="custom-in" rows={3} value={concern} onChange={(e) => setConcern(e.target.value)}
              placeholder="e.g. My 7-year-old is slow with reading and loses focus quickly with English." /></div>
          <div className="step"><div className="step-h"><span className="step-num">4</span><h3>Over how long?</h3></div>
            <Seg opts={["2", "4", "6"].map((w) => `${w} weeks`)} value={`${weeks} weeks`} onChange={(v) => setWeeks(Number(v.split(" ")[0]))} /></div>
          <div className="cta-wrap"><button className="cta" disabled={busy} onClick={generate}>{busy ? "Building your plan…" : "✨ Build my plan"}</button></div>
        </div>
      )}

      {plan && (
        <div className="coach-plan printable">
          <div className="coach-bar no-print">
            <button className="btn btn-ghost btn-sm" onClick={() => setPlan(null)}>← New plan</button>
            <button className="btn btn-primary btn-sm" onClick={() => window.print()}>🖨️ Print / Save as PDF</button>
          </div>

          <div className="coach-goal">
            <span className="coach-ic">{plan.icon}</span>
            <div><span className="badge-cat">{plan.focus_label}</span><h2>{plan.goal}</h2>
              {plan.concern && <p className="muted">Your note: “{plan.concern}”</p>}</div>
          </div>

          <div className="coach-progress no-print">
            <div className="cp-head"><b>Your progress</b><span>{doneCount}/{totalActions} done · {pct}%</span></div>
            <div className="cp-track"><div className="cp-fill" style={{ width: `${pct}%` }} /></div>
            {pct === 0 && <p className="muted">Tick actions as you do them — your progress saves on this device.</p>}
          </div>

          {plan.phases.map((ph) => (
            <div key={ph.week} className={"coach-week" + (ph.week === plan.midpoint_week ? " mid" : "")}>
              <div className="cw-head"><span className="cw-num">{ph.week_label}</span><b>{ph.theme}</b></div>
              {ph.actions.map((a, i) => {
                const key = `w${ph.week}a${i}`;
                return (
                  <label key={key} className={"coach-action" + (done[key] ? " checked" : "")}>
                    <input type="checkbox" checked={!!done[key]} onChange={() => toggle(key)} />
                    <span className="ca-box" />
                    <span className="ca-body"><b>{a.text}</b><span className="ca-measure">📏 {a.measure}</span></span>
                  </label>
                );
              })}
              {ph.week === plan.midpoint_week && (
                <div className="coach-reflect"><b>🪞 Mid-point reflection</b><p>{plan.midpoint}</p></div>
              )}
            </div>
          ))}

          <div className="coach-cols">
            <div className="coach-card good"><h4>✅ Signs it's working</h4><ul>{plan.indicators.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
            <div className="coach-card watch"><h4>⚠️ Watch for (possible gaps)</h4><ul>{(plan.gaps || []).map((s, i) => <li key={i}>{s}</li>)}</ul></div>
          </div>

          <div className="coach-card nudges"><h4>💡 Gentle nudges</h4><ul>{plan.nudges.map((s, i) => <li key={i}>{s}</li>)}</ul></div>

          <div className="coach-pro"><h4>👩‍⚕️ When to get extra help</h4><p>{plan.professional}</p></div>
          <p className="coach-disclaimer">{plan.disclaimer}</p>
        </div>
      )}
      </>)}
    </div>
  );
}

function Homework() {
  const [text, setText] = useState("");
  const [ans, setAns] = useState("");
  const [busy, setBusy] = useState(false);
  const onFile = (f: File | null) => { if (f) f.text().then((t) => setText((prev) => prev ? prev + "\n" + t : t)); };
  const go = () => {
    if (!text.trim() || busy) return;
    setBusy(true); setAns("");
    api.ask(text.trim(), { mode: "homework" }).then((r) => setAns(r.reply)).catch(() => setAns("Sorry, something went wrong — please try again.")).finally(() => setBusy(false));
  };
  return (
    <div className="panel">
      <div className="eyebrow">📚 Homework help</div>
      <p className="muted" style={{ marginBottom: 8 }}>Paste the homework, questions or instructions (or upload a text file). {brand.name} answers each point, keeping the same format.</p>
      <div className="file-row">
        <label className="btn btn-ghost btn-sm file-pick">📎 Upload .txt
          <input type="file" accept=".txt,.md,text/plain" style={{ display: "none" }} onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        </label>
      </div>
      <textarea className="custom-in" rows={6} value={text} onChange={(e) => setText(e.target.value)}
        placeholder={"e.g.\n1. What is photosynthesis?\n2. Name three planets.\n3. 7 x 8 = ?"} />
      <div className="cta-wrap"><button className="btn btn-primary" disabled={busy} onClick={go}>{busy ? "Thinking…" : "✨ Answer my homework"}</button></div>
      {ans && (
        <div className="hw-answer">
          <div className="hw-answer-head"><b>Answers</b>
            {speechSupported && <span className="hw-ctrl"><button className="round-btn small" title="Read" onClick={() => speak(ans)}>🔊</button><button className="round-btn small" title="Slower" onClick={() => speak(ans, 0.6)}>🐢</button></span>}
          </div>
          <pre className="hw-pre">{ans}</pre>
        </div>
      )}
      <p className="hint">Answers come from the {brand.name} assistant — a grown-up should always check important work.</p>
    </div>
  );
}
