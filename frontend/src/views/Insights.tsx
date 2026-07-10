import { useState, useMemo } from "react";
import { brand } from "../lib/brand";
import PageHero from "../components/PageHero";
import { useProfile, THEMES } from "../lib/profile";
import EvolutionChart from "../components/EvolutionChart";
import ProgressReport from "../components/ProgressReport";
import IssuesTimeline from "../components/IssuesTimeline";
import IntelligencePanel from "../components/IntelligencePanel";
import ProfileWheel from "../components/ProfileWheel";
import KnowledgePanel from "../components/KnowledgePanel";
import BenchmarkRadars from "../components/BenchmarkRadars";
import ValueTiles from "../components/ValueTiles";

/* Curio · Insights — the honest value view for parents.
   1) An animated illustration of how every module feeds the Brain and how the
      Brain returns curated learning, advice, books, nudges.
   2) Value created, measurable across week → 5 years, per child.
   3) Intelligence: how each child stacks up against age-typical and best-practice.
   Data here is clearly-labelled synthetic preview (seeded per child) until live
   activity tracking feeds real numbers — no marketing, just the shape of it. */

// ---- deterministic synthetic data (stable per child) ----
function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const RANGES = [
  { key: "week", label: "Week", pts: 7, mul: 0.5 },
  { key: "month", label: "Month", pts: 8, mul: 1 },
  { key: "quarter", label: "Quarter", pts: 9, mul: 2.2 },
  { key: "half", label: "6 mo", pts: 10, mul: 3.6 },
  { key: "y1", label: "1 yr", pts: 12, mul: 5 },
  { key: "y2", label: "2 yr", pts: 12, mul: 8 },
  { key: "y3", label: "3 yr", pts: 12, mul: 11 },
  { key: "y5", label: "5 yr", pts: 12, mul: 15 },
] as const;
type RangeKey = typeof RANGES[number]["key"];

const METRICS = [
  { key: "reading", label: "Reading stamina", color: "#9B6DD6" },
  { key: "number", label: "Number sense", color: "#5AA7E6" },
  { key: "creativity", label: "Creativity", color: "#FF7A66" },
  { key: "focus", label: "Focus & attention", color: "#2EC4B6" },
  { key: "vocab", label: "Vocabulary", color: "#FFB02E" },
  { key: "curiosity", label: "Curiosity", color: "#FF7AA8" },
] as const;

function series(childId: string, metric: string, range: typeof RANGES[number]) {
  const r = rng(hash(childId + metric));
  const start = 28 + r() * 24;
  const growth = (7 + r() * 11) * (range.mul / 5);
  const end = Math.max(2, Math.min(99, start + growth));
  const pts: number[] = [];
  for (let i = 0; i < range.pts; i++) {
    const f = i / (range.pts - 1);
    const noise = (r() - 0.5) * 5;
    pts.push(Math.max(0, Math.min(100, start + (end - start) * f + noise)));
  }
  pts[pts.length - 1] = Math.round(end);
  return { pts, start: Math.round(start), end: Math.round(end), gain: Math.round(end - start) };
}

function Spark({ pts, color }: { pts: number[]; color: string }) {
  const W = 240, H = 60, pad = 4;
  const max = 100, min = 0;
  const xs = (i: number) => pad + (i / (pts.length - 1)) * (W - 2 * pad);
  const ys = (v: number) => H - pad - ((v - min) / (max - min)) * (H - 2 * pad);
  const d = pts.map((v, i) => `${i ? "L" : "M"}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(" ");
  const area = `${d} L${xs(pts.length - 1).toFixed(1)},${H - pad} L${xs(0).toFixed(1)},${H - pad} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="ins-spark" preserveAspectRatio="none" aria-hidden="true">
      <path d={area} fill={color} opacity="0.12" />
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" className="ins-line" />
      <circle cx={xs(pts.length - 1)} cy={ys(pts[pts.length - 1])} r="3.5" fill={color} />
    </svg>
  );
}

