import { useEffect, useRef, useState } from "react";
import PageHero from "../components/PageHero";
import { api } from "../lib/api";
import type { WorkbenchAsset } from "../types";

export default function Workbench() {
  const [assets, setAssets] = useState<WorkbenchAsset[]>([]);
  const [name, setName] = useState("");
  const [section, setSection] = useState<"coloring" | "searchfind" | "painting">("coloring");
  const [items, setItems] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => api.workbenchAssets().then((r) => setAssets(r.assets)).catch(() => {});
  useEffect(() => { load(); }, []);

  const upload = async () => {
    if (!file) { setMsg("Pick an image first."); return; }
    setBusy(true); setMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", name || file.name.replace(/\.[^.]+$/, ""));
      fd.append("section", section);
      fd.append("items", items);
      await api.workbenchUpload(fd);
      setName(""); setItems(""); setFile(null); if (fileRef.current) fileRef.current.value = "";
      setMsg("✓ Added — it now appears under Canvas.");
      load();
    } catch { setMsg("Upload failed — try a PNG/JPG under 8MB."); }
    finally { setBusy(false); }
  };

  const del = async (id: string) => { await api.workbenchDelete(id); load(); };

  return (
    <div className="view">
      <PageHero kind="account" eyebrow="Workbench · admin" title={<>Feed your own <em>pictures</em> in</>}
        tease="Upload artwork you make (Canva, AI, scans) and choose where it lands in Canvas. Access control for admin vs everyone is coming next." />

      <div className="panel wb-form">
        <div className="step-h"><span className="step-num">1</span><h3>Upload a picture</h3></div>
        <label className="lbl">Name</label>
        <input className="custom-in" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jungle colouring page" />

        <label className="lbl">Where should it go?</label>
        <div className="seg" style={{ marginBottom: 12 }}>
          <button className={section === "coloring" ? "on" : ""} onClick={() => setSection("coloring")}>🖍️ Colouring book</button>
          <button className={section === "searchfind" ? "on" : ""} onClick={() => setSection("searchfind")}>🔍 Search &amp; find</button>
          <button className={section === "painting" ? "on" : ""} onClick={() => setSection("painting")}>🎨 Painting studio</button>
        </div>

        {section === "searchfind" && (
          <>
            <label className="lbl">Things to find (one per line)</label>
            <textarea className="custom-in" rows={4} value={items} onChange={(e) => setItems(e.target.value)} placeholder={"glasses\nheart\nbutterfly\ncarrot"} />
          </>
        )}

        <label className="lbl">Image file (PNG / JPG / WEBP / SVG, max 8MB)</label>
        <input ref={fileRef} type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

        <div className="cta-wrap" style={{ marginTop: 14 }}>
          <button className="btn btn-primary" disabled={busy} onClick={upload}>{busy ? "Uploading…" : "⬆️ Add to Canvas"}</button>
          {msg && <span className="muted" style={{ marginLeft: 12 }}>{msg}</span>}
        </div>
      </div>

      <h3 style={{ marginTop: 24 }}>Your uploads ({assets.length})</h3>
      {assets.length === 0 && <p className="muted">Nothing yet — upload your first picture above.</p>}
      <div className="wb-grid">
        {assets.map((a) => (
          <div key={a.id} className="wb-card">
            <img src={api.workbenchImageUrl(a.id)} alt={a.name} />
            <div className="wb-meta">
              <b>{a.name}</b>
              <span className="tag">{a.section === "coloring" ? "Colouring" : a.section === "painting" ? "Painting" : "Search & find"}</span>
              {a.items?.length > 0 && <span className="muted">{a.items.length} items</span>}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => del(a.id)}>🗑️ Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}
