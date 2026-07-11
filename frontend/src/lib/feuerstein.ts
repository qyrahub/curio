/* Feuerstein's cognitive functions — the canonical, fixed taxonomy.
   Three phases (Input / Elaboration / Output); each function pairs the working
   form (the cognitive function) with its growth-area counterpart.
   Fixed IDs = comparable over time, exactly like the canonical tag vocabulary.
   Cognitive functions as identified by Prof. Reuven Feuerstein. Guidance, not diagnosis. */

export type Phase = "input" | "elaboration" | "output";

export interface CogFn { id: string; phase: Phase; n: number; name: string; fn: string; growth: string; }

export const PHASES: { id: Phase; label: string; sub: string; color: string }[] = [
  { id: "input", label: "Input", sub: "Gathering the information", color: "#2EC4B6" },
  { id: "elaboration", label: "Elaboration", sub: "Thinking it through", color: "#5AA7E6" },
  { id: "output", label: "Output", sub: "Expressing it clearly", color: "#FF7A66" },
];

export const FUNCTIONS: CogFn[] = [
  // INPUT (8)
  { id: "i1", phase: "input", n: 1, name: "Focus & perceive", fn: "Focused, clear use of all senses — can copy from the board while still listening.", growth: "Struggles with several senses at once; easily distracted when it's noisy or busy." },
  { id: "i2", phase: "input", n: 2, name: "Systematic search", fn: "Takes in instructions before starting; searches methodically for what's relevant.", growth: "Impulsive start — jumps in before reading or hearing the full instructions." },
  { id: "i3", phase: "input", n: 3, name: "Labels & vocabulary", fn: "Has the words and labels needed to think about the topic.", growth: "Incomplete grasp of the words and terms needed to hold the concept." },
  { id: "i4", phase: "input", n: 4, name: "Spatial awareness", fn: "Aware of orientation; organises themselves and their work systematically.", growth: "Untidy, disorganised work; loses their place." },
  { id: "i5", phase: "input", n: 5, name: "Time awareness", fn: "Understands and applies time — how long to spend, how to sequence, how to plan.", growth: "Doesn't grasp time, or processes slowly." },
  { id: "i6", phase: "input", n: 6, name: "Conserve constancies", fn: "Holds what stays the same, separate from what changes.", growth: "Doesn't grasp what stays constant when other things change." },
  { id: "i7", phase: "input", n: 7, name: "Precision in gathering", fn: "Precise, accurate gathering — focuses on what's actually needed.", growth: "Imprecise; assumes rather than checks; brings in too much or too little." },
  { id: "i8", phase: "input", n: 8, name: "Two or more sources", fn: "Considers two or more sources together — can hold two things in mind.", growth: "Difficulty holding two or more sources of information at once." },
  // ELABORATION (12)
  { id: "e1", phase: "elaboration", n: 1, name: "Define the problem", fn: "Accurately perceives and defines the problem; knows what's expected.", growth: "Struggles to define what the problem actually is ('I don't understand the question')." },
  { id: "e2", phase: "elaboration", n: 2, name: "Relevant cues", fn: "Selects relevant information — sees what's important.", growth: "Difficulty choosing what's relevant versus irrelevant." },
  { id: "e3", phase: "elaboration", n: 3, name: "Compare", fn: "Compares by finding similarities and differences.", growth: "Doesn't compare well; can't find similarities and differences." },
  { id: "e4", phase: "elaboration", n: 4, name: "Working memory", fn: "Holds information in mind while manipulating it.", growth: "Loses information mid-task on multi-step work." },
  { id: "e5", phase: "elaboration", n: 5, name: "Understand reality", fn: "Sees reality as interconnected — cause and effect; learns from experience.", growth: "Struggles to link events and subjects; doesn't learn from past mistakes." },
  { id: "e6", phase: "elaboration", n: 6, name: "Logical evidence", fn: "Seeks and uses logical evidence — can prove their thinking.", growth: "Reaches an answer but doesn't show the working or defend the thinking." },
  { id: "e7", phase: "elaboration", n: 7, name: "Abstract thinking", fn: "Visualises and creates a mental picture or plan.", growth: "Difficulty with abstract information; strongly prefers the concrete." },
  { id: "e8", phase: "elaboration", n: 8, name: "Hypothetical thinking", fn: "Brainstorms what else could be true — 'if this is true, then…'.", growth: "Struggles with inferential thinking." },
  { id: "e9", phase: "elaboration", n: 9, name: "Test the hypothesis", fn: "Finds strategies to test an idea — 'how could I check this?'", growth: "Gets stuck on how to test or prove an idea." },
  { id: "e10", phase: "elaboration", n: 10, name: "Summing up", fn: "Sees the bigger picture; works with both parts and whole.", growth: "Gets lost in details; misses the main idea." },
  { id: "e11", phase: "elaboration", n: 11, name: "Planning behaviour", fn: "Thinks forward — states steps and reasons.", growth: "Lack of planning behaviour." },
  { id: "e12", phase: "elaboration", n: 12, name: "Categories & labels", fn: "Forms categories by grouping and naming the groups.", growth: "Struggles to form groups or categories and label them." },
  // OUTPUT (8)
  { id: "o1", phase: "output", n: 1, name: "Multiple viewpoints", fn: "Communicates other perspectives — cognitive flexibility.", growth: "Egocentric viewpoint; struggles to express another point of view." },
  { id: "o2", phase: "output", n: 2, name: "Project relationships", fn: "Transfers connections and analogies to new situations.", growth: "Difficulty seeing connections and applying them to a new context." },
  { id: "o3", phase: "output", n: 3, name: "Perseverance", fn: "Sticks with it; doesn't give up.", growth: "Blocking — cognitive or emotional shutdown." },
  { id: "o4", phase: "output", n: 4, name: "Thoughtful response", fn: "Pauses ('just a moment…') and checks the answer truly fits the question.", growth: "Trial-and-error responses; random guessing." },
  { id: "o5", phase: "output", n: 5, name: "Full expression", fn: "Uses the right words and full sentences to express ideas.", growth: "Difficulty communicating in full sentences with adequate vocabulary." },
  { id: "o6", phase: "output", n: 6, name: "Precision in output", fn: "Answers exactly what was asked, with intent and accuracy.", growth: "Rambles or writes everything they know without answering the question." },
  { id: "o7", phase: "output", n: 7, name: "Visual transporting", fn: "Copies accurately; work is neat and logical.", growth: "Messy work, skipped steps, copying errors, losing place when reading." },
  { id: "o8", phase: "output", n: 8, name: "Self-control", fn: "Pauses to think; slows down for accuracy; monitors their own response.", growth: "Impulsive, rushed; answers before hearing all the facts." },
];

