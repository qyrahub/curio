import { useState, useEffect, useRef } from "react";
import { brand } from "./lib/brand";
import { useHashRoute } from "./lib/useHashRoute";
import { loadAuth } from "./lib/auth";
import { BrandMark } from "./components/art";
import type { UserPublic } from "./types";
import { ProfileProvider, useProfile, THEMES } from "./lib/profile";
import Home from "./views/Home";
import Child from "./views/Child";
import Parent from "./views/Parent";
import Family from "./views/Family";
import Athena from "./views/Athena";
import Develop from "./views/Develop";
import Feedback from "./views/Feedback";
import Insights from "./views/Insights";
import AdminIntelligence from "./views/AdminIntelligence";
import Settings from "./views/Settings";
import FamilyPlanner from "./views/FamilyPlanner";
import Canvas from "./views/Canvas";
import Library from "./views/Library";
import Workbench from "./views/Workbench";
import Brain from "./views/Brain";
import KnowledgeCentre from "./views/KnowledgeCentre";
import Curate from "./views/Curate";
import Inbox from "./views/Inbox";
import "./views/inbox.css";
import { inbox } from "./lib/inboxStore";
import Journal from "./views/Journal";
import CheckIn from "./views/CheckIn";
import Help from "./views/Help";
import Account from "./views/Account";

// Menus depend on who is "wearing" the site.
// Grouped nav: a few top-level items, each opening a click-only dropdown.
// "Grow" deliberately holds the core loop in order: Develop -> Journal -> Insights -> Brain.
type NavItem = { rt: string; label: string; icon: string; sub?: string };
type NavEntry = { rt: string; label: string } | { label: string; items: NavItem[] };

const G_GROW: NavItem[] = [
  { rt: "develop", label: "Develop", icon: "🌱", sub: "Bring a need, build a plan" },
  { rt: "journal", label: "Journal", icon: "📓", sub: "Notice and note" },
  { rt: "insights", label: "Insights", icon: "📈", sub: "Growth over time" },
  { rt: "brain", label: "Brain", icon: "🧠", sub: "What it has learned" },
];
const G_CHILD: NavItem[] = [
  { rt: "child", label: "Child", icon: "👧", sub: "Their space" },
  { rt: "coach", label: "Coach", icon: "🎯", sub: "Homework help" },
  { rt: "library", label: "Library", icon: "📚", sub: "Books & activities" },
  { rt: "canvas", label: "Canvas", icon: "🎨", sub: "Create & play" },
];
const G_FAMILY: NavItem[] = [
  { rt: "family", label: "Family", icon: "\u{1F46A}", sub: "Everyone together" },
  { rt: "journal", label: "Journal", icon: "\u{1F4D3}", sub: "Notice and note" },
  { rt: "planner", label: "Planner", icon: "\u{1F5D3}", sub: "The plan" },
];
const G_LEARN: NavItem[] = [
  { rt: "learn", label: "Knowledge Centre", icon: "✽", sub: "Articles, papers, one-pagers" },
  { rt: "curate", label: "Curate", icon: "\u{1F9ED}", sub: "Specialised topic toolkits" },
];

const CHILD_NAV: NavEntry[] = [
  { rt: "home", label: "Home" },
  { label: "My space", items: [G_CHILD[0], G_CHILD[1], G_CHILD[3], G_CHILD[2]] },
  { rt: "journal", label: "Journal" },
  { rt: "planner", label: "Planner" },
  { label: "Learn", items: G_LEARN },
  { rt: "help", label: "Help" },
  { rt: "inbox", label: "\u{1F4EC}" },
];
const PARENT_NAV: NavEntry[] = [
  { rt: "home", label: "Home" },
  { label: "Child", items: G_CHILD },
  { label: "__parent__", items: [] },
  { label: "Family", items: G_FAMILY },
  { label: "Grow", items: G_GROW },
  { label: "Learn", items: G_LEARN },
  { rt: "help", label: "Help" },
  { rt: "inbox", label: "\u{1F4EC}" },
];
const ADMIN_NAV: NavEntry[] = [
  { rt: "home", label: "Home" },
  { label: "Grow", items: [{ rt: "intelligence", label: "Intelligence", icon: "\u26a1", sub: "The signal room" }, G_GROW[2], G_GROW[3]] },
  { label: "Learn", items: G_LEARN },
  { rt: "help", label: "Help" },
  { rt: "inbox", label: "\u{1F4EC}" },
];

