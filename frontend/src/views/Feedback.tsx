import { useEffect, useState } from "react";
import type { UserPublic } from "../types";
import PageHero from "../components/PageHero";
import { growth, type FeedbackItem, type ReleaseItem } from "../lib/growth";

const ADMIN_EMAILS = ["thomas.marokane@gmail.com", "tech@qyrafund.com"];
const FEATURE_STATUS = ["new", "incorporate", "scheduled", "dismissed", "shipped"];
const PURGE_COLLS = ["growth_needs", "growth_reviews", "growth_evaluations", "feedback", "release_items"];

export default function Feedback({ user }: { user: UserPublic | null }) {
  const isAdmin = !!user && ADMIN_EMAILS.includes(user.email.toLowerCase());
  return (
    <div className="view">
      <PageHero kind="parent" eyebrow="Your voice" title={<>Feedback &amp; <em>feature requests</em></>}
        tease="Tell us what would help. Feedback quietly teaches the app; feature requests are triaged and, when built, you'll be told." />
      <UserForm user={user} />
      {isAdmin && <AdminPanel />}
    </div>
  );
}

function UserForm({ user }: { user: UserPublic | null }) {
  const [kind, setKind] = useState<"feedback" | "feature">("feature");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [mine, setMine] = useState<FeedbackItem[]>([]);
  const loadMine = () => { growth.mine().then(setMine).catch(() => {}); };
  useEffect(loadMine, []);
  const submit = async () => {
    if (message.trim().length < 2) { setErr("Add a short message."); return; }
    setErr("");
    try { await growth.submit(kind, message.trim(), email.trim() || undefined); setSent(true); setMessage(""); loadMine(); }
    catch { setErr("Couldn't send — check you're signed in."); }
  };
  return (
    <>
      <div className="dv-card" style={{ maxWidth: 720 }}>
        <div className="seg wrap" style={{ marginBottom: 12 }}>
          <button className={kind === "feature" ? "on" : ""} onClick={() => setKind("feature")}>💡 Feature request</button>
          <button className={kind === "feedback" ? "on" : ""} onClick={() => setKind("feedback")}>💬 Feedback</button>
        </div>
        <textarea className="pt-ta" rows={4} value={message} onChange={(e) => { setMessage(e.target.value); setSent(false); }}
          placeholder={kind === "feature" ? "What would you love the app to do?" : "What's working, what isn't?"} />
        <div className="fb-row">
          <input className="pt-ta" style={{ minHeight: 0 }} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (so we can tell you when it ships)" />
          <button className="pt-go" onClick={submit}>Send</button>
        </div>
        {err && <div className="needs-err">{err}</div>}
        {sent && <div className="fb-ok">🌱 Thanks — received. {kind === "feature" ? "We'll triage it and let you know if it ships." : "This helps the app learn."}</div>}
      </div>
      {mine.length > 0 && (
        <div className="dv-card" style={{ maxWidth: 720, marginTop: 14 }}>
          <h3 style={{ marginTop: 0 }}>Your feature requests</h3>
          {mine.map((f) => (
            <div className={"fb-mine" + (f.status === "shipped" ? " shipped" : "")} key={f.id}>
              <div className="fb-msg">{f.message}</div>
              <span className={"fb-badge fb-" + f.status}>{f.status === "shipped" ? "🎉 Shipped" : f.status}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function AdminPanel() {
  const [tab, setTab] = useState<"queue" | "release" | "data">("queue");
  return (
    <div style={{ marginTop: 26 }}>
      <h2 style={{ marginBottom: 10 }}>Admin</h2>
      <div className="tabs">
        {(["queue", "release", "data"] as const).map((t) => (
          <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t === "queue" ? "Requests" : t === "release" ? "Release plan" : "Data controls"}</button>
        ))}
      </div>
      {tab === "queue" && <Queue />}
      {tab === "release" && <Release />}
      {tab === "data" && <DataControls />}
    </div>
  );
}

function Queue() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const load = () => { growth.adminFeedback().then(setItems).catch(() => {}); };
  useEffect(load, []);
  const set = async (f: FeedbackItem, patch: Partial<FeedbackItem>) => { const u = await growth.adminUpdateFeedback(f.id, patch); setItems((x) => x.map((y) => (y.id === f.id ? u : y))); };
  const toRelease = async (f: FeedbackItem) => { await growth.adminPutRelease({ title: f.message.slice(0, 120), source_id: f.id, status: "planned", progress: 0 }); await set(f, { status: "scheduled" }); };
  const features = items.filter((f) => f.kind === "feature");
  const feedback = items.filter((f) => f.kind === "feedback");
  return (
    <div className="dv-card">
      <h3 style={{ marginTop: 0 }}>Feature requests ({features.length})</h3>
      {features.length === 0 && <div className="dv-empty">No feature requests yet.</div>}
      {features.map((f) => (
        <div className="adm-fb" key={f.id}>
          <div className="adm-msg">{f.message}<div className="muted" style={{ fontSize: ".8rem" }}>{f.email} · {(f.created_at || "").slice(0, 10)}</div></div>
          <select value={f.status} onChange={(e) => set(f, { status: e.target.value })}>{FEATURE_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
          <button className="pt-ghost adm-btn" onClick={() => toRelease(f)}>→ Release</button>
          <button className={"pt-ghost adm-btn" + (f.notified ? " done" : "")} onClick={() => set(f, { notified: !f.notified })}>{f.notified ? "✓ Notified" : "Notify"}</button>
        </div>
      ))}
      <h3>Feedback ({feedback.length})</h3>
      {feedback.map((f) => (
        <div className="adm-fb" key={f.id}><div className="adm-msg">{f.message}<div className="muted" style={{ fontSize: ".8rem" }}>{(f.created_at || "").slice(0, 10)} · feeds the Brain</div></div></div>
      ))}
    </div>
  );
}

function Release() {
  const [items, setItems] = useState<ReleaseItem[]>([]);
  const load = () => { growth.adminRelease().then(setItems).catch(() => {}); };
  useEffect(load, []);
  const patch = async (r: ReleaseItem, p: Partial<ReleaseItem>) => { const u = await growth.adminPutRelease({ ...r, ...p }); setItems((x) => x.map((y) => (y.id === r.id ? u : y))); };
  const add = async () => { const u = await growth.adminPutRelease({ title: "New release item", status: "planned", progress: 0 }); setItems((x) => [u, ...x]); };
  const del = async (r: ReleaseItem) => { await growth.adminDelRelease(r.id); setItems((x) => x.filter((y) => y.id !== r.id)); };
  return (
    <div className="dv-card">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}><h3 style={{ margin: 0 }}>Release plan</h3><button className="pt-ghost" onClick={add}>＋ Add item</button></div>
      {items.length === 0 && <div className="dv-empty">Nothing scheduled. Send requests here from the queue.</div>}
      {items.map((r) => (
        <div className="adm-rel" key={r.id}>
          <input value={r.title} onChange={(e) => patch(r, { title: e.target.value })} />
          <select value={r.status} onChange={(e) => patch(r, { status: e.target.value })}>{["planned", "building", "paused", "shipped"].map((s) => <option key={s}>{s}</option>)}</select>
          <span className="adm-prog"><input type="range" min={0} max={100} step={10} value={r.progress || 0} onChange={(e) => patch(r, { progress: Number(e.target.value) })} /><b>{r.progress || 0}%</b></span>
          <button className="need-x" onClick={() => del(r)}>✕</button>
        </div>
      ))}
    </div>
  );
}

function DataControls() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [coll, setColl] = useState(PURGE_COLLS[0]);
  const [days, setDays] = useState("365");
  const [msg, setMsg] = useState("");
  const load = () => { growth.adminStats().then(setStats).catch(() => {}); };
  useEffect(load, []);
  const purge = async () => {
    if (!confirm(`Purge from ${coll} older than ${days} days? This cannot be undone.`)) return;
    try { const r = await growth.adminPurge(coll, { older_than_days: Number(days) || undefined }); setMsg(`Purged ${r.purged} from ${coll}.`); load(); }
    catch { setMsg("Purge failed."); }
  };
  return (
    <div className="dv-card">
      <h3 style={{ marginTop: 0 }}>Stored records</h3>
      <div className="adm-stats">{Object.entries(stats).map(([k, v]) => <div key={k} className="adm-stat"><b>{v}</b><span>{k}</span></div>)}</div>
      <h3>Compact / purge</h3>
      <p className="muted" style={{ marginTop: 0 }}>Prune old records by collection and age. Applies across all users — use with care.</p>
      <div className="fb-row">
        <select value={coll} onChange={(e) => setColl(e.target.value)}>{PURGE_COLLS.map((c) => <option key={c}>{c}</option>)}</select>
        <input className="pt-ta" style={{ minHeight: 0, maxWidth: 160 }} type="number" value={days} onChange={(e) => setDays(e.target.value)} placeholder="older than days" />
        <button className="pt-go" style={{ background: "#FF7A66" }} onClick={purge}>Purge</button>
      </div>
      {msg && <div className="fb-ok">{msg}</div>}
    </div>
  );
}