// ---- ecosystem illustration ----
const NODES = [
  { id: "child", label: "Child", emoji: "🧒", color: "#FF7A66", x: 410, y: 56 },
  { id: "canvas", label: "Canvas", emoji: "🎨", color: "#FFB02E", x: 588, y: 150 },
  { id: "coach", label: "Coach", emoji: "🧭", color: "#9B6DD6", x: 588, y: 312 },
  { id: "parent", label: "Parent", emoji: "👪", color: "#5AA7E6", x: 410, y: 406 },
  { id: "library", label: "Library", emoji: "📚", color: "#5BBF8A", x: 232, y: 312 },
  { id: "develop", label: "Develop", emoji: "📈", color: "#FF7AA8", x: 232, y: 150 },
];
const CX = 410, CY = 231;

function Ecosystem() {
  return (
    <div className="ins-eco-wrap">
      <svg viewBox="0 0 820 462" className="ins-eco" role="img" aria-label="How Curio's modules feed the Brain and receive curated learning back">
        <defs>
          <radialGradient id="brainGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2EC4B6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#2EC4B6" stopOpacity="0" />
          </radialGradient>
        </defs>
        {NODES.map((n) => {
          const mx = (n.x + CX) / 2, my = (n.y + CY) / 2;
          const dx = CX - n.x, dy = CY - n.y; const len = Math.hypot(dx, dy) || 1;
          const px = -dy / len, py = dx / len; const off = 26;
          const cin = `${(mx + px * off).toFixed(0)},${(my + py * off).toFixed(0)}`;
          const cout = `${(mx - px * off).toFixed(0)},${(my - py * off).toFixed(0)}`;
          return (
            <g key={n.id}>
              {/* inbound: signals curve into the Brain */}
              <path d={`M${n.x},${n.y} Q${cin} ${CX},${CY}`} fill="none" stroke={n.color} strokeWidth="2.6" strokeOpacity="0.6"
                strokeDasharray="2 10" strokeLinecap="round" className="eco-in" />
              {/* outbound: curated feedback curves back */}
              <path d={`M${CX},${CY} Q${cout} ${n.x},${n.y}`} fill="none" stroke="#2EC4B6" strokeWidth="2.2" strokeOpacity="0.45"
                strokeDasharray="2 13" strokeLinecap="round" className="eco-out" style={{ animationDelay: `${(Math.abs(dx) % 7) * 0.12}s` }} />
            </g>
          );
        })}
        {/* brain */}
        <circle cx={CX} cy={CY} r="84" fill="url(#brainGlow)" className="eco-glow" />
        <circle cx={CX} cy={CY} r="46" fill="#2EC4B6" />
        <circle cx={CX} cy={CY} r="46" fill="none" stroke="#2EC4B6" strokeWidth="2" className="eco-ring" />
        <text x={CX} y={CY - 4} textAnchor="middle" className="eco-brain-emoji">🧠</text>
        <text x={CX} y={CY + 22} textAnchor="middle" className="eco-brain-lbl">Brain</text>
        {/* modules */}
        {NODES.map((n) => (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r="30" fill="#fff" stroke={n.color} strokeWidth="2.5" />
            <text x={n.x} y={n.y + 1} textAnchor="middle" className="eco-node-emoji">{n.emoji}</text>
            <text x={n.x} y={n.y + 48} textAnchor="middle" className="eco-node-lbl" fill={n.color}>{n.label}</text>
          </g>
        ))}
      </svg>
      <div className="ins-eco-key">
        <span><i className="dot in" /> Activity &amp; behaviour feed the Brain</span>
        <span><i className="dot out" /> Brain returns curated learning, advice, books &amp; nudges</span>
      </div>
    </div>
  );
}

