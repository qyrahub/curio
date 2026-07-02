import { useEffect, useState } from "react";
import { brand } from "../lib/brand";
import PageHero from "../components/PageHero";
import { api } from "../lib/api";
import { speak, stopSpeaking, speechSupported } from "../lib/speech";
import type { Book, BookDetail, LibraryFacets, LibraryFilters } from "../types";

export default function Library() {
  const [facets, setFacets] = useState<LibraryFacets | null>(null);
  const [filters, setFilters] = useState<LibraryFilters>({});
  const [items, setItems] = useState<Book[]>([]);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState<BookDetail | null>(null);
  const [browsing, setBrowsing] = useState(false);

  useEffect(() => { api.libraryFacets().then(setFacets).catch(() => {}); }, []);
  useEffect(() => {
    if (!browsing) return;
    api.libraryCatalog(filters).then((r) => { setItems(r.items); setTotal(r.total); }).catch(() => {});
  }, [filters, browsing]);

  const setF = (k: keyof LibraryFilters, v: string | number | undefined) =>
    setFilters((f) => ({ ...f, [k]: f[k] === v ? undefined : v }));

  const openCategory = (key: string) => { setFilters({ category: key }); setBrowsing(true); };

  if (!facets) return <div className="view"><p className="muted">Loading…</p></div>;

  return (
    <div className="view">
      <PageHero kind="account" eyebrow="Library" title={<>The {brand.name} <em>Library</em></>}
        tease={`${facets.total}+ books across every subject and discipline — browse by category, filter, then read aloud or download.`} />

      {!browsing && (
        <>
          <div className="lib-toolbar">
            <input className="ask-in" placeholder="🔎 Search all books…" onKeyDown={(e) => {
              if (e.key === "Enter") { setFilters({ q: (e.target as HTMLInputElement).value }); setBrowsing(true); }
            }} />
            <button className="btn btn-ghost btn-sm" onClick={() => { setFilters({}); setBrowsing(true); }}>Browse all →</button>
          </div>
          <h3>Browse by category</h3>
          <div className="lib-cats">
            {facets.categories.map((c) => (
              <button key={c.key} className="lib-cat" style={{ background: `#${c.color}` }} onClick={() => openCategory(c.key)}>
                <span className="lib-cat-emoji">{c.emoji}</span>
                <b>{c.label}</b><span className="lib-cat-count">{c.count} books</span>
              </button>
            ))}
          </div>
        </>
      )}

      {browsing && (
        <>
          <div className="lib-bar">
            <button className="btn btn-ghost btn-sm" onClick={() => { setBrowsing(false); setFilters({}); }}>← All categories</button>
            <span className="muted">{total} books</span>
          </div>
          <div className="lib-filters">
            <Filter label="Subject" opts={facets.subjects} val={filters.subject} on={(v) => setF("subject", v)} />
            <Filter label="Discipline" opts={facets.disciplines} val={filters.discipline} on={(v) => setF("discipline", v)} />
            <Filter label="Genre" opts={facets.genres} val={filters.genre} on={(v) => setF("genre", v)} />
            <Filter label="Mood" opts={facets.moods} val={filters.mood} on={(v) => setF("mood", v)} />
            <div className="lib-filter">
              <span className="lib-filter-label">Age</span>
              <div className="pills">
                {[4, 8, 11, 14].map((a) => (
                  <button key={a} className="pill" aria-pressed={filters.age === a} onClick={() => setF("age", a)}>{a}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid-cards g3">
            {items.map((b) => (
              <button key={b.id} className="book-card" style={{ borderTopColor: `#${b.color}` }} onClick={() => api.libraryBook(b.id).then(setOpen)}>
                <div className="book-cover" style={{ background: `#${b.color}` }}><span>{b.emoji}</span></div>
                <b className="book-title">{b.title}</b>
                <p className="muted">{b.blurb}</p>
                <div className="book-tags"><span className="tag">{b.genre}</span><span className="tag">{b.mood}</span><span className="tag">ages {b.age_min}-{b.age_max}</span></div>
              </button>
            ))}
          </div>
          {items.length === 0 && <p className="muted">No books match those filters — try removing one.</p>}
        </>
      )}

      {open && <BookModal book={open} onClose={() => { stopSpeaking(); setOpen(null); }} />}
    </div>
  );
}

function Filter({ label, opts, val, on }: { label: string; opts: string[]; val?: string; on: (v: string) => void }) {
  return (
    <div className="lib-filter">
      <span className="lib-filter-label">{label}</span>
      <select value={val ?? ""} onChange={(e) => on(e.target.value)}>
        <option value="">Any</option>
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function BookModal({ book, onClose }: { book: BookDetail; onClose: () => void }) {
  const [dl, setDl] = useState("");
  const download = async (fmt: string) => {
    setDl(fmt);
    try {
      const blob = await api.libraryDownload(book.id, fmt);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${book.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.${fmt}`;
      a.click(); URL.revokeObjectURL(url);
    } catch { alert("Sorry — that download failed. Please try again."); }
    finally { setDl(""); }
  };
  return (
    <div className="cv-overlay" onClick={onClose}>
      <div className="cv-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="cv-head">
          <span className="tic" style={{ background: `#${book.color}` }}>{book.emoji}</span>
          <div><b>{book.title}</b><span className="who">{book.category_label} · {book.discipline} · ages {book.age_min}-{book.age_max}</span></div>
          <button className="round-btn small cv-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className="cv-intro">{book.blurb}</p>
        <div className="book-actions">
          {speechSupported && <button className="btn btn-primary btn-sm" onClick={() => speak(book.full_text)}>🔊 Listen (audiobook)</button>}
          {["pdf", "epub", "pptx", "txt", "md"].map((f) => (
            <button key={f} className="btn btn-ghost btn-sm" disabled={dl === f} onClick={() => download(f)}>
              {dl === f ? "…" : `⬇️ ${f.toUpperCase()}`}
            </button>
          ))}
        </div>
        <div className="book-pages">
          {book.book_pages.map((p, i) => (
            <div key={i} className="book-page">
              <b>Chapter {i + 1}: {p.title}</b>
              <p>{p.text}</p>
              <p className="muted">Try this: {p.challenge}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