export const byPhase = (p: Phase) => FUNCTIONS.filter((f) => f.phase === p);
export const fnById = (id: string) => FUNCTIONS.find((f) => f.id === id);
export const FN_IDS = FUNCTIONS.map((f) => f.id);

/* A review may carry cog scores: { i1: 0-100, e4: 0-100, ... } — only for functions
   the evidence actually supports. Missing = not observed, NOT zero. */
export type CogScores = Record<string, number>;

export interface FnStat { fn: CogFn; latest: number; avg: number; n: number; first: number; delta: number; points: { t: number; v: number }[]; }

/* Build per-function stats from dated reviews. Real data only — a function with no
   observations is simply absent, never invented. */
export function fnStats(reviews: { created_at?: string; period?: string; cog?: CogScores }[]): Map<string, FnStat> {
  const map = new Map<string, { t: number; v: number }[]>();
  reviews.forEach((r) => {
    const t = new Date(r.created_at || r.period || Date.now()).getTime();
    const c = r.cog || {};
    Object.entries(c).forEach(([id, v]) => {
      if (typeof v !== "number" || !fnById(id)) return;
      const arr = map.get(id) || [];
      arr.push({ t, v: Math.max(0, Math.min(100, Math.round(v))) });
      map.set(id, arr);
    });
  });
  const out = new Map<string, FnStat>();
  map.forEach((pts, id) => {
    const fn = fnById(id);
    if (!fn) return;
    pts.sort((a, b) => a.t - b.t);
    const latest = pts[pts.length - 1].v;
    const first = pts[0].v;
    const avg = Math.round(pts.reduce((s, p) => s + p.v, 0) / pts.length);
    out.set(id, { fn, latest, avg, n: pts.length, first, delta: latest - first, points: pts });
  });
  return out;
}

export function phaseScore(stats: Map<string, FnStat>, phase: Phase): { score: number; observed: number; total: number } {
  const fns = byPhase(phase);
  const seen = fns.map((f) => stats.get(f.id)).filter(Boolean) as FnStat[];
  const total = fns.length;
  if (seen.length === 0) return { score: 0, observed: 0, total };
  return { score: Math.round(seen.reduce((s, x) => s + x.latest, 0) / seen.length), observed: seen.length, total };
}

/* Ranked: strongest → weakest, within a phase or across all. Only observed functions. */
export function ranked(stats: Map<string, FnStat>, phase?: Phase): FnStat[] {
  return Array.from(stats.values())
    .filter((s) => !phase || s.fn.phase === phase)
    .sort((a, b) => b.latest - a.latest || b.n - a.n);
}

export const band = (v: number) => (v >= 75 ? "strong" : v >= 55 ? "steady" : v >= 40 ? "emerging" : "growth area");
