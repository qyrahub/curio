import { useEffect, useMemo, useState } from "react";
import PageHero from "../components/PageHero";
import { useProfile, THEMES } from "../lib/profile";
import { journal, type JournalEntry, type JournalPatterns, type JournalSummary } from "../lib/journal";
import { addToPlanner, todayKey } from "../lib/plannerStore";
import { useDictation, dictationSupported } from "../lib/dictation";
import { analyseJournal, journalAI, type JournalAnalysis, type JournalMode, type JournalRec } from "../lib/journalAI";
import "./journal.css";

type Scope = "child" | "family" | "general";
type Period = "week" | "month" | "quarter" | "half" | "year";

const MOODS: [string, string][] = [["🙂", "win"], ["⭐", "milestone"], ["💡", "idea"], ["😟", "worry"], ["😔", "hard day"], ["📌", "note"]];
const PERIODS: [Period, string, number][] = [["week", "Week", 7], ["month", "Month", 30], ["quarter", "Quarter", 91], ["half", "Half year", 182], ["year", "Year", 365]];
const MODES: [JournalMode, string, string][] = [
  ["personal", "📝 Personal", "Your own note — the way the Journal has always worked."],
  ["conversation", "👫 Conversation", "Capture a discussion between you and another parent."],
  ["dialogue", "🧒 Dialogue", "Capture a conversation with a specific child."],
];

const dayOf = (e: JournalEntry) => e.entry_date || (e.created_at || "").slice(0, 10);
const sinceKey = (days: number) => { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().slice(0, 10); };
const modeOf = (e: JournalEntry): JournalMode => {
  // Persisted marker convention: entries in the two new modes start their text
  // with "[conversation]" or "[dialogue]" so we can tell them apart even when
  // the backend schema hasn't grown a dedicated field. Older entries default
  // to personal — no migration required.
  const t = (e.text || "").trimStart();
  if (t.startsWith("[conversation]")) return "conversation";
  if (t.startsWith("[dialogue]")) return "dialogue";
  return "personal";
};
const stripMarker = (t: string) => t.replace(/^\s*\[(conversation|dialogue)\]\s*/i, "");

