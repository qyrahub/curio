import { useEffect, useState } from "react";
import { brand } from "../lib/brand";
import PageHero from "../components/PageHero";
import { api } from "../lib/api";
import type { BrainItem } from "../types";
import { useProfile, THEMES } from "../lib/profile";
import { extractFileText } from "../lib/fileParse";
import { growth } from "../lib/growth";
import BrainChild from "../components/BrainChild";

type Mode = "idea" | "url" | "file";

export default function Brain() {
  const { children, focusChild, setFocusChild } = useProfile();
  const [log, setLog] = useState<BrainItem[]>([]);
  const [mode, setMode] = useState<Mode>("idea");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileText, setFileText] = useState("");
  const [fed, setFed] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.brainLog().then((s) => setLog(s.log)).catch(() => {}); }, []);

  const feed = async () => {
    const payload: { text?: string; url?: string; source_name?: string } = {};
    if (mode === "idea" && text.trim()) payload.text = text.trim();
    else if (mode === "url" && url.trim()) payload.url = url.trim();
    else if (mode === "file" && fileText.trim()) { payload.text = fileText.trim(); payload.source_name = fileName; }
    else { setFed("Add something first — and for a file, wait for it to be read."); return; }
    setBusy(true); setFed("");
    try {
      const k = await growth.knowledgeFeed(payload);
      setFed(`Added to the shared knowledge base: “${k.title}” — pending review before it informs guidance.`);
      setText(""); setUrl(""); setFileName(""); setFileText("");
      api.brainLog().then((r) => setLog(r.log)).catch(() => {});
    } catch {
      setFed("Couldn't read that — try different material, or check you're signed in.");
    } finally { setBusy(false); }
  };

  const onFile = async (f: File) => {
    setFileName(f.name); setFileText(""); setFed("Reading…");
    try { const t = await extractFileText(f); setFileText(t); setFed(t.trim() ? `Read ${t.length} characters from ${f.name}.` : "No readable text found in that file."); }
    catch (e) { setFed(e instanceof Error ? e.message : "Couldn't read that file."); }
  };

  return (
    <div className="view">
      <PageHero kind="brain" eyebrow="The Brain" title={<>What {brand.name} is <em>learning</em></>} tease="Two layers: what each child's Brain has learned about them, and the shared learning — general theories and approaches — that informs guidance for every family." />
      {focusChild && (
        <>
          <div className="seg wrap" style={{ margin: "4px 0 16px" }}>
            {children.map((k) => (
              <button key={k.id} className={k.id === focusChild.id ? "on" : ""} onClick={() => setFocusChild(k.id)}>{THEMES[k.theme].emoji} {k.name}</button>
            ))}
          </div>
          <BrainChild childId={focusChild.id} childName={focusChild.name} childAge={focusChild.age} accent={THEMES[focusChild.theme].accent} interests={focusChild.interests} outcomes={focusChild.outcomes} onGoDevelop={() => { window.location.hash = "develop"; }} />
          <h3 style={{ marginTop: 30 }}>Feed the shared Brain</h3>
          <p className="muted" style={{ marginTop: -6, marginBottom: 12 }}>Contribute general learning — a theory, an approach, an article (e.g. metacognition, Feuerstein) — that applies to <b>all</b> children. It is summarised in original words and added to the shared knowledge base, pending review, where it grounds guidance for every family.</p>
        </>
      )}
      <div className="panel brainwrap">
        <div className="eyebrow"><span className="pulse-dot" /> Feed the shared knowledge</div>
        <div className="seg" style={{ marginTop: 8 }}>
          {(["idea", "url", "file"] as const).map((m) => (
            <button key={m} className={mode === m ? "on" : ""} aria-pressed={mode === m} onClick={() => setMode(m)}>
              {m === "idea" ? "💡 Idea / text" : m === "url" ? "🔗 Link" : "📄 Document"}
            </button>
          ))}
        </div>
        {mode === "idea" && (
          <textarea className="custom-in" rows={3} placeholder="A learning theory, approach or study that applies to all children…" value={text} onChange={(e) => setText(e.target.value)} />
        )}
        {mode === "url" && (
          <input className="custom-in" placeholder="https://example.com/article" value={url} onChange={(e) => setUrl(e.target.value)} />
        )}
        {mode === "file" && (
          <div className="file-row">
            <label className="btn btn-ghost btn-sm file-pick">
              Choose file…
              <input type="file" accept=".pdf,.docx,.txt,.md,.csv" style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
            </label>
            <span className="muted">{fileName || "PDF, Word (.docx) or text — read in your browser"}</span>
          </div>
        )}
        <div className="cta-wrap"><button className="btn btn-primary" disabled={busy} onClick={feed}>{busy ? "Absorbing…" : "Feed The Brain"}</button>
        {fed && <div className="muted" style={{ marginTop: 10, lineHeight: 1.45 }}>{fed}</div>}</div>
        <p className="hint">Files register as a learning signal (name + type). Deep parsing of file contents is on the roadmap.</p>
      </div>

      <h3>Recently learned</h3>
      <p className="muted" style={{ marginTop: -6, marginBottom: 12 }}>Tap any item to see what it means for your child, you, and the family.</p>
      <div className="learned">
        {log.map((b, i) => (
          <div key={i} className={"learned-item" + (open === i ? " open" : "")}>
            <button className="learned-head" onClick={() => setOpen(open === i ? null : i)}>
              <span className="nic">{b.icon}</span>
              <div className="learned-main"><b>{b.title}</b><p className="muted">{b.detail}</p></div>
              <span className="chev">{open === i ? "▴" : "▾"}</span>
            </button>
            {open === i && (b.for_child || b.for_parent || b.for_family) && (
              <div className="learned-drill">
                <div className="drill-row"><span className="drill-tag child">For the child</span><p>{b.for_child}</p></div>
                <div className="drill-row"><span className="drill-tag parent">For you</span><p>{b.for_parent}</p></div>
                <div className="drill-row"><span className="drill-tag family">For the family</span><p>{b.for_family}</p></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
