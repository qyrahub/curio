import { useState, useEffect } from "react";
import { useProfile, THEMES, type ChildProfile, type ThemeKey } from "../lib/profile";
import type { UserPublic } from "../types";

/* Curio · Settings — the single home for accounts, access, security, rights,
   themes/mode, 2FA and the personal account (sign out, delete, data choices).
   Gated by role: child sees Themes only; parent/admin see everything; admin
   sets themes for all but not display mode. Account-security actions run
   client-side until the auth/account backend is wired. */

const ADMIN_EMAILS = ["thomas.marokane@gmail.com", "tech@qyrafund.com"];
const PARENT_MODULES = ["Home", "Child", "Parent", "Family", "Coach", "Develop", "Insights", "Brain", "Library", "Workbench"];
const CHILD_MODULES = ["Home", "Child", "Coach", "Canvas", "Library"];
const MODES = [["light", "☀️ Light"], ["dark", "🌙 Dark"], ["system", "💻 System"]] as const;
type Role = "admin" | "parent" | "child";
type Plan = "Free" | "Family" | "Premium";
const PLANS: Plan[] = ["Free", "Family", "Premium"];
const ROLE_COLOR: Record<Role, string> = { admin: "#6366F1", parent: "#5AA7E6", child: "#FF7A66" };
const uid = () => Math.random().toString(36).slice(2);

interface Account { id: string; name: string; email: string; role: Role; plan: Plan; parentId: string | null; themeRight: boolean; username?: string; country?: string; }
type Gender = ChildProfile["gender"];
const GENDERS: { v: Gender; l: string }[] = [{ v: "girl", l: "Girl" }, { v: "boy", l: "Boy" }, { v: "other", l: "Other" }];
const emptyNewUser = () => ({
  name: "", email: "", role: "child" as Role, username: "", password: "",
  age: "7", gender: "other" as Gender, theme: "" as ThemeKey | "", country: "", interests: "",
});
interface AcctSec { locked: boolean; vacation: { start: string; end: string } | null; }
interface Guardian { id: string; name: string; email: string; role: "parent" | "guardian"; modules: string[]; canEditAccount: boolean; }
interface SetState {
  parentLocked: boolean;
  child: Record<string, AcctSec>;
  guardians: Guardian[];
  childModules: Record<string, string[]>;
  twoFA: { email: boolean; sms: boolean; app: boolean };
  dataOptOut: { parent: boolean; child: Record<string, boolean> };
}
const SKEY = "curio.settings.v1";
function load(): SetState {
  try { const r = localStorage.getItem(SKEY); if (r) { const p = JSON.parse(r) as SetState; return { ...p, dataOptOut: p.dataOptOut || { parent: false, child: {} } }; } } catch { /* ignore */ }
  return { parentLocked: false, child: {}, guardians: [], childModules: {}, twoFA: { email: true, sms: false, app: false }, dataOptOut: { parent: false, child: {} } };
}
function firstName(u: UserPublic) { const b = u.email.split("@")[0]; const f = b.split(/[._\s]+/)[0] || b; return f.charAt(0).toUpperCase() + f.slice(1); }