export default function Journal() {
  const { children, focusChild } = useProfile();
  const [mode, setMode] = useState<JournalMode>("personal");
  const [scope, setScope] = useState<Scope>("child");
  const [childId, setChildId] = useState(focusChild?.id || children[0]?.id || "");
  const [text, setText] = useState("");
  const [mood, setMood] = useState("");
  const [when, setWhen] = useState(todayKey());
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  /* Conversation & dialogue state — a compact "who's speaking" toggle plus the
     transcript itself. The transcript is a single textarea that everyone can
     read/edit; each dictation session prepends a speaker label so the AI (and
     the parent scanning it later) can tell turns apart. */
  const [convA, setConvA] = useState("Me");
  const [convB, setConvB] = useState("Partner");
  const [dialogueChildId, setDialogueChildId] = useState(focusChild?.id || children[0]?.id || "");
  const dialogueChild = children.find((c) => c.id === dialogueChildId);

  const [analysis, setAnalysis] = useState<JournalAnalysis | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [aiById, setAiById] = useState<Record<string, JournalAnalysis>>({});

  /* Dictation. In personal mode this fills the single textarea. In the other
     two modes each speaker gets their own mic button; the transcript grows by
     appending a labelled line per dictation session. */
  const [speaker, setSpeaker] = useState<"A" | "B">("A");
  const speakerName = () => {
    if (mode === "conversation") return speaker === "A" ? (convA.trim() || "Me") : (convB.trim() || "Partner");
    if (mode === "dialogue") return speaker === "A" ? (convA.trim() || "Me") : (dialogueChild?.name || "Child");
    return "";
  };
  const appendDictation = (t: string) => {
    if (!t.trim()) return;
    if (mode === "personal") { setText((x) => (x ? x + " " : "") + t.trim()); return; }
    const label = speakerName();
    setText((x) => (x ? x.trimEnd() + "\n" : "") + `${label}: ${t.trim()}`);
  };
  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(""), 2600); };
  const dict = useDictation({ onResult: appendDictation, onError: (msg) => flash(msg) });

  const [patterns, setPatterns] = useState<JournalPatterns | null>(null);
  const [pbusy, setPbusy] = useState(false);
  const [period, setPeriod] = useState<Period>("month");
  const [summary, setSummary] = useState<JournalSummary | null>(null);
  const [sbusy, setSbusy] = useState(false);

  const load = () => {
    journal.list(scope, scope === "child" ? childId : undefined)
      .then((rows) => {
        setEntries(rows);
        // Hydrate cached AI analyses for these entries.
        const next: Record<string, JournalAnalysis> = {};
        rows.forEach((e) => { const a = journalAI.get(e.id); if (a) next[e.id] = a; });
        setAiById(next);
      })
      .catch(() => setEntries([]));
    setPatterns(null);
  };
  useEffect(load, [scope, childId]);

  const days = PERIODS.find((p) => p[0] === period)![2];
  const from = sinceKey(days);
  const periodLabel = PERIODS.find((p) => p[0] === period)![1].toLowerCase();

  const inPeriod = useMemo(() => entries.filter((e) => dayOf(e) >= from), [entries, from]);
  const sorted = useMemo(() => entries.slice().sort((a, b) => (dayOf(b) || "").localeCompare(dayOf(a) || "")), [entries]);

  /* Real stats — counted from actual entries, nothing modelled. */
  const stats = useMemo(() => {
    const byMood = new Map<string, number>();
    let planned = 0;
    inPeriod.forEach((e) => {
      const m = e.mood || "note";
      byMood.set(m, (byMood.get(m) || 0) + 1);
      if (e.planned_for) planned++;
    });
    const rank = Array.from(byMood.entries()).sort((a, b) => b[1] - a[1]);
    return { total: inPeriod.length, planned, rank, max: rank[0]?.[1] || 1 };
  }, [inPeriod]);

  const scopeName = scope === "child" ? (children.find((c) => c.id === childId)?.name || "child") : scope === "family" ? "the family" : "learning in general";

  const add = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      // Preserve marker so we can round-trip mode back on reload without a
      // backend schema change. Personal mode never gets a marker.
      const stored = mode === "personal" ? text.trim() : `[${mode}] ${text.trim()}`;
      // For conversation/dialogue, scope semantics: dialogue is scoped to the
      // selected child, conversation is scoped to the family.
      const effectiveScope: Scope = mode === "dialogue" ? "child" : mode === "conversation" ? "family" : scope;
      const effectiveChildId = mode === "dialogue" ? dialogueChildId : (effectiveScope === "child" ? childId : undefined);

      const saved = await journal.add({
        scope: effectiveScope,
        child_id: effectiveChildId,
        text: stored,
        mood,
        entry_date: when || todayKey(),
      });
      // Kick off AI analysis for the new modes. If it fails, we just carry on —
      // the entry is safely saved, the summary panel just says so.
      if (mode !== "personal") {
        setAnalysing(true);
        const participants = mode === "conversation"
          ? [convA.trim() || "Me", convB.trim() || "Partner"]
          : [convA.trim() || "Me", dialogueChild?.name || "Child"];
        const a = await analyseJournal({
          mode,
          transcript: text.trim(),
          participants,
          childName: mode === "dialogue" ? dialogueChild?.name : undefined,
          childAge: mode === "dialogue" ? dialogueChild?.age : undefined,
        });
        if (a && saved?.id) {
          journalAI.set(saved.id, a);
          setAiById((x) => ({ ...x, [saved.id]: a }));
          setAnalysis(a);
        } else {
          flash("Saved. The summary couldn't be generated just now — you can re-run it later.");
        }
        setAnalysing(false);
      }
      setText(""); setMood(""); setWhen(todayKey()); load();
    } catch { flash("Couldn't save — check you're signed in."); }
    finally { setBusy(false); }
  };

  const del = async (id: string) => {
    await journal.del(id);
    journalAI.drop(id);
    setEntries((x) => x.filter((e) => e.id !== id));
    setAiById((x) => { const y = { ...x }; delete y[id]; return y; });
  };

  const push = async (e: JournalEntry) => {
    const date = dayOf(e) || todayKey();
    const cal = e.scope === "child" && e.child_id ? e.child_id : "family";
    const ok = await addToPlanner(cal, date, stripMarker(e.text), "education");
    if (!ok) flash("Saved on this device, but couldn't sync to the server.");
    try { const u = await journal.patch(e.id, { planned_for: date }); setEntries((x) => x.map((y) => (y.id === e.id ? u : y))); } catch { /* planner still has it */ }
    flash(`Added to the planner on ${date}.`);
  };

  /* Trigger the right ecosystem side-effect for a recommendation. Kinds that
     don't map to an in-app action just show a toast (reflect). */
  const runRec = async (e: JournalEntry, rec: JournalRec) => {
    const date = dayOf(e) || todayKey();
    if (rec.kind === "planner") {
      const cal = e.scope === "child" && e.child_id ? e.child_id : "family";
      const ok = await addToPlanner(cal, date, rec.text, "education");
      flash(ok ? `Added to the planner on ${date}.` : "Saved locally — couldn't sync to the server.");
      return;
    }
    if (rec.kind === "coach") { window.location.hash = "coach"; return; }
    if (rec.kind === "develop") { window.location.hash = "develop"; return; }
    if (rec.kind === "brain") { window.location.hash = "brain"; return; }
    flash("Noted.");
  };

  const reveal = async () => {
    setPbusy(true);
    const who = scope === "child" ? (children.find((c) => c.id === childId)?.name || "the child") : scope === "family" ? "the family" : "children in general";
    try { setPatterns(await journal.patterns({ scope, child_id: scope === "child" ? childId : undefined, who })); }
    finally { setPbusy(false); }
  };

  const synth = async () => {
    setSbusy(true);
    try { setSummary(await journal.summary(from)); }
    catch { flash("Couldn't build the summary just now."); }
    finally { setSbusy(false); }
  };

  return (
    <div className="jn view">
      <PageHero kind="parent" eyebrow="Smart Journal" title={<>Notice, note, <em>learn</em></>}
        tease="Jot what happens as it happens — backdate it if it was yesterday, push it to the planner, and let the journal show you the patterns over time." />

      {/* Mode selector — the three ways to journal. Personal is the original
          Journal untouched (plus a mic). Conversation and Dialogue are
          transcript-shaped modes with per-speaker dictation and on-save AI. */}
      <div className="jn-modes">
        {MODES.map(([m, label, hint]) => (
          <button key={m} className={"jn-mode" + (mode === m ? " on" : "")}
            onClick={() => { setMode(m); setAnalysis(null); }}
            title={hint}>
            {label}
          </button>
        ))}
      </div>

      {mode === "personal" && (
        <div className="jn-scopes">
          {(["child", "family", "general"] as const).map((sc) => (
            <button key={sc} className={scope === sc ? "on" : ""} onClick={() => setScope(sc)}>{sc === "child" ? "👧 A child" : sc === "family" ? "👪 Family" : "🌱 General"}</button>
          ))}
          {scope === "child" && (
            <select className="jn-childsel" value={childId} onChange={(e) => setChildId(e.target.value)}>
              {children.map((c) => <option key={c.id} value={c.id}>{THEMES[c.theme].emoji} {c.name}</option>)}
            </select>
          )}
        </div>
      )}

      {msg && <div className="jn-flash">{msg}</div>}

      {/* Personal composer — unchanged shape, plus a mic button */}
      {mode === "personal" && (
        <div className="jn-compose">
          <div className="jn-textwrap">
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
              placeholder={scope === "child" ? `What did you notice about ${scopeName}?` : scope === "family" ? "A note about the family…" : "A learning idea or approach that applies to all kids…"} />
            {dictationSupported && (
              <button className={"jn-mic" + (dict.listening ? " on" : "")}
                onClick={() => (dict.listening ? dict.stop() : dict.start())}
                title={dict.listening ? "Stop listening" : "Dictate — Chrome/Edge only"}>
                {dict.listening ? "🎙️" : "🎤"}
              </button>
            )}
          </div>
          <div className="jn-row2">
            <label className="jn-date">
              <span>When did this happen?</span>
              <input type="date" value={when} max={todayKey()} onChange={(e) => setWhen(e.target.value || todayKey())} />
            </label>
            <span className="muted jn-hint">Defaults to today — backdate it if it happened earlier.</span>
          </div>
          <div className="jn-moods">
            {MOODS.map(([e, l]) => <button key={l} className={mood === l ? "on" : ""} onClick={() => setMood(mood === l ? "" : l)}>{e} {l}</button>)}
            <button className="jn-add" disabled={busy || !text.trim()} onClick={add}>{busy ? "Saving…" : "Add entry"}</button>
          </div>
        </div>
      )}

      {/* Conversation composer — two parents, transcript style */}
      {mode === "conversation" && (
        <div className="jn-compose">
          <div className="jn-partrow">
            <label className="jn-part"><span>You (Speaker A)</span>
              <input value={convA} onChange={(e) => setConvA(e.target.value)} placeholder="Me" /></label>
            <label className="jn-part"><span>Other parent (Speaker B)</span>
              <input value={convB} onChange={(e) => setConvB(e.target.value)} placeholder="Partner" /></label>
          </div>
          <p className="muted jn-hint">Type the conversation freely, or use the mics below — each mic labels its turn with the right speaker. Every entry stays private to you.</p>
          <div className="jn-textwrap">
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6}
              placeholder={`${convA || "Me"}: …\n${convB || "Partner"}: …`} />
          </div>
          {dictationSupported && (
            <div className="jn-mics">
              <button className={"jn-mic wide" + (dict.listening && speaker === "A" ? " on" : "")}
                onClick={() => { if (dict.listening && speaker === "A") { dict.stop(); } else { setSpeaker("A"); if (!dict.listening) dict.start(); } }}>
                {dict.listening && speaker === "A" ? "🎙️ Stop" : `🎤 ${convA || "Speaker A"}`}
              </button>
              <button className={"jn-mic wide" + (dict.listening && speaker === "B" ? " on" : "")}
                onClick={() => { if (dict.listening && speaker === "B") { dict.stop(); } else { setSpeaker("B"); if (!dict.listening) dict.start(); } }}>
                {dict.listening && speaker === "B" ? "🎙️ Stop" : `🎤 ${convB || "Speaker B"}`}
              </button>
            </div>
          )}
          <div className="jn-row2">
            <label className="jn-date">
              <span>When did this happen?</span>
              <input type="date" value={when} max={todayKey()} onChange={(e) => setWhen(e.target.value || todayKey())} />
            </label>
            <span className="muted jn-hint">Defaults to today.</span>
          </div>
          <div className="jn-moods">
            {MOODS.map(([e, l]) => <button key={l} className={mood === l ? "on" : ""} onClick={() => setMood(mood === l ? "" : l)}>{e} {l}</button>)}
            <button className="jn-add" disabled={busy || !text.trim()} onClick={add}>{busy ? "Saving…" : analysing ? "Summarising…" : "Add & summarise"}</button>
          </div>
        </div>
      )}

      {/* Dialogue composer — parent + specific child */}
      {mode === "dialogue" && (
        <div className="jn-compose">
          <div className="jn-partrow">
            <label className="jn-part"><span>You (parent)</span>
              <input value={convA} onChange={(e) => setConvA(e.target.value)} placeholder="Me" /></label>
            <label className="jn-part"><span>Child</span>
              {children.length === 0 ? (
                <input disabled placeholder="Add a child in Settings first" />
              ) : (
                <select value={dialogueChildId} onChange={(e) => setDialogueChildId(e.target.value)}>
                  {children.map((c) => <option key={c.id} value={c.id}>{THEMES[c.theme].emoji} {c.name}</option>)}
                </select>
              )}
            </label>
          </div>
          <p className="muted jn-hint">Type the exchange freely, or use the mics below. The summary will be scoped to {dialogueChild?.name || "the child"}, and recommendations can flow to their Brain, Coach or Develop.</p>
          <div className="jn-textwrap">
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6}
              placeholder={`${convA || "Me"}: …\n${dialogueChild?.name || "Child"}: …`} />
          </div>
          {dictationSupported && (
            <div className="jn-mics">
              <button className={"jn-mic wide" + (dict.listening && speaker === "A" ? " on" : "")}
                onClick={() => { if (dict.listening && speaker === "A") { dict.stop(); } else { setSpeaker("A"); if (!dict.listening) dict.start(); } }}>
                {dict.listening && speaker === "A" ? "🎙️ Stop" : `🎤 ${convA || "Me"}`}
              </button>
              <button className={"jn-mic wide" + (dict.listening && speaker === "B" ? " on" : "")}
                onClick={() => { if (dict.listening && speaker === "B") { dict.stop(); } else { setSpeaker("B"); if (!dict.listening) dict.start(); } }}>
                {dict.listening && speaker === "B" ? "🎙️ Stop" : `🎤 ${dialogueChild?.name || "Child"}`}
              </button>
            </div>
          )}
          <div className="jn-row2">
            <label className="jn-date">
              <span>When did this happen?</span>
              <input type="date" value={when} max={todayKey()} onChange={(e) => setWhen(e.target.value || todayKey())} />
            </label>
            <span className="muted jn-hint">Defaults to today.</span>
          </div>
          <div className="jn-moods">
            {MOODS.map(([e, l]) => <button key={l} className={mood === l ? "on" : ""} onClick={() => setMood(mood === l ? "" : l)}>{e} {l}</button>)}
            <button className="jn-add" disabled={busy || !text.trim() || children.length === 0} onClick={add}>{busy ? "Saving…" : analysing ? "Summarising…" : "Add & summarise"}</button>
          </div>
        </div>
      )}

      {/* Inline analysis panel — appears right after saving a
          conversation/dialogue entry. Vanishes when the user starts typing
          the next one. */}
      {analysis && mode !== "personal" && (
        <div className="jn-analysis">
          <div className="jn-ph">
            <div><b>Fresh summary</b><span className="muted"> · from the entry you just saved</span></div>
            <button className="jn-reveal" onClick={() => setAnalysis(null)}>Dismiss</button>
          </div>
          {analysis.summary && <p className="jn-psum">{analysis.summary}</p>}
          {analysis.tone && <div className="jn-tone"><span className="jn-wl">Tone</span> {analysis.tone}</div>}
          {analysis.themes.length > 0 && (
            <div className="jn-themes">{analysis.themes.map((t, i) => <div className="jn-theme" key={i}><b>{t}</b></div>)}</div>
          )}
          {analysis.recommendations.length > 0 && (
            <div className="jn-recs">
              <div className="jn-recs-h">Recommendations</div>
              {analysis.recommendations.map((r, i) => {
                const latest = sorted[0];
                return (
                  <div className="jn-rec" key={i}>
                    <span className={"jn-rkind k-" + r.kind}>{r.kind}</span>
                    <span className="jn-rt">{r.text}</span>
                    {latest && <button className="jn-rgo" onClick={() => runRec(latest, r)}>{r.kind === "planner" ? "🗓 Add to planner" : r.kind === "coach" ? "→ Coach" : r.kind === "develop" ? "→ Develop" : r.kind === "brain" ? "→ Brain" : "Noted"}</button>}
                  </div>
                );
              })}
            </div>
          )}
          <p className="muted jn-disc">An inference from what you journalled — not a diagnosis.</p>
        </div>
      )}

      {/* period stats — real counts */}
      <div className="jn-stats">
        <div className="jn-ph">
          <div><b>Over the last {periodLabel}</b><span className="muted"> · counted from real entries</span></div>
          <div className="jn-periods">
            {PERIODS.map(([p, label]) => <button key={p} className={period === p ? "on" : ""} onClick={() => { setPeriod(p); setSummary(null); }}>{label}</button>)}
          </div>
        </div>

        {stats.total === 0 ? <div className="jn-empty">Nothing journalled in this window yet.</div> : (
          <>
            <div className="jn-nums">
              <div className="jn-num"><b>{stats.total}</b><span>entries</span></div>
              <div className="jn-num"><b>{stats.planned}</b><span>added to planner</span></div>
              <div className="jn-num"><b>{stats.rank.length}</b><span>kinds of thing</span></div>
            </div>
            <div className="jn-rank">
              <div className="jn-rank-h">What you journalled most</div>
              {stats.rank.map(([m, n], i) => (
                <div className="jn-rrow" key={m}>
                  <span className="jn-rn">{i + 1}</span>
                  <span className="jn-rl">{MOODS.find((x) => x[1] === m)?.[0] || "📌"} {m}</span>
                  <span className="jn-rbar"><i style={{ width: `${(n / stats.max) * 100}%` }} /></span>
                  <span className="jn-rc">{n}×</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* the super summary — child / parent / family */}
      <div className="jn-synth">
        <div className="jn-ph">
          <div><b>What we've learnt</b><span className="muted"> · from this {periodLabel}'s entries, across every scope</span></div>
          <button className="jn-reveal" disabled={sbusy} onClick={synth}>{sbusy ? "Reading…" : summary ? "↻ Refresh" : "Build summary"}</button>
        </div>
        {summary && !summary.enough && <div className="jn-empty">Only {summary.count} entr{summary.count === 1 ? "y" : "ies"} in this window — add a few more and a real summary can be drawn.</div>}
        {summary && summary.enough && (
          <>
            <div className="jn-three">
              <div className="jn-area child"><h4>The children</h4><p>{summary.child || "Not enough to say yet."}</p></div>
              <div className="jn-area parent"><h4>You, the parent</h4><p>{summary.parent || "Not enough to say yet."}</p></div>
              <div className="jn-area family"><h4>The family</h4><p>{summary.family || "Not enough to say yet."}</p></div>
            </div>
            <p className="muted jn-disc">Drawn from {summary.count} real entries. An inference from what you wrote — not a diagnosis.</p>
          </>
        )}
      </div>

      {/* patterns for the current scope */}
      <div className="jn-patterns">
        <div className="jn-ph">
          <div><b>Patterns in {scopeName}</b><span className="muted"> · from your entries over time</span></div>
          <button className="jn-reveal" disabled={pbusy || entries.length < 2} onClick={reveal}>{pbusy ? "Reading…" : patterns ? "↻ Refresh" : "Reveal patterns"}</button>
        </div>
        {entries.length < 2 && <div className="jn-empty">Add a couple of entries and honest patterns will appear here.</div>}
        {patterns && (
          <div className="jn-pbody">
            {patterns.summary && <p className="jn-psum">{patterns.summary}</p>}
            {patterns.themes.length > 0 && <div className="jn-themes">{patterns.themes.map((t, i) => <div className="jn-theme" key={i}><b>{t.theme}</b><span>{t.trend}</span></div>)}</div>}
            {patterns.watch.length > 0 && <div className="jn-watch"><span className="jn-wl">Gently watch</span>{patterns.watch.map((w, i) => <span key={i} className="jn-wpill">{w}</span>)}</div>}
            <p className="muted jn-disc">An inference from your entries, not a diagnosis.</p>
          </div>
        )}
      </div>

      {/* timeline */}
      <div className="jn-timeline">
        {sorted.length === 0 && <div className="jn-empty">No entries yet for {scopeName}.</div>}
        {sorted.map((e) => {
          const eMode = modeOf(e);
          const eAi = aiById[e.id];
          const displayText = stripMarker(e.text);
          return (
            <div className={"jn-entry m-" + eMode} key={e.id}>
              <div className="jn-when">{(dayOf(e) || "").slice(5) || "—"}</div>
              <div className="jn-etext">
                {eMode !== "personal" && <span className={"jn-emode m-" + eMode}>{eMode === "conversation" ? "👫 conversation" : "🧒 dialogue"}</span>}
                {e.mood && <span className="jn-emood">{MOODS.find((m) => m[1] === e.mood)?.[0]} {e.mood}</span>}
                <div className={eMode === "personal" ? "jn-ebody" : "jn-ebody script"}>{displayText}</div>
                {e.planned_for && <span className="jn-planned">🗓 on the planner · {e.planned_for}</span>}
                {eAi && (
                  <details className="jn-eai">
                    <summary>
                      <b>Summary</b>
                      {eAi.tone && <span className="muted"> · {eAi.tone}</span>}
                    </summary>
                    {eAi.summary && <p className="jn-eaisum">{eAi.summary}</p>}
                    {eAi.themes.length > 0 && (
                      <div className="jn-etags">{eAi.themes.map((t, i) => <span key={i} className="jn-etag">{t}</span>)}</div>
                    )}
                    {eAi.recommendations.length > 0 && (
                      <div className="jn-recs compact">
                        {eAi.recommendations.map((r, i) => (
                          <div className="jn-rec" key={i}>
                            <span className={"jn-rkind k-" + r.kind}>{r.kind}</span>
                            <span className="jn-rt">{r.text}</span>
                            <button className="jn-rgo" onClick={() => runRec(e, r)}>{r.kind === "planner" ? "🗓 Add" : r.kind === "coach" ? "→ Coach" : r.kind === "develop" ? "→ Develop" : r.kind === "brain" ? "→ Brain" : "OK"}</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="muted jn-disc">Inference from this entry, not a diagnosis.</p>
                  </details>
                )}
              </div>
              <div className="jn-eacts">
                {!e.planned_for && <button className="jn-push" onClick={() => push(e)} title="Add to the planner">🗓</button>}
                <button className="jn-del" onClick={() => del(e.id)} title="Delete">✕</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
