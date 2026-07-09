import { useEffect, useState } from "react";
import { growth, type Knowledge } from "../lib/growth";

/* The shared knowledge base that informs Curio's guidance — established
   child-development traditions, curated and admin-approved. Enriches everyone. */
export default function KnowledgePanel() {
  const [items, setItems] = useState<Knowledge[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { growth.knowledge().then(setItems).catch(() => setItems([])).finally(() => setLoaded(true)); }, []);

  if (!loaded) return <div className="muted">Loading…</div>;
  if (items.length === 0) return <div className="evo-empty">The knowledge base is being curated.</div>;

  return (
    <div className="kb-grid">
      {items.map((k) => (
        <div className="kb-card" key={k.id}>
          <div className="kb-tradition">{k.tradition || "Approach"}</div>
          <h4>{k.title}</h4>
          <p>{k.summary}</p>
          {k.tags && k.tags.length > 0 && <div className="kb-tags">{k.tags.map((t, i) => <span key={i} className="kb-tag">{t}</span>)}</div>}
          {k.source && <div className="kb-src">{k.source}</div>}
        </div>
      ))}
    </div>
  );
}