function FeedbackLoop() {
  const C = { x: 450, y: 250 }, r = 150;
  const circle = `M ${C.x} ${C.y - r} A ${r} ${r} 0 1 1 ${C.x - 0.01} ${C.y - r} Z`;
  const pos = (deg: number) => { const a = (deg * Math.PI) / 180; return { x: C.x + Math.cos(a) * r, y: C.y + Math.sin(a) * r }; };
  const stages = [
    { a: -90, em: "🧒", t: "Plays & explores", c: "#FF7A66" },
    { a: 0, em: "📡", t: "Signals captured", c: "#5AA7E6" },
    { a: 90, em: "🧠", t: "Brain refines", c: "#9B6DD6" },
    { a: 180, em: "🎁", t: "Curated back", c: "#5BBF8A" },
  ];
  const arrows = [-45, 45, 135, 225].map((deg) => { const p = pos(deg); return { x: p.x, y: p.y, rot: deg + 90 }; });
  return (
    <div className="ins-loop-wrap">
      <svg viewBox="0 0 900 540" className="ins-loop" role="img" aria-label="The feedback loop: play, capture, refine, return — repeating and compounding each week">
        <defs>
          <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#9B6DD6" stopOpacity="0.45" /><stop offset="100%" stopColor="#9B6DD6" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hubFill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7AC9F0" /><stop offset="100%" stopColor="#9B6DD6" />
          </linearGradient>
          <linearGradient id="flowGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2EC4B6" /><stop offset="100%" stopColor="#5AA7E6" />
          </linearGradient>
        </defs>
        <circle cx={C.x} cy={C.y} r={r} className="loop-track" />
        <circle cx={C.x} cy={C.y} r={r} className="loop-flow" />
        {arrows.map((ar, i) => (
          <path key={i} d="M-7,-6 L8,0 L-7,6 Z" className="loop-arrow" transform={`translate(${ar.x},${ar.y}) rotate(${ar.rot})`} />
        ))}
        {[0, 2, 4].map((delay, i) => (
          <circle key={i} r={i === 0 ? 8 : 5} className="loop-dot" style={{ opacity: i === 0 ? 1 : 0.45 }}>
            <animateMotion dur="6s" begin={`${delay}s`} repeatCount="indefinite" path={circle} />
          </circle>
        ))}
        <circle cx={C.x} cy={C.y} r="92" fill="url(#hubGlow)" className="loop-glow" />
        <circle cx={C.x} cy={C.y} r="50" fill="url(#hubFill)" />
        <circle cx={C.x} cy={C.y} r="50" fill="none" stroke="#9B6DD6" strokeWidth="2" className="loop-ring" />
        <text x={C.x} y={C.y + 5} textAnchor="middle" className="loop-hub-e">🔁</text>
        <text x={C.x} y={C.y + 78} textAnchor="middle" className="loop-cap">compounds every week</text>
        {stages.map((s, i) => {
          const p = pos(s.a); const w = 188, h = 54; const bx = p.x - w / 2, by = p.y - h / 2;
          return (
            <g key={i}>
              <rect x={bx} y={by} width={w} height={h} rx="15" className="loop-chip" />
              <rect x={bx} y={by + 9} width="6" height={h - 18} rx="3" fill={s.c} />
              <text x={bx + 26} y={p.y + 8} className="loop-em">{s.em}</text>
              <text x={bx + 54} y={p.y + 6} className="loop-lbl">{s.t}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function Insights() {
  const { children, focusChild, setFocusChild } = useProfile();
  const [range, setRange] = useState<RangeKey>("month");
  const rcfg = RANGES.find((r) => r.key === range)!;
  const focus = focusChild;

  const metrics = useMemo(() => {
    if (!focus) return [];
    return METRICS.map((m) => ({ ...m, ...series(focus.id, m.key, rcfg) }));
  }, [focus ? focus.id : null, range]);

  const bench = useMemo(() => {
    if (!focus) return [];
    return METRICS.slice(0, 4).map((m) => {
      const s = series(focus.id, m.key, RANGES.find((r) => r.key === "y1")!);
      const typical = Math.max(20, Math.min(95, Math.round(s.end - 6 + (hash(focus.id + m.key) % 10) - 5)));
      return { label: m.label, color: m.color, child: s.end, typical, best: 92 };
    });
  }, [focus ? focus.id : null]);

  if (!focus) return <div className="view"><p className="muted">Add a child profile to see insights.</p></div>;
  const t = THEMES[focus.theme];
  const avgGain = Math.round(metrics.reduce((a, m) => a + m.gain, 0) / (metrics.length || 1));

  return (
    <div className="view ins">
      <PageHero kind="parent" eyebrow="Insights" title={<>Proof, not <em>promises</em></>}
        tease="How the whole ecosystem works, the value it's creating for your child and you, and how they're really doing — measured honestly, no marketing." />

      {/* progress report — shareable child-level summary */}
      <section className="ins-sec">
        <div className="ins-sec-head"><span className="ins-num">⇪</span><h2>{focus.name}'s progress report</h2></div>
        <p className="muted" style={{ marginTop: 0 }}>One honest summary to share with a teacher, partner or tutor — trajectory, strengths, watch-points and current focus, from real history.</p>
        <ProgressReport childId={focus.id} childName={focus.name} />
      </section>

      {/* section 0 — growth over time */}
      <section className="ins-sec">
        <div className="ins-sec-head"><span className="ins-num">★</span><h2>{focus.name}'s growth over time</h2></div>
        <div className="ins-chips" style={{ marginBottom: 14 }}>
          {children.map((k) => (
            <button key={k.id} className={"ins-chip" + (k.id === focus.id ? " on" : "")} onClick={() => setFocusChild(k.id)}>
              <span className="ins-av" style={{ background: `linear-gradient(140deg,${THEMES[k.theme].accent},${THEMES[k.theme].deep})` }}>{THEMES[k.theme].emoji}</span>
              {k.name}
            </button>
          ))}
        </div>
        <EvolutionChart childId={focus.id} childName={focus.name} accent={t.accent} />
      </section>

      {/* section 0b — issues over time */}
      <section className="ins-sec">
        <div className="ins-sec-head"><span className="ins-num">◷</span><h2>Issues over time</h2></div>
        <IssuesTimeline childId={focus.id} childName={focus.name} accent={t.accent} />
      </section>

      {/* section 0c — intelligence: ranked issues vs what works */}
      <section className="ins-sec">
        <div className="ins-sec-head"><span className="ins-num">✦</span><h2>Intelligence — {focus.name}'s bigger picture</h2></div>
        <IntelligencePanel childId={focus.id} childName={focus.name} />
      </section>

      {/* section 0c2 — profile wheel (sunburst) */}
      <section className="ins-sec">
        <div className="ins-sec-head"><span className="ins-num">◍</span><h2>{focus.name}'s profile wheel</h2></div>
        <ProfileWheel childId={focus.id} childName={focus.name} />
      </section>

      {/* section 0c3 — knowledge base that informs guidance */}
      <section className="ins-sec">
        <div className="ins-sec-head"><span className="ins-num">✽</span><h2>What informs {focus.name}'s guidance</h2></div>
        <p className="muted" style={{ marginTop: 0 }}>Curio's recommendations are grounded in established child-development traditions — curated, and the same shared knowledge enriches every family.</p>
        <KnowledgePanel />
      </section>

      {/* section 0d — benchmarking radars */}
      <section className="ins-sec">
        <div className="ins-sec-head"><span className="ins-num">◎</span><h2>Benchmarking — {focus.name} vs world, country &amp; own past</h2></div>
        <BenchmarkRadars childId={focus.id} childName={focus.name} childAge={focus.age} country={focus.country} />
      </section>

      {/* section 1 — how it works */}
      <section className="ins-sec">
        <div className="ins-sec-head"><span className="ins-num">1</span><h2>How {brand.name} works</h2></div>
        <p className="muted ins-lede">Every module quietly notices what happens — what's played, made, asked, finished, skipped. That flows to the Brain, which refines it into curated learning for the child, advice for you, fresh personalised books, and the next best nudges — then sends it back out. The loop gets sharper every week.</p>
        <Ecosystem />
        <h3 className="ins-sub">The loop that compounds</h3>
        <p className="muted ins-lede">Each pass makes the next one sharper: what your child does feeds the Brain, the Brain returns something more precisely theirs, and that shapes what they reach for next.</p>
        <FeedbackLoop />
      </section>

      {/* section 2 — value created */}
      <section className="ins-sec">
        <div className="ins-sec-head"><span className="ins-num">2</span><h2>Value created</h2></div>
        <p className="muted" style={{ marginTop: 0 }}>Live tiles — one per strength theme for {focus.name}, growing automatically as new themes emerge.</p>
        <ValueTiles childId={focus.id} childName={focus.name} accent={t.accent} />
        <div className="ins-preview" style={{ marginTop: 18 }}>The trend charts below are an illustrative preview of the fuller value model — the live data is the tiles above and the growth chart at the top.</div>
        <div className="ins-controls">
          <div className="ins-chips">
            {children.map((k) => (
              <button key={k.id} className={"ins-chip" + (k.id === focus.id ? " on" : "")} onClick={() => setFocusChild(k.id)}>
                <span className="ins-av" style={{ background: `linear-gradient(140deg,${THEMES[k.theme].accent},${THEMES[k.theme].deep})` }}>{THEMES[k.theme].emoji}</span>
                {k.name}
              </button>
            ))}
          </div>
          <div className="ins-range">
            {RANGES.map((r) => (
              <button key={r.key} className={range === r.key ? "on" : ""} onClick={() => setRange(r.key)}>{r.label}</button>
            ))}
          </div>
        </div>

        <div className="ins-headline" style={{ borderColor: t.accent }}>
          <div className="ins-headline-big" style={{ color: t.deep }}>+{avgGain}</div>
          <div>
            <b>average growth across {METRICS.length} areas</b> for {focus.name} over the last {rcfg.label.toLowerCase()}.
            <div className="muted" style={{ fontSize: ".84rem" }}>Higher is better. Each area is a 0–100 developmental index built from real activity.</div>
          </div>
        </div>

        <div className="ins-grid">
          {metrics.map((m) => (
            <div className="ins-card" key={m.key}>
              <div className="ins-card-top">
                <span className="ins-mlabel">{m.label}</span>
                <span className="ins-gain" style={{ color: m.gain >= 0 ? "#3E9E6C" : "#F2563D" }}>{m.gain >= 0 ? "▲" : "▼"} {Math.abs(m.gain)}</span>
              </div>
              <Spark pts={m.pts} color={m.color} />
              <div className="ins-card-bot muted">now {m.end}/100 <span>·</span> was {m.start}</div>
            </div>
          ))}
        </div>
      </section>

      {/* section 3 — intelligence / benchmark */}
      <section className="ins-sec">
        <div className="ins-sec-head"><span className="ins-num">3</span><h2>Intelligence — how {focus.name} stacks up</h2></div>
        <div className="ins-preview">Preview view — benchmarks populate once there’s enough real activity.</div>
        <p className="muted ins-lede">Against age-typical development and the best-practice target. The point isn't to rank a child — it's to show, factually, where they're ahead, on track, or worth a gentle push.</p>
        <div className="ins-bench">
          {bench.map((b) => (
            <div className="ins-brow" key={b.label}>
              <div className="ins-blabel">{b.label}</div>
              <div className="ins-btrack">
                <div className="ins-bbest" style={{ left: `${b.best}%` }} title="Best-practice target" />
                <div className="ins-btypical" style={{ left: `${b.typical}%` }} title="Age-typical" />
                <div className="ins-bfill" style={{ width: `${b.child}%`, background: b.color }} />
              </div>
              <div className="ins-bnote muted">
                {b.child >= b.best ? "Ahead of the best-practice target." : b.child >= b.typical ? `On track — ${b.best - b.child} to the top target.` : `Building — ${b.typical - b.child} behind age-typical; in this week's nudges.`}
              </div>
            </div>
          ))}
        </div>
        <div className="ins-legend muted">
          <span><i className="ins-key-fill" /> {focus.name}</span>
          <span><i className="ins-key-typ" /> age-typical</span>
          <span><i className="ins-key-best" /> best-practice target</span>
        </div>
      </section>

      <p className="ins-disclaimer muted">
        Preview figures are synthetic, seeded per child, so you can see the shape of the report. Once activity tracking is live, every number here becomes {focus.name}'s real, measured progress — drawn straight from what happens across {brand.name}, refined by the Brain, and shown to you unfiltered.
      </p>
    </div>
  );
}
