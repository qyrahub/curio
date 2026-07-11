import { useEffect, useMemo, useState } from "react";
import PageHero from "../components/PageHero";
import { useProfile, THEMES } from "../lib/profile";
import { journal, type JournalEntry, type JournalPatterns, type JournalSummary } from "../lib/journal";
import { addToPlanner, todayKey } from "../lib/plannerStore";
import "./journal.css";

type Scope = "child" | "family" | "general";
type Period = "week" | "month" | "quarter" | "half" | "year";

const MOODS: [string, string][] = [["🙂", "win"], ["⭐", "milestone"], ["💡", "idea"], ["😟", "worry"], ["😔", "hard day"], ["📌", "note"]];
const PERIODS: [Period, string, number][] = [["week", "Week", 7], ["month", "Month", 30], ["quarter", "Quarter", 91], ["half", "Half year", 182], ["year", "Year", 365]];

const dayOf = (e: JournalEntry) => e.entry_date || (e.created_at || "").slice(0, 10);
const sinceKey = (days: number) => { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().slice(0, 10); };

export default function Journal() {
  const { children, focusChild } = useProfile();
  const [scope, setScope] = useState<Scope>("child");
  const [childId, setChildId] = useState(focusChild?.id || children[0]?.id || "");
  const [text, setText] = useState("");
  const [mood, setMood] = useState("");
  const [when, setWhen] = useState(todayKey());
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const [patterns, setPatterns] = useState<JournalPatterns | null>(null);
  const [pbusy, setPbusy] = useState(false);
  const [period, setPeriod] = useState<Period>("month");
  const [summary, setSummary] = useState<JournalSummary | null>(null);
  const [sbusy, setSbusy] = useState(false);

  const load = () => { journal.list(scope, scope === "child" ? childId : undefined).then(setEntries).catch(() => setEntries([])); setPatterns(null); };
  useEffect(load, [scope, childId]);

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(""), 2600); };
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
      await journal.add({ scope, child_id: scope === "child" ? childId : undefined, text: text.trim(), mood, entry_date: when || todayKey() });
      setText(""); setMood(""); setWhen(todayKey()); load();
    } catch { flash("Couldn't save — check you're signed in."); }
    finally { setBusy(false); }
  };

  const del = async (id: string) => { await journal.del(id); setEntries((x) => x.filter((e) => e.id !== id)); };

  const push = async (e: JournalEntry) => {
    const date = dayOf(e) || todayKey();
    const cal = e.scope === "child" && e.child_id ? e.child_id : "family";
    if (!addToPlanner(cal, date, e.text, "education")) { flash("Couldn't write to the planner."); return; }
    try { const u = await journal.patch(e.id, { planned_for: date }); setEntries((x) => x.map((y) => (y.id === e.id ? u : y))); } catch { /* planner still has it */ }
    flash(`Added to the planner on ${date}.`);
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

      {msg && <div className="jn-flash">{msg}</div>}

      {/* composer */}
      <div className="jn-compose">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
          placeholder={scope === "child" ? `What did you notice about ${scopeName}?` : scope === "family" ? "A note about the family…" : "A learning idea or approach that applies to all kids…"} />
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
        {sorted.map((e) => (
          <div className="jn-entry" key={e.id}>
            <div className="jn-when">{(dayOf(e) || "").slice(5) || "—"}</div>
            <div className="jn-etext">
              {e.mood && <span className="jn-emood">{MOODS.find((m) => m[1] === e.mood)?.[0]} {e.mood}</span>}
              {e.text}
              {e.planned_for && <span className="jn-planned">🗓 on the planner · {e.planned_for}</span>}
            </div>
            <div className="jn-eacts">
              {!e.planned_for && <button className="jn-push" onClick={() => push(e)} title="Add to the planner">🗓</button>}
              <button className="jn-del" onClick={() => del(e.id)} title="Delete">✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
