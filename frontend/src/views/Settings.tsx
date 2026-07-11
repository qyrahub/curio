import { useState, useEffect } from "react";
import { useProfile, THEMES, type ChildProfile, type ThemeKey } from "../lib/profile";
import { INTERESTS, OUTCOMES, COUNTRIES, PERSONALITIES, PREFERENCES, DISLIKES, SUPPORT_NEEDS, PRIORITY_AREAS } from "../lib/options";
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
  age: "7", gender: "other" as Gender, theme: "" as ThemeKey | "", country: "",
  interests: [] as string[], nurture: [] as string[],
  personality: [] as string[], preferences: [] as string[], dislikes: [] as string[],
  needs: [] as string[], priorityAreas: [] as string[], history: "",
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
  const invite = async (a: Account) => {
    // Generate a plausible invite URL, copy to clipboard, and simulate emailing
    // it. Both actions in one click, so "invite / copy / email" is one atomic
    // step from the parent's point of view. When the auth backend is wired the
    // toast will reflect the actual server response.
    const token = uid() + uid();
    const url = `https://curio.sproutwise.co.za/invite?t=${token}`;
    let copied = false;
    try { await navigator.clipboard.writeText(url); copied = true; } catch { /* clipboard may be unavailable */ }
    flash(copied
      ? `Invite link copied. Also emailed to ${a.email}.`
      : `Invite link emailed to ${a.email}.`);
  };
  const addAcct = () => {
    if (!nu.name.trim()) { flash("Name is required."); return; }
    if (nu.role !== "child" && !nu.email.trim()) { flash("Email is required for parent and admin accounts."); return; }
    if (nu.role === "child") {
      const nc = addChild();
      const age = Math.max(1, Math.min(18, Math.round(Number(nu.age)) || nc.age));
      updateChild({
        ...nc, name: nu.name.trim(), age, gender: nu.gender,
        theme: (nu.theme || nc.theme) as ThemeKey,
        country: nu.country.trim() || undefined,
        interests: nu.interests.length ? nu.interests : nc.interests,
        outcomes: nu.nurture.length ? nu.nurture : undefined,
        personality: nu.personality.length ? nu.personality : undefined,
        preferences: nu.preferences.length ? nu.preferences : undefined,
        dislikes: nu.dislikes.length ? nu.dislikes : undefined,
        needs: nu.needs.length ? nu.needs : undefined,
        priorityAreas: nu.priorityAreas.length ? nu.priorityAreas : undefined,
        history: nu.history.trim() || undefined,
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

  // rights: grant module access to an existing parent/admin account. Previously
  // this tab had its own name/email/role form that duplicated user creation
  // and was confusing (an "Invite" button that also created an account) —
  // now rights are strictly about existing users. Guardian records key back
  // to accounts by email (stable across id regeneration).
  const [ng, setNg] = useState({ accountId: "", role: "parent" as "parent" | "guardian", modules: [...PARENT_MODULES], canEditAccount: false });
  const rightsCandidates = accounts.filter((a) => (a.role === "parent" || a.role === "admin") && a.id !== meId);
  const grantRights = () => {
    if (!ng.accountId) { flash("Pick a user to grant rights to."); return; }
    const a = accounts.find((x) => x.id === ng.accountId);
    if (!a) return;
    setSt((s) => {
      const others = s.guardians.filter((g) => g.email !== a.email);
      const existing = s.guardians.find((g) => g.email === a.email);
      const record: Guardian = { id: existing?.id || uid(), name: a.name, email: a.email, role: ng.role, modules: ng.modules, canEditAccount: ng.canEditAccount };
      return { ...s, guardians: [...others, record] };
    });
    setNg({ accountId: "", role: "parent", modules: [...PARENT_MODULES], canEditAccount: false });
    flash(`Rights ${st.guardians.some((g) => g.email === a.email) ? "updated" : "granted"} for ${a.name}.`);
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
                      {a.id !== meId && (a.role === "parent" || a.role === "admin") && <button className="adm-btn xs" onClick={() => invite(a)}>Invite</button>}
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
              <input placeholder={nu.role === "child" ? "Email (optional)" : "Email"} value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} />
              <select value={nu.role} onChange={(e) => setNu({ ...nu, role: e.target.value as Role })}><option value="child">child</option><option value="parent">parent</option>{isAdmin && <option value="admin">admin</option>}</select>
            </div>

            {nu.role === "child" ? (
              <>
                <div className="adm-addrow">
                  <input type="number" min={1} max={18} placeholder="Age" value={nu.age} onChange={(e) => setNu({ ...nu, age: e.target.value })} style={{ maxWidth: 90 }} />
                  <select value={nu.gender} onChange={(e) => setNu({ ...nu, gender: e.target.value as Gender })}>
                    {GENDERS.map((g) => <option key={g.v} value={g.v}>{g.l}</option>)}
                  </select>
                  <select value={nu.theme} onChange={(e) => setNu({ ...nu, theme: e.target.value as ThemeKey })}>
                    <option value="">Theme (auto)</option>
                    {(Object.keys(THEMES) as ThemeKey[]).map((k) => <option key={k} value={k}>{THEMES[k].emoji} {THEMES[k].name}</option>)}
                  </select>
                  <select value={nu.country} onChange={(e) => setNu({ ...nu, country: e.target.value })} style={{ minWidth: 180 }}>
                    <option value="">Country (not set)</option>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ marginTop: 10 }}>
                  <div className="muted" style={{ fontSize: ".82rem", marginBottom: 6 }}>Interests · tap to toggle (drives the outputs; can be changed later under Develop)</div>
                  <div className="dv-intchips">
                    {INTERESTS.filter((o) => !o.surprise).map((o) => {
                      const on = nu.interests.includes(o.v);
                      return (
                        <button key={o.v} type="button" className={"dv-intchip" + (on ? " on" : "")}
                          onClick={() => setNu({ ...nu, interests: on ? nu.interests.filter((i) => i !== o.v) : [...nu.interests, o.v] })}>
                          {o.e} {o.v}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <div className="muted" style={{ fontSize: ".82rem", marginBottom: 6 }}>What would you like to nurture? · these seed the Child module and give the Brain a sense of what you're aiming for</div>
                  <div className="dv-intchips">
                    {OUTCOMES.map((o) => {
                      const on = nu.nurture.includes(o.v);
                      return (
                        <button key={o.v} type="button" className={"dv-intchip" + (on ? " on" : "")}
                          onClick={() => setNu({ ...nu, nurture: on ? nu.nurture.filter((i) => i !== o.v) : [...nu.nurture, o.v] })}>
                          {o.e} {o.v}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <details style={{ marginTop: 14 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 700 }}>More about them <span className="muted" style={{ fontWeight: 500, fontSize: ".82rem" }}>· optional · seeds Brain, Insights, nudges &amp; reports</span></summary>
                  <p className="muted" style={{ fontSize: ".82rem", marginTop: 8, marginBottom: 12 }}>All optional. These are your best read now — you can edit them later per-child under Develop → ⚙. The Brain treats every field here as parent intent, never as observed evidence.</p>

                  {([
                    ["Personality", PERSONALITIES as readonly string[], "personality" as const, "How you'd describe their character."],
                    ["Preferences", PREFERENCES as readonly string[], "preferences" as const, "How they like to learn and engage."],
                    ["Dislikes", DISLIKES as readonly string[], "dislikes" as const, "Common friction points — non-judgmental, just useful for the Brain to know."],
                    ["Support needs", SUPPORT_NEEDS as readonly string[], "needs" as const, "What tends to help them do their best work."],
                    ["Priority areas", PRIORITY_AREAS as readonly string[], "priorityAreas" as const, "What you'd like to focus on right now."],
                  ] as const).map(([label, pool, key, hint]) => (
                    <div style={{ marginBottom: 12 }} key={key}>
                      <div className="muted" style={{ fontSize: ".82rem", marginBottom: 6 }}><b style={{ color: "var(--ink)" }}>{label}</b> · {hint}</div>
                      <div className="dv-intchips">
                        {pool.map((x) => {
                          const on = nu[key].includes(x);
                          return (
                            <button key={x} type="button" className={"dv-intchip" + (on ? " on" : "")}
                              onClick={() => setNu({ ...nu, [key]: on ? nu[key].filter((i) => i !== x) : [...nu[key], x] })}>
                              {x}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <div style={{ marginBottom: 6 }}>
                    <div className="muted" style={{ fontSize: ".82rem", marginBottom: 6 }}><b style={{ color: "var(--ink)" }}>History</b> · past behaviour, family context, or anything else you'd want the Brain to be aware of. Free text.</div>
                    <textarea
                      value={nu.history}
                      onChange={(e) => setNu({ ...nu, history: e.target.value })}
                      rows={4}
                      placeholder="e.g. Went through a rough transition at school last term; slowly finding their feet again. Loves the after-school drama club."
                      style={{ width: "100%", boxSizing: "border-box", padding: 10, borderRadius: 8, border: "1px solid var(--ring)", background: "var(--surface)", color: "var(--ink)", fontFamily: "inherit", fontSize: ".9rem", resize: "vertical" }}
                    />
                  </div>
                </details>
              </>
            ) : (
              <div className="adm-addrow">
                <input placeholder="Username" value={nu.username} onChange={(e) => setNu({ ...nu, username: e.target.value })} />
                <input type="password" placeholder="Set password (or leave blank to invite)" value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} />
                <select value={nu.country} onChange={(e) => setNu({ ...nu, country: e.target.value })} style={{ minWidth: 180 }}>
                  <option value="">Country (not set)</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            <div className="adm-addrow" style={{ marginTop: 4 }}>
              <button className="adm-btn" onClick={addAcct}>＋ Add {nu.role}</button>
            </div>
            <p className="muted" style={{ fontSize: ".82rem", marginTop: 8 }}>
              {nu.role === "child"
                ? "Children can't sign themselves up — they're enrolled here by a parent or admin. Email is optional for children. Age, gender, theme, country and interests can all be set now, or changed later per-child."
                : "A password set here triggers a secure invite link rather than being stored as plain text. You can also use the Invite action next to the row after they're added."}
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
            <h3 style={{ marginTop: 0 }}>Grant rights to a parent or guardian</h3>
            <p className="muted" style={{ marginTop: 0 }}>Pick an existing user, then choose the modules they can open. New parents are added under <b>Accounts &amp; access</b> — this tab only grants rights to people who already have an account.</p>
            {rightsCandidates.length === 0 ? (
              <div className="muted" style={{ padding: "10px 0" }}>No parent or admin accounts yet. Add one under <b>Accounts &amp; access</b>, then come back here.</div>
            ) : (
              <>
                <div className="set-grow">
                  <select value={ng.accountId} onChange={(e) => setNg({ ...ng, accountId: e.target.value })}>
                    <option value="">Select a user…</option>
                    {rightsCandidates.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.email}</option>)}
                  </select>
                  <select value={ng.role} onChange={(e) => setNg({ ...ng, role: e.target.value as "parent" | "guardian" })}><option value="parent">as parent</option><option value="guardian">as guardian</option></select>
                </div>
                <div className="set-modlabel">Modules they can access</div>
                <div className="set-mods">{PARENT_MODULES.map((m) => <button key={m} className={"set-modchip" + (ng.modules.includes(m) ? " on" : "")} onClick={() => toggleNgMod(m)}>{m}</button>)}</div>
                <label className="set-check"><input type="checkbox" checked={ng.canEditAccount} onChange={(e) => setNg({ ...ng, canEditAccount: e.target.checked })} /> May change login / account &amp; personal details</label>
                <button className="adm-btn" style={{ marginTop: 10 }} onClick={grantRights}>{ng.accountId && st.guardians.some((g) => { const a = accounts.find((x) => x.id === ng.accountId); return a && g.email === a.email; }) ? "Update rights" : "Grant rights"}</button>
              </>
            )}
            {st.guardians.length > 0 && <div className="set-glist">{st.guardians.map((g) => (<div className="set-grow-item" key={g.id}><div><b>{g.name}</b> <span className="set-role">{g.role}</span><div className="muted" style={{ fontSize: ".82rem" }}>{g.email} · {g.modules.length} modules · {g.canEditAccount ? "can edit account" : "view/use only"}</div></div><div style={{ display: "flex", gap: 6 }}><button className="adm-btn xs ghost" onClick={() => { const a = accounts.find((x) => x.email === g.email); if (a) setNg({ accountId: a.id, role: g.role, modules: [...g.modules], canEditAccount: g.canEditAccount }); }}>Edit</button><button className="adm-btn xs danger" onClick={() => setSt((s) => ({ ...s, guardians: s.guardians.filter((x) => x.id !== g.id) }))}>Revoke</button></div></div>))}</div>}
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
