import { useEffect, useState } from "react";
import { brand } from "../lib/brand";
import PageHero from "../components/PageHero";
import { api } from "../lib/api";
import type { BrainItem } from "../types";

type Mode = "idea" | "url" | "file";

export default function Brain() {
  const [log, setLog] = useState<BrainItem[]>([]);
  const [mode, setMode] = useState<Mode>("idea");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileKind, setFileKind] = useState("file");
  const [open, setOpen] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.brainLog().then((s) => setLog(s.log)).catch(() => {}); }, []);

  const feed = () => {
    let payload: { text?: string; url?: string; source_name?: string; kind?: string } | null = null;
    if (mode === "idea" && text.trim()) payload = { text: text.trim(), kind: "idea" };
    else if (mode === "url" && url.trim()) payload = { url: url.trim(), kind: "url" };
    else if (mode === "file" && fileName) payload = { source_name: fileName, kind: fileKind };
    if (!payload) return;
    setBusy(true);
    api.brainFeed(payload).then((s) => { setLog(s.log); setText(""); setUrl(""); setFileName(""); }).catch(() => {}).finally(() => setBusy(false));
  };

  const onFile = (f: File | null) => {
    if (!f) return;
    setFileName(f.name);
    const t = f.type;
    setFileKind(t.startsWith("video") ? "video" : t.startsWith("audio") ? "audio" : "file");
  };

  return (
    <div className="view">
      <PageHero kind="brain" eyebrow="The Brain" title={<>What {brand.name} is <em>learning</em></>} tease="Feed it ideas, links, files, audio or video — everything flows back into better plans for every family." />
      <div className="panel brainwrap">
        <div className="eyebrow"><span className="pulse-dot" /> Feed The Brain</div>
        <div className="seg" style={{ marginTop: 8 }}>
          {(["idea", "url", "file"] as const).map((m) => (
            <button key={m} className={mode === m ? "on" : ""} aria-pressed={mode === m} onClick={() => setMode(m)}>
              {m === "idea" ? "💡 Idea / text" : m === "url" ? "🔗 Link" : "📄 File / audio / video"}
            </button>
          ))}
        </div>
        {mode === "idea" && (
          <textarea className="custom-in" rows={3} placeholder="Feed it an article, study or idea…" value={text} onChange={(e) => setText(e.target.value)} />
        )}
        {mode === "url" && (
          <input className="custom-in" placeholder="https://example.com/article" value={url} onChange={(e) => setUrl(e.target.value)} />
        )}
        {mode === "file" && (
          <div className="file-row">
            <label className="btn btn-ghost btn-sm file-pick">
              Choose file…
              <input type="file" accept="audio/*,video/*,.pdf,.doc,.docx,.txt,.png,.jpg" style={{ display: "none" }}
                onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
            </label>
            <span className="muted">{fileName ? `${fileName} (${fileKind})` : "audio, video or document"}</span>
          </div>
        )}
        <div className="cta-wrap"><button className="btn btn-primary" disabled={busy} onClick={feed}>{busy ? "Absorbing…" : "Feed The Brain"}</button></div>
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
