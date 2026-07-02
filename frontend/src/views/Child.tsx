import { useState } from "react";
import { brand } from "../lib/brand";
import PageHero from "../components/PageHero";
import AskCurio from "../components/AskCurio";
import Flipbook from "../components/Flipbook";
import { api } from "../lib/api";
import { AgePills, Pills, Seg, toggle } from "../components/ui";
import {
  CADENCES, DETAILS, FAITHS, INTERESTS, MEDIUMS, OUTCOMES, SCOPES, SIZES,
  SPEECH_AUD, SPEECH_PLACE, SPORTS, SUBJECTS,
} from "../lib/options";
import type { ExportJob, Plan, PlanRequest } from "../types";

export default function Child() {
  const [age, setAge] = useState<number>(6);
  const [gender, setGender] = useState<string>("neutral");
  const [interests, setInterests] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [cadence, setCadence] = useState<string>("every day");
  const [scope, setScope] = useState<string>("my country");
  const [speechLen, setSpeechLen] = useState("3 minutes");
  const [speechAud, setSpeechAud] = useState<string[]>([]);
  const [speechPlace, setSpeechPlace] = useState<string[]>([]);
  const [includeSport, setIncludeSport] = useState(false);
  const [sports, setSports] = useState<string[]>([]);
  const [includeFaith, setIncludeFaith] = useState(false);
  const [faiths, setFaiths] = useState<string[]>([]);
  const [detail, setDetail] = useState<string>("summary");
  const [medium, setMedium] = useState<string>("both");
  const [size, setSize] = useState<string>("small");

  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [exp, setExp] = useState<ExportJob | null>(null);
  const [exporting, setExporting] = useState(false);
  const [resultView, setResultView] = useState<"flip" | "cards">("flip");
  const [expFmt, setExpFmt] = useState<string | null>(null);

  async function curate() {
    setBusy(true); setErr(null); setExp(null); setPlan(null);
    try {
      const req: PlanRequest = {
        age, gender, interests, subjects, outcomes,
        cadence: cadence as PlanRequest["cadence"],
        scope: scope as PlanRequest["scope"],
        speech_length: cadence === "speech" ? speechLen : null,
        speech_audience: speechAud, speech_place: speechPlace[0] ?? null,
        include_sport: includeSport, sports,
        include_faith: includeFaith, faiths,
        detail: detail as PlanRequest["detail"],
        medium: medium as PlanRequest["medium"],
        size: size as PlanRequest["size"],
      };
      setPlan(await api.createPlan(req));
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  }

  async function makeExport(fmt: PlanRequest["medium"] extends never ? never : "pptx" | "pdf" | "epub" | "txt" | "md") {
    if (!plan) return;
    setExporting(true); setExpFmt(fmt); setErr(null); setExp(null);
    try {
      let job = await api.requestExport(plan.id, fmt);
      for (let i = 0; i < 120 && job.status !== "done" && job.status !== "error"; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        job = await api.getExport(job.id);
        setExp(job);
      }
      setExp(job);
      if (job.status === "error") setErr(job.error ?? "export failed");
    } catch (e) { setErr(String(e)); } finally { setExporting(false); }
  }

  const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:8200/v1";

  return (
    <div className="view">
      <PageHero kind="child" eyebrow="Build a plan" title={<>Today's <em>learning adventure</em></>} tease={`Set the age, add a spark of what they love, and ${brand.name} builds a bright, balanced plan.`} />
      <AskCurio />
      <div className="builder">
        <div className="builder-inner">
          <div className="step">
            <div className="step-h"><span className="step-num">1</span><h3>How old is your child?</h3><span className="req">needed</span></div>
            <p className="hint">This is the only thing we need. Everything else just adds extra magic.</p>
            <AgePills value={age} onChange={setAge} />
            <label className="lbl">Colour palette <span className="opt">optional</span></label>
            <p className="hint" style={{ margin: "-4px 0 10px" }}>Tints the plan & slides. Girl leans pink/purple, boy leans blue/teal, neutral is the mixed default.</p>
            <Seg opts={["neutral", "girl", "boy"]} value={gender} onChange={setGender} />
          </div>

          <div className="step">
            <div className="step-h"><span className="step-num">2</span><h3>What do they love? <span className="muted">optional</span></h3></div>
            <Pills opts={INTERESTS} selected={interests} onToggle={(v) => setInterests(toggle(interests, v))} />
          </div>

          <div className="step">
            <div className="step-h"><span className="step-num">3</span><h3>School subjects to weave in</h3></div>
            <Pills opts={SUBJECTS} selected={subjects} onToggle={(v) => setSubjects(toggle(subjects, v))} />
          </div>

          <div className="step">
            <div className="step-h"><span className="step-num">4</span><h3>What would you like to nurture?</h3></div>
            <Pills opts={OUTCOMES} selected={outcomes} onToggle={(v) => setOutcomes(toggle(outcomes, v))} />
          </div>

          <div className="step">
            <div className="step-h"><span className="step-num">5</span><h3>How often?</h3></div>
            <Seg opts={CADENCES} value={cadence} onChange={setCadence} />
            {cadence === "speech" && (
              <div className="sub-block">
                <label className="lbl">Length</label>
                <input className="custom-in" value={speechLen} onChange={(e) => setSpeechLen(e.target.value)} />
                <label className="lbl">Audience</label>
                <Pills opts={SPEECH_AUD} selected={speechAud} onToggle={(v) => setSpeechAud(toggle(speechAud, v))} />
                <label className="lbl">Where</label>
                <Pills opts={SPEECH_PLACE} selected={speechPlace} onToggle={(v) => setSpeechPlace(toggle(speechPlace, v))} />
              </div>
            )}
          </div>

          <div className="step">
            <div className="step-h"><span className="step-num">6</span><h3>How far should we explore?</h3></div>
            <Seg opts={SCOPES} value={scope} onChange={setScope} />
          </div>

          <div className="step">
            <div className="step-h"><span className="step-num">7</span><h3>Add a little something</h3><span className="opt">optional</span></div>
            <div className="toggle-row">
              <label className="switch"><input type="checkbox" checked={includeSport} onChange={(e) => setIncludeSport(e.target.checked)} /><span className="slider" /></label>
              <span className="switch-label">Sport</span>
            </div>
            {includeSport && <Pills opts={SPORTS} selected={sports} onToggle={(v) => setSports(toggle(sports, v))} />}
            <div className="toggle-row" style={{ marginTop: 16 }}>
              <label className="switch"><input type="checkbox" checked={includeFaith} onChange={(e) => setIncludeFaith(e.target.checked)} /><span className="slider" /></label>
              <span className="switch-label">Faith &amp; values</span>
            </div>
            {includeFaith && <Pills opts={FAITHS} selected={faiths} onToggle={(v) => setFaiths(toggle(faiths, v))} />}
          </div>

          <div className="step">
            <div className="step-h"><span className="step-num">8</span><h3>Shape & format</h3></div>
            <label className="lbl">Detail</label><Seg opts={DETAILS} value={detail} onChange={setDetail} />
            <label className="lbl">Medium</label><Seg opts={MEDIUMS} value={medium} onChange={setMedium} />
            <label className="lbl">Length</label><Seg opts={SIZES} value={size} onChange={setSize} />
          </div>

          <div className="cta-wrap">
            <button className="btn btn-primary" disabled={busy} onClick={curate}>
              {busy ? "Curating…" : "✨ Curate the plan"}
            </button>
          </div>
          {err && <p className="muted" style={{ color: "#c0392b" }}>{err}</p>}
        </div>
      </div>

      {plan && (
        <div className="block">
          <div className="refresh-row">
            <h3>{plan.pages.length}-page plan for age {plan.request.age}</h3>
            <div className="fmts">
              {([["pdf", "📄 PDF"], ["epub", "📖 EPUB"], ["pptx", "🖼️ PPTX"], ["txt", "📝 TXT"], ["md", "⬇️ MD"]] as [string, string][]).map(([f, label]) => (
                <button key={f} className="btn btn-ghost btn-sm" disabled={exporting} onClick={() => makeExport(f as "pptx")}>
                  {exporting && expFmt === f ? "…" : label}
                </button>
              ))}
              {exp?.status === "done" && (
                <a className="btn btn-primary btn-sm" href={`${apiBase}/exports/${exp.id}/download`}>⬇ Download {exp.fmt.toUpperCase()}</a>
              )}
            </div>
          </div>
          <p className="hint">Browse it like a book below — flip through, tap 🔊 to read a challenge aloud, and 💡 to reveal the answer. No download needed.</p>
          {exporting && <p className="hint">First time generates one picture per page (~10–30s each), then they're cached.</p>}
          <div className="seg" style={{ margin: "8px 0 16px" }}>
            <button className={resultView === "flip" ? "on" : ""} aria-pressed={resultView === "flip"} onClick={() => setResultView("flip")}>📖 Flipbook</button>
            <button className={resultView === "cards" ? "on" : ""} aria-pressed={resultView === "cards"} onClick={() => setResultView("cards")}>🗂️ Cards</button>
          </div>
          {resultView === "flip" ? (
            <Flipbook plan={plan} apiBase={apiBase} />
          ) : (
            <div className="grid-cards g3">
              {plan.pages.map((p) => {
                const emoji = p.anchor_visual.split("|")[0];
                return (
                  <div key={p.id} className="card page-card">
                    <div className="card-head">
                      <span className="badge-cat">{p.domain}</span>
                      <span className="pageno">{p.order}</span>
                    </div>
                    <div className="anchor">
                      <img className="anchor-img" src={`${apiBase}/plans/${plan.id}/pages/${p.order}/image`} alt={p.topic}
                        onError={(e) => { const el = e.currentTarget; el.style.display = "none"; (el.nextElementSibling as HTMLElement).style.display = ""; }} />
                      <span className="emoji" style={{ display: "none" }}>{emoji || "✨"}</span>
                    </div>
                    <div className="card-body">
                      <h4 className="topic">{p.topic}</h4>
                      <p className="guide">{p.guideline}</p>
                      <div className="challenge"><b className="ch">Try this</b> {p.challenge}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
