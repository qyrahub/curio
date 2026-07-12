import { useMemo, useState } from "react";
import PageHero from "../components/PageHero";
import { inbox, type InboxItem, type InboxKind } from "../lib/inboxStore";

/* Inbox — the small curated feed. Read state is client-side (localStorage);
   items themselves come from lib/inboxStore.ts. When a backend-driven feed
   comes later, only that file changes. */

const KIND_META: Record<InboxKind, { label: string; icon: string; cls: string }> = {
  welcome: { label: "Welcome", icon: "👋", cls: "k-welcome" },
  news: { label: "News", icon: "📰", cls: "k-news" },
  finding: { label: "Finding", icon: "🔎", cls: "k-finding" },
  suggestion: { label: "Suggestion", icon: "💡", cls: "k-suggestion" },
};

export default function Inbox() {
  const items = useMemo(() => inbox.all(), []);
  // Read state is per-session; toggling forces a re-render via a bump.
  const [bump, setBump] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const rerender = () => setBump((n) => n + 1);
  // Reference bump so React knows it's part of dep chain.
  void bump;

  const openItem = (id: string) => {
    setOpenId((cur) => (cur === id ? null : id));
    if (!inbox.isRead(id)) {
      inbox.markRead(id);
      rerender();
      // Let the nav badge refresh too — fire the storage event manually so
      // App.tsx's listener picks it up on the same tab.
      window.dispatchEvent(new Event("curio-inbox-changed"));
    }
  };

  const markAll = () => {
    inbox.markAllRead();
    rerender();
    window.dispatchEvent(new Event("curio-inbox-changed"));
  };

  const unread = items.filter((i) => !inbox.isRead(i.id)).length;

  return (
    <div className="ib view">
      <PageHero kind="parent" eyebrow="Inbox" title={<>Small notes worth <em>your attention</em></>}
        tease="Curated news, findings and suggestions land here. The badge on the top-right shows how many are unread." />

      <div className="ib-toolbar">
        <div className="ib-count">
          {unread === 0 ? <>Everything read. 🌱</> : <><b>{unread}</b> unread of {items.length}</>}
        </div>
        {unread > 0 && (
          <button className="ib-mark-all" onClick={markAll}>Mark all as read</button>
        )}
      </div>

      <div className="ib-list">
        {items.map((it) => renderItem(it, openId === it.id, () => openItem(it.id)))}
      </div>
    </div>
  );
}

function renderItem(it: InboxItem, open: boolean, onToggle: () => void) {
  const meta = KIND_META[it.kind];
  const isRead = inbox.isRead(it.id);
  return (
    <div key={it.id} className={"ib-item " + meta.cls + (isRead ? " read" : " unread")}>
      <button className="ib-head" onClick={onToggle}>
        {!isRead && <span className="ib-dot" aria-label="Unread" />}
        <span className={"ib-kind " + meta.cls}>{meta.icon} {meta.label}</span>
        <span className="ib-title">{it.title}</span>
        <span className="ib-date">{new Date(it.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
      </button>
      {!open && <div className="ib-brief">{it.brief}</div>}
      {open && (
        <div className="ib-body">
          {it.body.split("\n").map((para, i) => <p key={i}>{para}</p>)}
          {it.href && it.linkLabel && (
            <a className="ib-cta" href={it.href}>{it.linkLabel} →</a>
          )}
        </div>
      )}
    </div>
  );
}
