import { useState } from "react";

/* Curio · Admin › Intelligence — the operator's advisory cockpit.
   What's working, what to introduce, tools to add/tweak, engagement analytics,
   and reports. Data is seeded preview until live tracking + the Brain feed it. */

function AdminHero({ eyebrow, title, tease }: { eyebrow: string; title: React.ReactNode; tease: string }) {
  return (
    <div className="adm-hero">
      <div className="adm-eyebrow">{eyebrow}</div>
      <h1 className="adm-title">{title}</h1>
      <p className="adm-tease muted">{tease}</p>
    </div>
  );
}

const KPIS = [
  { label: "Weekly active children", value: "2", delta: "+0", note: "of 2 profiles" },
  { label: "Avg session", value: "11m", delta: "+1m", note: "vs last week" },
  { label: "4-week retention", value: "86%", delta: "+4%", note: "returning" },
  { label: "Activities completed", value: "143", delta: "+22", note: "this week" },
];
const ENGAGE = [9, 11, 8, 13, 12, 15, 14, 17, 16, 19, 18, 22]; // weekly activities
const WORKING = [
  { name: "Bubble pop & games", pct: 92, trend: "▲ 6%" },
  { name: "Coach plans", pct: 74, trend: "▲ 11%" },
  { name: "Canvas creations", pct: 68, trend: "▲ 3%" },
  { name: "Read-aloud library", pct: 54, trend: "▲ 8%" },
  { name: "Word scramble (word clue)", pct: 41, trend: "▲ 19%" },
];
const INTRODUCE = [
  { title: "Phonics mini-games for ages 5–7", why: "Word-clue scramble engagement jumped 19% — there's clear appetite for sound/spelling play, and it's the top gap in this cohort.", impact: "High · fills a literacy gap that's already pulling kids in." },
  { title: "Parent weekly digest (opt-in email)", why: "Parents open the Insights page but rarely twice a week. A short Friday digest brings the value to them without a login.", impact: "Medium · retention + word-of-mouth." },
  { title: "Sibling co-op mode", why: "Two-child households are your norm. A shared, turn-based activity would lift session length and reduce 'whose turn' friction.", impact: "Medium · session length + delight." },
  { title: "Age-tiered illustrations", why: "Current hero art reads as ≤4yo. Older kids disengage from visuals that feel babyish; age-appropriate art should lift 8+ engagement.", impact: "High · directly addresses an 8+ drop-off." },
];
const TOOLS = [
  { kind: "add", name: "Streak & gentle reminders", reason: "Nudge daily habit without pressure — short streaks correlate with retention." },
  { kind: "tweak", name: "Coach 'create a plan' chat", reason: "Make it pull real Brain signals, not templates, so plans feel personal from message one." },
  { kind: "add", name: "Printable activity packs", reason: "Off-screen value parents ask for; cheap to generate from existing content." },
  { kind: "tweak", name: "Library shelf order", reason: "Surface 'Relevant to You' first — personalised books are the stickiest content." },
];
const REPORTS = [
  { name: "Weekly engagement", date: "Updated today", lines: "actives · sessions · completion by child" },
  { name: "Content performance", date: "Updated today", lines: "which activities earn time and repeat plays" },
  { name: "Age-cohort progress", date: "Weekly", lines: "growth by age band vs best-practice targets" },
  { name: "Churn-risk watch", date: "Weekly", lines: "profiles trending quiet, with a suggested nudge" },
];

function Bars({ data }: { data: number[] }) {
  const W = 560, H = 120, pad = 8, max = Math.max(...data);
  const bw = (W - pad * 2) / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="adm-bars" preserveAspectRatio="none" aria-hidden="true">
      {data.map((v, i) => {
        const h = (v / max) * (H - pad * 2);
        return <rect key={i} x={pad + i * bw + 3} y={H - pad - h} width={bw - 6} height={h} rx="4" className="adm-bar" style={{ animationDelay: `${i * 0.05}s` }} />;
      })}
    </svg>
  );
}

