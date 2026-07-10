import { useEffect, useMemo, useState } from "react";
import PageHero from "../components/PageHero";
import { useProfile, THEMES } from "../lib/profile";
import { journal, type JournalEntry, type JournalPatterns } from "../lib/journal";
import "./journal.css";

type Scope = "child" | "family" | "general";
const MOODS = [["🙂", "win"], ["⭐", "milestone"], ["💡", "idea"], ["😟", "worry"], ["😔", "hard day"], ["📌", "note"]];

export default function Journal() {
  const { children, focusChild } = useProfile();
  const [scope, setScope] = useState<Scope>("child");
  const [childId, setChildId] = useState(focusChild?.id || children[0]?.id || "");
  const [text, setText] = useState("");
  const [mood, setMood] = useState("");
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [patterns, setPatterns] = useState<JournalPatterns | null>(null);
  const [pbusy, setPbusy] = useState(false);

  const load = () => { journal.list(scope, scope === "child" ? childId : undefined).then(setEntries).catch(() => setEntries([])); setPatterns(null); };
  useEffect(load, [scope, childId]);

  const sorted = useMemo(() => entries.slice().sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()), [entries]);

  const add = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try { await journal.add({ scope, child_id: scope === "child" ? childId : undefined, text: text.trim(), mood }); setText(""); setMood(""); load(); }
    finally { setBusy(false); }
  };
  const del = async (id: string) => { await journal.del(id); setEntries((x) => x.filter((e) => e.id !== id)); };
  const reveal = async () => {
    setPbusy(true);
    const who = scope === "child" ? (children.find((c) => c.id === childId)?.name || "the child") : scope === "family" ? "the family" : "children in general";
    try { setPatterns(await journal.patterns({ scope, child_id: scope === "child" ? childId : undefined, who })); }
    finally { setPbusy(false); }
  };

  const scopeName = scope === "child" ? (children.find((c) => c.id === childId)?.name || "child") : scope === "family" ? "the family" : "learning in general";

  return (
    <div className="jn view">
      <PageHero kind="parent" eyebrow="Smart Journal" title={<>Notice, note, <em>learn</em></>}
        tease="Jot observations, wins and worries as they happen. Over time the journal surfaces patterns — and everything you record feeds the wider picture." />

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

      <div className="jn-compose">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder={scope === "child" ? `What did you notice about ${scopeName} today?` : scope === "family" ? "A note about the family…" : "A learning idea, theory or approach that applies to all kids…"} />
        <div className="jn-moods">
          {MOODS.map(([e, l]) => <button key={l} className={mood === l ? "on" : ""} onClick={() => setMood(mood === l ? "" : l)} title={l}>{e} {l}</button>)}
          <button className="jn-add" disabled={busy || !text.trim()} onClick={add}>{busy ? "Saving…" : "Add entry"}</button>
        </div>
      </div>

      <div className="jn-patterns">
        <div className="jn-ph">
          <div><b>Patterns in {scopeName}</b><span className="muted"> · derived from your entries over time</span></div>
          <button className="jn-reveal" disabled={pbusy || entries.length < 2} onClick={reveal}>{pbusy ? "Reading…" : patterns ? "↻ Refresh" : "Reveal patterns"}</button>
        </div>
        {entries.length < 2 && <div className="jn-empty">Add a couple of entries and the journal will surface honest patterns here.</div>}
        {patterns && (
          <div className="jn-pbody">
            {patterns.summary && <p className="jn-psum">{patterns.summary}</p>}
            {patterns.themes.length > 0 && <div className="jn-themes">{patterns.themes.map((t, i) => <div className="jn-theme" key={i}><b>{t.theme}</b><span>{t.trend}</span></div>)}</div>}
            {patterns.watch.length > 0 && <div className="jn-watch"><span className="jn-wl">Gently watch</span>{patterns.watch.map((w, i) => <span key={i} className="jn-wpill">{w}</span>)}</div>}
            <p className="muted jn-disc">An inference from your entries, not a diagnosis.</p>
          </div>
        )}
      </div>

      <div className="jn-timeline">
        {sorted.length === 0 && <div className="jn-empty">No entries yet for {scopeName}.</div>}
        {sorted.map((e) => (
          <div className="jn-entry" key={e.id}>
            <div className="jn-when">{new Date(e.created_at || Date.now()).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</div>
            <div className="jn-etext">{e.mood && <span className="jn-emood">{MOODS.find((m) => m[1] === e.mood)?.[0]} {e.mood}</span>}{e.text}</div>
            <button className="jn-del" onClick={() => del(e.id)} title="Delete">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
