import { useEffect, useState } from "react";
import type { UserPublic } from "../types";
import PageHero from "../components/PageHero";
import { growth, type FeedbackItem, type ReleaseItem, type Benchmark, type Knowledge } from "../lib/growth";
import { ISSUE_TAGS, STRENGTH_TAGS } from "../lib/tags";
import { COUNTRIES } from "../lib/options";
import { api } from "../lib/api";

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
  const [tab, setTab] = useState<"queue" | "release" | "data" | "benchmarks" | "knowledge" | "tech">("queue");
  return (
    <div style={{ marginTop: 26 }}>
      <h2 style={{ marginBottom: 10 }}>Admin</h2>
      <div className="tabs">
        {(["queue", "release", "data", "benchmarks", "knowledge", "tech"] as const).map((t) => (
          <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t === "queue" ? "Requests" : t === "release" ? "Release plan" : t === "data" ? "Data controls" : t === "benchmarks" ? "Benchmarks" : t === "knowledge" ? "Knowledge" : "Tech"}</button>
        ))}
      </div>
      {tab === "queue" && <Queue />}
      {tab === "release" && <Release />}
      {tab === "data" && <DataControls />}
      {tab === "benchmarks" && <Benchmarks />}
      {tab === "knowledge" && <KnowledgeAdmin />}
      {tab === "tech" && <Tech />}
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

const AGE_GROUPS = ["3-5", "6-8", "9-11", "12-14"];
const FREQS = ["off", "weekly", "monthly", "quarterly"];