export default function AdminIntelligence() {
  const [q, setQ] = useState("");
  const [thread, setThread] = useState<{ who: "you" | "ai"; text: string }[]>([
    { who: "ai", text: "This week is healthy: completions up 22 and the word-clue scramble is your fastest riser (+19%). The clearest opportunity is age-tiered visuals — older kids are the soft spot. Want me to draft the rollout?" },
  ]);
  const [roadmap, setRoadmap] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const ask = () => {
    if (!q.trim()) return;
    const text = q.trim();
    setThread((t) => [...t, { who: "you", text },
      { who: "ai", text: `Looking at "${text}": the data points to two moves — lean into what's already rising (phonics/spelling play, +19% this week) and fix the 8+ visual drop-off. I'd sequence age-tiered art first (high impact, low risk), then a weekly parent digest to compound retention. I can turn either into a roadmap item.` }]);
    setQ("");
  };
  const addRoad = (title: string) => { setRoadmap((r) => (r.includes(title) ? r : [...r, title])); setToast(`Added to roadmap: ${title}`); setTimeout(() => setToast(null), 2200); };

  return (
    <div className="view adm">
      <AdminHero eyebrow="Admin · Intelligence" title={<>What's working — and <em>what to do next</em></>}
        tease="Your AI operator: it watches everything across Curio, tells you what's earning engagement, what to introduce, what to tweak, and turns it into reports and a roadmap — honestly." />

      {toast && <div className="adm-toast">{toast}</div>}

      {/* advisor */}
      <section className="adm-sec">
        <h2 className="adm-h2">🧠 Ask the advisor</h2>
        <div className="adm-card">
          <div className="adm-thread">
            {thread.map((m, i) => (
              <div key={i} className={"adm-msg " + m.who}>{m.text}</div>
            ))}
          </div>
          <div className="adm-ask">
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} placeholder="Ask anything — what should I build next? what's underperforming? how do I lift 8+ engagement?" />
            <button className="adm-btn" onClick={ask}>Ask</button>
          </div>
        </div>
      </section>

      {/* analytics */}
      <section className="adm-sec">
        <h2 className="adm-h2">📊 Engagement & analytics</h2>
        <div className="adm-kpis">
          {KPIS.map((k) => (
            <div className="adm-kpi" key={k.label}>
              <div className="adm-kpi-v">{k.value}</div>
              <div className="adm-kpi-l">{k.label}</div>
              <div className="adm-kpi-d">{k.delta} <span className="muted">· {k.note}</span></div>
            </div>
          ))}
        </div>
        <div className="adm-card">
          <div className="row" style={{ justifyContent: "space-between" }}><b>Activities completed · last 12 weeks</b><span className="muted">trending up</span></div>
          <Bars data={ENGAGE} />
        </div>
      </section>

      {/* what's working */}
      <section className="adm-sec">
        <h2 className="adm-h2">✅ What's working</h2>
        <div className="adm-card">
          {WORKING.map((w) => (
            <div className="adm-work" key={w.name}>
              <span className="adm-work-n">{w.name}</span>
              <div className="adm-work-bar"><span style={{ width: `${w.pct}%` }} /></div>
              <span className="adm-work-p">{w.pct}%</span>
              <span className="adm-work-t">{w.trend}</span>
            </div>
          ))}
        </div>
      </section>

      {/* consider introducing */}
      <section className="adm-sec">
        <h2 className="adm-h2">💡 Consider introducing</h2>
        <div className="adm-grid">
          {INTRODUCE.map((it) => {
            const on = roadmap.includes(it.title);
            return (
              <div className="adm-rec" key={it.title}>
                <div className="adm-rec-t">{it.title}</div>
                <div className="adm-rec-w muted">{it.why}</div>
                <div className="adm-rec-i">Impact — {it.impact}</div>
                <button className={"adm-btn sm" + (on ? " done" : "")} onClick={() => addRoad(it.title)}>{on ? "✓ On roadmap" : "＋ Add to roadmap"}</button>
              </div>
            );
          })}
        </div>
      </section>

      {/* tools to add / tweak */}
      <section className="adm-sec">
        <h2 className="adm-h2">🛠 Tools to add or tweak</h2>
        <div className="adm-card">
          {TOOLS.map((t) => (
            <div className="adm-tool" key={t.name}>
              <span className={"adm-pill " + t.kind}>{t.kind === "add" ? "ADD" : "TWEAK"}</span>
              <span className="adm-tool-n">{t.name}</span>
              <span className="adm-tool-r muted">{t.reason}</span>
            </div>
          ))}
        </div>
      </section>

      {/* reports */}
      <section className="adm-sec">
        <h2 className="adm-h2">📑 Reports</h2>
        <div className="adm-card">
          {REPORTS.map((r) => (
            <div className="adm-report" key={r.name}>
              <div>
                <div className="adm-report-n">{r.name}</div>
                <div className="muted" style={{ fontSize: ".84rem" }}>{r.lines}</div>
              </div>
              <div className="row" style={{ gap: 12 }}>
                <span className="muted" style={{ fontSize: ".82rem" }}>{r.date}</span>
                <button className="adm-btn sm ghost" onClick={() => { setToast(`Opening "${r.name}"…`); setTimeout(() => setToast(null), 1800); }}>Open</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="adm-disclaimer muted">Figures are seeded preview so you can see the cockpit. Once activity tracking and the Brain feed are wired, every number, recommendation and report here is computed live from real usage across the ecosystem.</p>
    </div>
  );
}
