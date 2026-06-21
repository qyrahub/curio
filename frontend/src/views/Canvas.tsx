import { useEffect, useRef, useState } from "react";
import PageHero from "../components/PageHero";
import { api } from "../lib/api";
import { speak, stopSpeaking, speechSupported } from "../lib/speech";
import { sfx, startMusic, stopMusic, isMuted, toggleMute, playNote } from "../lib/sound";
import type { CanvasTool, CanvasTools, WorkbenchAsset } from "../types";

// ---- guided steps per tool (client-side, tailored by keyword) ----
function guideFor(t: CanvasTool): { intro: string; steps: string[] } {
  const s = (t.title + " " + t.desc).toLowerCase();
  if (/stem|science|build|maker|lab|design/.test(s))
    return { intro: `${t.name} will guide your project, step by step.`, steps: [
      "Pick your question or what you want to build.",
      "Gather what you know and what you need to find out.",
      "Make a simple plan or sketch before you start.",
      "Build it, test it, and note what happens.",
      "Show someone and explain how it works." ] };
  if (/art|paint|picasso/.test(s))
    return { intro: "Let's make something colourful!", steps: [
      "Choose your big idea — a place, animal or feeling.",
      "Lightly sketch the main shapes first.",
      "Add your colours, biggest areas before details.",
      "Add small details and a background last.",
      "Give it a title and share it." ] };
  if (/literature|essay|book report|writing|wordsworth|story/.test(s))
    return { intro: "Great stories and essays have a clear shape.", steps: [
      "Decide your beginning, middle and end.",
      "Write one strong opening line.",
      "Add the main events or points in order.",
      "Finish with an ending people remember.",
      "Read it aloud and fix anything bumpy." ] };
  if (/comic/.test(s))
    return { intro: "Turn your idea into a 4-panel comic.", steps: [
      "Panel 1: introduce your character.",
      "Panel 2: something happens (the problem).",
      "Panel 3: the big moment.",
      "Panel 4: the funny or happy ending.",
      "Add speech bubbles and a title." ] };
  if (/song|dj|beat/.test(s))
    return { intro: "Make a song about anything you like!", steps: [
      "Pick a topic and a feeling.",
      "Clap a steady beat.",
      "Make up one line that rhymes.",
      "Add a second rhyming line.",
      "Sing your chorus three times — done!" ] };
  if (/trivia|puzzle|word|game|wizard|tower|park/.test(s))
    return { intro: "Let's play and stretch your brain.", steps: [
      "Read the question or puzzle carefully.",
      "Say your first guess out loud.",
      "Check the clues before deciding.",
      "Try again if it's tricky — that's how we learn.",
      "Celebrate every win, big or small!" ] };
  return { intro: t.desc, steps: [
    "Pick what you want to make today.",
    "Plan your first three steps.",
    "Make a start — done is better than perfect.",
    "Improve one thing.",
    "Share it with someone." ] };
}

function makeStarter(tool: CanvasTool, idea: string): string {
  const topic = idea.trim() || "your idea";
  const s = (tool.title + " " + tool.desc).toLowerCase();
  if (/stem|science|build|maker|lab|design/.test(s))
    return `Project starter for "${topic}": 1) The question — what do you want to find out or build about ${topic}? 2) Materials — list 3 things you'll need. 3) Build/test — try it once and write what happened. 4) Show — one sentence explaining what you learned.`;
  if (/art|paint|picasso/.test(s))
    return `Art plan for "${topic}": pick 3 colours that feel right for ${topic}, sketch the biggest shape first, then add ${topic} in the middle, and finish with a background and a title.`;
  if (/literature|essay|book report|writing|wordsworth|story/.test(s))
    return `Outline for "${topic}": Beginning — introduce ${topic}. Middle — a problem about ${topic} and two events. End — how it's resolved and one feeling. Now write your strong first line!`;
  if (/comic/.test(s))
    return `Comic plan for "${topic}": Panel 1 meet the hero of ${topic}. Panel 2 the problem appears. Panel 3 the big moment. Panel 4 a funny or happy ending. Add a title!`;
  if (/song|dj|beat/.test(s))
    return `Song seed for "${topic}": Chorus idea — "${topic}, ${topic}, here we go!" Clap a steady beat, add one rhyming line about ${topic}, then sing the chorus twice.`;
  if (/trivia|puzzle|word|game|wizard|tower|park/.test(s))
    return `Game pack for "${topic}": Q1 What is one fact about ${topic}? Q2 Spot something linked to ${topic}. Q3 Make a word from the letters of "${topic}". Keep score and beat it next time!`;
  return `Starter for "${topic}": 1) one goal, 2) three first steps, 3) make a start now, 4) improve one thing, 5) share it.`;
}

function GuidedActivity({ tool }: { tool: CanvasTool }) {
  const g = guideFor(tool);
  const [note, setNote] = useState("");
  const [output, setOutput] = useState("");
  const [done, setDone] = useState<boolean[]>(() => g.steps.map(() => false));
  const full = `${g.intro} ${g.steps.map((s, i) => `Step ${i + 1}. ${s}`).join(" ")}`;
  const make = () => setOutput(makeStarter(tool, note));
  const count = done.filter(Boolean).length;
  const pct = Math.round((count / g.steps.length) * 100);
  const allDone = count === g.steps.length;
  const toggle = (i: number) => setDone((d) => d.map((v, j) => j === i ? !v : v));
  return (
    <div>
      <p className="cv-intro">{g.intro}</p>
      <button className="btn btn-ghost btn-sm" onClick={() => speak(full)} disabled={!speechSupported}>🔊 Read this to me</button>
      <div className="ga-progress"><div className="ga-bar"><span style={{ width: `${pct}%` }} /></div><span className="ga-count">{count}/{g.steps.length}{allDone ? " 🎉" : ""}</span></div>
      {allDone && <div className="ga-celebrate">🎉 Brilliant — you finished every step! Want to make another?</div>}
      <ol className="cv-steps ga-steps">{g.steps.map((s, i) => (
        <li key={i} className={done[i] ? "ga-on" : ""}>
          <button className="ga-check" onClick={() => toggle(i)} aria-pressed={done[i]} title="Mark done">{done[i] ? "✅" : "⬜"}</button>
          <span>{s}</span>
          {speechSupported && <button className="round-btn small" title="Read step" onClick={() => speak(`Step ${i + 1}. ${s}`)}>🔊</button>}
        </li>
      ))}</ol>
      <label className="lbl">Your idea</label>
      <textarea className="custom-in" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={`Type what you'd like to make with ${tool.name}…`} />
      <div className="cta-wrap">
        <button className="btn btn-primary btn-sm" onClick={make}>✨ Make my starter</button>
        {count > 0 && <button className="btn btn-ghost btn-sm" onClick={() => setDone(g.steps.map(() => false))}>↻ Reset steps</button>}
      </div>
      {output && (
        <div className="cv-story">
          <p>{output}</p>
          {speechSupported && <button className="btn btn-ghost btn-sm" onClick={() => speak(output)}>🔊 Read it to me</button>}
        </div>
      )}
    </div>
  );
}

const PAINT_IDEAS: [string, string][] = [
  ["a happy sun over the hills", "🌄"], ["your favourite animal", "🦁"], ["a rocket to the moon", "🚀"],
  ["an underwater world", "🐠"], ["a rainbow castle", "🏰"], ["a dinosaur in a jungle", "🦕"],
  ["your family", "👨‍👩‍👧‍👦"], ["a magical tree", "🌳"], ["a robot friend", "🤖"], ["a butterfly garden", "🦋"],
  ["a busy farm", "🚜"], ["a snowy mountain", "🏔️"], ["a hot-air balloon", "🎈"], ["a friendly dragon", "🐉"],
];
const PAINT_COLORS = ["#FF7A66", "#F2563D", "#FFC94D", "#FFB703", "#5BBF8A", "#2EC4B6", "#5AA7E6",
  "#4C7AE0", "#9B6DD6", "#C45CB0", "#FF7AA8", "#9C6B3F", "#2C2A4A", "#7A7A7A", "#FFFFFF", "#000000"];
const STAMPS = ["⭐", "❤️", "🌸", "🐱", "🦋", "🌈", "☁️", "🐠", "🌟", "🍀"];