function Benchmarks() {
  const [items, setItems] = useState<Benchmark[]>([]);
  const [freq, setFreq] = useState("monthly");
  const [scope, setScope] = useState<"world" | "country">("world");
  const [country, setCountry] = useState("South Africa");
  const [age, setAge] = useState("6-8");
  const [theme, setTheme] = useState("");
  const [value, setValue] = useState("60");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const load = () => { growth.adminBenchmarks().then(setItems).catch(() => {}); growth.adminBenchConfigGet().then((c) => setFreq(c.frequency)).catch(() => {}); };
  useEffect(load, []);

  const addOne = async () => {
    if (!theme.trim()) return;
    await growth.adminBenchPut({ scope, country: scope === "country" ? country : "", age_group: age, theme: theme.trim(), value: Number(value) || 50, status: "approved" });
    setTheme(""); load();
  };
  const suggest = async () => {
    setBusy(true); setMsg("");
    try { await growth.adminBenchSuggest({ scope, country: scope === "country" ? country : "", age_group: age, themes: [...ISSUE_TAGS, ...STRENGTH_TAGS] }); setMsg("AI suggestions added below — review and approve."); load(); }
    catch { setMsg("Suggest failed — check the model is configured."); }
    setBusy(false);
  };
  const patch = async (b: Benchmark, p: Partial<Benchmark>) => { const u = await growth.adminBenchPatch(b.id, p); setItems((x) => x.map((y) => (y.id === b.id ? u : y))); };
  const del = async (b: Benchmark) => { await growth.adminBenchDel(b.id); setItems((x) => x.filter((y) => y.id !== b.id)); };
  const saveFreq = async (f: string) => { setFreq(f); await growth.adminBenchConfigSet(f); };

  const view = items.filter((b) => b.scope === scope && (scope === "world" || b.country === country) && b.age_group === age);
  const suggested = view.filter((b) => b.status === "suggested");
  const approved = view.filter((b) => b.status === "approved");

  const row = (b: Benchmark, pending: boolean) => (
    <div className="adm-rel" key={b.id}>
      <span style={{ flex: 1, fontWeight: 700 }}>{b.theme}</span>
      <input type="number" min={0} max={100} value={b.value} style={{ width: 70 }} onChange={(e) => patch(b, { value: Math.max(0, Math.min(100, Number(e.target.value))) })} />
      {pending
        ? <><button className="pt-ghost adm-btn" onClick={() => patch(b, { status: "approved" })}>Approve</button><button className="need-x" onClick={() => del(b)}>✕</button></>
        : <button className="need-x" onClick={() => del(b)}>✕</button>}
    </div>
  );

  return (
    <div className="dv-card">
      <p className="muted" style={{ marginTop: 0 }}>Typical-for-age reference levels (0–100), not measured percentiles. AI can suggest values; nothing shows to parents until you approve it.</p>
      <div className="fb-row">
        <select value={scope} onChange={(e) => setScope(e.target.value as "world" | "country")}><option value="world">World</option><option value="country">Country</option></select>
        {scope === "country" && <select value={country} onChange={(e) => setCountry(e.target.value)}>{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</select>}
        <select value={age} onChange={(e) => setAge(e.target.value)}>{AGE_GROUPS.map((a) => <option key={a}>{a}</option>)}</select>
        <button className="pt-go" disabled={busy} onClick={suggest}>{busy ? "Thinking…" : "🤖 AI-suggest"}</button>
      </div>
      <div className="fb-row">
        <input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Theme (e.g. Reading fluency)" />
        <input type="number" min={0} max={100} value={value} style={{ maxWidth: 90 }} onChange={(e) => setValue(e.target.value)} />
        <button className="pt-ghost" onClick={addOne}>＋ Add</button>
      </div>
      {msg && <div className="fb-ok">{msg}</div>}

      {suggested.length > 0 && <><h3>Pending approval ({suggested.length})</h3>{suggested.map((b) => row(b, true))}</>}
      <h3>Approved · {scope === "country" ? country : "World"} · age {age} ({approved.length})</h3>
      {approved.length === 0 && <div className="dv-empty">None yet. Add manually or use AI-suggest, then approve.</div>}
      {approved.map((b) => row(b, false))}

      <hr style={{ border: 0, borderTop: "1px solid var(--ring)", margin: "16px 0" }} />
      <h3 style={{ margin: "0 0 6px" }}>Auto-suggest frequency</h3>
      <p className="muted" style={{ marginTop: 0 }}>How often the AI proposes fresh benchmark values for your review.</p>
      <div className="seg wrap">{FREQS.map((f) => <button key={f} className={freq === f ? "on" : ""} onClick={() => saveFreq(f)}>{f}</button>)}</div>
    </div>
  );
}

function KnowledgeAdmin() {
  const [items, setItems] = useState<Knowledge[]>([]);
  const [freq, setFreq] = useState("monthly");
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [tradition, setTradition] = useState("");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const load = () => { growth.adminKnowledge().then(setItems).catch(() => {}); growth.adminKnowledgeConfigGet().then((c) => setFreq(c.frequency)).catch(() => {}); };
  useEffect(load, []);

  const addOne = async () => {
    if (!title.trim() || !summary.trim()) { setMsg("Title and summary are required."); return; }
    await growth.adminKnowledgePut({ title: title.trim(), tradition: tradition.trim(), summary: summary.trim(), status: "approved" });
    setTitle(""); setTradition(""); setSummary(""); setMsg(""); load();
  };
  const suggest = async () => {
    if (!topic.trim()) { setMsg("Enter a topic to draft."); return; }
    setBusy(true); setMsg("");
    try { await growth.adminKnowledgeSuggest(topic.trim()); setMsg("Draft added below — review and approve."); setTopic(""); load(); }
    catch { setMsg("Draft failed — check the model is configured."); }
    setBusy(false);
  };
  const patch = async (k: Knowledge, p: Partial<Knowledge>) => { const u = await growth.adminKnowledgePatch(k.id, p); setItems((x) => x.map((y) => (y.id === k.id ? u : y))); };
  const del = async (k: Knowledge) => { await growth.adminKnowledgeDel(k.id); setItems((x) => x.filter((y) => y.id !== k.id)); };
  const saveFreq = async (f: string) => { setFreq(f); await growth.adminKnowledgeConfigSet(f); };

  const suggested = items.filter((k) => k.status === "suggested");
  const approved = items.filter((k) => k.status === "approved");
  const card = (k: Knowledge, pending: boolean) => (
    <div className="dv-card" key={k.id} style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <b>{k.title}</b><span className="muted" style={{ fontSize: ".8rem" }}>{k.tradition}{k.source_type === "ai" ? " · AI-drafted" : k.source_type === "seed" ? " · seed" : ""}</span>
      </div>
      <p className="muted" style={{ margin: "6px 0" }}>{k.summary}</p>
      <div className="fb-row">
        {pending && <button className="pt-go adm-btn" onClick={() => patch(k, { status: "approved" })}>Approve</button>}
        <button className="need-x" onClick={() => del(k)}>Delete ✕</button>
      </div>
    </div>
  );

  return (
    <div className="dv-card">
      <p className="muted" style={{ marginTop: 0 }}>The shared knowledge base that informs guidance for every family. AI can draft original summaries; nothing goes live until you approve it. No copyrighted text is stored.</p>
      <div className="fb-row">
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Draft a tradition (e.g. 'Te Whāriki, New Zealand')" style={{ flex: 1 }} />
        <button className="pt-go" disabled={busy} onClick={suggest}>{busy ? "Drafting…" : "🤖 AI-draft"}</button>
      </div>
      <div className="fb-row" style={{ flexWrap: "wrap" }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <input value={tradition} onChange={(e) => setTradition(e.target.value)} placeholder="Tradition / origin" />
      </div>
      <textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Original summary (2-3 sentences)" rows={2} style={{ width: "100%", marginTop: 8 }} />
      <div className="fb-row"><button className="pt-ghost" onClick={addOne}>＋ Add entry</button></div>
      {msg && <div className="fb-ok">{msg}</div>}

      {suggested.length > 0 && <><h3>Pending approval ({suggested.length})</h3>{suggested.map((k) => card(k, true))}</>}
      <h3>Approved ({approved.length})</h3>
      {approved.map((k) => card(k, false))}

      <hr style={{ border: 0, borderTop: "1px solid var(--ring)", margin: "16px 0" }} />
      <h3 style={{ margin: "0 0 6px" }}>Auto-draft frequency</h3>
      <p className="muted" style={{ marginTop: 0 }}>How often the AI proposes fresh knowledge entries for your review.</p>
      <div className="seg wrap">{["off", "weekly", "monthly", "quarterly"].map((f) => <button key={f} className={freq === f ? "on" : ""} onClick={() => saveFreq(f)}>{f}</button>)}</div>
    </div>
  );
}

function Tech() {
  // Admin tech-error viewer. Backend redacts secrets before writing, so the
  // upstream field is safe to display; still keep it collapsed by default.
  const [rows, setRows] = useState<import("../types").AdminError[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const load = () => {
    setLoading(true);
    api.adminErrorsList(200)
      .then((r) => setRows(r.errors))
      .catch(() => setErr("Couldn't load errors."))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  const purgeOld = async () => {
    if (!confirm("Delete errors older than 2 days?")) return;
    await api.adminErrorsPurge(2);
    load();
  };
  const clearAll = async () => {
    if (!confirm("Delete ALL errors from the log? (Cron keeps 2 days automatically.)")) return;
    await api.adminErrorsClear();
    load();
  };
  const badge = (s: number) => {
    if (s === 401 || s === 403 || s === 402) return { l: "auth", c: "#813040", bg: "#F4E3E5" };
    if (s === 429) return { l: "rate", c: "#9A4D00", bg: "#FFEDD5" };
    if (s === 413) return { l: "size", c: "#9A4D00", bg: "#FFEDD5" };
    if (s >= 500) return { l: "server", c: "#7A1D1D", bg: "#FCD7D7" };
    if (s >= 400) return { l: "client", c: "#5B5666", bg: "#F4F1EA" };
    return { l: String(s), c: "#5B5666", bg: "#F4F1EA" };
  };
  return (
    <div className="adm-card" style={{ maxWidth: 960 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0 }}>Technical errors</h3>
          <p className="muted" style={{ margin: "6px 0 0" }}>Recent server-side errors, with secrets automatically redacted. Retained for 2 days (or until manually cleared).</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="adm-btn xs ghost" onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
          <button className="adm-btn xs" onClick={purgeOld}>Purge &gt;2 days</button>
          <button className="adm-btn xs danger" onClick={clearAll}>Clear all</button>
        </div>
      </div>
      {err && <div className="fb-ok" style={{ background: "#FCD7D7", color: "#7A1D1D" }}>{err}</div>}
      {rows.length === 0 && !loading && <div className="dv-empty" style={{ marginTop: 14 }}>No errors logged. That's a good sign.</div>}
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((r) => {
          const b = badge(r.status);
          const isOpen = !!expanded[r.id];
          return (
            <div key={r.id} style={{ background: "var(--surface)", border: "1px solid var(--ring)", borderRadius: 11, padding: "10px 12px" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ background: b.bg, color: b.c, borderRadius: 99, padding: "3px 9px", fontSize: ".72rem", fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase" }}>{b.l} · {r.status}</span>
                <b style={{ fontFamily: "monospace", fontSize: ".82rem" }}>{r.endpoint}</b>
                <span className="muted" style={{ fontSize: ".78rem" }}>{new Date(r.created_at).toLocaleString()}</span>
                {r.user_id && <span className="muted" style={{ fontSize: ".78rem" }}>· user {r.user_id.slice(0, 24)}</span>}
              </div>
              <div style={{ marginTop: 6, fontSize: ".92rem", color: "var(--ink)" }}>{r.message}</div>
              {r.upstream && (
                <div style={{ marginTop: 6 }}>
                  <button className="adm-btn xs ghost" onClick={() => setExpanded((x) => ({ ...x, [r.id]: !isOpen }))}>
                    {isOpen ? "Hide upstream detail" : "Show upstream detail"}
                  </button>
                  {isOpen && (
                    <pre style={{ marginTop: 6, background: "var(--paper)", border: "1px solid var(--ring)", borderRadius: 8, padding: 10, fontSize: ".78rem", whiteSpace: "pre-wrap", wordBreak: "break-word", overflowX: "auto" }}>{r.upstream}</pre>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