export default function Settings({ user, onSignOut }: { user?: UserPublic | null; onSignOut?: () => void }) {
  const { mode, children, activeChild, addChild, updateChild, removeChild, switchToChild, parentDisplay, setParentDisplay, parentTheme, setParentTheme } = useProfile();
  const role = mode;
  const isAdmin = !!user && ADMIN_EMAILS.includes(user.email.toLowerCase());
  const [st, setSt] = useState<SetState>(load);
  useEffect(() => { try { localStorage.setItem(SKEY, JSON.stringify(st)); } catch { /* ignore */ } }, [st]);
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2200); };

  // merged accounts (was the admin "Accounts, access & plans" Hub)
  const meId = "acc-me";
  const me: Account = {
    id: meId, name: user ? firstName(user) : "You", email: user?.email || "you@curio.app",
    role: isAdmin ? "admin" : "parent", plan: "Premium", parentId: null, themeRight: true,
  };
  // Child rows derive LIVE from the real profile store so the list never drifts.
  const [ovr, setOvr] = useState<Record<string, { plan?: Plan; themeRight?: boolean }>>({});
  const [extra, setExtra] = useState<Account[]>([]);
  const childAccts: Account[] = children.map((c) => ({
    id: "acc-" + c.id, name: c.name, email: `${c.name.toLowerCase()}@family.co`,
    role: "child", plan: ovr[c.id]?.plan || "Family", parentId: meId, themeRight: ovr[c.id]?.themeRight ?? true,
  }));
  const accounts: Account[] = [me, ...childAccts, ...extra];
  const [nu, setNu] = useState(emptyNewUser());
  const childIdOf = (id: string) => (id.startsWith("acc-") ? id.slice(4) : "");
  const setPlan = (id: string, plan: Plan) => {
    const cid = childIdOf(id);
    if (children.some((c) => c.id === cid)) setOvr((o) => ({ ...o, [cid]: { ...o[cid], plan } }));
    else setExtra((a) => a.map((x) => (x.id === id ? { ...x, plan } : x)));
  };
  const toggleThemeRight = (id: string) => {
    const cid = childIdOf(id);
    if (children.some((c) => c.id === cid)) setOvr((o) => ({ ...o, [cid]: { ...o[cid], themeRight: !(o[cid]?.themeRight ?? true) } }));
    else setExtra((a) => a.map((x) => (x.id === id ? { ...x, themeRight: !x.themeRight } : x)));
  };
  const removeAcct = (id: string) => {
    const cid = childIdOf(id);
    if (children.some((c) => c.id === cid)) {
      if (children.length <= 1) { flash("Keep at least one child profile."); return; }
      removeChild(cid);
    } else {
      setExtra((a) => a.filter((x) => x.id !== id && x.parentId !== id));
    }
  };
  const addAcct = () => {
    if (!nu.name.trim() || !nu.email.trim()) { flash("Name and email are required."); return; }
    if (nu.role === "child") {
      const nc = addChild();
      const age = Math.max(1, Math.min(18, Math.round(Number(nu.age)) || nc.age));
      const interests = nu.interests.split(",").map((s) => s.trim()).filter(Boolean);
      updateChild({
        ...nc, name: nu.name.trim(), age, gender: nu.gender,
        theme: (nu.theme || nc.theme) as ThemeKey,
        country: nu.country.trim() || undefined,
        interests: interests.length ? interests : nc.interests,
      });
    } else {
      setExtra((a) => [...a, {
        id: "acc-" + uid(), name: nu.name.trim(), email: nu.email.trim(), role: nu.role,
        plan: "Family", parentId: null, themeRight: true,
        username: nu.username.trim() || undefined, country: nu.country.trim() || undefined,
      }]);
    }
    // Passwords for invited parents/guardians aren't stored client-side — an invite/reset
    // link is what actually sets credentials, same as the "Reset" action on the table below.
    const hadPassword = nu.role !== "child" && !!nu.password;
    setNu(emptyNewUser());
    flash(hadPassword ? "Account created — invite link sent to set the password." : "Account created.");
  };

  const TABS = role === "child"
    ? ([["themes", "Themes"]] as const)
    : ([["accounts", "Accounts & access"], ["hub", "Hub"], ["rights", "Rights"], ["themes", "Themes"], ["twofa", "2FA"], ["account", "Account"]] as const);
  const [tab, setTab] = useState<string>(TABS[0][0]);

  const sec = (id: string): AcctSec => st.child[id] || { locked: false, vacation: null };
  const setSec = (id: string, next: AcctSec) => setSt((s) => ({ ...s, child: { ...s.child, [id]: next } }));
  const childMods = (id: string) => st.childModules[id] || CHILD_MODULES;
  const toggleChildMod = (id: string, m: string) => setSt((s) => { const cur = s.childModules[id] || CHILD_MODULES; const next = cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]; return { ...s, childModules: { ...s.childModules, [id]: next } }; });

  // themes target
  const [target, setTarget] = useState<string>(role === "child" && activeChild ? activeChild.id : (role === "parent" ? "parent" : (children[0]?.id || "parent")));
  const themeOf = (t: string): ThemeKey => t === "parent" ? (parentTheme || "sunrise") : (children.find((c) => c.id === t)?.theme || "sunrise");
  const modeOf = (t: string): string => t === "parent" ? parentDisplay : (children.find((c) => c.id === t)?.displayMode || "system");
  const setTheme = (t: string, k: ThemeKey) => { if (t === "parent") setParentTheme(k); else { const c = children.find((x) => x.id === t); if (c) updateChild({ ...c, theme: k }); } flash("Theme updated."); };
  const setDisp = (t: string, m: "light" | "dark" | "system") => { if (role === "admin") return; if (t === "parent") setParentDisplay(m); else { const c = children.find((x) => x.id === t); if (c) updateChild({ ...c, displayMode: m } as ChildProfile); } };

  // rights: add parent/guardian
  const [ng, setNg] = useState({ name: "", email: "", role: "parent" as "parent" | "guardian", modules: [...PARENT_MODULES], canEditAccount: false });
  const addGuardian = () => {
    if (!ng.name.trim() || !ng.email.trim()) { flash("Name and email required."); return; }
    setSt((s) => ({ ...s, guardians: [...s.guardians, { id: uid(), name: ng.name.trim(), email: ng.email.trim(), role: ng.role, modules: ng.modules, canEditAccount: ng.canEditAccount }] }));
    setNg({ name: "", email: "", role: "parent", modules: [...PARENT_MODULES], canEditAccount: false }); flash(`${ng.role === "parent" ? "Parent" : "Guardian"} invited.`);
  };
  const toggleNgMod = (m: string) => setNg((g) => ({ ...g, modules: g.modules.includes(m) ? g.modules.filter((x) => x !== m) : [...g.modules, m] }));

  // delete account modal
  const [delOpen, setDelOpen] = useState(false);
  const [delText, setDelText] = useState("");
  const doDelete = () => {
    if (delText !== "DELETE") return;
    try { Object.keys(localStorage).filter((k) => k.startsWith("curio.")).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
    setDelOpen(false); if (onSignOut) onSignOut();
  };

  const swatches = (t: string) => (
    <div className="set-swatches">
      {(Object.keys(THEMES) as ThemeKey[]).map((k) => { const th = THEMES[k]; const on = themeOf(t) === k;
        return <button key={k} className={"set-sw" + (on ? " on" : "")} title={th.name} style={{ background: `linear-gradient(140deg,${th.accent},${th.deep})` }} onClick={() => setTheme(t, k)}>{th.emoji}</button>; })}
    </div>
  );
  const kids = (pid: string) => accounts.filter((a) => a.parentId === pid);
  const parentsList = accounts.filter((a) => a.role === "parent" || a.role === "admin");

  return (
    <div className="view set">
      <div className="adm-hero">
        <div className="adm-eyebrow">Settings · {role}</div>
        <h1 className="adm-title">{role === "child" ? <>Make it <em>yours</em></> : role === "admin" ? <>Manage <em>everything</em></> : <>Accounts &amp; <em>access</em></>}</h1>
        <p className="adm-tease muted">{role === "child" ? "Choose your theme and whether the app looks light or dark." : role === "admin" ? "Full control over every account. You set themes for everyone; display mode stays with each user." : "Your children, passwords and time limits, extra parents or guardians, themes, security and your own account."}</p>
      </div>

      {toast && <div className="adm-toast">{toast}</div>}

      {TABS.length > 1 && (
        <div className="set-tabs">{TABS.map(([k, l]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}</div>
      )}

      {/* ACCOUNTS & ACCESS (merged from the old Hub page) */}
      {tab === "accounts" && role !== "child" && (
        <div>
          <div className="adm-card adm-tablewrap">
            <table className="adm-table">
              <thead><tr><th>Account</th><th>Role</th><th>Plan</th><th>Theme rights</th><th></th></tr></thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id}>
                    <td><div className="adm-acc"><span className="adm-dot" style={{ background: ROLE_COLOR[a.role] }} /><div><b>{a.name}</b>{a.id === meId && <span className="set-role">you</span>}<div className="muted" style={{ fontSize: ".82rem" }}>{a.email}</div></div></div></td>
                    <td><span className="adm-role" style={{ color: ROLE_COLOR[a.role], borderColor: ROLE_COLOR[a.role] + "66" }}>{a.role}</span></td>
                    <td>{a.role === "admin" ? <span className="muted">—</span> : <select className="adm-select" value={a.plan} onChange={(e) => setPlan(a.id, e.target.value as Plan)}>{PLANS.map((p) => <option key={p} value={p}>{p}</option>)}</select>}</td>
                    <td>{a.role === "child" ? <button className={"adm-toggle" + (a.themeRight ? " on" : "")} onClick={() => toggleThemeRight(a.id)}><span /></button> : <span className="muted">—</span>}</td>
                    <td className="adm-actions">
                      {a.role === "child" && <button className="adm-btn xs" onClick={() => switchToChild(a.id.replace("acc-", ""))}>Open</button>}
                      {a.id !== meId && <button className="adm-btn xs ghost" onClick={() => flash(`Reset link sent to ${a.email}`)}>Reset</button>}
                      {a.id !== meId && <button className="adm-btn xs danger" onClick={() => removeAcct(a.id)}>Remove</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="adm-card adm-adduser">
            <b>Add a user</b>
            <div className="adm-addrow">
              <input placeholder="Name" value={nu.name} onChange={(e) => setNu({ ...nu, name: e.target.value })} />
              <input placeholder="Email" value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} />
              <select value={nu.role} onChange={(e) => setNu({ ...nu, role: e.target.value as Role })}><option value="child">child</option><option value="parent">parent</option>{isAdmin && <option value="admin">admin</option>}</select>
            </div>

            {nu.role === "child" ? (
              <div className="adm-addrow">
                <input type="number" min={1} max={18} placeholder="Age" value={nu.age} onChange={(e) => setNu({ ...nu, age: e.target.value })} style={{ maxWidth: 90 }} />
                <select value={nu.gender} onChange={(e) => setNu({ ...nu, gender: e.target.value as Gender })}>
                  {GENDERS.map((g) => <option key={g.v} value={g.v}>{g.l}</option>)}
                </select>
                <select value={nu.theme} onChange={(e) => setNu({ ...nu, theme: e.target.value as ThemeKey })}>
                  <option value="">Theme (auto)</option>
                  {(Object.keys(THEMES) as ThemeKey[]).map((k) => <option key={k} value={k}>{THEMES[k].emoji} {THEMES[k].name}</option>)}
                </select>
                <input placeholder="Country" value={nu.country} onChange={(e) => setNu({ ...nu, country: e.target.value })} style={{ maxWidth: 140 }} />
                <input placeholder="Interests (comma-separated)" value={nu.interests} onChange={(e) => setNu({ ...nu, interests: e.target.value })} />
              </div>
            ) : (
              <div className="adm-addrow">
                <input placeholder="Username" value={nu.username} onChange={(e) => setNu({ ...nu, username: e.target.value })} />
                <input type="password" placeholder="Set password (or leave blank to invite)" value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} />
                <input placeholder="Country" value={nu.country} onChange={(e) => setNu({ ...nu, country: e.target.value })} style={{ maxWidth: 140 }} />
              </div>
            )}

            <div className="adm-addrow" style={{ marginTop: 4 }}>
              <button className="adm-btn" onClick={addAcct}>＋ Add {nu.role}</button>
            </div>
            <p className="muted" style={{ fontSize: ".82rem", marginTop: 8 }}>
              {nu.role === "child"
                ? "Children can't sign themselves up — they're enrolled here by a parent or admin. Age, gender, theme, country and interests can all be set now, or changed later per-child."
                : "A password set here triggers a secure invite link rather than being stored as plain text — same as the Reset action below."}
            </p>
          </div>
          <div className="adm-card" style={{ marginTop: 14 }}>
            <h3 style={{ marginTop: 0 }}>Account hierarchy</h3>
            {parentsList.map((p) => (
              <div className="adm-tree" key={p.id}>
                <div className="adm-tnode parent"><span className="adm-dot" style={{ background: ROLE_COLOR[p.role] }} />{p.name} <span className="muted">· {p.plan}</span></div>
                <div className="adm-tchildren">
                  {kids(p.id).map((c) => { const prof = children.find((ch) => "acc-" + ch.id === c.id); return (
                    <div className="adm-tchild" key={c.id}><span className="adm-tline" /><div className="adm-tnode child"><span className="adm-av" style={{ background: prof ? `linear-gradient(140deg,${THEMES[prof.theme].accent},${THEMES[prof.theme].deep})` : "#ccc" }}>{prof ? THEMES[prof.theme].emoji : "🙂"}</span>{c.name} <span className="muted">· {c.plan}</span></div></div>
                  ); })}
                  {kids(p.id).length === 0 && <span className="muted" style={{ fontSize: ".85rem" }}>No child accounts linked.</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HUB — passwords / lock / vacation */}
      {tab === "hub" && role !== "child" && (
        <div>
          <div className="adm-card">
            <h3 style={{ marginTop: 0 }}>Your password</h3>
            <div className="set-pw"><input type="password" placeholder="New password" /><input type="password" placeholder="Confirm" /><button className="adm-btn" onClick={() => flash("Your password was updated.")}>Update</button></div>
            <div className="set-lockrow"><div><b>Lock my account</b><div className="muted" style={{ fontSize: ".84rem" }}>Signs you out and blocks access until you unlock. Separate from children's locks.</div></div><button className={"adm-toggle" + (st.parentLocked ? " on" : "")} onClick={() => setSt((s) => ({ ...s, parentLocked: !s.parentLocked }))}><span /></button></div>
          </div>
          <div className="adm-card" style={{ marginTop: 14 }}>
            <h3 style={{ marginTop: 0 }}>Child accounts</h3>
            {children.map((c) => { const s = sec(c.id); return (
              <div className="set-childsec" key={c.id}>
                <div className="set-childhead"><span className="set-av" style={{ background: `linear-gradient(140deg,${THEMES[c.theme].accent},${THEMES[c.theme].deep})` }}>{THEMES[c.theme].emoji}</span><b>{c.name}</b></div>
                <div className="set-pw"><input type="password" placeholder={`New password for ${c.name}`} /><button className="adm-btn sm" onClick={() => flash(`${c.name}'s password was set.`)}>Set password</button></div>
                <div className="set-lockrow"><div><b>{s.locked ? "Suspended" : "Active"}</b><div className="muted" style={{ fontSize: ".82rem" }}>Manually lock, then unsuspend when ready.</div></div><button className={"adm-btn sm" + (s.locked ? "" : " danger")} onClick={() => setSec(c.id, { ...s, locked: !s.locked })}>{s.locked ? "Unsuspend" : "Lock"}</button></div>
                <div className="set-vac"><div><b>Vacation</b><div className="muted" style={{ fontSize: ".82rem" }}>Pause access between two dates; lifts on the end date.</div></div>
                  <div className="set-vacrow"><label>From <input type="date" value={s.vacation?.start || ""} onChange={(e) => setSec(c.id, { ...s, vacation: { start: e.target.value, end: s.vacation?.end || "" } })} /></label><label>To <input type="date" value={s.vacation?.end || ""} onChange={(e) => setSec(c.id, { ...s, vacation: { start: s.vacation?.start || "", end: e.target.value } })} /></label>{s.vacation && <button className="adm-btn xs ghost" onClick={() => setSec(c.id, { ...s, vacation: null })}>Clear</button>}</div>
                </div>
              </div>
            ); })}
          </div>
        </div>
      )}

      {/* RIGHTS */}
      {tab === "rights" && role !== "child" && (
        <div>
          <div className="adm-card">
            <h3 style={{ marginTop: 0 }}>Add a parent or guardian</h3>
            <p className="muted" style={{ marginTop: 0 }}>They get only the modules you give them. Choose whether they may change login, account or personal details — otherwise they can use the app but not alter the account. Once they log in they manage their own profile.</p>
            <div className="set-grow"><input placeholder="Name" value={ng.name} onChange={(e) => setNg({ ...ng, name: e.target.value })} /><input placeholder="Email" value={ng.email} onChange={(e) => setNg({ ...ng, email: e.target.value })} /><select value={ng.role} onChange={(e) => setNg({ ...ng, role: e.target.value as "parent" | "guardian" })}><option value="parent">parent</option><option value="guardian">guardian</option></select></div>
            <div className="set-modlabel">Modules they can access</div>
            <div className="set-mods">{PARENT_MODULES.map((m) => <button key={m} className={"set-modchip" + (ng.modules.includes(m) ? " on" : "")} onClick={() => toggleNgMod(m)}>{m}</button>)}</div>
            <label className="set-check"><input type="checkbox" checked={ng.canEditAccount} onChange={(e) => setNg({ ...ng, canEditAccount: e.target.checked })} /> May change login / account &amp; personal details</label>
            <button className="adm-btn" style={{ marginTop: 10 }} onClick={addGuardian}>＋ Invite</button>
            {st.guardians.length > 0 && <div className="set-glist">{st.guardians.map((g) => (<div className="set-grow-item" key={g.id}><div><b>{g.name}</b> <span className="set-role">{g.role}</span><div className="muted" style={{ fontSize: ".82rem" }}>{g.email} · {g.modules.length} modules · {g.canEditAccount ? "can edit account" : "view/use only"}</div></div><button className="adm-btn xs danger" onClick={() => setSt((s) => ({ ...s, guardians: s.guardians.filter((x) => x.id !== g.id) }))}>Remove</button></div>))}</div>}
          </div>
          <div className="adm-card" style={{ marginTop: 14 }}>
            <h3 style={{ marginTop: 0 }}>Child modules</h3>
            <p className="muted" style={{ marginTop: 0 }}>Grant or revoke what each child can open.</p>
            {children.map((c) => (<div className="set-childsec" key={c.id}><div className="set-childhead"><span className="set-av" style={{ background: `linear-gradient(140deg,${THEMES[c.theme].accent},${THEMES[c.theme].deep})` }}>{THEMES[c.theme].emoji}</span><b>{c.name}</b></div><div className="set-mods">{CHILD_MODULES.map((m) => <button key={m} className={"set-modchip" + (childMods(c.id).includes(m) ? " on" : "")} onClick={() => toggleChildMod(c.id, m)}>{m}</button>)}</div></div>))}
          </div>
        </div>
      )}

      {/* THEMES */}
      {tab === "themes" && (
        <div className="adm-card">
          {role !== "child" && (
            <div className="set-target"><span className="muted">Whose look:</span><button className={"set-tbtn" + (target === "parent" ? " on" : "")} onClick={() => setTarget("parent")}>{role === "admin" ? "Admin" : "Me"}</button>{children.map((c) => <button key={c.id} className={"set-tbtn" + (target === c.id ? " on" : "")} onClick={() => setTarget(c.id)}>{THEMES[c.theme].emoji} {c.name}</button>)}</div>
          )}
          <h3 style={{ margin: "6px 0 8px" }}>Theme</h3>
          {swatches(role === "child" && activeChild ? activeChild.id : target)}
          <h3 style={{ margin: "18px 0 8px" }}>Display mode</h3>
          {role === "admin"
            ? <p className="muted" style={{ marginTop: 0 }}>As admin you set themes, but light/dark/system stays each user's own choice.</p>
            : <div className="set-modes">{MODES.map(([k, l]) => { const t = role === "child" && activeChild ? activeChild.id : target; const on = modeOf(t) === k; return <button key={k} className={"set-modebtn" + (on ? " on" : "")} onClick={() => setDisp(t, k as "light" | "dark" | "system")}>{l}</button>; })}</div>}
          {role === "child" && <p className="muted" style={{ fontSize: ".84rem", marginTop: 14 }}>Want more changes, like your name or what you learn? Ask a parent — they can set those up for you.</p>}
        </div>
      )}

      {/* 2FA */}
      {tab === "twofa" && role !== "child" && (
        <div className="adm-card">
          <h3 style={{ marginTop: 0 }}>Two-factor authentication</h3>
          <p className="muted" style={{ marginTop: 0 }}>Add a second step at sign-in. Children's accounts never use 2FA — they're enrolled and managed by you.</p>
          {([["email", "Email code"], ["sms", "SMS code"], ["app", "Authenticator app"]] as const).map(([k, l]) => (
            <div className="set-lockrow" key={k}><div><b>{l}</b></div><button className={"adm-toggle" + (st.twoFA[k] ? " on" : "")} onClick={() => setSt((s) => ({ ...s, twoFA: { ...s.twoFA, [k]: !s.twoFA[k] } }))}><span /></button></div>
          ))}
        </div>
      )}

      {/* ACCOUNT — sign out, data choices, delete */}
      {tab === "account" && role !== "child" && (
        <div>
          <div className="adm-card">
            <h3 style={{ marginTop: 0 }}>Data &amp; privacy</h3>
            <p className="muted" style={{ marginTop: 0 }}>Curio personalises learning from activity either way. This only controls whether anonymised activity may also help improve the general model — choose per person.</p>
            <div className="set-lockrow"><div><b>{user ? firstName(user) : "Me"} (you)</b><div className="muted" style={{ fontSize: ".82rem" }}>Opt out of using my data for general model training</div></div><button className={"adm-toggle" + (st.dataOptOut.parent ? " on" : "")} onClick={() => setSt((s) => ({ ...s, dataOptOut: { ...s.dataOptOut, parent: !s.dataOptOut.parent } }))}><span /></button></div>
            {children.map((c) => (
              <div className="set-lockrow" key={c.id}><div><b>{c.name}</b><div className="muted" style={{ fontSize: ".82rem" }}>Opt out of using {c.name}'s data for general model training</div></div><button className={"adm-toggle" + (st.dataOptOut.child[c.id] ? " on" : "")} onClick={() => setSt((s) => ({ ...s, dataOptOut: { ...s.dataOptOut, child: { ...s.dataOptOut.child, [c.id]: !s.dataOptOut.child[c.id] } } }))}><span /></button></div>
            ))}
          </div>
          <div className="adm-card" style={{ marginTop: 14 }}>
            <h3 style={{ marginTop: 0 }}>Session</h3>
            <button className="adm-btn ghost" onClick={() => onSignOut && onSignOut()}>Sign out</button>
          </div>
          <div className="adm-card set-danger" style={{ marginTop: 14 }}>
            <h3 style={{ marginTop: 0 }}>Delete my account</h3>
            <p className="muted" style={{ marginTop: 0 }}>Permanently removes your account and all child profiles, plans and data. This can't be undone.</p>
            <button className="adm-btn danger" onClick={() => { setDelText(""); setDelOpen(true); }}>Delete my account</button>
          </div>
        </div>
      )}

      {delOpen && (
        <div className="set-modal-scrim" onClick={() => setDelOpen(false)}>
          <div className="set-modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Delete your account?</h3>
            <p className="muted">This permanently deletes your account and every linked child profile, plan and setting. To confirm, type <b>DELETE</b> below.</p>
            <input className="set-modal-in" value={delText} onChange={(e) => setDelText(e.target.value)} placeholder="Type DELETE to confirm" autoFocus />
            <div className="set-modal-row">
              <button className="adm-btn ghost" onClick={() => setDelOpen(false)}>Cancel</button>
              <button className="adm-btn danger" disabled={delText !== "DELETE"} style={{ opacity: delText === "DELETE" ? 1 : 0.5 }} onClick={doDelete}>Delete forever</button>
            </div>
          </div>
        </div>
      )}

      <p className="adm-disclaimer muted">Themes and display mode are live now. Accounts, passwords, locks, vacation, extra parents/guardians, 2FA, the data-training choices, sign-out and delete run client-side here so you can shape the flow — they persist to your API once the auth &amp; account backend is wired.</p>
    </div>
  );
}
