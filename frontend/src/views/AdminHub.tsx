import { useState } from "react";
import { useProfile, THEMES } from "../lib/profile";

/* Curio · Admin › Hub — accounts, access & plans.
   Add users, reset passwords, set theme rights, view the parent→child account
   tree, and assign paid plans. Client-side demo until the auth/user backend is
   wired (then these actions hit your API + Mongo). */

type Role = "admin" | "parent" | "child";
type Plan = "Free" | "Family" | "Premium";
interface Account { id: string; name: string; email: string; role: Role; plan: Plan; parentId: string | null; themeRight: boolean; }

function AdminHero({ eyebrow, title, tease }: { eyebrow: string; title: React.ReactNode; tease: string }) {
  return (
    <div className="adm-hero">
      <div className="adm-eyebrow">{eyebrow}</div>
      <h1 className="adm-title">{title}</h1>
      <p className="adm-tease muted">{tease}</p>
    </div>
  );
}

const PLANS: Plan[] = ["Free", "Family", "Premium"];
const ROLE_COLOR: Record<Role, string> = { admin: "#6366F1", parent: "#5AA7E6", child: "#FF7A66" };

export default function AdminHub() {
  const { children } = useProfile();
  const PARENT_ID = "acc-parent";
  const [accounts, setAccounts] = useState<Account[]>(() => [
    { id: "acc-admin", name: "You", email: "tech@qyrafund.com", role: "admin", plan: "Premium", parentId: null, themeRight: true },
    { id: PARENT_ID, name: "Parent", email: "parent@family.co", role: "parent", plan: "Family", parentId: null, themeRight: true },
    ...children.map((c) => ({ id: "acc-" + c.id, name: c.name, email: `${c.name.toLowerCase()}@family.co`, role: "child" as Role, plan: "Family" as Plan, parentId: PARENT_ID, themeRight: true })),
  ]);
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2200); };
  const [nu, setNu] = useState({ name: "", email: "", role: "child" as Role });

  const setPlan = (id: string, plan: Plan) => setAccounts((a) => a.map((x) => (x.id === id ? { ...x, plan } : x)));
  const toggleTheme = (id: string) => setAccounts((a) => a.map((x) => (x.id === id ? { ...x, themeRight: !x.themeRight } : x)));
  const remove = (id: string) => setAccounts((a) => a.filter((x) => x.id !== id && x.parentId !== id));
  const reset = (acc: Account) => flash(`Password reset link sent to ${acc.email}`);
  const addUser = () => {
    if (!nu.name.trim() || !nu.email.trim()) { flash("Name and email are required."); return; }
    const id = "acc-" + Date.now();
    setAccounts((a) => [...a, { id, name: nu.name.trim(), email: nu.email.trim(), role: nu.role, plan: "Family", parentId: nu.role === "child" ? PARENT_ID : null, themeRight: true }]);
    setNu({ name: "", email: "", role: "child" });
    flash("Account created.");
  };

  // family tree (parent → children)
  const parents = accounts.filter((a) => a.role === "parent");
  const kids = (pid: string) => accounts.filter((a) => a.parentId === pid);

  return (
    <div className="view adm">
      <AdminHero eyebrow="Admin · Hub" title={<>Accounts, access &amp; <em>plans</em></>}
        tease="Add users, reset passwords, set who can change themes, see how parent and child accounts link together, and assign paid plans — all in one place." />

      {toast && <div className="adm-toast">{toast}</div>}

      {/* users */}
      <section className="adm-sec">
        <h2 className="adm-h2">👥 Users</h2>
        <div className="adm-card adm-tablewrap">
          <table className="adm-table">
            <thead><tr><th>Account</th><th>Role</th><th>Plan</th><th>Theme rights</th><th></th></tr></thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td><div className="adm-acc"><span className="adm-dot" style={{ background: ROLE_COLOR[a.role] }} /><div><b>{a.name}</b><div className="muted" style={{ fontSize: ".82rem" }}>{a.email}</div></div></div></td>
                  <td><span className="adm-role" style={{ color: ROLE_COLOR[a.role], borderColor: ROLE_COLOR[a.role] + "66" }}>{a.role}</span></td>
                  <td>
                    {a.role === "admin" ? <span className="muted">—</span> : (
                      <select className="adm-select" value={a.plan} onChange={(e) => setPlan(a.id, e.target.value as Plan)}>
                        {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    )}
                  </td>
                  <td>{a.role === "child"
                    ? <button className={"adm-toggle" + (a.themeRight ? " on" : "")} onClick={() => toggleTheme(a.id)} aria-pressed={a.themeRight}><span /></button>
                    : <span className="muted">—</span>}</td>
                  <td className="adm-actions">
                    <button className="adm-btn xs ghost" onClick={() => reset(a)}>Reset password</button>
                    {a.role !== "admin" && <button className="adm-btn xs danger" onClick={() => remove(a.id)}>Remove</button>}
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
            <select value={nu.role} onChange={(e) => setNu({ ...nu, role: e.target.value as Role })}>
              <option value="child">child</option><option value="parent">parent</option><option value="admin">admin</option>
            </select>
            <button className="adm-btn" onClick={addUser}>＋ Add</button>
          </div>
        </div>
      </section>

      {/* account tree */}
      <section className="adm-sec">
        <h2 className="adm-h2">🌳 Account hierarchy</h2>
        <p className="muted" style={{ marginTop: 0 }}>How parent and child accounts link together. Children inherit their parent's plan unless overridden above.</p>
        <div className="adm-card">
          {parents.map((p) => (
            <div className="adm-tree" key={p.id}>
              <div className="adm-tnode parent"><span className="adm-dot" style={{ background: ROLE_COLOR.parent }} />{p.name} <span className="muted">· {p.plan}</span></div>
              <div className="adm-tchildren">
                {kids(p.id).map((c) => {
                  const prof = children.find((ch) => "acc-" + ch.id === c.id);
                  return (
                    <div className="adm-tchild" key={c.id}>
                      <span className="adm-tline" />
                      <div className="adm-tnode child">
                        <span className="adm-av" style={{ background: prof ? `linear-gradient(140deg,${THEMES[prof.theme].accent},${THEMES[prof.theme].deep})` : "#ccc" }}>{prof ? THEMES[prof.theme].emoji : "🙂"}</span>
                        {c.name} <span className="muted">· {c.plan}</span>
                      </div>
                    </div>
                  );
                })}
                {kids(p.id).length === 0 && <span className="muted" style={{ fontSize: ".85rem" }}>No child accounts linked.</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* plans */}
      <section className="adm-sec">
        <h2 className="adm-h2">💳 Plans</h2>
        <div className="adm-plans">
          {[
            { name: "Free", price: "R0", feats: ["1 child profile", "Core games & Canvas", "Weekly plan (basic)"] },
            { name: "Family", price: "R99/mo", feats: ["Up to 4 children", "Full Coach + Develop", "Insights & tracking", "Personalised books"] },
            { name: "Premium", price: "R199/mo", feats: ["Unlimited children", "Everything in Family", "Priority new tools", "Deep Intelligence reports"] },
          ].map((p) => (
            <div className={"adm-plan" + (p.name === "Family" ? " feat" : "")} key={p.name}>
              {p.name === "Family" && <div className="adm-plan-tag">Most chosen</div>}
              <div className="adm-plan-n">{p.name}</div>
              <div className="adm-plan-p">{p.price}</div>
              <ul>{p.feats.map((f) => <li key={f}>{f}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>

      <p className="adm-disclaimer muted">This Hub runs client-side for now so you can shape it. Once the auth/user backend is wired, add-user, password resets, plan changes and theme rights persist to your API and Mongo, and link to real billing.</p>
    </div>
  );
}