function PaintPad() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [color, setColor] = useState("#FF7A66");
  const [size, setSize] = useState(10);
  const [tool, setTool] = useState<"brush" | "marker" | "spray" | "eraser" | "stamp">("brush");
  const [stamp, setStamp] = useState("⭐");
  const [ideaIdx, setIdeaIdx] = useState(() => Math.floor(Math.random() * PAINT_IDEAS.length));
  const [idea, refEmoji] = PAINT_IDEAS[ideaIdx];
  const drawing = useRef(false);
  const [bases, setBases] = useState<WorkbenchAsset[]>([]);
  useEffect(() => { api.workbenchAssets("painting").then((r) => setBases(r.assets)).catch(() => {}); }, []);
  const loadBase = (a: WorkbenchAsset) => {
    const c = ref.current!; const ctx = c.getContext("2d")!;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      const r = Math.min(c.width / img.width, c.height / img.height);
      const w = img.width * r, h = img.height * r;
      ctx.drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h);
    };
    img.src = api.workbenchImageUrl(a.id);
  };
  const ctxOf = () => ref.current!.getContext("2d")!;
  const pos = (e: React.PointerEvent) => {
    const c = ref.current!; const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  };
  const dab = (x: number, y: number) => {
    const ctx = ctxOf();
    if (tool === "spray") {
      ctx.fillStyle = color;
      for (let i = 0; i < 18; i++) {
        const a = Math.random() * Math.PI * 2, rr = Math.random() * size * 1.6;
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr, 0.8, 0, Math.PI * 2); ctx.fill();
      }
    }
  };
  const start = (e: React.PointerEvent) => {
    const p = pos(e);
    if (tool === "stamp") { const ctx = ctxOf(); ctx.font = `${size * 3}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(stamp, p.x, p.y); return; }
    drawing.current = true; const ctx = ctxOf(); ctx.beginPath(); ctx.moveTo(p.x, p.y); dab(p.x, p.y);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return; const ctx = ctxOf(); const p = pos(e);
    if (tool === "spray") { dab(p.x, p.y); return; }
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = tool === "marker" ? size * 1.8 : tool === "eraser" ? size * 2.2 : size;
    ctx.lineCap = tool === "marker" ? "square" : "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = tool === "marker" ? 0.7 : 1;
    ctx.stroke();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  };
  const end = () => { drawing.current = false; };
  const clear = () => { const c = ref.current!; ctxOf().clearRect(0, 0, c.width, c.height); };

  const TOOLS: [typeof tool, string, string][] = [
    ["brush", "🖌️", "Brush"], ["marker", "🖊️", "Marker"], ["spray", "💨", "Spray"],
    ["stamp", "✨", "Stamp"], ["eraser", "🧽", "Eraser"],
  ];
  return (
    <div className="paint">
      <div className="paint-ref">
        <div className="paint-ref-pic">{refEmoji}</div>
        <div>
          <p className="cv-intro" style={{ margin: 0 }}>Try painting <b>{idea}</b></p>
          <p className="muted">Look at the picture for an idea — then make it your own!</p>
          <button className="btn btn-ghost btn-sm" onClick={() => setIdeaIdx((i) => (i + 1) % PAINT_IDEAS.length)}>🎲 New picture</button>
        </div>
      </div>
      <div className="paint-bar">
        {TOOLS.map(([t, ic, label]) => (
          <button key={t} className={"tool-btn" + (tool === t ? " on" : "")} title={label} onClick={() => setTool(t)}>{ic}</button>
        ))}
        <span className="paint-sep" />
        {PAINT_COLORS.map((c) => (
          <button key={c} className={"swatch" + (color === c ? " on" : "")} style={{ background: c }} onClick={() => { setColor(c); if (tool === "eraser") setTool("brush"); }} aria-label={c} />
        ))}
      </div>
      <div className="paint-bar">
        <span className="muted">Size</span>
        <input type="range" min={2} max={36} value={size} onChange={(e) => setSize(Number(e.target.value))} />
        {tool === "stamp" && STAMPS.map((s) => (
          <button key={s} className={"tool-btn" + (stamp === s ? " on" : "")} onClick={() => setStamp(s)}>{s}</button>
        ))}
        <span className="paint-sep" />
        <button className="btn btn-ghost btn-sm" onClick={clear}>🗑️ Clear all</button>
      </div>
      {bases.length > 0 && (
        <div className="paint-bases">
          <span className="muted">🎨 Illustrations to paint:</span>
          {bases.map((a) => (
            <button key={a.id} className="paint-base-thumb" title={a.name} onClick={() => loadBase(a)}>
              <img src={api.workbenchImageUrl(a.id)} alt={a.name} />
            </button>
          ))}
        </div>
      )}
      <canvas ref={ref} width={780} height={440} className="paint-canvas"
        onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end} />
    </div>
  );
}

function StoryBuilder() {
  const [hero, setHero] = useState(""); const [problem, setProblem] = useState(""); const [twist, setTwist] = useState("");
  const [story, setStory] = useState("");
  const build = () => {
    const h = hero.trim() || "a brave little explorer";
    const p = problem.trim() || "a puzzle no one could solve";
    const tw = twist.trim() || "a surprising new friend";
    setStory(
      `Once upon a time there was ${h}. One bright morning, they met ${p}. ` +
      `They tried and tried, and just when it seemed impossible, along came ${tw}. ` +
      `Together they found a clever way through — and everyone cheered. The end!`
    );
  };
  return (
    <div>
      <label className="lbl">Who is the hero?</label>
      <input className="custom-in" value={hero} onChange={(e) => setHero(e.target.value)} placeholder="e.g. Lerato the lion cub" />
      <label className="lbl">What is the problem?</label>
      <input className="custom-in" value={problem} onChange={(e) => setProblem(e.target.value)} placeholder="e.g. the river dried up" />
      <label className="lbl">A happy twist?</label>
      <input className="custom-in" value={twist} onChange={(e) => setTwist(e.target.value)} placeholder="e.g. a wise old turtle" />
      <div className="cta-wrap"><button className="btn btn-primary btn-sm" onClick={build}>✨ Build my story</button></div>
      {story && (
        <div className="cv-story">
          <p>{story}</p>
          {speechSupported && <button className="btn btn-ghost btn-sm" onClick={() => speak(story)}>🔊 Read my story</button>}
        </div>
      )}
    </div>
  );
}

// ---------- Match game (food & objects) ----------
// ---------- Triple Match (collect 3 of a kind into the tray) ----------
function MatchGame() {
  const POOL = ["🍔", "🍟", "🌭", "🥤", "🍩", "🧁", "🍗", "🍕", "🍦", "🍪"];
  const TYPES = 7, SETS = 3;
  const build = () => {
    const types = [...POOL].sort(() => Math.random() - 0.5).slice(0, TYPES);
    let id = 0; const tiles: { id: number; e: string }[] = [];
    types.forEach((e) => { for (let k = 0; k < SETS; k++) tiles.push({ id: id++, e }); });
    return tiles.sort(() => Math.random() - 0.5);
  };
  const [board, setBoard] = useState(build);
  const [tray, setTray] = useState<{ id: number; e: string }[]>([]);
  const [status, setStatus] = useState<"play" | "won" | "lost">("play");
  const tap = (t: { id: number; e: string }) => {
    if (status !== "play" || tray.length >= 7) return;
    sfx.tap();
    const nb = board.filter((b) => b.id !== t.id);
    let nt = [...tray, t];
    const counts: Record<string, number> = {};
    nt.forEach((x) => { counts[x.e] = (counts[x.e] || 0) + 1; });
    const triple = Object.keys(counts).find((e) => counts[e] >= 3);
    if (triple) { let removed = 0; nt = nt.filter((x) => (x.e === triple && removed < 3) ? (removed++, false) : true); sfx.good(); }
    setBoard(nb); setTray(nt);
    if (nb.length === 0 && nt.length === 0) { sfx.win(); setStatus("won"); }
    else if (nt.length >= 7) { sfx.lose(); setStatus("lost"); }
  };
  const reset = () => { setBoard(build()); setTray([]); setStatus("play"); };
  const trayView = [...tray].sort((a, b) => a.e.localeCompare(b.e));
  return (
    <div>
      <p className="cv-intro">Tap tiles to collect them. Get <b>3 of a kind</b> and they clear! {status === "won" ? "🎉 You cleared the board!" : status === "lost" ? "😅 Tray full — try again!" : `${board.length} tiles left`}</p>
      <div className="tm-board">
        {board.map((t) => (
          <button key={t.id} className="tm-tile" onClick={() => tap(t)} disabled={status !== "play"}><span>{t.e}</span></button>
        ))}
        {board.length === 0 && status === "won" && <div className="tm-clear">🎉</div>}
      </div>
      <div className="tm-tray">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className={"tm-slot" + (trayView[i] ? " filled" : "")}>{trayView[i]?.e ?? ""}</div>
        ))}
      </div>
      <div className="cta-wrap"><button className="btn btn-ghost btn-sm" onClick={reset}>↻ New game</button></div>
    </div>
  );
}

// ---------- Bubble Pop, Ricochet & Bubble Shooter (20 levels) ----------
type Mech = "plate" | "deflect";
type Behavior = "fall" | "static";
const RC_COLORS = ["#FF7A66", "#FFC94D", "#5BBF8A", "#5AA7E6", "#9B6DD6", "#FF7AA8"];
const MAX_LEVEL = 20;

function levelCfg(level: number) {
  const L = Math.max(1, Math.min(MAX_LEVEL, level));
  return {
    L,
    goal: 6 + L * 2,                                 // falling target count
    spawn: Math.max(0.30, 0.92 - L * 0.028),         // seconds between spawns
    time: Math.max(26, 60 - Math.round(L * 1.6)),    // seconds on the clock
    fallA: 9 + L * 1.4,                              // %/s lower bound
    fallB: 17 + L * 2.4,                             // %/s upper bound
    burst: L >= 6,                                   // spawn small clusters
    puck: 230 + L * 12,                              // deflect puck speed (px/s)
    rows: Math.min(6, 2 + Math.floor(L / 3)),        // static cluster rows
    cols: Math.min(9, 4 + Math.floor(L / 2)),        // static cluster cols
  };
}

function LevelHeader({ level, note }: { level: number; note?: string }) {
  const pct = Math.round((level / MAX_LEVEL) * 100);
  return (
    <div className="lvl-head">
      <span className="lvl-badge">Level {level} <span className="muted">/ {MAX_LEVEL}</span></span>
      <div className="lvl-bar"><span style={{ width: `${pct}%` }} /></div>
      {note && <span className="lvl-note muted">{note}</span>}
    </div>
  );
}

function PlateField({ level, mechanic, behavior, onNext, onRestart }: { level: number; mechanic: Mech; behavior: Behavior; onNext: () => void; onRestart: () => void }) {
  const cfg = levelCfg(level);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const sizeRef = useRef({ w: 600, h: 460 });
  type Ball = { id: number; x: number; y: number; r: number; color: string; vy: number };
  const [balloons, setBalloons] = useState<Ball[]>([]);
  const [plate, setPlate] = useState({ x: 300, y: 400, w: 110 });
  const [puck, setPuck] = useState({ x: 300, y: 120, r: 13 });
  const [popped, setPopped] = useState(0);
  const [time, setTime] = useState<number>(cfg.time);
  const [status, setStatus] = useState<"play" | "won" | "lost">("play");
  const goalRef = useRef(cfg.goal);

  const st = useRef({
    balloons: [] as Ball[],
    plate: { x: 300, y: 400, vx: 0, vy: 0, w: 110, h: 16 },
    puck: { x: 300, y: 120, vx: 200, vy: 200, r: 13 },
    keys: new Set<string>(),
    id: 0, popped: 0, acc: 0,
  });

  const reinit = () => {
    const { w, h } = sizeRef.current;
    const c = levelCfg(level);
    const pw = Math.max(80, Math.min(150, w * 0.2));
    st.current.plate = { x: w / 2, y: h - 40, vx: 0, vy: 0, w: pw, h: 16 };
    const sp = c.puck;
    const ang = (Math.random() * 0.5 + 0.3) * Math.PI;
    st.current.puck = { x: w / 2, y: h * 0.3, vx: (Math.random() < 0.5 ? -1 : 1) * Math.cos(ang) * sp, vy: Math.abs(Math.sin(ang)) * sp, r: 13 };
    st.current.id = 0; st.current.popped = 0; st.current.acc = 0;
    const r = 22;
    if (behavior === "static") {
      const cols = c.cols, rows = c.rows, gap = 8;
      const stepX = r * 2 + gap, stepY = r * 2 + gap;
      const startX = (w - (cols - 1) * stepX) / 2;
      const startY = 56;
      const grid: Ball[] = [];
      for (let yy = 0; yy < rows; yy++) for (let xx = 0; xx < cols; xx++) {
        grid.push({ id: st.current.id++, x: startX + xx * stepX, y: startY + yy * stepY, r, color: RC_COLORS[(xx + yy) % RC_COLORS.length], vy: 0 });
      }
      st.current.balloons = grid;
      goalRef.current = grid.length;
    } else {
      st.current.balloons = [];
      goalRef.current = c.goal;
    }
    setBalloons(st.current.balloons);
    setPopped(0); setTime(c.time); setStatus("play");
    setPlate({ x: st.current.plate.x, y: st.current.plate.y, w: pw });
    setPuck({ x: st.current.puck.x, y: st.current.puck.y, r: 13 });
  };

  useEffect(() => {
    const el = fieldRef.current; if (!el) return;
    const measure = () => { sizeRef.current = { w: el.clientWidth || 600, h: el.clientHeight || 460 }; };
    measure(); reinit();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);
    return () => { ro?.disconnect(); window.removeEventListener("resize", measure); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, mechanic, behavior]);

  useEffect(() => {
    const ARROWS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
    const down = (e: KeyboardEvent) => { if (ARROWS.has(e.key)) { e.preventDefault(); st.current.keys.add(e.key); } };
    const up = (e: KeyboardEvent) => { st.current.keys.delete(e.key); };
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useEffect(() => {
    if (status !== "play") return;
    const c = levelCfg(level);
    let raf = 0; let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.05); last = t;
      const { w, h } = sizeRef.current;
      const s = st.current;
      const p = s.plate;
      if (mechanic === "plate") {
        const A = 1500, MAX = 560, FR = 0.9;
        if (s.keys.has("ArrowLeft")) p.vx -= A * dt;
        if (s.keys.has("ArrowRight")) p.vx += A * dt;
        if (s.keys.has("ArrowUp")) p.vy -= A * dt;
        if (s.keys.has("ArrowDown")) p.vy += A * dt;
        if (!s.keys.size) { p.vx *= FR; p.vy *= FR; }
        p.vx = Math.max(-MAX, Math.min(MAX, p.vx));
        p.vy = Math.max(-MAX, Math.min(MAX, p.vy));
        p.x += p.vx * dt; p.y += p.vy * dt;
        const hw = p.w / 2, hh = p.h / 2;
        if (p.x - hw < 0) { p.x = hw; p.vx = Math.abs(p.vx) * 0.7; sfx.bounce(); }
        else if (p.x + hw > w) { p.x = w - hw; p.vx = -Math.abs(p.vx) * 0.7; sfx.bounce(); }
        if (p.y - hh < 0) { p.y = hh; p.vy = Math.abs(p.vy) * 0.7; sfx.bounce(); }
        else if (p.y + hh > h) { p.y = h - hh; p.vy = -Math.abs(p.vy) * 0.7; sfx.bounce(); }
      } else {
        const V = 440; let dx = 0, dy = 0;
        if (s.keys.has("ArrowLeft")) dx -= 1;
        if (s.keys.has("ArrowRight")) dx += 1;
        if (s.keys.has("ArrowUp")) dy -= 1;
        if (s.keys.has("ArrowDown")) dy += 1;
        p.x += dx * V * dt; p.y += dy * V * dt;
        const hw = p.w / 2, hh = p.h / 2;
        p.x = Math.max(hw, Math.min(w - hw, p.x));
        p.y = Math.max(hh, Math.min(h - hh, p.y));
      }

      const k = s.puck;
      if (mechanic === "deflect") {
        k.x += k.vx * dt; k.y += k.vy * dt;
        let bounced = false;
        if (k.x - k.r < 0) { k.x = k.r; k.vx = Math.abs(k.vx); bounced = true; }
        else if (k.x + k.r > w) { k.x = w - k.r; k.vx = -Math.abs(k.vx); bounced = true; }
        if (k.y - k.r < 0) { k.y = k.r; k.vy = Math.abs(k.vy); bounced = true; }
        else if (k.y + k.r > h) { k.y = h - k.r; k.vy = -Math.abs(k.vy); bounced = true; }
        const hw = p.w / 2, hh = p.h / 2 + 4;
        if (k.x > p.x - hw && k.x < p.x + hw && k.y > p.y - hh && k.y < p.y + hh) {
          const ox = (k.x - p.x) / hw, oy = (k.y - p.y) / hh;
          if (Math.abs(ox) > Math.abs(oy)) { k.vx = (ox >= 0 ? 1 : -1) * Math.abs(k.vx); k.x = p.x + (ox >= 0 ? 1 : -1) * (hw + k.r); }
          else { k.vy = (oy >= 0 ? 1 : -1) * Math.abs(k.vy); k.y = p.y + (oy >= 0 ? 1 : -1) * (hh + k.r); k.vx += ox * 60; }
          bounced = true;
        }
        if (bounced) sfx.bounce();
      }

      let balloons = s.balloons;
      if (behavior === "fall") {
        balloons = balloons.map((b) => ({ ...b, y: b.y + b.vy * dt })).filter((b) => b.y - b.r < h + 30);
        s.acc += dt;
        if (s.acc > c.spawn && balloons.length < 18) {
          s.acc = 0;
          const r = 22;
          const n = c.burst && Math.random() < 0.4 ? 3 : 1;
          for (let i = 0; i < n; i++) {
            balloons = [...balloons, { id: s.id++, x: r + Math.random() * (w - 2 * r), y: -r - i * (r * 2), r, color: RC_COLORS[Math.floor(Math.random() * RC_COLORS.length)], vy: (c.fallA + Math.random() * (c.fallB - c.fallA)) * 4.4 }];
          }
        }
      }

      const hit = (bx: number, by: number, br: number) => {
        const hw = p.w / 2, hh = p.h / 2;
        const cx = Math.max(p.x - hw, Math.min(bx, p.x + hw));
        const cy = Math.max(p.y - hh, Math.min(by, p.y + hh));
        const plateHit = (bx - cx) ** 2 + (by - cy) ** 2 <= (br + 2) ** 2;
        const puckHit = mechanic === "deflect" && (bx - k.x) ** 2 + (by - k.y) ** 2 <= (br + k.r) ** 2;
        return plateHit || puckHit;
      };
      let gained = 0;
      balloons = balloons.filter((b) => { if (hit(b.x, b.y, b.r)) { gained++; return false; } return true; });
      if (gained) { sfx.pop(); s.popped += gained; setPopped(s.popped); }

      s.balloons = balloons;
      setBalloons(balloons);
      setPlate({ x: p.x, y: p.y, w: p.w });
      if (mechanic === "deflect") setPuck({ x: k.x, y: k.y, r: k.r });

      if (s.popped >= goalRef.current) { sfx.win(); setStatus("won"); return; }
      if (behavior === "static" && balloons.length === 0) { sfx.win(); setStatus("won"); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, mechanic, behavior, level]);

  useEffect(() => {
    if (status !== "play") return;
    const iv = setInterval(() => setTime((tm) => Math.max(0, tm - 1)), 1000);
    return () => clearInterval(iv);
  }, [status]);
  useEffect(() => {
    if (status === "play" && time <= 0) {
      if (st.current.popped >= goalRef.current) { sfx.win(); setStatus("won"); }
      else { sfx.lose(); setStatus("lost"); }
    }
  }, [time, status]);

  const goal = goalRef.current;
  const pct = Math.min(100, Math.round((popped / goal) * 100));
  const isLast = level >= MAX_LEVEL;
  return (
    <div>
      <div className="bp-hud">
        <div className="bp-prog"><div className="bp-bar"><span style={{ width: `${pct}%` }} /></div><span className="bp-count">{popped}/{goal} {behavior === "static" ? "smashed" : "popped"}</span></div>
        <div className={"bp-time" + (time <= 10 ? " low" : "")}>⏱ {time}s</div>
      </div>
      <div className="bp-field rc-field" ref={fieldRef} tabIndex={0}>
        {balloons.map((b) => (
          <span key={b.id} className="bp-balloon" style={{ left: b.x, top: b.y, width: b.r * 2, height: b.r * 2.3, background: b.color }} />
        ))}
        <div className="rc-plate" style={{ left: plate.x, top: plate.y, width: plate.w }} />
        {mechanic === "deflect" && <div className="rc-puck" style={{ left: puck.x, top: puck.y, width: puck.r * 2, height: puck.r * 2 }} />}
        {status !== "play" && (
          <div className="bp-over">
            <div className="bp-over-msg">{status === "won" ? (isLast ? "🏆 All 20 levels!" : "🎉 Level clear!") : "⏰ Time's up!"}</div>
            <div className="muted">{status === "won" ? (isLast ? "You're a ricochet champion!" : `On to level ${level + 1}.`) : `You got ${popped}/${goal}. Try again!`}</div>
            {status === "won"
              ? (isLast
                  ? <button className="btn btn-primary btn-sm" onClick={onRestart}>↻ Play again</button>
                  : <button className="btn btn-primary btn-sm" onClick={onNext}>Level {level + 1} →</button>)
              : <button className="btn btn-primary btn-sm" onClick={reinit}>↻ Retry level {level}</button>}
          </div>
        )}
      </div>
      <p className="cv-intro" style={{ marginTop: 10 }}>
        {mechanic === "plate"
          ? "Fly the metal plate with the arrow keys ← ↑ → ↓ — it pops any balloon it touches."
          : "The metal puck ricochets around — move the plate with ← ↑ → ↓ to deflect it into the balloons."}
        {behavior === "static" ? " Smash the whole cluster before time runs out!" : " Clear the target before the timer ends!"}
        {" "}(Click the field first so the keys work.)
      </p>
    </div>
  );
}

function BubblePop() {
  const [control, setControl] = useState<"mouse" | "keyboard">("mouse");
  const [mechanic, setMechanic] = useState<Mech>("plate");
  const [level, setLevel] = useState(1);
  const cfg = levelCfg(level);
  const [balloons, setBalloons] = useState<{ id: number; x: number; y: number; color: string; speed: number }[]>([]);
  const [popped, setPopped] = useState(0);
  const [time, setTime] = useState<number>(cfg.time);
  const [status, setStatus] = useState<"play" | "won" | "lost">("play");
  const idRef = useRef(0); const accRef = useRef(0);
  const resetMouse = () => { const c = levelCfg(level); setBalloons([]); setPopped(0); setTime(c.time); idRef.current = 0; accRef.current = 0; setStatus("play"); };
  useEffect(() => { if (control === "mouse") resetMouse(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [level, control]);
  useEffect(() => {
    if (control !== "mouse" || status !== "play") return;
    const c = levelCfg(level);
    let raf = 0; let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.05); last = t; accRef.current += dt;
      setBalloons((prev) => prev.map((b) => ({ ...b, y: b.y + b.speed * dt })).filter((b) => b.y < 104));
      if (accRef.current > c.spawn) {
        accRef.current = 0;
        setBalloons((prev) => {
          if (prev.length > 16) return prev;
          const n = c.burst && Math.random() < 0.4 ? 3 : 1;
          const add = [];
          for (let i = 0; i < n; i++) add.push({ id: idRef.current++, x: 6 + Math.random() * 88, y: -6 - i * 8, color: RC_COLORS[Math.floor(Math.random() * RC_COLORS.length)], speed: c.fallA + Math.random() * (c.fallB - c.fallA) });
          return [...prev, ...add];
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [status, level, control]);
  useEffect(() => {
    if (control !== "mouse" || status !== "play") return;
    const iv = setInterval(() => setTime((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(iv);
  }, [status, level, control]);
  useEffect(() => { if (control === "mouse" && status === "play" && popped >= cfg.goal) { sfx.win(); setStatus("won"); } }, [popped, status, control, cfg.goal]);
  useEffect(() => { if (control === "mouse" && status === "play" && time <= 0) { if (popped >= cfg.goal) { sfx.win(); setStatus("won"); } else { sfx.lose(); setStatus("lost"); } } }, [time, popped, status, control, cfg.goal]);
  const pop = (id: number) => { if (status !== "play") return; sfx.pop(); setBalloons((prev) => prev.filter((b) => b.id !== id)); setPopped((p) => p + 1); };
  const nextLevel = () => { if (level < MAX_LEVEL) setLevel((l) => l + 1); };
  const restart = () => setLevel(1);
  const pct = Math.min(100, Math.round((popped / cfg.goal) * 100));
  const isLast = level >= MAX_LEVEL;
  return (
    <div>
      <div className="seg" style={{ marginBottom: 10 }}>
        {(["mouse", "keyboard"] as const).map((m) => (
          <button key={m} className={control === m ? "on" : ""} aria-pressed={control === m} onClick={() => { sfx.select(); setControl(m); }}>
            {m === "mouse" ? "🖱 Mouse" : "⌨ Keyboard"}
          </button>
        ))}
      </div>
      {control === "keyboard" && (
        <div className="seg" style={{ marginBottom: 10 }}>
          {(["plate", "deflect"] as const).map((m) => (
            <button key={m} className={mechanic === m ? "on" : ""} aria-pressed={mechanic === m} onClick={() => { sfx.select(); setMechanic(m); }}>
              {m === "plate" ? "🛡 Plate" : "🏓 Deflect puck"}
            </button>
          ))}
        </div>
      )}
      <LevelHeader level={level} note={control === "mouse" ? "Tap the balloons" : "Arrow-key plate"} />
      {control === "mouse" ? (
        <>
          <div className="bp-hud">
            <div className="bp-prog"><div className="bp-bar"><span style={{ width: `${pct}%` }} /></div><span className="bp-count">{popped}/{cfg.goal} popped</span></div>
            <div className={"bp-time" + (time <= 10 ? " low" : "")}>⏱ {time}s</div>
          </div>
          <div className="bp-field">
            {balloons.map((b) => (
              <button key={b.id} className="bp-balloon" style={{ left: `${b.x}%`, top: `${b.y}%`, background: b.color }} onClick={() => pop(b.id)} aria-label="Pop balloon" />
            ))}
            {status !== "play" && (
              <div className="bp-over">
                <div className="bp-over-msg">{status === "won" ? (isLast ? "🏆 All 20 levels!" : "🎉 Level clear!") : "⏰ Time's up!"}</div>
                <div className="muted">{status === "won" ? (isLast ? "You popped your way to the top!" : `On to level ${level + 1}.`) : `You popped ${popped}/${cfg.goal}. Try again!`}</div>
                {status === "won"
                  ? (isLast
                      ? <button className="btn btn-primary btn-sm" onClick={restart}>↻ Play again</button>
                      : <button className="btn btn-primary btn-sm" onClick={nextLevel}>Level {level + 1} →</button>)
                  : <button className="btn btn-primary btn-sm" onClick={resetMouse}>↻ Retry level {level}</button>}
              </div>
            )}
          </div>
          <p className="cv-intro" style={{ marginTop: 10 }}>Tap {cfg.goal} balloons before they fall and before the timer runs out!</p>
        </>
      ) : (
        <PlateField level={level} mechanic={mechanic} behavior="fall" onNext={nextLevel} onRestart={restart} />
      )}
    </div>
  );
}

// ---------- Ricochet (dedicated arrow-key plate / deflect game, 20 levels) ----------
function Ricochet() {
  const [mechanic, setMechanic] = useState<Mech>("plate");
  const [behavior, setBehavior] = useState<Behavior>("fall");
  const [level, setLevel] = useState(1);
  const next = () => { if (level < MAX_LEVEL) setLevel((l) => l + 1); };
  const restart = () => setLevel(1);
  return (
    <div>
      <div className="seg" style={{ marginBottom: 10 }}>
        {(["plate", "deflect"] as const).map((m) => (
          <button key={m} className={mechanic === m ? "on" : ""} aria-pressed={mechanic === m} onClick={() => { sfx.select(); setMechanic(m); }}>
            {m === "plate" ? "🛡 Plate" : "🏓 Deflect puck"}
          </button>
        ))}
      </div>
      <div className="seg" style={{ marginBottom: 10 }}>
        {(["fall", "static"] as const).map((b) => (
          <button key={b} className={behavior === b ? "on" : ""} aria-pressed={behavior === b} onClick={() => { sfx.select(); setBehavior(b); }}>
            {b === "fall" ? "⬇ Falling" : "🎯 Smash cluster"}
          </button>
        ))}
      </div>
      <LevelHeader level={level} note={behavior === "static" ? "Smash them all" : "Catch them falling"} />
      <PlateField level={level} mechanic={mechanic} behavior={behavior} onNext={next} onRestart={restart} />
    </div>
  );
}

// ---------- Bubble Shooter (aim & fire; match 3+ of a colour to pop, clear to advance) ----------
const SHOOT_PALETTE = ["#FF7A66", "#FFC94D", "#5BBF8A", "#5AA7E6", "#9B6DD6", "#FF7AA8"];
function BubbleShooter() {
  const R = 18, COLS = 9;
  const STEP = R * 1.732;
  const W = 2 * R * COLS;            // 324
  const H = 470;
  const MAXROWS = Math.floor((H - 70) / STEP);
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [level, setLevel] = useState(1);
  const [status, setStatus] = useState<"play" | "won" | "lost">("play");
  const [remaining, setRemaining] = useState(0);

  const colMax = (r: number) => (r % 2 ? COLS - 2 : COLS - 1);
  const cx = (r: number, c: number) => R + c * 2 * R + (r % 2 ? R : 0);
  const cy = (r: number) => R + r * STEP;
  const colorsN = (L: number) => Math.min(SHOOT_PALETTE.length, 3 + Math.floor((L - 1) / 3));

  const st = useRef({
    grid: [] as (number | 0)[][],     // 0 empty, else 1-based colour index
    cur: 1, next: 1,
    angle: -Math.PI / 2,              // pointing up
    proj: null as null | { x: number; y: number; vx: number; vy: number; color: number },
    nColors: 3,
  });

  const neighbors = (r: number, c: number): [number, number][] => {
    const odd = r % 2 === 1;
    const list: [number, number][] = odd
      ? [[r, c - 1], [r, c + 1], [r - 1, c], [r - 1, c + 1], [r + 1, c], [r + 1, c + 1]]
      : [[r, c - 1], [r, c + 1], [r - 1, c - 1], [r - 1, c], [r + 1, c - 1], [r + 1, c]];
    return list.filter(([rr, ccc]) => rr >= 0 && rr < MAXROWS && ccc >= 0 && ccc <= colMax(rr));
  };
  const occupiedCount = () => st.current.grid.flat().filter((v) => v).length;

  const newColor = () => 1 + Math.floor(Math.random() * st.current.nColors);
  const reload = () => { st.current.cur = st.current.next; st.current.next = newColor(); };

  const initLevel = (L: number) => {
    const nC = colorsN(L);
    st.current.nColors = nC;
    const grid: (number | 0)[][] = Array.from({ length: MAXROWS }, () => Array(COLS).fill(0));
    const rows = Math.min(MAXROWS - 4, 3 + Math.floor(L / 2));
    for (let r = 0; r < rows; r++) for (let c = 0; c <= colMax(r); c++) grid[r][c] = 1 + Math.floor(Math.random() * nC);
    st.current.grid = grid;
    st.current.angle = -Math.PI / 2;
    st.current.proj = null;
    st.current.cur = newColor(); st.current.next = newColor();
    setRemaining(occupiedCount());
    setStatus("play");
  };

  // snap a flying bubble to the nearest sensible empty cell
  const snap = (px: number, py: number): [number, number] => {
    let best: [number, number] | null = null; let bestD = Infinity;
    for (let r = 0; r < MAXROWS; r++) for (let c = 0; c <= colMax(r); c++) {
      if (st.current.grid[r][c]) continue;
      const adj = r === 0 || neighbors(r, c).some(([rr, ccc]) => st.current.grid[rr][ccc]);
      if (!adj) continue;
      const d = (cx(r, c) - px) ** 2 + (cy(r) - py) ** 2;
      if (d < bestD) { bestD = d; best = [r, c]; }
    }
    if (best) return best;
    // fallback: nearest empty anywhere
    for (let r = 0; r < MAXROWS; r++) for (let c = 0; c <= colMax(r); c++) {
      if (st.current.grid[r][c]) continue;
      const d = (cx(r, c) - px) ** 2 + (cy(r) - py) ** 2;
      if (d < bestD) { bestD = d; best = [r, c]; }
    }
    return best ?? [0, 0];
  };

  const settle = (color: number, px: number, py: number) => {
    const [r, c] = snap(px, py);
    st.current.grid[r][c] = color;
    // same-colour flood fill
    const seen = new Set<string>(); const stack: [number, number][] = [[r, c]]; const cluster: [number, number][] = [];
    while (stack.length) {
      const [rr, ccc] = stack.pop()!; const key = rr + ":" + ccc;
      if (seen.has(key)) continue; seen.add(key);
      if (st.current.grid[rr][ccc] !== color) continue;
      cluster.push([rr, ccc]);
      neighbors(rr, ccc).forEach((n) => { if (!seen.has(n[0] + ":" + n[1])) stack.push(n); });
    }
    if (cluster.length >= 3) {
      cluster.forEach(([rr, ccc]) => { st.current.grid[rr][ccc] = 0; });
      sfx.pop();
      // drop floating: keep only cells connected to row 0
      const keep = new Set<string>(); const q: [number, number][] = [];
      for (let c0 = 0; c0 <= colMax(0); c0++) if (st.current.grid[0][c0]) { q.push([0, c0]); keep.add("0:" + c0); }
      while (q.length) {
        const [rr, ccc] = q.shift()!;
        neighbors(rr, ccc).forEach(([nr, nc]) => { const key = nr + ":" + nc; if (st.current.grid[nr][nc] && !keep.has(key)) { keep.add(key); q.push([nr, nc]); } });
      }
      let dropped = 0;
      for (let rr = 0; rr < MAXROWS; rr++) for (let ccc = 0; ccc <= colMax(rr); ccc++) {
        if (st.current.grid[rr][ccc] && !keep.has(rr + ":" + ccc)) { st.current.grid[rr][ccc] = 0; dropped++; }
      }
      if (dropped) sfx.good();
    } else {
      sfx.tap();
    }
    const occ = occupiedCount();
    setRemaining(occ);
    if (occ === 0) { sfx.win(); setStatus("won"); return; }
    // lose if a bubble reaches the danger line
    let lowest = 0;
    for (let rr = 0; rr < MAXROWS; rr++) for (let ccc = 0; ccc <= colMax(rr); ccc++) if (st.current.grid[rr][ccc]) lowest = Math.max(lowest, rr);
    if (cy(lowest) + R >= H - 56) { sfx.lose(); setStatus("lost"); return; }
    reload();
  };

  useEffect(() => { initLevel(level); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [level]);

  useEffect(() => {
    let raf = 0;
    const sx = W / 2, sy = H - 30;
    const draw = () => {
      const cv = ref.current; if (!cv) return; const ctx = cv.getContext("2d")!;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#FFFBF4"; ctx.fillRect(0, 0, W, H);
      // danger line
      ctx.strokeStyle = "rgba(242,86,61,.35)"; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(0, H - 56); ctx.lineTo(W, H - 56); ctx.stroke(); ctx.setLineDash([]);
      const bubble = (x: number, y: number, color: number) => {
        ctx.beginPath(); ctx.arc(x, y, R - 1, 0, Math.PI * 2);
        ctx.fillStyle = SHOOT_PALETTE[color - 1]; ctx.fill();
        ctx.beginPath(); ctx.arc(x - R * 0.3, y - R * 0.3, R * 0.32, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.fill();
      };
      const g = st.current.grid;
      for (let r = 0; r < MAXROWS; r++) for (let c = 0; c <= colMax(r); c++) if (g[r][c]) bubble(cx(r, c), cy(r), g[r][c]);
      // aim guide
      if (!st.current.proj && status === "play") {
        ctx.strokeStyle = "rgba(44,42,74,.25)"; ctx.setLineDash([4, 6]); ctx.beginPath();
        ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(st.current.angle) * 120, sy + Math.sin(st.current.angle) * 120); ctx.stroke(); ctx.setLineDash([]);
      }
      // projectile
      if (st.current.proj) bubble(st.current.proj.x, st.current.proj.y, st.current.proj.color);
      // shooter + next
      bubble(sx, sy, st.current.cur);
      bubble(W - R - 2, H - 16, st.current.next);
    };
    const stepProj = () => {
      const p = st.current.proj; if (!p) return;
      const SPEED = 9;
      for (let i = 0; i < SPEED; i++) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < R) { p.x = R; p.vx = -p.vx; }
        else if (p.x > W - R) { p.x = W - R; p.vx = -p.vx; }
        if (p.y <= R) { settle(p.color, p.x, R); st.current.proj = null; return; }
        const g = st.current.grid;
        for (let r = 0; r < MAXROWS; r++) for (let c = 0; c <= colMax(r); c++) {
          if (g[r][c] && (cx(r, c) - p.x) ** 2 + (cy(r) - p.y) ** 2 <= (2 * R - 3) ** 2) {
            settle(p.color, p.x, p.y); st.current.proj = null; return;
          }
        }
      }
    };
    const loop = () => { if (status === "play") stepProj(); draw(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, level]);

  const aimAt = (clientX: number, clientY: number) => {
    const cv = ref.current; if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const x = (clientX - rect.left) * (W / rect.width);
    const y = (clientY - rect.top) * (H / rect.height);
    let a = Math.atan2(y - (H - 30), x - W / 2);
    // clamp to an upward cone
    if (a > -0.15) a = -0.15; if (a < -Math.PI + 0.15) a = -Math.PI + 0.15;
    st.current.angle = a;
  };
  const fire = () => {
    if (status !== "play" || st.current.proj) return;
    sfx.shoot();
    st.current.proj = { x: W / 2, y: H - 30, vx: Math.cos(st.current.angle) * 1, vy: Math.sin(st.current.angle) * 1, color: st.current.cur };
  };
  const next = () => { if (level < MAX_LEVEL) setLevel((l) => l + 1); };
  const restart = () => { if (level === 1) initLevel(1); else setLevel(1); };
  const isLast = level >= MAX_LEVEL;

  return (
    <div className="tetris">
      <LevelHeader level={level} note={`${remaining} bubbles left`} />
      <div className="shooter-wrap">
        <canvas
          ref={ref} width={W} height={H} className="tetris-canvas shooter-canvas"
          onMouseMove={(e) => aimAt(e.clientX, e.clientY)}
          onClick={(e) => { aimAt(e.clientX, e.clientY); fire(); }}
          onTouchMove={(e) => { const t = e.touches[0]; if (t) aimAt(t.clientX, t.clientY); }}
          onTouchEnd={() => fire()}
        />
        {status !== "play" && (
          <div className="bp-over">
            <div className="bp-over-msg">{status === "won" ? (isLast ? "🏆 All 20 levels!" : "🎉 Cleared!") : "😅 Bubbles reached the line"}</div>
            <div className="muted">{status === "won" ? (isLast ? "You popped every bubble!" : `On to level ${level + 1}.`) : "Give it another go!"}</div>
            {status === "won"
              ? (isLast
                  ? <button className="btn btn-primary btn-sm" onClick={restart}>↻ Play again</button>
                  : <button className="btn btn-primary btn-sm" onClick={next}>Level {level + 1} →</button>)
              : <button className="btn btn-primary btn-sm" onClick={() => initLevel(level)}>↻ Retry level {level}</button>}
          </div>
        )}
      </div>
      <div className="tetris-ctrl">
        <button className="round-btn" title="Aim left" onClick={() => { st.current.angle = Math.max(-Math.PI + 0.15, st.current.angle - 0.12); }}>◀</button>
        <button className="round-btn" title="Fire" onClick={fire}>🚀</button>
        <button className="round-btn" title="Aim right" onClick={() => { st.current.angle = Math.min(-0.15, st.current.angle + 0.12); }}>▶</button>
      </div>
      <p className="cv-intro" style={{ marginTop: 4 }}>Aim with the mouse (or ◀ ▶), tap the board or 🚀 to fire. Match 3+ of a colour to pop them. Clear the board to reach level 20!</p>
    </div>
  );
}

// ---------- Word Scramble (256 picture words; picture OR word clue) ----------
const SCRAMBLE_WORDS: [string, string][] = [
  ["🐱", "CAT"], ["🐶", "DOG"], ["🐘", "ELEPHANT"], ["🦁", "LION"], ["🐯", "TIGER"],
  ["🐻", "BEAR"], ["🐰", "RABBIT"], ["🦊", "FOX"], ["🐸", "FROG"], ["🐝", "BEE"],
  ["🦋", "BUTTERFLY"], ["🐢", "TURTLE"], ["🐍", "SNAKE"], ["🐬", "DOLPHIN"], ["🐙", "OCTOPUS"],
  ["🦒", "GIRAFFE"], ["🦓", "ZEBRA"], ["🐧", "PENGUIN"], ["🦉", "OWL"], ["🐴", "HORSE"],
  ["🐮", "COW"], ["🐷", "PIG"], ["🐑", "SHEEP"], ["🐔", "CHICKEN"], ["🐭", "MOUSE"],
  ["🐹", "HAMSTER"], ["🐨", "KOALA"], ["🐼", "PANDA"], ["🐵", "MONKEY"], ["🦍", "GORILLA"],
  ["🐊", "CROCODILE"], ["🦎", "LIZARD"], ["🐳", "WHALE"], ["🦈", "SHARK"], ["🐟", "FISH"],
  ["🦀", "CRAB"], ["🦞", "LOBSTER"], ["🦐", "SHRIMP"], ["🐚", "SHELL"], ["🐌", "SNAIL"],
  ["🐞", "LADYBUG"], ["🐜", "ANT"], ["🦗", "CRICKET"], ["🕷️", "SPIDER"], ["🦂", "SCORPION"],
  ["🐛", "CATERPILLAR"], ["🦅", "EAGLE"], ["🦆", "DUCK"], ["🦢", "SWAN"], ["🦜", "PARROT"],
  ["🦩", "FLAMINGO"], ["🦚", "PEACOCK"], ["🐓", "ROOSTER"], ["🦃", "TURKEY"], ["🐦", "BIRD"],
  ["🐺", "WOLF"], ["🦝", "RACCOON"], ["🦨", "SKUNK"], ["🦦", "OTTER"], ["🦔", "HEDGEHOG"],
  ["🐿️", "SQUIRREL"], ["🦇", "BAT"], ["🦘", "KANGAROO"], ["🐪", "CAMEL"], ["🦏", "RHINO"],
  ["🦛", "HIPPO"], ["🐂", "BULL"], ["🐐", "GOAT"], ["🦌", "DEER"], ["🐲", "DRAGON"],
  ["🦄", "UNICORN"], ["🍎", "APPLE"], ["🍌", "BANANA"], ["🍇", "GRAPES"], ["🍓", "STRAWBERRY"],
  ["🍊", "ORANGE"], ["🍉", "WATERMELON"], ["🍋", "LEMON"], ["🥕", "CARROT"], ["🌽", "CORN"],
  ["🍅", "TOMATO"], ["🍐", "PEAR"], ["🍑", "PEACH"], ["🍒", "CHERRY"], ["🥝", "KIWI"],
  ["🍍", "PINEAPPLE"], ["🥥", "COCONUT"], ["🥭", "MANGO"], ["🫐", "BLUEBERRY"], ["🥔", "POTATO"],
  ["🍠", "YAM"], ["🧅", "ONION"], ["🧄", "GARLIC"], ["🥦", "BROCCOLI"], ["🥬", "LETTUCE"],
  ["🥒", "CUCUMBER"], ["🌶️", "PEPPER"], ["🍄", "MUSHROOM"], ["🥜", "PEANUT"], ["🌰", "CHESTNUT"],
  ["🫒", "OLIVE"], ["🍞", "BREAD"], ["🧀", "CHEESE"], ["🍕", "PIZZA"], ["🍔", "BURGER"],
  ["🍩", "DONUT"], ["🍪", "COOKIE"], ["🍦", "ICECREAM"], ["🎂", "CAKE"], ["🥚", "EGG"],
  ["🥓", "BACON"], ["🌭", "HOTDOG"], ["🥨", "PRETZEL"], ["🥐", "CROISSANT"], ["🥞", "PANCAKE"],
  ["🍝", "PASTA"], ["🍜", "NOODLES"], ["🍚", "RICE"], ["🍫", "CHOCOLATE"], ["🍭", "LOLLIPOP"],
  ["🍬", "CANDY"], ["🍯", "HONEY"], ["🥛", "MILK"], ["🧊", "ICE"], ["🧁", "CUPCAKE"],
  ["🍿", "POPCORN"], ["🥪", "SANDWICH"], ["🌮", "TACO"], ["🍟", "FRIES"], ["🥧", "PIE"],
  ["🍮", "PUDDING"], ["☀️", "SUN"], ["🌙", "MOON"], ["⭐", "STAR"], ["🌈", "RAINBOW"],
  ["🌸", "FLOWER"], ["🌳", "TREE"], ["🔥", "FIRE"], ["💧", "WATER"], ["⛄", "SNOWMAN"],
  ["❄️", "SNOW"], ["☁️", "CLOUD"], ["🌧️", "RAIN"], ["⚡", "LIGHTNING"], ["🌊", "WAVE"],
  ["🌋", "VOLCANO"], ["🏔️", "MOUNTAIN"], ["🌵", "CACTUS"], ["🍂", "LEAF"], ["🌻", "SUNFLOWER"],
  ["🌹", "ROSE"], ["🌲", "PINE"], ["🪨", "ROCK"], ["🏝️", "ISLAND"], ["🏖️", "BEACH"],
  ["🌍", "EARTH"], ["🪐", "PLANET"], ["☄️", "COMET"], ["🌪️", "TORNADO"], ["🌷", "TULIP"],
  ["🚗", "CAR"], ["🚌", "BUS"], ["✈️", "PLANE"], ["🚀", "ROCKET"], ["🚂", "TRAIN"],
  ["⛵", "BOAT"], ["🚲", "BICYCLE"], ["🚁", "HELICOPTER"], ["🚚", "TRUCK"], ["🚒", "FIRETRUCK"],
  ["🚓", "POLICECAR"], ["🚜", "TRACTOR"], ["🏍️", "MOTORBIKE"], ["🛵", "SCOOTER"], ["🚤", "SPEEDBOAT"],
  ["🛶", "CANOE"], ["🚢", "SHIP"], ["🚕", "TAXI"], ["🛴", "KICKSCOOTER"], ["🛸", "SAUCER"],
  ["🏠", "HOUSE"], ["🎈", "BALLOON"], ["🎁", "PRESENT"], ["📚", "BOOK"], ["⚽", "BALL"],
  ["👑", "CROWN"], ["🎸", "GUITAR"], ["🪑", "CHAIR"], ["🛏️", "BED"], ["🚪", "DOOR"],
  ["🪟", "WINDOW"], ["💡", "LAMP"], ["🕰️", "CLOCK"], ["📺", "TELEVISION"], ["📞", "PHONE"],
  ["🔑", "KEY"], ["✂️", "SCISSORS"], ["✏️", "PENCIL"], ["📏", "RULER"], ["🎨", "PALETTE"],
  ["🖌️", "BRUSH"], ["🧸", "TEDDY"], ["🪁", "KITE"], ["🎺", "TRUMPET"], ["🥁", "DRUM"],
  ["🎻", "VIOLIN"], ["🎹", "PIANO"], ["🔔", "BELL"], ["🔦", "TORCH"], ["🧹", "BROOM"],
  ["🪣", "BUCKET"], ["🧺", "BASKET"], ["☂️", "UMBRELLA"], ["👓", "GLASSES"], ["🎒", "BACKPACK"],
  ["🧦", "SOCK"], ["👟", "SHOE"], ["👒", "HAT"], ["🧤", "GLOVE"], ["🧣", "SCARF"],
  ["👗", "DRESS"], ["👕", "SHIRT"], ["👁️", "EYE"], ["👂", "EAR"], ["👃", "NOSE"],
  ["👄", "MOUTH"], ["✋", "HAND"], ["🦶", "FOOT"], ["🦷", "TOOTH"], ["🦴", "BONE"],
  ["❤️", "HEART"], ["🧠", "BRAIN"], ["⭕", "CIRCLE"], ["🔺", "TRIANGLE"], ["⬛", "SQUARE"],
  ["💠", "DIAMOND"], ["🌟", "SPARKLE"], ["🎯", "TARGET"], ["🧩", "PUZZLE"], ["🎲", "DICE"],
  ["🪙", "COIN"], ["💎", "GEM"], ["🔮", "CRYSTAL"], ["🎪", "TENT"], ["🏰", "CASTLE"],
  ["⚓", "ANCHOR"], ["🧭", "COMPASS"], ["🗺️", "MAP"], ["🎀", "BOW"], ["🔋", "BATTERY"],
  ["🪜", "LADDER"], ["🧲", "MAGNET"], ["🔨", "HAMMER"], ["🪚", "SAW"], ["🔧", "WRENCH"],
  ["🪛", "SCREWDRIVER"],
];
function WordScramble() {
  const pick = () => SCRAMBLE_WORDS[Math.floor(Math.random() * SCRAMBLE_WORDS.length)];
  const mix = (w: string) => { const a = w.split(""); let s = a; do { s = [...a].sort(() => Math.random() - 0.5); } while (s.join("") === w && w.length > 1); return s; };
  const [item, setItem] = useState<[string, string]>(pick);
  const [emoji, word] = item;
  const [letters, setLetters] = useState(() => mix(word).map((ch, i) => ({ id: i, ch })));
  const [slots, setSlots] = useState<{ id: number; ch: string }[]>([]);
  const [status, setStatus] = useState<"play" | "won">("play");
  const [solved, setSolved] = useState(0);
  const [clue, setClue] = useState<"picture" | "word">("picture");
  useEffect(() => { if (clue === "word" && speechSupported) speak(word); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [clue, item]);
  const guess = slots.map((s) => s.ch).join("");
  const wrong = slots.length === word.length && guess !== word && status === "play";
  const tapLetter = (l: { id: number; ch: string }) => {
    if (status !== "play" || slots.length >= word.length) return;
    sfx.tap();
    const ns = [...slots, l]; setSlots(ns); setLetters(letters.filter((x) => x.id !== l.id));
    if (ns.length === word.length) {
      if (ns.map((x) => x.ch).join("") === word) { sfx.win(); setStatus("won"); setSolved((n) => n + 1); }
      else sfx.wrong();
    }
  };
  const tapSlot = (i: number) => { if (status !== "play") return; const l = slots[i]; setSlots(slots.filter((_, j) => j !== i)); setLetters([...letters, l].sort((a, b) => a.id - b.id)); };
  const next = () => { const it = pick(); setItem(it); setLetters(mix(it[1]).map((ch, i) => ({ id: i, ch }))); setSlots([]); setStatus("play"); };
  const reshuffle = () => { setLetters([...letters, ...slots].sort(() => Math.random() - 0.5)); setSlots([]); };
  return (
    <div className="ws">
      <div className="seg" style={{ marginBottom: 10 }}>
        {(["picture", "word"] as const).map((m) => (
          <button key={m} className={clue === m ? "on" : ""} aria-pressed={clue === m} onClick={() => { sfx.select(); setClue(m); }}>
            {m === "picture" ? "🖼 Picture clue" : "🔤 Word clue"}
          </button>
        ))}
      </div>
      <p className="cv-intro">
        {clue === "picture" ? "Unscramble the word for the picture!" : "Listen, then spell the word — no peeking!"} Solved: {solved}
      </p>
      {clue === "picture"
        ? <div className="ws-pic">{emoji}</div>
        : (
          <div className="ws-listen">
            <button className="ws-listen-btn" onClick={() => speak(word)} disabled={!speechSupported} aria-label="Hear the word">🔊</button>
            <span className="muted">Tap to hear the word again</span>
          </div>
        )}
      <div className="ws-slots">
        {Array.from({ length: word.length }).map((_, i) => (
          <button key={i} className={"ws-slot" + (slots[i] ? " filled" : "") + (status === "won" ? " win" : wrong ? " wrong" : "")} onClick={() => tapSlot(i)}>{slots[i]?.ch ?? ""}</button>
        ))}
      </div>
      <div className="ws-tiles">
        {letters.map((l) => <button key={l.id} className="ws-tile" onClick={() => tapLetter(l)}>{l.ch}</button>)}
      </div>
      {status === "won" && <div className="ws-msg">🎉 Yes! It's {word}.</div>}
      {wrong && <div className="ws-msg wrong">Not quite — tap a tile to take it back.</div>}
      <div className="cta-wrap">
        {status === "won"
          ? <button className="btn btn-primary btn-sm" onClick={next}>Next word →</button>
          : <button className="btn btn-ghost btn-sm" onClick={reshuffle}>🔀 Shuffle</button>}
        <button className="btn btn-ghost btn-sm" onClick={() => speak(word.split("").join(" "))} disabled={!speechSupported}>🔊 Spell it</button>
        {status !== "won" && <button className="btn btn-ghost btn-sm" onClick={next}>Skip</button>}
      </div>
    </div>
  );
}

// ---------- Trivia quiz ----------
const TRIVIA: { cat: string; q: string; opts: string[]; a: number }[] = [
  { cat: "Animals", q: "Which animal is the king of the jungle?", opts: ["Lion", "Mouse", "Frog"], a: 0 },
  { cat: "Animals", q: "How many legs does a spider have?", opts: ["6", "8", "10"], a: 1 },
  { cat: "Animals", q: "Which animal can fly?", opts: ["Penguin", "Ostrich", "Eagle"], a: 2 },
  { cat: "Animals", q: "What do bees make?", opts: ["Milk", "Honey", "Bread"], a: 1 },
  { cat: "Animals", q: "Which is the largest animal on Earth?", opts: ["Elephant", "Blue whale", "Giraffe"], a: 1 },
  { cat: "Animals", q: "A baby dog is called a…", opts: ["Kitten", "Puppy", "Calf"], a: 1 },
  { cat: "Science", q: "What do plants need to make food?", opts: ["Sunlight", "Darkness", "Ice"], a: 0 },
  { cat: "Science", q: "Which planet do we live on?", opts: ["Mars", "Earth", "Jupiter"], a: 1 },
  { cat: "Science", q: "What is frozen water called?", opts: ["Steam", "Ice", "Sand"], a: 1 },
  { cat: "Science", q: "How many colours are in a rainbow?", opts: ["5", "7", "10"], a: 1 },
  { cat: "Science", q: "What gas do we breathe in to live?", opts: ["Oxygen", "Helium", "Smoke"], a: 0 },
  { cat: "Science", q: "Which is bigger, the Sun or the Moon?", opts: ["The Moon", "The Sun", "Same size"], a: 1 },
  { cat: "World", q: "Which is the largest ocean?", opts: ["Atlantic", "Pacific", "Indian"], a: 1 },
  { cat: "World", q: "How many days are in a week?", opts: ["5", "7", "10"], a: 1 },
  { cat: "World", q: "What do you call frozen rain?", opts: ["Snow", "Mud", "Wind"], a: 0 },
  { cat: "World", q: "Which season is the coldest?", opts: ["Summer", "Winter", "Spring"], a: 1 },
  { cat: "World", q: "What colour is the sky on a clear day?", opts: ["Green", "Blue", "Red"], a: 1 },
  { cat: "Numbers", q: "What is 2 + 3?", opts: ["4", "5", "6"], a: 1 },
  { cat: "Numbers", q: "What is 10 − 4?", opts: ["6", "7", "5"], a: 0 },
  { cat: "Numbers", q: "What comes after 9?", opts: ["10", "8", "11"], a: 0 },
  { cat: "Numbers", q: "How many sides does a triangle have?", opts: ["3", "4", "5"], a: 0 },
  { cat: "Numbers", q: "What is 5 × 2?", opts: ["7", "10", "12"], a: 1 },
  { cat: "Numbers", q: "Which number is the biggest?", opts: ["18", "81", "8"], a: 1 },
  { cat: "Numbers", q: "Half of 8 is…", opts: ["3", "4", "5"], a: 1 },
];
function Trivia() {
  const CATS = ["All", "Animals", "Science", "World", "Numbers"];
  const ROUND = 8;
  const [cat, setCat] = useState("All");
  const build = (c: string) => {
    const pool = TRIVIA.filter((q) => c === "All" || q.cat === c);
    return [...pool].sort(() => Math.random() - 0.5).slice(0, ROUND);
  };
  const [round, setRound] = useState(() => build("All"));
  const [qi, setQi] = useState(0);
  const [score, setScore] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const q = round[qi];
  const done = qi >= round.length;
  const choose = (i: number) => {
    if (chosen !== null) return;
    setChosen(i);
    if (i === q.a) { sfx.good(); setScore((s) => s + 1); } else sfx.wrong();
  };
  const nextQ = () => { setChosen(null); setQi((n) => n + 1); };
  const restart = (c = cat) => { setCat(c); setRound(build(c)); setQi(0); setScore(0); setChosen(null); };
  useEffect(() => { if (done) sfx.win(); }, [done]);
  return (
    <div className="tv">
      <div className="seg" style={{ marginBottom: 12, flexWrap: "wrap" }}>
        {CATS.map((c) => <button key={c} className={cat === c ? "on" : ""} onClick={() => restart(c)}>{c}</button>)}
      </div>
      {done ? (
        <div className="tv-done">
          <div className="tv-score">🎉 {score}/{round.length}</div>
          <p className="muted">{score === round.length ? "Perfect score!" : score >= round.length / 2 ? "Great work!" : "Keep practising — you'll get there!"}</p>
          <button className="btn btn-primary btn-sm" onClick={() => restart()}>↻ Play again</button>
        </div>
      ) : (
        <div>
          <div className="tv-prog">Question {qi + 1} of {round.length} · Score {score}</div>
          <div className="tv-q">{q.q}</div>
          <div className="tv-opts">
            {q.opts.map((o, i) => {
              const reveal = chosen !== null;
              const cls = reveal ? (i === q.a ? " correct" : i === chosen ? " wrong" : "") : "";
              return <button key={i} className={"tv-opt" + cls} onClick={() => choose(i)} disabled={reveal}>{o}</button>;
            })}
          </div>
          {chosen !== null && (
            <div className="cta-wrap">
              <span className={chosen === q.a ? "tv-fb ok" : "tv-fb no"}>{chosen === q.a ? "✅ Correct!" : `❌ It's ${q.opts[q.a]}`}</span>
              <button className="btn btn-primary btn-sm" onClick={nextQ}>{qi + 1 >= round.length ? "See score →" : "Next →"}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Picture Puzzle (3x3 slide, by category) ----------
const PUZZLE_CATS: { name: string; emoji: string; tiles: string[] }[] = [
  { name: "Animals", emoji: "🐾", tiles: ["🐶", "🐱", "🦁", "🐘", "🐵", "🐰", "🦊", "🐼"] },
  { name: "People", emoji: "🧑", tiles: ["👶", "🧒", "👩", "👨", "👵", "👴", "👮", "🧑‍🚀"] },
  { name: "Nature", emoji: "🌳", tiles: ["🌳", "🌸", "🌞", "🌈", "🍄", "🌵", "🌻", "🍁"] },
  { name: "Transport", emoji: "🚗", tiles: ["🚗", "🚌", "✈️", "🚀", "🚂", "⛵", "🚲", "🚒"] },
];
function SlidePuzzle() {
  const [ci, setCi] = useState(0);
  const target = [...PUZZLE_CATS[ci].tiles, ""]; // 8 tiles + blank at index 8
  const shuffle = () => {
    const b = [...target]; let blank = 8;
    for (let n = 0; n < 80; n++) {
      const nbrs = [blank - 3, blank + 3, blank % 3 !== 0 ? blank - 1 : -1, blank % 3 !== 2 ? blank + 1 : -1].filter((x) => x >= 0 && x < 9);
      const sw = nbrs[Math.floor(Math.random() * nbrs.length)];
      [b[blank], b[sw]] = [b[sw], b[blank]]; blank = sw;
    }
    return b;
  };
  const [board, setBoard] = useState<string[]>(shuffle);
  const [moves, setMoves] = useState(0);
  const solved = board.every((v, i) => v === target[i]);
  const tap = (i: number) => {
    if (solved) return;
    const blank = board.indexOf("");
    const ok = (i === blank - 3 || i === blank + 3 || (i === blank - 1 && blank % 3 !== 0) || (i === blank + 1 && blank % 3 !== 2));
    if (!ok) return;
    sfx.tap();
    const nb = [...board]; [nb[blank], nb[i]] = [nb[i], nb[blank]]; setBoard(nb); setMoves((m) => m + 1);
    if (nb.every((v, k) => v === target[k])) sfx.win();
  };
  const restart = (c = ci) => { setCi(c); setBoard(shuffle()); setMoves(0); };
  return (
    <div className="pz">
      <div className="seg" style={{ marginBottom: 10, flexWrap: "wrap" }}>
        {PUZZLE_CATS.map((c, i) => <button key={c.name} className={ci === i ? "on" : ""} onClick={() => restart(i)}>{c.emoji} {c.name}</button>)}
      </div>
      <p className="cv-intro">Slide the tiles to match the picture. Moves: {moves} {solved ? "— 🎉 Solved!" : ""}</p>
      <div className="pz-wrap">
        <div className="pz-board">
          {board.map((v, i) => (
            <button key={i} className={"pz-tile" + (v === "" ? " blank" : "")} onClick={() => tap(i)} disabled={v === ""}>{v}</button>
          ))}
        </div>
        <div className="pz-ref"><span className="dress-lbl">Goal</span>
          <div className="pz-mini">{target.map((v, i) => <span key={i} className="pz-mini-cell">{v}</span>)}</div>
        </div>
      </div>
      <div className="cta-wrap"><button className="btn btn-ghost btn-sm" onClick={() => restart()}>🔀 Shuffle</button></div>
    </div>
  );
}

// ---------- Comic builder ----------
function ComicBuilder() {
  const SCENES = ["🏞️", "🌆", "🏰", "🚀", "🌊", "🌳", "🏜️", "🌙", "🏟️", "🛸"];
  const CHARS = ["🦸", "🐯", "🤖", "🧙", "🐶", "👧", "👦", "🦖", "👽", "🐉", "🦄", "🐱"];
  const [panels, setPanels] = useState([
    { bg: "🏞️", ch: "🦸", cap: "" }, { bg: "🌆", ch: "🤖", cap: "" },
    { bg: "🏰", ch: "🧙", cap: "" }, { bg: "🚀", ch: "🐯", cap: "" },
  ]);
  const cycle = (i: number, key: "bg" | "ch", list: string[], dir: number) =>
    setPanels((p) => p.map((x, j) => j === i ? { ...x, [key]: list[(list.indexOf(x[key]) + dir + list.length) % list.length] } : x));
  const setCap = (i: number, v: string) => setPanels((p) => p.map((x, j) => j === i ? { ...x, cap: v } : x));
  return (
    <div className="comic">
      <p className="cv-intro">Build a 4-panel comic — pick a scene and a character, then add a caption.</p>
      <div className="comic-grid">
        {panels.map((p, i) => (
          <div key={i} className="comic-panel">
            <div className="comic-art"><span className="comic-bg">{p.bg}</span><span className="comic-ch">{p.ch}</span></div>
            <div className="comic-pick">
              <button onClick={() => cycle(i, "bg", SCENES, -1)}>◀</button><span>{p.bg}</span><button onClick={() => cycle(i, "bg", SCENES, 1)}>▶</button>
              <button onClick={() => cycle(i, "ch", CHARS, -1)}>◀</button><span>{p.ch}</span><button onClick={() => cycle(i, "ch", CHARS, 1)}>▶</button>
            </div>
            <input className="comic-cap" value={p.cap} onChange={(e) => setCap(i, e.target.value)} placeholder={`Caption ${i + 1}…`} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Song studio ----------
const SONG_NOTES: [string, number][] = [["C", 523], ["D", 587], ["E", 659], ["F", 698], ["G", 784], ["A", 880], ["B", 988], ["C²", 1047]];
const TWINKLE = [0, 0, 4, 4, 5, 5, 4, 3, 3, 2, 2, 1, 1, 0];
function SongStudio() {
  const [seq, setSeq] = useState<number[]>([]);
  const COLORS = ["#FF7A66", "#FFC94D", "#5BBF8A", "#2EC4B6", "#5AA7E6", "#9B6DD6", "#FF7AA8", "#F2563D"];
  const hit = (i: number) => { playNote(SONG_NOTES[i][1]); setSeq((s) => [...s, i].slice(-32)); };
  const playList = (list: number[]) => list.forEach((n, k) => setTimeout(() => playNote(SONG_NOTES[n][1]), k * 320));
  return (
    <div className="song">
      <p className="cv-intro">Tap the pads to play notes and make a tune!</p>
      <div className="song-pads">
        {SONG_NOTES.map(([name], i) => (
          <button key={name} className="song-pad" style={{ background: COLORS[i] }} onClick={() => hit(i)}>{name}</button>
        ))}
      </div>
      <div className="cta-wrap">
        <button className="btn btn-primary btn-sm" onClick={() => playList(TWINKLE)}>▶ Play "Twinkle"</button>
        <button className="btn btn-ghost btn-sm" onClick={() => playList(seq)} disabled={!seq.length}>🔁 Play my tune ({seq.length})</button>
        <button className="btn btn-ghost btn-sm" onClick={() => setSeq([])} disabled={!seq.length}>🗑️ Clear</button>
      </div>
    </div>
  );
}

// ---------- Search & Find ----------
const FIND_SCENES: { name: string; bg: string; items: string[] }[] = [
  { name: "On the farm", bg: "linear-gradient(#EAF6FF,#E7F3D8)", items: ["🐄", "🐖", "🐑", "🐔", "🚜", "🌽", "🍎", "🐶", "🐱", "🦆", "🌻", "🐝", "🐴", "🐐", "🥚", "🌾", "🐤", "🍏"] },
  { name: "Under the sea", bg: "linear-gradient(#DFF3FF,#Bfe6f5)", items: ["🐠", "🐙", "🐢", "🦀", "🐚", "⭐", "🦈", "🐡", "🐬", "🦑", "🪸", "🐟", "🐳", "🦐", "🌊", "🦞", "🐋", "🫧"] },
  { name: "In the park", bg: "linear-gradient(#EAF6FF,#E1F0D2)", items: ["🌳", "🐦", "🐿️", "⚽", "🪁", "🌷", "🦋", "🌈", "🐝", "🍦", "🎈", "🐶", "🌻", "🛝", "🧺", "☀️", "🐞", "🌼"] },
  { name: "Food", bg: "linear-gradient(#FFF3E6,#FFE7D6)", items: ["🍎", "🍌", "🍕", "🍔", "🍓", "🍩", "🧁", "🍦", "🌽", "🥕", "🍪", "🍇", "🍒", "🥨", "🧀", "🍉", "🍟", "🍰", "🍇", "🥞"] },
];
function SearchFind() {
  const [si, setSi] = useState(0);
  const COLS = 16, ROWS = 13;
  const build = (idx: number) => {
    const scene = FIND_SCENES[idx];
    const targets = [...scene.items].sort(() => Math.random() - 0.5).slice(0, 8);
    const total = COLS * ROWS;
    const targetCells = new Set<number>();
    while (targetCells.size < targets.length) targetCells.add(Math.floor(Math.random() * total));
    const cellArr = [...targetCells]; let ti = 0;
    const map: Record<number, string> = {};
    cellArr.forEach((ci) => { map[ci] = targets[ti++]; });
    const decoys = scene.items.filter((e) => !targets.includes(e));
    const decoyPool = decoys.length ? decoys : scene.items;
    let id = 0;
    const placed = Array.from({ length: total }, (_, i) => ({
      id: id++,
      e: i in map ? map[i] : decoyPool[Math.floor(Math.random() * decoyPool.length)],
    }));
    return { targets, placed };
  };
  const [game, setGame] = useState(() => build(0));
  const [foundIds, setFoundIds] = useState<number[]>([]);
  const [uploads, setUploads] = useState<WorkbenchAsset[]>([]);
  const [up, setUp] = useState<WorkbenchAsset | null>(null);
  useEffect(() => { api.workbenchAssets("searchfind").then((r) => setUploads(r.assets)).catch(() => {}); }, []);
  const foundTypes = new Set(game.placed.filter((o) => foundIds.includes(o.id)).map((o) => o.e));
  useEffect(() => { if (!up) { setGame(build(si)); setFoundIds([]); } }, [si, up]);
  const tap = (o: { id: number; e: string }) => {
    if (game.targets.includes(o.e) && !foundTypes.has(o.e) && !foundIds.includes(o.id)) { sfx.good(); setFoundIds((f) => [...f, o.id]); }
  };
  const won = foundTypes.size >= game.targets.length;
  useEffect(() => { if (won) sfx.win(); }, [won]);
  return (
    <div>
      <div className="seg" style={{ marginBottom: 10, flexWrap: "wrap" }}>
        {FIND_SCENES.map((s, i) => <button key={s.name} className={!up && si === i ? "on" : ""} onClick={() => { setUp(null); setSi(i); }}>{s.name}</button>)}
        {uploads.map((a) => <button key={a.id} className={up?.id === a.id ? "on" : ""} onClick={() => setUp(a)}>🖼️ {a.name}</button>)}
      </div>
      {up ? <ImageFind src={api.workbenchImageUrl(up.id)} items={up.items} /> : (<>
      <p className="cv-intro">Find and tap each item in the list — only the one you tap is marked! {won ? "🎉 You found them all!" : `Found ${foundTypes.size}/${game.targets.length}`}</p>
      <div className="sf-wrap">
        <div className="sf-scene" style={{ background: FIND_SCENES[si].bg, gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
          {game.placed.map((o) => (
            <button key={o.id} className={"sf-cell" + (foundIds.includes(o.id) ? " found" : "")} onClick={() => tap(o)}>{o.e}</button>
          ))}
        </div>
        <div className="sf-list">
          {game.targets.map((e) => (
            <div key={e} className={"sf-item" + (foundTypes.has(e) ? " done" : "")}><span className="sf-box">{foundTypes.has(e) ? "✅" : "⬜"}</span><span className="sf-em">{e}</span></div>
          ))}
        </div>
      </div>
      <div className="cta-wrap"><button className="btn btn-ghost btn-sm" onClick={() => { setGame(build(si)); setFoundIds([]); }}>↻ New layout</button></div>
      </>)}
    </div>
  );
}

// ---------- Tetris ----------
const TET_COLORS = ["", "#5AA7E6", "#FFC94D", "#9B6DD6", "#5BBF8A", "#FF7A66", "#2EC4B6", "#F2563D"];
const SHAPES: number[][][] = [
  [[1, 1, 1, 1]], [[2, 0, 0], [2, 2, 2]], [[0, 0, 3], [3, 3, 3]], [[4, 4], [4, 4]],
  [[0, 5, 5], [5, 5, 0]], [[0, 6, 0], [6, 6, 6]], [[7, 7, 0], [0, 7, 7]],
];
function Tetris() {
  const COLS = 12, ROWS = 18, CELL = 28;
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<"slow" | "normal" | "fast">("normal");
  const [mode, setMode] = useState<"auto" | "pick">("auto");
  const [choices, setChoices] = useState<number[] | null>(null);
  const [gen, setGen] = useState(0);
  const dropMs = useRef(560);
  const modeRef = useRef<"auto" | "pick">("auto");
  modeRef.current = mode;
  const choicesRef = useRef<number[] | null>(null);
  const putChoices = (c: number[] | null) => { choicesRef.current = c; setChoices(c); };
  const setSpd = (s: "slow" | "normal" | "fast") => { setSpeed(s); dropMs.current = { slow: 950, normal: 560, fast: 300 }[s]; };
  const state = useRef({
    grid: Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
    piece: null as null | { shape: number[][]; x: number; y: number },
  });
  const rotate = (s: number[][]) => s[0].map((_, c) => s.map((r) => r[c]).reverse());
  const collide = (sh: number[][], x: number, y: number) => {
    const g = state.current.grid;
    for (let r = 0; r < sh.length; r++) for (let c = 0; c < sh[r].length; c++) {
      if (!sh[r][c]) continue;
      const nx = x + c, ny = y + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS || (ny >= 0 && g[ny][nx])) return true;
    }
    return false;
  };
  const spawnShape = (shape: number[][]) => {
    const p = { shape, x: Math.floor((COLS - shape[0].length) / 2), y: -shape.length + 1 };
    if (collide(p.shape, p.x, p.y + 1)) { setOver(true); state.current.piece = null; putChoices(null); return; }
    state.current.piece = p;
  };
  const dealIndices = () => Array.from({ length: 3 }, () => Math.floor(Math.random() * SHAPES.length));
  const deal = () => { state.current.piece = null; putChoices(dealIndices()); };
  const spawnRandom = () => spawnShape(SHAPES[Math.floor(Math.random() * SHAPES.length)]);
  const pickShape = (idx: number) => { if (state.current.piece) return; sfx.select(); putChoices(null); spawnShape(SHAPES[idx]); };
  const merge = () => {
    const { grid, piece } = state.current; if (!piece) return;
    piece.shape.forEach((row, r) => row.forEach((v, c) => { if (v && piece.y + r >= 0) grid[piece.y + r][piece.x + c] = v; }));
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) { if (grid[r].every((v) => v)) { grid.splice(r, 1); grid.unshift(Array(COLS).fill(0)); cleared++; r++; } }
    if (cleared) { sfx.good(); setScore((s) => s + [0, 40, 100, 300, 1200][cleared]); }
    state.current.piece = null;
    if (modeRef.current === "auto") spawnRandom(); else deal();
  };
  const move = (dx: number, dy: number) => {
    const p = state.current.piece; if (!p) return false;
    if (!collide(p.shape, p.x + dx, p.y + dy)) { p.x += dx; p.y += dy; return true; }
    return false;
  };
  const rot = () => { const p = state.current.piece; if (!p) return; const r = rotate(p.shape); if (!collide(r, p.x, p.y)) p.shape = r; };
  const step = () => { if (!move(0, 1)) merge(); };
  const hardDrop = () => { if (!state.current.piece) return; while (move(0, 1)) { /* fall */ } merge(); };

  // explicit init: never leaves a stale piece when switching to pick.
  const initFor = (m: "auto" | "pick") => {
    state.current.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    state.current.piece = null;
    if (m === "auto") { putChoices(null); spawnRandom(); }
    else deal();
  };
  useEffect(() => { initFor(modeRef.current); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  useEffect(() => {
    const draw = () => {
      const cv = ref.current; if (!cv) return; const ctx = cv.getContext("2d")!;
      ctx.fillStyle = "#FFFBF4"; ctx.fillRect(0, 0, cv.width, cv.height);
      const { grid, piece } = state.current;
      const cell = (x: number, y: number, v: number) => {
        ctx.fillStyle = TET_COLORS[v]; ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
      };
      grid.forEach((row, y) => row.forEach((v, x) => { if (v) cell(x, y, v); }));
      if (piece) piece.shape.forEach((row, r) => row.forEach((v, c) => { if (v && piece.y + r >= 0) cell(piece.x + c, piece.y + r, v); }));
    };
    let raf = 0; let last = 0;
    const loop = (t: number) => {
      if (!over && !paused) {
        if (modeRef.current === "auto") { if (t - last > dropMs.current) { step(); last = t; } }
        else if (!state.current.piece && !choicesRef.current) { deal(); } // self-heal: always offer a choice
        draw();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onKey = (e: KeyboardEvent) => {
      if (over || paused || !state.current.piece) return;
      if (e.key === "ArrowLeft") move(-1, 0);
      else if (e.key === "ArrowRight") move(1, 0);
      else if (e.key === "ArrowDown") move(0, 1);
      else if (e.key === "ArrowUp") rot();
      else if (e.key === " " || e.key === "Enter") hardDrop();
      if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "].includes(e.key)) e.preventDefault();
    };
    window.addEventListener("keydown", onKey, { passive: false });
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over, paused, gen]);

  const reset = () => { setScore(0); setOver(false); setPaused(false); initFor(modeRef.current); setGen((g) => g + 1); };
  const chooseMode = (m: "auto" | "pick") => {
    if (m === mode) return;
    sfx.select();
    modeRef.current = m;
    setScore(0); setOver(false); setPaused(false);
    initFor(m);
    setMode(m); setGen((g) => g + 1);
  };

  const preview = (idx: number) => {
    const sh = SHAPES[idx];
    return (
      <span className="pick-grid" style={{ gridTemplateColumns: `repeat(${sh[0].length}, 13px)` }}>
        {sh.flatMap((row, r) => row.map((v, c) => (
          <span key={`${r}-${c}`} className="pick-cell" style={{ background: v ? TET_COLORS[v] : "transparent" }} />
        )))}
      </span>
    );
  };

  const placing = mode === "pick" && !!state.current.piece;
  return (
    <div className="tetris">
      <div className="seg" style={{ marginBottom: 10 }}>
        {(["auto", "pick"] as const).map((m) => (
          <button key={m} className={mode === m ? "on" : ""} aria-pressed={mode === m} onClick={() => chooseMode(m)}>
            {m === "auto" ? "⬇ Auto drop" : "✋ Pick blocks"}
          </button>
        ))}
      </div>
      <p className="cv-intro">Score: {score} {over ? "— Game over!" : ""} <span className="muted">{mode === "auto" ? "(arrows move & rotate, ▼ drops faster)" : placing ? "(place it: arrows move & rotate, ⤓ or Space drops)" : "(tap a block on the right to place it)"}</span></p>
      <div className="tetris-stage">
        <canvas ref={ref} width={COLS * CELL} height={ROWS * CELL} className="tetris-canvas" />
        <div className="tetris-speed">
          {mode === "auto" ? (
            <>
              <span className="dress-lbl">Speed</span>
              {(["slow", "normal", "fast"] as const).map((s) => (
                <button key={s} className={"speed-btn" + (speed === s ? " on" : "")} aria-pressed={speed === s} onClick={() => setSpd(s)}>
                  {s === "slow" ? "🐢 Slow" : s === "normal" ? "Normal" : "⚡ Fast"}
                </button>
              ))}
            </>
          ) : (
            <>
              <span className="dress-lbl">Choose a block</span>
              {choices && !over && !state.current.piece
                ? choices.map((idx, i) => (
                    <button key={i} className="pick-btn" onClick={() => pickShape(idx)} title="Place this block">{preview(idx)}</button>
                  ))
                : <span className="muted" style={{ fontSize: ".85rem" }}>{over ? "Game over" : "Placing…"}</span>}
            </>
          )}
        </div>
      </div>
      <div className="tetris-ctrl">
        <button className="round-btn" onClick={() => move(-1, 0)}>◀</button>
        <button className="round-btn" onClick={() => rot()}>🔄</button>
        <button className="round-btn" onClick={() => move(1, 0)}>▶</button>
        <button className="round-btn" onClick={() => step()}>▼</button>
        {mode === "pick" && <button className="round-btn" title="Drop to bottom" onClick={() => hardDrop()}>⤓</button>}
        {over ? <button className="btn btn-primary btn-sm" onClick={reset}>↻ Restart</button>
          : <button className="btn btn-ghost btn-sm" onClick={() => setPaused((p) => !p)}>{paused ? "Resume" : "Pause"}</button>}
      </div>
    </div>
  );
}

// ---------- Coloring book (tap regions to fill) ----------
// ---------- Coloring book: recognizable objects + thumbnail gallery ----------
type Shp =
  | { t: "c"; cx: number; cy: number; r: number }
  | { t: "e"; cx: number; cy: number; rx: number; ry: number }
  | { t: "r"; x: number; y: number; w: number; h: number; rx?: number }
  | { t: "pg"; pts: string }
  | { t: "pa"; d: string };
type CPage = { name: string; emoji: string; group: string; vb: string; regions: Shp[] };
const c = (cx: number, cy: number, r: number): Shp => ({ t: "c", cx, cy, r });
const e = (cx: number, cy: number, rx: number, ry: number): Shp => ({ t: "e", cx, cy, rx, ry });
const rr = (x: number, y: number, w: number, h: number, rx = 0): Shp => ({ t: "r", x, y, w, h, rx });
const pg = (pts: string): Shp => ({ t: "pg", pts });
const pa = (d: string): Shp => ({ t: "pa", d });

function Shape({ s, fill, onClick }: { s: Shp; fill: string; onClick?: () => void }) {
  const p = { fill, stroke: "#2C2A4A", strokeWidth: 2.4, strokeLinejoin: "round" as const, onClick, style: onClick ? { cursor: "pointer" } : undefined };
  if (s.t === "c") return <circle cx={s.cx} cy={s.cy} r={s.r} {...p} />;
  if (s.t === "e") return <ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...p} />;
  if (s.t === "r") return <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} {...p} />;
  if (s.t === "pg") return <polygon points={s.pts} {...p} />;
  return <path d={s.d} {...p} />;
}

const OBJECTS: CPage[] = [
  { name: "House", emoji: "🏠", group: "Objects", vb: "0 0 240 240", regions: [
    c(202, 46, 18), rr(150, 70, 16, 36), rr(56, 112, 128, 94), pg("120,50 194,116 46,116"),
    rr(74, 128, 26, 26, 2), rr(140, 128, 26, 26, 2), rr(104, 152, 32, 54, 4), c(128, 182, 3) ] },
  { name: "Unicorn", emoji: "🦄", group: "Objects", vb: "0 0 240 240", regions: [
    e(118, 142, 56, 50), pg("92,98 108,62 122,100"), pg("120,42 132,100 108,100"),
    e(70, 122, 18, 30), e(78, 162, 16, 26), e(64, 96, 12, 16), c(138, 140, 7), e(160, 162, 6, 8) ] },
  { name: "Cat", emoji: "🐱", group: "Objects", vb: "0 0 240 240", regions: [
    pg("82,80 70,40 106,68"), pg("158,80 170,40 134,68"), c(120, 112, 52), e(120, 184, 46, 40),
    c(102, 110, 7), c(138, 110, 7), pg("114,124 126,124 120,134"), e(90, 204, 15, 11), e(150, 204, 15, 11),
    pa("M166 184 q40 -8 28 32") ] },
  { name: "Fish", emoji: "🐟", group: "Objects", vb: "0 0 240 240", regions: [
    e(108, 124, 64, 42), pg("168,124 214,92 214,156"), pg("98,82 130,104 78,104"),
    pg("98,166 130,144 78,144"), c(78, 116, 9), c(46, 84, 7), c(34, 106, 6), c(126, 110, 5) ] },
  { name: "Butterfly", emoji: "🦋", group: "Objects", vb: "0 0 240 240", regions: [
    e(80, 100, 36, 32), e(160, 100, 36, 32), e(86, 152, 28, 26), e(154, 152, 28, 26),
    rr(115, 78, 10, 96, 5), c(120, 74, 9), c(92, 98, 7), c(148, 98, 7), c(92, 150, 6), c(148, 150, 6) ] },
  { name: "Flower", emoji: "🌸", group: "Objects", vb: "0 0 240 240", regions: [
    e(120, 72, 20, 16), e(168, 96, 20, 16), e(158, 142, 20, 16), e(82, 142, 20, 16), e(72, 96, 20, 16),
    rr(115, 110, 10, 96, 4), e(92, 160, 22, 11), e(150, 176, 22, 11), c(120, 110, 20) ] },
  { name: "Car", emoji: "🚗", group: "Objects", vb: "0 0 240 240", regions: [
    pa("M70 122 L92 90 L156 90 L180 122 Z"), rr(38, 120, 164, 48, 14), rr(96, 96, 28, 24, 3),
    rr(130, 96, 28, 24, 3), c(80, 172, 18), c(168, 172, 18), c(80, 172, 7), c(168, 172, 7), c(198, 138, 6) ] },
  { name: "Rocket", emoji: "🚀", group: "Objects", vb: "0 0 240 240", regions: [
    rr(100, 66, 40, 112, 18), pg("100,66 120,28 140,66"), c(120, 106, 13),
    pg("100,150 70,202 100,180"), pg("140,150 170,202 140,180"), pg("106,180 134,180 120,216") ] },
  { name: "Robot", emoji: "🤖", group: "Objects", vb: "0 0 240 240", regions: [
    rr(112, 34, 10, 22, 4), c(117, 32, 7), rr(74, 56, 92, 62, 14), c(102, 86, 10), c(140, 86, 10),
    rr(68, 122, 104, 80, 14), c(120, 148, 8), c(120, 176, 8), rr(46, 130, 20, 54, 9),
    rr(174, 130, 20, 54, 9), rr(84, 202, 26, 28, 7), rr(132, 202, 26, 28, 7) ] },
  { name: "Ice cream", emoji: "🍦", group: "Objects", vb: "0 0 240 240", regions: [
    pg("88,150 152,150 120,224"), c(104, 130, 27), c(136, 130, 27), c(120, 106, 29), c(120, 82, 9) ] },
  { name: "Train", emoji: "🚂", group: "Objects", vb: "0 0 240 240", regions: [
    rr(48, 110, 120, 62, 10), rr(150, 78, 42, 52, 8), rr(60, 78, 22, 36, 4), c(70, 66, 11), c(88, 56, 8),
    rr(96, 122, 30, 28, 3), c(78, 182, 17), c(132, 182, 17), c(176, 182, 14) ] },
  { name: "Clown", emoji: "🤡", group: "Objects", vb: "0 0 240 240", regions: [
    pg("78,82 120,40 162,82"), rr(78, 80, 84, 10, 4), c(76, 124, 24), c(164, 124, 24), c(120, 132, 54),
    c(120, 152, 13), c(102, 120, 8), c(138, 120, 8), pa("M96 150 q24 28 48 0"), pg("84,184 156,184 120,210") ] },
  { name: "Owl", emoji: "🦉", group: "Objects", vb: "0 0 240 240", regions: [
    e(120, 132, 52, 62), c(100, 110, 21), c(140, 110, 21), c(100, 110, 8), c(140, 110, 8),
    pg("112,122 128,122 120,138"), pa("M70 132 q-16 40 12 72"), pa("M170 132 q16 40 -12 72"),
    pg("102,190 118,190 110,206"), pg("122,190 138,190 130,206") ] },
  { name: "Sun & cloud", emoji: "🌤️", group: "Objects", vb: "0 0 240 240", regions: [
    c(96, 96, 34), pg("96,40 104,62 96,58 88,62"), pg("150,96 128,104 132,96 128,88"),
    pg("96,152 88,130 96,134 104,130"), pg("42,96 64,88 60,96 64,104"),
    e(150, 160, 44, 26), e(116, 156, 26, 20), e(184, 156, 24, 18) ] },
];

const _OBJCAT: Record<string, string> = { House: "Things", Unicorn: "Fantasy", Cat: "Animals", Fish: "Animals", Butterfly: "Animals", Flower: "Nature", Car: "Vehicles", Rocket: "Vehicles", Robot: "Fantasy", "Ice cream": "Food", Train: "Vehicles", Clown: "Fantasy", Owl: "Animals", "Sun & cloud": "Nature" };
OBJECTS.forEach((o) => { o.group = _OBJCAT[o.name] || "Things"; });
OBJECTS.push(
  { name: "Apple", emoji: "🍎", group: "Food", vb: "0 0 240 240", regions: [e(120, 140, 56, 58), rr(116, 70, 8, 28, 3), pg("128,80 162,62 150,94"), c(100, 120, 8)] },
  { name: "Cupcake", emoji: "🧁", group: "Food", vb: "0 0 240 240", regions: [pg("80,150 160,150 148,212 92,212"), rr(92, 150, 56, 8), e(120, 132, 52, 30), c(96, 122, 22), c(144, 122, 22), c(120, 110, 24), c(120, 92, 9)] },
  { name: "Bird", emoji: "🐦", group: "Animals", vb: "0 0 240 240", regions: [pg("74,140 50,126 60,158"), e(118, 140, 46, 36), pa("M92 138 q28 -12 50 6 q-26 16 -50 -6 z"), c(152, 108, 26), pg("176,104 198,110 176,118"), c(158, 102, 5), rr(108, 174, 4, 18), rr(128, 174, 4, 18)] },
  { name: "Bee", emoji: "🐝", group: "Animals", vb: "0 0 240 240", regions: [e(98, 98, 20, 14), e(142, 98, 20, 14), e(122, 132, 50, 32), rr(110, 104, 12, 56, 4), rr(132, 104, 12, 56, 4), c(78, 132, 18), pg("172,132 192,126 192,138")] },
  { name: "Ladybug", emoji: "🐞", group: "Animals", vb: "0 0 240 240", regions: [c(120, 134, 52), c(120, 86, 22), rr(116, 94, 8, 86, 2), c(98, 120, 9), c(142, 120, 9), c(100, 156, 9), c(140, 156, 9)] },
  { name: "Snail", emoji: "🐌", group: "Animals", vb: "0 0 240 240", regions: [pa("M36 174 q0 -22 30 -22 l78 0 q12 0 12 12 l0 8 q0 8 -10 8 l-100 0 z"), c(140, 130, 46), c(140, 130, 30), c(140, 130, 14), rr(50, 116, 4, 36, 2), c(50, 114, 6)] },
  { name: "Boat", emoji: "⛵", group: "Vehicles", vb: "0 0 240 240", regions: [pa("M48 160 L192 160 L172 198 L68 198 Z"), rr(116, 66, 5, 96, 2), pg("120,72 120,156 62,156"), pg("121,70 146,80 121,90")] },
  { name: "Plane", emoji: "✈️", group: "Vehicles", vb: "0 0 240 240", regions: [e(120, 128, 72, 20), pg("100,124 140,124 156,168 84,168"), pg("96,124 128,124 138,96 110,96"), pg("182,126 202,102 198,128"), c(72, 128, 5), c(94, 128, 5), c(116, 128, 5)] },
  { name: "Tree", emoji: "🌳", group: "Nature", vb: "0 0 240 240", regions: [rr(110, 150, 20, 58, 4), c(86, 126, 34), c(154, 126, 34), c(120, 104, 48)] },
  { name: "Crown", emoji: "👑", group: "Fantasy", vb: "0 0 240 240", regions: [pg("64,152 64,94 92,130 120,88 148,130 176,94 176,152"), rr(64, 150, 112, 28, 4), c(92, 120, 7), c(120, 108, 8), c(148, 120, 7)] },
  { name: "Balloon", emoji: "🎈", group: "Things", vb: "0 0 240 240", regions: [e(120, 106, 46, 54), pg("113,158 127,158 120,172"), pa("M120 172 q16 28 -6 54 q-2 4 2 6")] },
  { name: "Gift", emoji: "🎁", group: "Things", vb: "0 0 240 240", regions: [rr(64, 120, 112, 88, 4), rr(56, 100, 128, 26, 4), rr(112, 100, 16, 108, 2), c(104, 90, 13), c(136, 90, 13)] },
  { name: "Star", emoji: "⭐", group: "Things", vb: "0 0 240 240", regions: [pg("120,44 138,98 196,98 149,132 167,188 120,154 73,188 91,132 44,98 102,98")] },
);

const TAU = Math.PI * 2;
const _P = (cx: number, cy: number, r: number, a: number) => `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
function _ann(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const lg = (a1 - a0) > Math.PI ? 1 : 0;
  if (r0 <= 0.6) return `M ${cx} ${cy} L ${_P(cx, cy, r1, a0)} A ${r1} ${r1} 0 ${lg} 1 ${_P(cx, cy, r1, a1)} Z`;
  return `M ${_P(cx, cy, r1, a0)} A ${r1} ${r1} 0 ${lg} 1 ${_P(cx, cy, r1, a1)} L ${_P(cx, cy, r0, a1)} A ${r0} ${r0} 0 ${lg} 0 ${_P(cx, cy, r0, a0)} Z`;
}
function _mandala(rings: number, sectors: number): Shp[] {
  const out: Shp[] = [];
  for (let r = 0; r < rings; r++) {
    const r0 = (118 / rings) * r, r1 = (118 / rings) * (r + 1), off = (r % 2) ? (TAU / sectors) / 2 : 0;
    for (let s = 0; s < sectors; s++) out.push(pa(_ann(120, 120, r0, r1, TAU / sectors * s + off, TAU / sectors * (s + 1) + off)));
  }
  return out;
}
function _mosaic(n: number): Shp[] {
  const out: Shp[] = [], s = 240 / n;
  for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) {
    const x = col * s, y = r * s;
    if ((r + col) % 2 === 0) { out.push(pa(`M${x} ${y}L${x + s} ${y}L${x} ${y + s}Z`)); out.push(pa(`M${x + s} ${y}L${x + s} ${y + s}L${x} ${y + s}Z`)); }
    else { out.push(pa(`M${x} ${y}L${x + s} ${y}L${x + s} ${y + s}Z`)); out.push(pa(`M${x} ${y}L${x + s} ${y + s}L${x} ${y + s}Z`)); }
  }
  return out;
}
const PATTERNS: CPage[] = (() => {
  const out: CPage[] = []; let i = 1;
  for (const [ri, se] of [[5, 12], [6, 16], [7, 18], [8, 16], [6, 20], [8, 24], [5, 16], [7, 24], [9, 18], [6, 12], [8, 20], [4, 16]] as [number, number][])
    out.push({ name: `Mandala ${i++}`, emoji: "❄️", group: "Patterns", vb: "0 0 240 240", regions: _mandala(ri, se) });
  let j = 1;
  for (const n of [6, 7, 8, 9, 10]) out.push({ name: `Mosaic ${j++}`, emoji: "🔷", group: "Patterns", vb: "0 0 240 240", regions: _mosaic(n) });
  return out;
})();
const COLOR_PALETTE = ["#FF7A66", "#F2563D", "#FFC94D", "#FFB703", "#FF9F1C", "#5BBF8A", "#2EC4B6", "#118AB2",
  "#5AA7E6", "#4C7AE0", "#9B6DD6", "#C45CB0", "#FF7AA8", "#E0699B", "#9C6B3F", "#6B4226", "#2C2A4A", "#7A7A7A", "#000000", "#FFFFFF"];

type ColPage = { name: string; emoji: string; group: string; cols: number; rows: number; cells: CPage[] };
const _CAT_ORDER = ["Animals", "Food", "Vehicles", "Nature", "Fantasy", "Things"];
function buildCollages(): ColPage[] {
  const out: ColPage[] = [];
  for (const cat of _CAT_ORDER) {
    const objs = OBJECTS.filter((o) => o.group === cat);
    if (!objs.length) continue;
    const n = Math.max(12, objs.length);
    const cells: CPage[] = []; for (let i = 0; i < n; i++) cells.push(objs[i % objs.length]);
    out.push({ name: cat, emoji: objs[0].emoji, group: "Colouring sheets", cols: 4, rows: Math.ceil(cells.length / 4), cells });
  }
  const all = OBJECTS.slice();
  out.push({ name: "Everything", emoji: "🎨", group: "Colouring sheets", cols: 5, rows: Math.ceil(all.length / 5), cells: all });
  for (const p of PATTERNS) out.push({ name: p.name, emoji: p.emoji, group: "Patterns", cols: 1, rows: 1, cells: [p] });
  return out;
}
const COL_PAGES = buildCollages();

// Paint-over colouring for uploaded raster line-art (multiply keeps the black lines).
function ImageColor({ src }: { src: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState("#FF7A66");
  const [size, setSize] = useState(16);
  const redraw = () => {
    const cv = ref.current, img = imgRef.current; if (!cv || !img) return;
    const ctx = cv.getContext("2d")!; ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
  };
  useEffect(() => {
    const img = new Image(); img.crossOrigin = "anonymous";
    img.onload = () => { const cv = ref.current!; const W = 540; const sc = W / img.width; cv.width = W; cv.height = Math.round(img.height * sc); imgRef.current = img; redraw(); };
    img.src = src;
  }, [src]);
  const pos = (e: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect(); return { x: (e.clientX - r.left) * (ref.current!.width / r.width), y: (e.clientY - r.top) * (ref.current!.height / r.height) }; };
  const down = (e: React.PointerEvent) => { drawing.current = true; last.current = pos(e); (e.target as HTMLElement).setPointerCapture(e.pointerId); };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return; const ctx = ref.current!.getContext("2d")!; const p = pos(e);
    ctx.globalCompositeOperation = "multiply"; ctx.strokeStyle = color; ctx.lineWidth = size; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(last.current!.x, last.current!.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last.current = p;
  };
  const up = () => { drawing.current = false; last.current = null; };
  return (
    <div>
      <div className="paint-bar">
        {COLOR_PALETTE.map((cc) => <button key={cc} className={"swatch" + (color === cc ? " on" : "")} style={{ background: cc }} onClick={() => setColor(cc)} />)}
      </div>
      <div className="paint-bar">
        <span className="dress-lbl">Brush</span>
        {[8, 16, 28, 44].map((s) => <button key={s} className={"pill" + (size === s ? " on" : "")} aria-pressed={size === s} onClick={() => setSize(s)}>{s <= 8 ? "S" : s <= 16 ? "M" : s <= 28 ? "L" : "XL"}</button>)}
        <button className="btn btn-ghost btn-sm" onClick={redraw}>🗑️ Clear</button>
      </div>
      <canvas ref={ref} className="coloring-svg" style={{ touchAction: "none", width: "100%", maxWidth: 540 }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} />
    </div>
  );
}

// Uploaded search & find: show the image + a tick-off checklist of items to find.
function ImageFind({ src, items }: { src: string; items: string[] }) {
  const [found, setFound] = useState<string[]>([]);
  const toggle = (it: string) => setFound((f) => f.includes(it) ? f.filter((x) => x !== it) : [...f, it]);
  const won = items.length > 0 && found.length === items.length;
  return (
    <div>
      <p className="cv-intro">Find each thing in the picture, then tick it off! {won ? "🎉 You found them all!" : `Found ${found.length}/${items.length}`}</p>
      <div className="sf-wrap">
        <div className="sf-scene-img"><img src={src} alt="search and find" /></div>
        <div className="sf-list">
          {items.map((it) => (
            <button key={it} className={"sf-item" + (found.includes(it) ? " done" : "")} onClick={() => toggle(it)}>
              <span className="sf-box">{found.includes(it) ? "✅" : "⬜"}</span><span>{it}</span>
            </button>
          ))}
          {items.length === 0 && <span className="muted">No item list was set for this picture.</span>}
        </div>
      </div>
    </div>
  );
}

function ColoringBook() {
  const [view, setView] = useState<"gallery" | "page">("gallery");
  const [pic, setPic] = useState(0);
  const [color, setColor] = useState("#FF7A66");
  const [fills, setFills] = useState<Record<string, string>>({});
  const [uploads, setUploads] = useState<WorkbenchAsset[]>([]);
  const [upload, setUpload] = useState<WorkbenchAsset | null>(null);
  useEffect(() => { api.workbenchAssets("coloring").then((r) => setUploads(r.assets)).catch(() => {}); }, []);
  const open = (i: number) => { setPic(i); setUpload(null); setFills({}); setView("page"); };
  const openUpload = (a: WorkbenchAsset) => { setUpload(a); setView("page"); };
  const CELL = 220;
  const renderCollage = (pg: ColPage, interactive: boolean) => (
    <svg viewBox={`0 0 ${pg.cols * CELL} ${pg.rows * CELL}`} className={interactive ? "coloring-svg" : undefined}>
      {pg.cells.map((obj, ci) => {
        const col = ci % pg.cols, row = Math.floor(ci / pg.cols);
        const sc = (CELL - 16) / 240, dx = col * CELL + 8, dy = row * CELL + 8;
        return (
          <g key={ci} transform={`translate(${dx} ${dy}) scale(${sc})`}>
            {obj.regions.map((s, ri) => {
              const key = ci + "-" + ri;
              return <Shape key={ri} s={s} fill={fills[key] || "#fff"} onClick={interactive ? () => setFills((f) => ({ ...f, [key]: color })) : undefined} />;
            })}
          </g>
        );
      })}
    </svg>
  );
  if (view === "gallery") {
    return (
      <div>
        <p className="cv-intro">Pick a sheet to colour — each one is packed with pictures! {COL_PAGES.length} sheets.</p>
        {["Colouring sheets", "Patterns"].map((grp) => (
          <div key={grp}>
            <span className="dress-lbl">{grp}</span>
            <div className="color-gallery">
              {COL_PAGES.map((p, i) => p.group === grp && (
                <button key={i} className="color-thumb" onClick={() => open(i)} title={p.name}>
                  {renderCollage(p, false)}<span>{p.emoji} {p.name}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {uploads.length > 0 && (
          <div>
            <span className="dress-lbl">Illustrations</span>
            <div className="color-gallery">
              {uploads.map((a) => (
                <button key={a.id} className="color-thumb" onClick={() => openUpload(a)} title={a.name}>
                  <img src={api.workbenchImageUrl(a.id)} alt={a.name} style={{ width: "100%", height: 74, objectFit: "contain" }} />
                  <span>🖼️ {a.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  if (upload) {
    return (
      <div>
        <div className="paint-bar"><button className="btn btn-ghost btn-sm" onClick={() => { setUpload(null); setView("gallery"); }}>← All sheets</button><b>🖼️ {upload.name}</b></div>
        <ImageColor src={api.workbenchImageUrl(upload.id)} />
      </div>
    );
  }
  const page = COL_PAGES[pic];
  return (
    <div>
      <div className="paint-bar"><button className="btn btn-ghost btn-sm" onClick={() => setView("gallery")}>← All sheets</button><b>{page.emoji} {page.name}</b></div>
      <div className="paint-bar">{COLOR_PALETTE.map((cc) => <button key={cc} className={"swatch" + (color === cc ? " on" : "")} style={{ background: cc }} onClick={() => setColor(cc)} />)}</div>
      <div className="coloring-scroll">{renderCollage(page, true)}</div>
      <div className="paint-bar">
        <button className="round-btn small" onClick={() => open((pic - 1 + COL_PAGES.length) % COL_PAGES.length)}>◀</button>
        <button className="round-btn small" onClick={() => open((pic + 1) % COL_PAGES.length)}>▶</button>
        <button className="btn btn-ghost btn-sm" onClick={() => setFills({})}>🗑️ Clear</button>
      </div>
    </div>
  );
}

// ---------- Dress-up (cute chibi) ----------
const SKINS = ["#F7D7B0", "#F2C79B", "#E0A878", "#C68642", "#8D5524", "#5C3A21"];
const HAIRC = ["#2C2118", "#5A3A22", "#8B5A2B", "#C9962B", "#D94F3D", "#9B6DD6", "#E8E2D0"];
const CLOTH = ["#FF7A66", "#FFC94D", "#5BBF8A", "#2EC4B6", "#5AA7E6", "#9B6DD6", "#FF7AA8", "#2C2A4A", "#FFFFFF"];
function DressUp() {
  const [skin, setSkin] = useState(SKINS[1]);
  const [hairColor, setHairColor] = useState(HAIRC[1]);
  const [hair, setHair] = useState("long");
  const [top, setTop] = useState("dress");
  const [topColor, setTopColor] = useState("#FF7AA8");
  const [bottom, setBottom] = useState("skirt");
  const [botColor, setBotColor] = useState("#5AA7E6");
  const [shoeColor, setShoeColor] = useState("#F2563D");
  const [hat, setHat] = useState("");
  const [glasses, setGlasses] = useState("");
  const [acc, setAcc] = useState("");
  const isDress = top === "dress";
  const surprise = () => {
    const r = (a: string[]) => a[Math.floor(Math.random() * a.length)];
    setSkin(r(SKINS)); setHairColor(r(HAIRC)); setHair(r(["long", "short", "curly", "bun"]));
    setTop(r(["tshirt", "jumper", "dress", "tank"])); setTopColor(r(CLOTH)); setBottom(r(["skirt", "trousers", "shorts"]));
    setBotColor(r(CLOTH)); setShoeColor(r(CLOTH)); setHat(r(["", "🎩", "👑", "🧢", "🎀"]));
    setGlasses(r(["", "👓", "🕶️"])); setAcc(r(["", "🎈", "🧸", "🌸", "🪄"]));
  };
  return (
    <div className="dressup">
      <svg viewBox="0 0 240 320" className="doll">
        {/* hair back */}
        {(hair === "long" || hair === "curly") && <path d="M58 78 Q52 200 78 215 L162 215 Q188 200 182 78 Z" fill={hairColor} />}
        {/* legs */}
        <rect x="98" y="226" width="18" height="62" rx="9" fill={skin} />
        <rect x="124" y="226" width="18" height="62" rx="9" fill={skin} />
        {/* shoes */}
        <ellipse cx="107" cy="294" rx="17" ry="12" fill={shoeColor} />
        <ellipse cx="133" cy="294" rx="17" ry="12" fill={shoeColor} />
        {/* arms */}
        <rect x="66" y="150" width="18" height="64" rx="9" fill={skin} />
        <rect x="156" y="150" width="18" height="64" rx="9" fill={skin} />
        {/* torso */}
        <rect x="84" y="150" width="72" height="86" rx="20" fill={skin} />
        {/* bottoms (hidden by dress) */}
        {!isDress && bottom === "skirt" && <path d="M84 210 H156 L172 262 Q120 276 68 262 Z" fill={botColor} />}
        {!isDress && bottom === "trousers" && <><rect x="94" y="210" width="22" height="80" rx="8" fill={botColor} /><rect x="124" y="210" width="22" height="80" rx="8" fill={botColor} /></>}
        {!isDress && bottom === "shorts" && <><rect x="94" y="210" width="22" height="44" rx="8" fill={botColor} /><rect x="124" y="210" width="22" height="44" rx="8" fill={botColor} /></>}
        {/* tops */}
        {isDress && <path d="M84 150 H156 L184 264 Q120 282 56 264 Z" fill={topColor} />}
        {top === "tshirt" && <><rect x="80" y="150" width="80" height="74" rx="16" fill={topColor} /><rect x="62" y="150" width="26" height="34" rx="12" fill={topColor} /><rect x="152" y="150" width="26" height="34" rx="12" fill={topColor} /></>}
        {top === "tank" && <rect x="88" y="152" width="64" height="70" rx="14" fill={topColor} />}
        {top === "jumper" && <><rect x="76" y="148" width="88" height="84" rx="18" fill={topColor} /><rect x="58" y="150" width="28" height="46" rx="14" fill={topColor} /><rect x="154" y="150" width="28" height="46" rx="14" fill={topColor} /></>}
        {/* head */}
        <circle cx="120" cy="92" r="56" fill={skin} />
        {/* cheeks */}
        <circle cx="92" cy="104" r="9" fill="#FF9D8A" opacity="0.55" />
        <circle cx="148" cy="104" r="9" fill="#FF9D8A" opacity="0.55" />
        {/* eyes */}
        <circle cx="100" cy="88" r="8" fill="#2C2A4A" /><circle cx="140" cy="88" r="8" fill="#2C2A4A" />
        <circle cx="102.5" cy="85" r="2.6" fill="#fff" /><circle cx="142.5" cy="85" r="2.6" fill="#fff" />
        {/* smile */}
        <path d="M104 112 Q120 126 136 112" stroke="#2C2A4A" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        {/* hair front */}
        {hair === "short" && <path d="M64 84 Q120 28 176 84 Q160 60 120 58 Q80 60 64 84 Z" fill={hairColor} />}
        {hair === "long" && <path d="M62 86 Q120 24 178 86 Q158 54 120 52 Q82 54 62 86 Z" fill={hairColor} />}
        {hair === "curly" && <path d="M60 88 a18 18 0 0 1 18 -24 a20 20 0 0 1 84 0 a18 18 0 0 1 18 24 Q160 60 120 58 Q80 60 60 88 Z" fill={hairColor} />}
        {hair === "bun" && <><circle cx="120" cy="40" r="16" fill={hairColor} /><path d="M64 84 Q120 40 176 84 Q160 60 120 58 Q80 60 64 84 Z" fill={hairColor} /></>}
        {/* accessories — sized + placed properly */}
        {glasses && <text x="120" y="92" fontSize="40" textAnchor="middle" dominantBaseline="middle">{glasses}</text>}
        {hat && <text x="120" y="44" fontSize="56" textAnchor="middle" dominantBaseline="middle">{hat}</text>}
        {acc && <text x="176" y="196" fontSize="44" textAnchor="middle" dominantBaseline="middle">{acc}</text>}
      </svg>
      <div className="dress-panel">
        <DChips label="Hair" opts={["short", "long", "curly", "bun"]} val={hair} on={setHair} />
        <DSw label="Hair colour" arr={HAIRC} val={hairColor} on={setHairColor} />
        <DSw label="Skin" arr={SKINS} val={skin} on={setSkin} />
        <DChips label="Top" opts={["tshirt", "tank", "jumper", "dress"]} val={top} on={setTop} />
        <DSw label="Top colour" arr={CLOTH} val={topColor} on={setTopColor} />
        {!isDress && <DChips label="Bottom" opts={["skirt", "trousers", "shorts"]} val={bottom} on={setBottom} />}
        {!isDress && <DSw label="Bottom colour" arr={CLOTH} val={botColor} on={setBotColor} />}
        <DSw label="Shoes" arr={CLOTH} val={shoeColor} on={setShoeColor} />
        <DEmoji label="Hat" opts={["", "🎩", "👑", "🧢", "🎀", "⛑️"]} val={hat} on={setHat} />
        <DEmoji label="Glasses" opts={["", "👓", "🕶️"]} val={glasses} on={setGlasses} />
        <DEmoji label="Holding" opts={["", "🎈", "👜", "🪄", "🧸", "🌸"]} val={acc} on={setAcc} />
        <div className="cta-wrap"><button className="btn btn-primary btn-sm" onClick={surprise}>🎲 Surprise outfit</button></div>
      </div>
    </div>
  );
}
function DChips({ label, opts, val, on }: { label: string; opts: string[]; val: string; on: (v: string) => void }) {
  return <div className="dress-row"><span className="dress-lbl">{label}</span><div className="pills">{opts.map((o) => <button key={o} className="pill" aria-pressed={val === o} onClick={() => on(o)}>{o}</button>)}</div></div>;
}
function DEmoji({ label, opts, val, on }: { label: string; opts: string[]; val: string; on: (v: string) => void }) {
  return <div className="dress-row"><span className="dress-lbl">{label}</span><div className="pills">{opts.map((o) => <button key={o || "none"} className={"tool-btn" + (val === o ? " on" : "")} onClick={() => on(o)}>{o || "🚫"}</button>)}</div></div>;
}
function DSw({ label, arr, val, on }: { label: string; arr: string[]; val: string; on: (v: string) => void }) {
  return <div className="dress-row"><span className="dress-lbl">{label}</span><div className="paint-bar">{arr.map((cc) => <button key={cc} className={"swatch" + (val === cc ? " on" : "")} style={{ background: cc }} onClick={() => on(cc)} />)}</div></div>;
}

// ---------- House builder (clean rooms + suggest guides) ----------
const ROOMS: Record<string, { label: string; wall: string; floor: string; seam: string }> = {
  living: { label: "Living room", wall: "#EAF2FB", floor: "#E7D2B4", seam: "#C9A876" },
  bedroom: { label: "Bedroom", wall: "#F3E8FB", floor: "#E7D2B4", seam: "#C9A876" },
  kitchen: { label: "Kitchen", wall: "#E8F7F0", floor: "#DCC6A8", seam: "#BCA079" },
  garden: { label: "Garden", wall: "#D7EEFF", floor: "#BFE3A8", seam: "#8FBE76" },
};
const ARRANGE: Record<string, { e: string; x: number; y: number }[][]> = {
  living: [
    [{ e: "🛋️", x: 30, y: 72 }, { e: "📺", x: 30, y: 30 }, { e: "🪴", x: 78, y: 70 }, { e: "🖼️", x: 70, y: 26 }],
    [{ e: "🛋️", x: 55, y: 74 }, { e: "🪑", x: 22, y: 70 }, { e: "📺", x: 80, y: 32 }, { e: "🕯️", x: 50, y: 40 }],
    [{ e: "🪑", x: 30, y: 72 }, { e: "🪑", x: 60, y: 72 }, { e: "🪴", x: 85, y: 70 }, { e: "🖼️", x: 45, y: 24 }],
    [{ e: "🛋️", x: 40, y: 76 }, { e: "🪴", x: 14, y: 72 }, { e: "🪴", x: 86, y: 72 }, { e: "📺", x: 50, y: 28 }],
    [{ e: "🛋️", x: 28, y: 70 }, { e: "🛋️", x: 70, y: 70 }, { e: "🕯️", x: 50, y: 42 }, { e: "🖼️", x: 50, y: 22 }],
  ],
  bedroom: [
    [{ e: "🛏️", x: 32, y: 70 }, { e: "🪟", x: 70, y: 28 }, { e: "🪴", x: 82, y: 70 }, { e: "🖼️", x: 30, y: 26 }],
    [{ e: "🛏️", x: 60, y: 72 }, { e: "🕯️", x: 24, y: 66 }, { e: "🪞", x: 84, y: 60 }, { e: "🖼️", x: 50, y: 24 }],
    [{ e: "🛏️", x: 40, y: 74 }, { e: "🧸", x: 70, y: 74 }, { e: "🪟", x: 50, y: 26 }, { e: "🪴", x: 16, y: 70 }],
    [{ e: "🛏️", x: 28, y: 72 }, { e: "🪑", x: 66, y: 70 }, { e: "🪟", x: 80, y: 28 }, { e: "🕯️", x: 20, y: 60 }],
    [{ e: "🛏️", x: 50, y: 74 }, { e: "🧸", x: 22, y: 74 }, { e: "🪴", x: 80, y: 72 }, { e: "🖼️", x: 50, y: 22 }],
  ],
  kitchen: [
    [{ e: "🧊", x: 22, y: 64 }, { e: "🍳", x: 50, y: 66 }, { e: "🍽️", x: 76, y: 72 }, { e: "🪟", x: 78, y: 26 }],
    [{ e: "🍽️", x: 50, y: 72 }, { e: "🪑", x: 30, y: 70 }, { e: "🪑", x: 70, y: 70 }, { e: "🫖", x: 50, y: 50 }],
    [{ e: "🧊", x: 80, y: 64 }, { e: "🍳", x: 30, y: 66 }, { e: "☕", x: 52, y: 56 }, { e: "🪟", x: 50, y: 26 }],
    [{ e: "🍽️", x: 30, y: 72 }, { e: "🍽️", x: 64, y: 72 }, { e: "🫖", x: 84, y: 60 }, { e: "🪴", x: 16, y: 66 }],
    [{ e: "🍳", x: 24, y: 66 }, { e: "🧊", x: 76, y: 64 }, { e: "🥣", x: 50, y: 72 }, { e: "🪟", x: 50, y: 24 }],
  ],
  garden: [
    [{ e: "🌳", x: 24, y: 56 }, { e: "🌸", x: 60, y: 76 }, { e: "🪴", x: 80, y: 72 }, { e: "☀️", x: 80, y: 22 }],
    [{ e: "🌳", x: 78, y: 56 }, { e: "🪑", x: 30, y: 74 }, { e: "🐕", x: 55, y: 78 }, { e: "🌸", x: 18, y: 76 }],
    [{ e: "🌳", x: 50, y: 52 }, { e: "🌸", x: 24, y: 78 }, { e: "🌸", x: 76, y: 78 }, { e: "🦜", x: 60, y: 30 }],
    [{ e: "🌳", x: 20, y: 56 }, { e: "🌳", x: 80, y: 56 }, { e: "⚽", x: 50, y: 80 }, { e: "🐈", x: 35, y: 78 }],
    [{ e: "🪴", x: 30, y: 74 }, { e: "🌸", x: 55, y: 76 }, { e: "🦜", x: 75, y: 34 }, { e: "☀️", x: 22, y: 22 }],
  ],
};
const HOUSE_ITEMS: [string, string[]][] = [
  ["Furniture", ["🛋️", "🪑", "🛏️", "🚪", "🪟", "🖼️", "🪴", "🛁", "🚽", "🪞", "🕯️", "📺"]],
  ["Kitchen", ["🍽️", "🍳", "☕", "🧊", "🥣", "🫖"]],
  ["People", ["👩", "👨", "🧒", "👶", "👵", "👴"]],
  ["Pets", ["🐕", "🐈", "🐠", "🐰", "🐹", "🦜"]],
  ["Fun", ["🧸", "⚽", "🎈", "🪀", "🎨", "📚", "🌟", "🪁"]],
];
function HouseBuilder() {
  const [room, setRoom] = useState("living");
  const [items, setItems] = useState<{ id: number; e: string; x: number; y: number }[]>([]);
  const [sugg, setSugg] = useState(-1);
  const idRef = useRef(0);
  const drag = useRef<{ id: number; dx: number; dy: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const add = (ej: string) => setItems((i) => [...i, { id: idRef.current++, e: ej, x: 44 + Math.random() * 30, y: 60 + Math.random() * 16 }]);
  const onDown = (ev: React.PointerEvent, id: number) => {
    const it = items.find((t) => t.id === id); if (!it) return;
    const r = wrapRef.current!.getBoundingClientRect();
    drag.current = { id, dx: ev.clientX - r.left - (it.x / 100) * r.width, dy: ev.clientY - r.top - (it.y / 100) * r.height };
    (ev.target as HTMLElement).setPointerCapture(ev.pointerId);
  };
  const onMove = (ev: React.PointerEvent) => {
    if (!drag.current) return; const r = wrapRef.current!.getBoundingClientRect();
    const x = ((ev.clientX - r.left - drag.current.dx) / r.width) * 100;
    const y = ((ev.clientY - r.top - drag.current.dy) / r.height) * 100;
    setItems((arr) => arr.map((t) => t.id === drag.current!.id ? { ...t, x: Math.max(0, Math.min(94, x)), y: Math.max(0, Math.min(92, y)) } : t));
  };
  const onUp = () => { drag.current = null; };
  const rm = ROOMS[room];
  const ghosts = sugg >= 0 ? ARRANGE[room][sugg] : [];
  const bg = `linear-gradient(to bottom, ${rm.wall} 0%, ${rm.wall} 56%, ${rm.seam} 56%, ${rm.seam} 57.6%, ${rm.floor} 57.6%, ${rm.floor} 100%)`;
  return (
    <div className="house">
      <div className="house-toolbar">
        <div className="seg house-rooms">
          {Object.entries(ROOMS).map(([k, r]) => <button key={k} className={room === k ? "on" : ""} onClick={() => { setRoom(k); setSugg(-1); }}>{r.label}</button>)}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setSugg((s) => (s >= 4 ? -1 : s + 1))}>
          {sugg < 0 ? "💡 Suggest" : `Idea ${sugg + 1}/5`}
        </button>
      </div>
      <div ref={wrapRef} className="house-scene" style={{ background: bg }} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}>
        {ghosts.map((g, i) => (
          <span key={"g" + i} className="house-ghost" style={{ left: `${g.x}%`, top: `${g.y}%` }}>{g.e}</span>
        ))}
        {items.map((it) => (
          <span key={it.id} className="house-item" style={{ left: `${it.x}%`, top: `${it.y}%` }}
            onPointerDown={(ev) => onDown(ev, it.id)} onDoubleClick={() => setItems((a) => a.filter((t) => t.id !== it.id))}>{it.e}</span>
        ))}
        {items.length === 0 && sugg < 0 && <span className="house-hint">Tap 💡 Suggest for arrangement ideas, then tap items below to add — drag to place, double-tap to remove.</span>}
      </div>
      <div className="house-palette">
        {HOUSE_ITEMS.map(([group, list]) => (
          <div key={group} className="house-group"><span className="dress-lbl">{group}</span><div className="pills">{list.map((ej) => <button key={ej} className="tool-btn" onClick={() => add(ej)}>{ej}</button>)}</div></div>
        ))}
        <div className="cta-wrap"><button className="btn btn-ghost btn-sm" onClick={() => setItems([])}>🗑️ Clear room</button></div>
      </div>
    </div>
  );
}


function ActivityModal({ tool, onClose }: { tool: CanvasTool; onClose: () => void }) {
  const t = tool.title.toLowerCase();
  const isGame = /match|bubble|pop|shooter|ricochet|deflect|search|find|tetris|block|scramble|word|trivia|quiz|puzzle/.test(t);
  const [muted, setMuted] = useState(isMuted());
  useEffect(() => {
    if (isGame) startMusic();
    return () => { stopSpeaking(); stopMusic(); };
  }, [isGame]);
  const body = /paint/.test(t) ? <PaintPad />
    : /story/.test(t) ? <StoryBuilder />
    : /colour|color/.test(t) ? <ColoringBook />
    : /dress/.test(t) ? <DressUp />
    : /house|room/.test(t) ? <HouseBuilder />
    : /match/.test(t) ? <MatchGame />
    : /shooter/.test(t) ? <BubbleShooter />
    : /ricochet|deflect/.test(t) ? <Ricochet />
    : /bubble|pop/.test(t) ? <BubblePop />
    : /search|find/.test(t) ? <SearchFind />
    : /tetris|block/.test(t) ? <Tetris />
    : /scramble|word/.test(t) ? <WordScramble />
    : /trivia|quiz/.test(t) ? <Trivia />
    : /puzzle|jigsaw/.test(t) ? <SlidePuzzle />
    : /comic/.test(t) ? <ComicBuilder />
    : /song|music|beat/.test(t) ? <SongStudio />
    : <GuidedActivity tool={tool} />;
  return (
    <div className="cv-overlay" onClick={onClose}>
      <div className="cv-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="cv-head">
          <span className="tic" style={{ background: tool.color }}>{tool.icon}</span>
          <div><b>{tool.title}</b><span className="who">{tool.name}</span></div>
          <button className="round-btn small" title={muted ? "Sound off" : "Sound on"} onClick={() => { const m = toggleMute(); setMuted(m); if (!m && isGame) startMusic(); }}>{muted ? "🔇" : "🔊"}</button>
          <button className="round-btn small cv-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {body}
      </div>
    </div>
  );
}

const GAMES: CanvasTool[] = [
  { name: "Match Master", color: "#5BBF8A", icon: "🍔", title: "Match game", desc: "Collect 3 of a kind into the tray to clear the board." },
  { name: "Pop", color: "#FF7AA8", icon: "🫧", title: "Bubble pop", desc: "Pop falling balloons by mouse — or steer a metal plate by keyboard. 20 levels." },
  { name: "Bounce", color: "#2EC4B6", icon: "🏓", title: "Ricochet", desc: "Arrow-key plate or deflect puck; catch falling balloons or smash a static cluster — 20 levels." },
  { name: "Sharpshooter", color: "#5AA7E6", icon: "🎯", title: "Bubble shooter", desc: "Aim and fire; match 3+ of a colour to pop. Clear the board across 20 levels." },
  { name: "Finder", color: "#FFC94D", icon: "🔍", title: "Search & find", desc: "Spot and tap every object from the list in the scene." },
  { name: "Block Drop", color: "#5AA7E6", icon: "🧱", title: "Tetris blocks", desc: "Auto-drop with slow / normal / fast — or pick which block to place." },
  { name: "Speller", color: "#9B6DD6", icon: "🔤", title: "Word scramble", desc: "Match the picture, or hide it for a spelling challenge — 200+ words." },
  { name: "Quiz Whizz", color: "#FF7A66", icon: "❓", title: "Trivia quiz", desc: "Animals, science, world and numbers — beat your score." },
  { name: "Puzzler", color: "#2EC4B6", icon: "🧩", title: "Picture puzzle", desc: "Slide the tiles to fix the picture — animals, people, nature, transport." },
];
const COLORING_TILE: CanvasTool = { name: "Picasso", color: "#9B6DD6", icon: "🖍️", title: "Colouring book", desc: "Colour clowns, unicorns, trains, houses and more — tap a tile to start." };
const DRESSUP_TILE: CanvasTool = { name: "Coco", color: "#FF7AA8", icon: "👗", title: "Dress me up", desc: "Style a character — hair, outfits, colours, hats and more." };
const HOUSE_TILE: CanvasTool = { name: "Bob", color: "#5BBF8A", icon: "🏠", title: "My house", desc: "Arrange a room with furniture, people, pets and things." };

export default function Canvas() {
  const [tools, setTools] = useState<CanvasTools | null>(null);
  const [active, setActive] = useState<CanvasTool | null>(null);
  useEffect(() => { api.canvasTools().then(setTools).catch(() => {}); }, []);
  if (!tools) return <div className="view"><p className="muted">Loading…</p></div>;
  const section = (title: string, items: CanvasTool[]) => (
    <div className="block">
      <h3>{title}</h3>
      <div className="grid-cards g3">
        {items.map((t) => (
          <button key={t.name + t.title} className="tile tile-btn" style={{ borderTopColor: t.color }} onClick={() => setActive(t)}>
            <span className="tic" style={{ background: t.color }}>{t.icon}</span>
            <b>{t.title}</b><span className="who">{t.name}</span>
            <p className="muted">{t.desc}</p>
            <span className="tile-cta" style={{ color: t.color }}>Open →</span>
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="view">
      <PageHero kind="canvas" eyebrow="Make" title={<>A <em>canvas</em> for making things</>} tease="Projects, books, games and playful tools to create together — guided every step, with read-aloud help." />
      {section("Build for education", tools.education)}
      {section("Build for fun", tools.fun)}
      {section("Play", [...tools.play, COLORING_TILE, DRESSUP_TILE, HOUSE_TILE])}
      {section("Games", GAMES)}
      {active && <ActivityModal tool={active} onClose={() => setActive(null)} />}
    </div>
  );
}