// Routes reachable per mode (dropdown items + the always-there ones).
const routesOf = (entries: NavEntry[]) =>
  entries.flatMap((e) => ("items" in e ? e.items.map((i) => i.rt) : [e.rt]));

const ALL_ROUTES = ["home", "child", "parent", "checkin", "family", "planner", "journal", "coach", "develop", "insights", "brain", "library", "workbench", "canvas", "intelligence", "feedback", "learn", "curate", "help", "inbox", "account", "settings"];

const ADMIN_EMAILS = ["thomas.marokane@gmail.com", "tech@qyrafund.com"];
function firstName(user: UserPublic) {
  const base = user.email.split("@")[0];
  const first = base.split(/[._\s]+/)[0] || base;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function InboxNavButton({ route, go }: { route: string; go: (r: string) => void }) {
  const [count, setCount] = useState<number>(inbox.unreadCount());
  useEffect(() => {
    const refresh = () => setCount(inbox.unreadCount());
    // Refresh when the Inbox view marks something read, or when the tab
    // regains focus (in case another tab changed localStorage).
    window.addEventListener("curio-inbox-changed", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("curio-inbox-changed", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  const active = route === "inbox";
  return (
    <button className={"nav-inbox" + (active ? " active" : "")} onClick={() => go("inbox")}
      title={count > 0 ? `${count} unread inbox item${count === 1 ? "" : "s"}` : "Inbox"}
      aria-label={count > 0 ? `Inbox — ${count} unread` : "Inbox"}>
      📬
      {count > 0 && <span className="nav-badge">{count > 99 ? "99+" : count}</span>}
    </button>
  );
}

function NavGroup({ label, items, route, go }: { label: string; items: NavItem[]; route: string; go: (r: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const here = items.some((i) => i.rt === route);
  useEffect(() => {
    if (!open) return;
    const onDoc = (ev: MouseEvent) => { if (ref.current && !ref.current.contains(ev.target as Node)) setOpen(false); };
    const onKey = (ev: KeyboardEvent) => { if (ev.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div className="navgrp" ref={ref}>
      <button className={(here ? "on" : "") + (open ? " opened" : "")} aria-expanded={open} aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}>
        {label}<span className="navgrp-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="navgrp-menu" role="menu">
          {items.map((i) => (
            <button key={i.rt} role="menuitem" className={"navgrp-item" + (route === i.rt ? " on" : "")}
              onClick={() => { setOpen(false); go(i.rt); }}>
              <span className="navgrp-ico">{i.icon}</span>
              <span className="navgrp-txt"><b>{i.label}</b>{i.sub && <small>{i.sub}</small>}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ParentGroup({ route, go }: { route: string; go: (r: string) => void }) {
  const { children, mode, activeChild, switchToChild } = useProfile();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const here = route === "parent" || route === "checkin";
  useEffect(() => {
    if (!open) return;
    const onDoc = (ev: MouseEvent) => { if (ref.current && !ref.current.contains(ev.target as Node)) setOpen(false); };
    const onKey = (ev: KeyboardEvent) => { if (ev.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div className="navgrp" ref={ref}>
      <button className={(here ? "on" : "") + (open ? " opened" : "")} aria-expanded={open} aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}>
        Parent<span className="navgrp-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="navgrp-menu" role="menu">
          <button role="menuitem" className={"navgrp-item" + (route === "parent" ? " on" : "")} onClick={() => { setOpen(false); go("parent"); }}>
            <span className="navgrp-ico">🫶</span>
            <span className="navgrp-txt"><b>Parent</b><small>Your corner</small></span>
          </button>
          <button role="menuitem" className={"navgrp-item" + (route === "checkin" ? " on" : "")} onClick={() => { setOpen(false); go("checkin"); }}>
            <span className="navgrp-ico">☕</span>
            <span className="navgrp-txt"><b>Check-in</b><small>How each child is doing, and what to do</small></span>
          </button>
          {children.length > 0 && <div className="navgrp-sep" />}
          {children.map((c) => (
            <button key={c.id} role="menuitem"
              className={"navgrp-item" + (mode === "child" && activeChild && activeChild.id === c.id ? " on" : "")}
              onClick={() => { setOpen(false); switchToChild(c.id); go("home"); }}>
              <span className="navgrp-ico" style={{ background: `linear-gradient(140deg,${THEMES[c.theme].accent},${THEMES[c.theme].deep})` }}>{THEMES[c.theme].emoji}</span>
              <span className="navgrp-txt"><b>{c.name}</b><small>{c.age}</small></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AccountMenu({ user, nav, manage, signOut }: { user: UserPublic | null; nav: (r: string) => void; manage: string[]; signOut: () => void }) {
  const { mode, activeChild, switchToParent, switchToAdmin } = useProfile();
  const [open, setOpen] = useState(false);
  if (!user) return <button className="acct-signin" onClick={() => nav("account")}>Sign in</button>;
  const isAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase());
  const curEmoji = mode === "admin" ? "🛡️" : mode === "parent" ? "👪" : activeChild ? THEMES[activeChild.theme].emoji : "🙂";
  const curBg = mode === "admin" ? "linear-gradient(140deg,#6366F1,#4F46E5)"
    : mode === "parent" ? "linear-gradient(140deg,#9B6DD6,#7A4FB5)"
      : activeChild ? `linear-gradient(140deg,${THEMES[activeChild.theme].accent},${THEMES[activeChild.theme].deep})` : "#cbd2dc";
  const pick = (fn: () => void) => { fn(); setOpen(false); nav("home"); };
  return (
    <div className="acct">
      <button className="acct-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="true" aria-expanded={open}>
        <span className="acct-av" style={{ background: curBg }}>{curEmoji}</span>
        <span className="acct-name">{firstName(user)}</span>
        <span className="acct-caret">▾</span>
      </button>
      {open && (
        <>
          <div className="acct-scrim" onClick={() => setOpen(false)} />
          <div className="acct-menu" role="menu">
            <button role="menuitem" className={"acct-item" + (mode === "parent" ? " on" : "")} onClick={() => pick(switchToParent)}>
              <span className="acct-av sm" style={{ background: "linear-gradient(140deg,#9B6DD6,#7A4FB5)" }}>👪</span>
              <span><b>Parent</b><span className="muted"> · sees all</span></span>
            </button>
            {isAdmin && (
              <button role="menuitem" className={"acct-item" + (mode === "admin" ? " on" : "")} onClick={() => pick(switchToAdmin)}>
                <span className="acct-av sm" style={{ background: "linear-gradient(140deg,#6366F1,#4F46E5)" }}>🛡️</span>
                <span><b>Admin</b><span className="muted"> · everything</span></span>
              </button>
            )}
            <div className="acct-div" />
            {manage.length > 0 && <>
              <div className="acct-sep" />
              {manage.includes("workbench") && (
                <button role="menuitem" className="acct-item" onClick={() => { setOpen(false); nav("workbench"); }}>
                  <span className="acct-ico">🛠</span><span><b>Workbench</b></span>
                </button>
              )}
              {manage.includes("feedback") && (
                <button role="menuitem" className="acct-item" onClick={() => { setOpen(false); nav("feedback"); }}>
                  <span className="acct-ico">💬</span><span><b>Feedback</b></span>
                </button>
              )}
            </>}
            <button role="menuitem" className="acct-item" onClick={() => { setOpen(false); nav("settings"); }}>
              <span className="acct-ico">⚙️</span><span><b>Settings</b></span>
            </button>
            <button role="menuitem" className="acct-item" onClick={() => { setOpen(false); signOut(); }}>
              <span className="acct-ico">🚪</span><span><b>Sign out</b></span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Shell() {
  const [route, nav] = useHashRoute();
  const gnav = (rt: string) => {
    const dirty = (window as unknown as { __curioFlowDirty?: boolean }).__curioFlowDirty;
    if (dirty && !window.confirm("You haven't submitted your plan for this child yet. Leave this page anyway?")) return;
    nav(rt);
  };
  const [user, setUser] = useState<UserPublic | null>(() => loadAuth());
  const { mode } = useProfile();
  const signOut = () => {
    try { Object.keys(localStorage).filter((k) => /auth|token|session/i.test(k) || k === "curio.user").forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
    setUser(null); nav("home");
  };

  const entries = mode === "child" ? CHILD_NAV : mode === "admin" ? ADMIN_NAV : PARENT_NAV;
  // Workbench + Feedback now live in the account menu (parent/admin only).
  const manage = mode === "child" ? [] : ["workbench", "feedback"];
  const parentRoutes = mode === "child" ? [] : ["parent", "checkin"];
  const allowed = mode === "admin"
    ? new Set<string>(ALL_ROUTES)
    : new Set<string>([...routesOf(entries), ...parentRoutes, ...manage, "account", "settings"]);
  // keep the URL honest: if the current route isn't valid for this mode, go home.
  useEffect(() => { if (route && !allowed.has(route)) nav("home"); }, [route, mode]); // eslint-disable-line react-hooks/exhaustive-deps
  const r = allowed.has(route) ? route : "home";

  return (
    <>
      <nav className="nav">
        <div className="nav-in">
          <button className="brand" onClick={() => gnav("home")}>
            <BrandMark />
            <div style={{ textAlign: "left" }}>
              <div className="brand-name">{brand.name.slice(0, -1)}<span>{brand.name.slice(-1)}</span></div>
              <div className="tagline">{brand.tagline}</div>
            </div>
          </button>
          <div className="tabs">
            {entries.map((e) =>
              "items" in e
                ? (e.label === "__parent__"
                  ? <ParentGroup key="parent" route={r} go={gnav} />
                  : <NavGroup key={e.label} label={e.label} items={e.items} route={r} go={gnav} />)
                : e.rt === "inbox"
                  ? <InboxNavButton key="inbox" route={r} go={gnav} />
                  : <button key={e.rt} className={r === e.rt ? "on" : ""} onClick={() => gnav(e.rt)}>{e.label}</button>
            )}
            <AccountMenu user={user} nav={nav} manage={manage} signOut={signOut} />
          </div>
        </div>
      </nav>
      <main className="wrap">
        {r === "home" && <Home nav={nav} />}
        {r === "child" && <Child />}
        {r === "parent" && <Parent />}
        {r === "checkin" && <CheckIn />}
        {r === "family" && <Family />}
        {r === "planner" && <FamilyPlanner />}
        {r === "journal" && <Journal />}
        {r === "coach" && <Athena />}
        {r === "develop" && <Develop />}
        {r === "feedback" && <Feedback user={user} />}
        {r === "insights" && <Insights />}
        {r === "intelligence" && <AdminIntelligence />}
        {r === "settings" && <Settings user={user} onSignOut={signOut} />}
        {r === "canvas" && <Canvas />}
        {r === "brain" && <Brain />}
        {r === "learn" && <KnowledgeCentre />}
        {r === "curate" && <Curate />}
        {r === "inbox" && <Inbox />}
        {r === "help" && <Help />}
        {r === "library" && <Library />}
        {r === "workbench" && <Workbench />}
        {r === "account" && <Account onChange={setUser} />}
      </main>
    </>
  );
}

export default function App() {
  return (
    <ProfileProvider>
      <Shell />
    </ProfileProvider>
  );
}
