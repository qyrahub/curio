import { useEffect, useMemo, useState } from "react";
import { askJSON } from "../lib/ai";
import { growth, type ReviewCycle, type GrowthNeed, type Evaluation, type Portrait } from "../lib/growth";
import { journal, type JournalEntry } from "../lib/journal";
import { normTag } from "../lib/themes";

/* Per-child Brain: what it has absorbed (real events), the Brain's current read
   (an AI portrait built ONLY from that history, cached + refreshable, clearly an
   inference), and how it shapes guidance. No fabrication; honest when data is thin. */

const dt = (s?: string) => (s ? new Date(s) : new Date());

export default function BrainChild({ childId, childName, childAge, accent, interests, outcomes, onGoDevelop }: {
  childId: string; childName: string; childAge: number; accent: string;
  interests?: string[]; outcomes?: string[]; onGoDevelop: () => void;
}) {
  const [reviews, setReviews] = useState<ReviewCycle[]>([]);
  const [needs, setNeeds] = useState<GrowthNeed[]>([]);
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [portrait, setPortrait] = useState<Portrait | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = () => {
    setLoaded(false);
    Promise.all([
      growth.listReviews(childId).then(setReviews).catch(() => setReviews([])),
      growth.listNeeds(childId).then(setNeeds).catch(() => setNeeds([])),
      growth.listEvals(childId).then(setEvals).catch(() => setEvals([])),
      growth.listPortraits(childId).then((r) => setPortrait(r[0] || null)).catch(() => setPortrait(null)),
      journal.list("child", childId).then(setJournalEntries).catch(() => setJournalEntries([])),
    ]).finally(() => setLoaded(true));
  };
  useEffect(load, [childId]);

  const inputs = reviews.length + needs.length + evals.length + journalEntries.length;

  const absorbed = useMemo(() => {
    const items: { t: number; icon: string; label: string; sub?: string }[] = [];
    reviews.forEach((r) => items.push({ t: dt(r.created_at || r.period).getTime(), icon: "📋", label: r.summary || "Review submitted", sub: [...(r.issues || []), ...(r.strengths || [])].map(normTag).slice(0, 5).join(" · ") }));
    needs.forEach((n) => items.push({ t: dt(n.created_at).getTime(), icon: "🎯", label: `Need: ${n.title || n.area}`, sub: n.status }));
    evals.forEach((e) => items.push({ t: dt(e.created_at).getTime(), icon: "🔍", label: `Evaluated: ${e.title}`, sub: e.summary?.slice(0, 80) }));
    journalEntries.forEach((j) => items.push({ t: dt(j.created_at).getTime(), icon: "📓", label: j.text.slice(0, 90), sub: "journal" + (j.mood ? " · " + j.mood : "") }));
    return items.sort((a, b) => b.t - a.t).slice(0, 12);
  }, [reviews, needs, evals, journalEntries]);

  const refresh = async () => {
    setBusy(true); setErr("");
    const hist = reviews.slice(0, 8).map((r) => `- ${(r.created_at || r.period || "").slice(0, 10)}: ${r.summary}. issues: ${(r.issues || []).join(", ") || "none"}; strengths: ${(r.strengths || []).join(", ") || "none"}`).join("\n");
    const needLines = needs.map((n) => `${n.title || n.area} (${n.status})`).join("; ") || "none";
    const declared = `Parent's declared focus for ${childName} — INTENT, NOT EVIDENCE: interests=${(interests || []).join(", ") || "none stated"}; nurture goals=${(outcomes || []).join(", ") || "none stated"}. Use this to know what the parent cares about (bias your language toward these areas when history is silent), but do NOT treat it as observation of the child's actual skills or behaviour.`;
    const prompt = `You are "the Brain" — summarise your current read of a child from their real history only. Child: ${childName}, age ${childAge}. Inputs so far: ${inputs}.\n${declared}\nReviews:\n${hist || "none yet"}\nNeeds: ${needLines}.\nWrite a warm, plain-language read. Base every strength/challenge/improving/watch ONLY on the review history; if it's thin, keep it short and say what's still unknown rather than inventing. Be specific and reference concrete patterns from the reviews (e.g. "recurring spelling slips", "focus improving at homework") - avoid generic parenting platitudes; each list item 4-10 words. Return ONLY JSON: {"summary": string, "strengths": [string], "challenges": [string], "improving": [string], "watch": [string]}.`;
    const j = await askJSON<Omit<Portrait, "id" | "child_id">>(prompt);
    if (!j) { setErr("Couldn't refresh the read just now — try again."); setBusy(false); return; }
    try {
      const saved = await growth.putPortrait({ child_id: childId, summary: j.summary || "", strengths: j.strengths || [], challenges: j.challenges || [], improving: j.improving || [], watch: j.watch || [], inputs });
      setPortrait(saved);
    } catch { setErr("Generated, but couldn't save."); }
    setBusy(false);
  };

  if (!loaded) return <div className="muted">Loading {childName}'s Brain…</div>;

  const chip = (label: string, arr: string[] | undefined, cls: string) => (arr && arr.length ? (
    <div className="bc-facet"><span className={"bc-ftag " + cls}>{label}</span><div>{arr.map((x, i) => <span key={i} className="bc-pill">{x}</span>)}</div></div>
  ) : null);

  return (
    <div className="bc" style={{ ["--bc-accent" as string]: accent }}>
      {/* Layer 1 — absorbed */}
      <div className="bc-card">
        <div className="bc-h"><span className="pulse-dot" /> What the Brain has absorbed <span className="muted">· {inputs} input{inputs === 1 ? "" : "s"}</span></div>
        {absorbed.length === 0 ? <div className="evo-empty">Nothing yet. Submit a Review or evaluation in Develop and it flows in here — real events only.</div> : (
          <div className="bc-feed">
            {absorbed.map((a, i) => (
              <div className="bc-item" key={i}>
                <span className="bc-ic">{a.icon}</span>
                <div><b>{a.label}</b>{a.sub && <div className="muted bc-sub">{a.sub}</div>}</div>
                <span className="bc-when">{new Date(a.t).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Layer 1b — declared focus (parent intent, not observed evidence) */}
      {((interests && interests.length) || (outcomes && outcomes.length)) && (
        <div className="bc-card">
          <div className="bc-h">🎯 Declared focus <span className="muted">· what you set up for {childName}</span></div>
          <p className="muted bc-disc">These are your intent, not observations. The Brain uses them to know where to look and how to phrase things — it never treats them as evidence of what {childName} can already do.</p>
          {chip("Interests", interests, "improving")}
          {chip("Nurture goals", outcomes, "good")}
        </div>
      )}

      {/* Layer 2 — the read */}
      <div className="bc-card">
        <div className="bc-h">🧠 The Brain's current read of {childName}</div>
        <p className="muted bc-disc">An AI inference built only from the history above — a working portrait, not a fact or diagnosis. Refresh after new reviews.</p>
        {portrait ? (
          <>
            <div className="bc-summary">{portrait.summary}</div>
            {chip("Strengths", portrait.strengths, "good")}
            {chip("Improving", portrait.improving, "improving")}
            {chip("Challenges", portrait.challenges, "bad")}
            {chip("Watch", portrait.watch, "watch")}
            <div className="muted bc-gen">Read from {portrait.inputs ?? inputs} inputs · {portrait.created_at ? new Date(portrait.created_at).toLocaleString() : "just now"}</div>
          </>
        ) : <div className="evo-empty">{inputs === 0 ? "Still learning — no inputs yet. Submit a review in Develop first." : `Ready to read ${childName} from ${inputs} input${inputs === 1 ? "" : "s"}.`}</div>}
        {err && <div className="gf-err">{err}</div>}
        <button className="gf-go" style={{ marginTop: 12 }} disabled={busy || inputs === 0} onClick={refresh}>{busy ? "Reading…" : portrait ? "↻ Refresh the read" : "Generate the read"}</button>
      </div>

      {/* Layer 3 — shaping */}
      <div className="bc-card bc-shape">
        <div className="bc-h">🔗 How this shapes {childName}'s guidance</div>
        <p>This read is what your next recommendations build on — each cycle, the Brain gets a sharper picture and the plans get more precisely theirs. Add a need or run a review to feed it further.</p>
        <button className="gf-ghost" onClick={onGoDevelop}>Go to Develop →</button>
      </div>
    </div>
  );
}
