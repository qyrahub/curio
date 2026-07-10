import { useState, useEffect } from "react";
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
import Journal from "./views/Journal";
import Account from "./views/Account";

// Menus depend on who is "wearing" the site.
const CHILD_LINKS: [string, string][] = [
  ["home", "Home"], ["child", "Child"], ["coach", "Coach"], ["canvas", "Canvas"], ["planner", "Planner"], ["journal", "Journal"], ["library", "Library"], ["learn", "Knowledge"],
];
const PARENT_LINKS: [string, string][] = [
  ["home", "Home"], ["child", "Child"], ["parent", "Parent"], ["family", "Family"], ["coach", "Coach"], ["develop", "Develop"], ["journal", "Journal"], ["insights", "Insights"], ["brain", "Brain"], ["library", "Library"], ["learn", "Knowledge"], ["workbench", "Workbench"], ["feedback", "Feedback"],
];
const ADMIN_LINKS: [string, string][] = [
  ["home", "Home"], ["intelligence", "Intelligence"], ["insights", "Insights"], ["brain", "Brain"], ["learn", "Knowledge"],
];
const ALL_ROUTES = ["home", "child", "parent", "family", "planner", "journal", "coach", "develop", "insights", "brain", "library", "workbench", "canvas", "intelligence", "feedback", "learn", "account", "settings"];

const ADMIN_EMAILS = ["thomas.marokane@gmail.com", "tech@qyrafund.com"];
function firstName(user: UserPublic) {
  const base = user.email.split("@")[0];
  const first = base.split(/[._\s]+/)[0] || base;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function AccountMenu({ user, nav }: { user: UserPublic | null; nav: (r: string) => void }) {
  const { mode, children, activeChild, switchToChild, switchToParent, switchToAdmin } = useProfile();
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
            <div className="acct-head">Switch profile</div>
            {children.map((c) => (
              <button key={c.id} role="menuitem" className={"acct-item" + (mode === "child" && activeChild && activeChild.id === c.id ? " on" : "")} onClick={() => pick(() => switchToChild(c.id))}>
                <span className="acct-av sm" style={{ background: `linear-gradient(140deg,${THEMES[c.theme].accent},${THEMES[c.theme].deep})` }}>{THEMES[c.theme].emoji}</span>
                <span><b>{c.name}</b><span className="muted"> · {c.age}</span></span>
              </button>
            ))}
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
            <button role="menuitem" className="acct-item" onClick={() => { setOpen(false); nav("settings"); }}>
              <span className="acct-ico">⚙️</span><span><b>Settings</b><span className="muted"> · account, themes &amp; more</span></span>
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

  const links = mode === "child" ? CHILD_LINKS : mode === "admin" ? ADMIN_LINKS : PARENT_LINKS;
  const allowed = mode === "admin" ? new Set<string>(ALL_ROUTES) : new Set<string>([...links.map((l) => l[0]), "account", "settings"]);
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
            {links.map(([rt, label]) => (
              <button key={rt} className={r === rt ? "on" : ""} onClick={() => gnav(rt)}>{label}</button>
            ))}
            <AccountMenu user={user} nav={nav} />
          </div>
        </div>
      </nav>
      <main className="wrap">
        {r === "home" && <Home nav={nav} />}
        {r === "child" && <Child />}
        {r === "parent" && <Parent />}
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
