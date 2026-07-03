import { useState, useEffect, useMemo, type CSSProperties } from "react";
import PageHero from "../components/PageHero";
import { useProfile, THEMES, type ChildProfile, type ThemeKey } from "../lib/profile";
import { type GanttItem } from "../lib/devstore";
import GanttChart from "../components/GanttChart";
import PlanTracker, { type ChildCtx } from "../components/PlanTracker";
import GrowthSpine from "../components/GrowthSpine";
import NeedsPanel from "../components/NeedsPanel";
import EvaluatePanel from "../components/EvaluatePanel";
import ReviewPanel from "../components/ReviewPanel";

/* Curio · Develop — the parent-mode cockpit. Profiles, themes and the focused
   child all come from the shared profile context (single source of truth), so
   editing here re-skins and re-scopes the whole site. Richer per-child
   observations + the tracked plan live in a side-store keyed by child id. */

type Discipline = "Literacy" | "Numeracy" | "Science" | "Creativity" | "Social-emotional" | "Physical";
type Source = "Child" | "Parent" | "Coach" | "Brain" | "Canvas";
interface PlanItem { id: string; day: string; discipline: Discipline; title: string; why: string; source: Source; done: boolean; open: boolean; }
interface Nudge { id: string; discipline: Discipline; source: Source; title: string; why: string; value: string; }
interface Details { likes: string[]; dislikes: string[]; strengths: string[]; struggles: string[]; gaps: string[]; most: string[]; least: string[]; plan: PlanItem[]; gantt: GanttItem[]; }
type WorkChild = ChildProfile & Details;

const DISC_COLORS: Record<Discipline, string> = {
  Literacy: "#9B6DD6", Numeracy: "#5AA7E6", Science: "#2EC4B6",
  Creativity: "#FF7A66", "Social-emotional": "#FF7AA8", Physical: "#5BBF8A",
};
const SRC_COLORS: Record<Source, string> = {
  Child: "#FF7A66", Parent: "#5AA7E6", Coach: "#9B6DD6", Brain: "#2EC4B6", Canvas: "#FFB02E",
};
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const uid = () => Math.random().toString(36).slice(2);

const SEED: Record<string, Details> = {
  lerato: {
    likes: ["Bubble pop", "Counting games", "Animal picture books"],
    dislikes: ["Long writing tasks", "Sitting still for long stories"],
    strengths: ["Number sense", "Curiosity — asks lots of questions", "Pattern spotting"],
    struggles: ["Staying with a longer story", "Forming letters neatly"],
    gaps: ["Reading stamina", "Tricky letter sounds (sh, th)"],
    most: ["Bubble pop", "Counting", "Colouring book"], least: ["Story maker", "Word scramble"], plan: [], gantt: [],
  },
  thabo: {
    likes: ["Comic builder", "Tetris", "Search & find"],
    dislikes: ["Spelling drills", "Finishing written work"],
    strengths: ["Creativity & storytelling", "Spatial / building", "Persistence on puzzles"],
    struggles: ["Spelling longer words", "Reading fluency aloud"],
    gaps: ["Times-tables recall (6–9)", "Editing his own writing"],
    most: ["Comic builder", "Tetris", "Search & find"], least: ["Spelling", "Reading aloud"], plan: [], gantt: [],
  },
};
function defaultDetails(p: ChildProfile): Details {
  const top = p.interests[0] || "their favourite things";
  return {
    likes: [`${top} activities`, "Short, playful sessions"],
    dislikes: ["Tasks that drag on"],
    strengths: ["Curiosity"],
    struggles: ["Staying focused on longer tasks"],
    gaps: ["Building a daily learning habit"],
    most: ["—"], least: ["—"], plan: [], gantt: [],
  };
}

function nudgesFor(c: WorkChild): Nudge[] {
  const top = c.interests[0] || "their favourite topic";
  const n: Nudge[] = [];
  const add = (discipline: Discipline, source: Source, title: string, why: string, value: string) =>
    n.push({ id: `${c.id}-${discipline}-${n.length}`, discipline, source, title, why, value });

  add("Literacy", "Brain",
    `Bedtime read-aloud about ${top.toLowerCase()} (10 min)`,
    `${c.name} skips longer stories in Canvas but lights up around ${top.toLowerCase()} — anchoring reading to a known love lowers resistance. Daily read-aloud is the highest-leverage habit in the world best-practice feed.`,
    `Builds reading stamina and vocabulary without it feeling like "work".`);
  const phon = c.gaps.find((g) => /sound|phonic|sh|th/i.test(g));
  if (phon) add("Literacy", "Coach",
    `Two-minute "sh / th" sound hunt`,
    `The Coach flagged tricky letter sounds (${phon}). Short, daily, playful sound hunts beat weekly drills at age ${c.age}.`,
    `Targets the exact phonics gap with the lightest possible touch.`);
  if (c.gaps.some((g) => /fluency|edit/i.test(g)))
    add("Literacy", "Canvas",
      `Turn one comic panel into 3 written sentences`,
      `Canvas shows ${c.name} loves Comic builder but avoids written work. Bridging from a strength (comics) into writing meets them where motivation already is.`,
      `Converts an existing favourite into low-friction writing practice.`);
  if (c.strengths.some((s) => /number/i.test(s)))
    add("Numeracy", "Child",
      `Count to 20 by twos before bed`,
      `${c.name} breezes through counting games — it's a confidence anchor. Skip-counting stretches the strength a notch instead of leaving it idle.`,
      `Consolidates number sense and ends the day on a guaranteed win.`);
  if (c.gaps.some((g) => /table|times|multipl/i.test(g)))
    add("Numeracy", "Coach",
      `3-a-day times-table cards (6× this week)`,
      `Coach identified 6–9 times-tables recall as the gap. Tiny daily doses with spaced repetition (from the Brain feed) outperform cramming.`,
      `Closes a concrete maths gap in ~3 minutes a day.`);
  add("Creativity", "Canvas",
    `Make a ${top.toLowerCase()} scene in Painting studio`,
    `Activity patterns put creative play among ${c.name}'s top three. Feeding the spark keeps engagement high and gives the week a free-choice win.`,
    `Protects intrinsic motivation and self-directed play.`);
  add("Science", "Brain",
    `"Experiment of the week": ${top === "Space" ? "shadow & light" : "sink or float"}`,
    `World best-practice favours one hands-on science moment a week. Tying it to ${c.name}'s interest in ${top.toLowerCase()} makes the question feel like theirs.`,
    `Grows curiosity-led reasoning with almost no prep.`);
  add("Social-emotional", "Parent",
    `Name one feeling at dinner`,
    `You mentioned wanting calmer evenings. Naming feelings out loud is linked to better focus and self-control — a 30-second habit with outsized payoff.`,
    `Builds emotional vocabulary and steadier evenings.`);
  add("Physical", "Brain",
    `Movement break between focused tasks`,
    `${c.name} learns best in short bursts (a pattern in their sessions). A 3-minute movement break resets attention for the next task.`,
    `Lengthens the focus that follows — without a battle.`);
  return n;
}
function lessonsFor(c: WorkChild) {
  return [
    { lead: `${c.name} learns in short bursts.`, rest: ` 10-minute sessions land better than long ones — plans are paced accordingly.` },
    { lead: `Strength to lean on:`, rest: ` ${c.strengths[0].toLowerCase()}. Use it as the on-ramp to harder things.` },
    { lead: `Gentle stretch needed:`, rest: ` ${c.gaps[0].toLowerCase()} — small, daily, low-pressure.` },
    { lead: `Motivation lives in:`, rest: ` ${(c.interests[0] || "their interests").toLowerCase()}. Tie new skills to it.` },
  ];
}
function planItem(day: string, discipline: Discipline, title: string, why: string, source: Source): PlanItem {
  return { id: uid(), day, discipline, title, why, source, done: false, open: false };
}
function templatePlan(kind: string, c: WorkChild): PlanItem[] {
  const top = c.interests[0] || "their topic";
  if (kind === "Reading focus") return [
    planItem("Mon", "Literacy", `Read-aloud about ${top.toLowerCase()}`, "Anchors reading to a known interest.", "Brain"),
    planItem("Tue", "Literacy", "Two-minute sound hunt", "Targets the phonics gap playfully.", "Coach"),
    planItem("Wed", "Literacy", "Read-aloud + predict the ending", "Builds comprehension and stamina.", "Brain"),
    planItem("Thu", "Creativity", "Draw the story's best moment", "Bridges reading into a strength.", "Canvas"),
    planItem("Fri", "Literacy", "Re-read a favourite, aloud this time", "Fluency through repetition.", "Coach"),
  ];
  if (kind === "STEM week") return [
    planItem("Mon", "Numeracy", "Count / skip-count to 20", "Consolidates number sense.", "Child"),
    planItem("Tue", "Science", `Experiment: ${top === "Space" ? "shadows" : "sink or float"}`, "Hands-on, interest-led.", "Brain"),
    planItem("Wed", "Numeracy", "3 times-table cards", "Spaced repetition closes the gap.", "Coach"),
    planItem("Thu", "Science", "Build & test a quick model", "Spatial strength + reasoning.", "Canvas"),
    planItem("Fri", "Numeracy", "Counting game in Canvas", "Ends the week on a win.", "Canvas"),
  ];
  if (kind === "Confidence builder") return [
    planItem("Mon", "Creativity", `Free ${top.toLowerCase()} creation`, "Protects intrinsic motivation.", "Canvas"),
    planItem("Tue", "Social-emotional", "Name one feeling at dinner", "Steadier evenings, more focus.", "Parent"),
    planItem("Wed", "Numeracy", "A task they already love", "Confidence anchor.", "Child"),
    planItem("Thu", "Physical", "Movement break challenge", "Resets attention.", "Brain"),
    planItem("Fri", "Literacy", "Teach a parent today's idea", "Explaining cements learning.", "Coach"),
  ];
  return [
    planItem("Mon", "Literacy", `Read-aloud about ${top.toLowerCase()}`, "Daily read-aloud, interest-anchored.", "Brain"),
    planItem("Tue", "Numeracy", "Count / table cards", "Strength + gap in one short session.", "Coach"),
    planItem("Wed", "Science", "Experiment of the week", "Curiosity-led reasoning.", "Brain"),
    planItem("Thu", "Creativity", "Free creation in Canvas", "Self-directed play.", "Canvas"),
    planItem("Fri", "Social-emotional", "Name a feeling at dinner", "Emotional vocabulary.", "Parent"),
    planItem("Sat", "Physical", "Outdoor spot-and-name", "Movement + observation.", "Brain"),
  ];
}

const DKEY = "curio.develop.v1";
function loadDetails(): Record<string, Details> {
  try { const r = localStorage.getItem(DKEY); if (r) return JSON.parse(r) as Record<string, Details>; } catch { /* ignore */ }
  return { ...SEED };
}

export default function Develop() {
  const { children, focusChild, setFocusChild, addChild, updateChild, removeChild } = useProfile();
  const [tab, setTab] = useState<"insights" | "needs" | "plan" | "evaluate" | "review" | "settings">("insights");
  const [added, setAdded] = useState<string[]>([]);
  const [chat, setChat] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [detailsAll, setDetailsAll] = useState<Record<string, Details>>(loadDetails);
  useEffect(() => { try { localStorage.setItem(DKEY, JSON.stringify(detailsAll)); } catch { /* ignore */ } }, [detailsAll]);

  if (!focusChild) return <div className="view"><p className="muted">Add a child profile to begin.</p></div>;
  const focus = focusChild;
  const d = detailsAll[focus.id] || defaultDetails(focus);
  const c: WorkChild = { ...focus, ...d };
  const t = THEMES[focus.theme];
  const themeStyle = { "--dv-accent": t.accent, "--dv-deep": t.deep, "--dv-t1": t.t1, "--dv-t2": t.t2 } as CSSProperties;
  const setDetails = (next: Details) => setDetailsAll({ ...detailsAll, [focus.id]: next });
  const gantt = d.gantt || [];
  const setGantt = (items: GanttItem[]) => setDetails({ ...d, gantt: items });
  const childCtx: ChildCtx = { id: focus.id, name: focus.name, age: focus.age, gender: focus.gender, interests: focus.interests, strengths: d.strengths, struggles: d.struggles, gaps: d.gaps, likes: d.likes, dislikes: d.dislikes };

  const nudges = useMemo(() => nudgesFor(c), [c.id, c.name, c.age, c.interests.join(","), c.gaps.join(","), c.strengths.join(",")]);
  const lessons = useMemo(() => lessonsFor(c), [c.id, c.name, c.interests.join(","), c.gaps.join(","), c.strengths.join(",")]);
  const byDisc = useMemo(() => {
    const m: Partial<Record<Discipline, Nudge[]>> = {};
    nudges.forEach((nz) => { (m[nz.discipline] = m[nz.discipline] || []).push(nz); });
    return m;
  }, [nudges]);

  const addNudge = (nz: Nudge) => {
    if (added.includes(nz.id)) return;
    const counts: Record<string, number> = {}; DAYS.forEach((day) => (counts[day] = 0)); d.plan.forEach((p) => counts[p.day]++);
    const day = DAYS.slice(0, 6).sort((a, b) => counts[a] - counts[b])[0];
    setDetails({ ...d, plan: [...d.plan, planItem(day, nz.discipline, nz.title, `${nz.why}  ·  (${nz.value})`, nz.source)] });
    setAdded([...added, nz.id]); setTab("plan");
  };
  const setPlan = (plan: PlanItem[]) => setDetails({ ...d, plan });
  const seedFrom = (kind: string) => { setPlan(templatePlan(kind, c)); setMsg(`Built a ${kind.toLowerCase()} week for ${focus.name}, paced for short sessions and weighted to ${(focus.interests[0] || "their interests").toLowerCase()} and the "${d.gaps[0]}" gap. Tweak any day, or add nudges from Insights.`); };
  const onChat = () => { if (!chat.trim()) return; seedFrom("Balanced"); setMsg(`Got it — "${chat.trim()}". I drafted a balanced week for ${focus.name} from their profile, Coach focus and Canvas patterns. Edit freely, or layer on nudges from Insights.`); setChat(""); };

  const done = d.plan.filter((p) => p.done).length;
  const pct = d.plan.length ? Math.round((done / d.plan.length) * 100) : 0;
  const balance: Partial<Record<Discipline, number>> = {};
  d.plan.forEach((p) => { balance[p.discipline] = (balance[p.discipline] || 0) + 1; });

  return (
    <div className="view dv" style={themeStyle}>
      <PageHero kind="parent" eyebrow="Develop" title={<>A <em>cockpit</em> for each child</>}
        tease="See what they love, where they're growing, and what's worth doing next — then turn any recommendation into a tracked plan. Understanding, not monitoring." />

      <div className="dv-switcher">
        {children.map((k) => {
          const kt = THEMES[k.theme];
          return (
            <button key={k.id} className={"dv-chip" + (k.id === focus.id ? " active" : "")} onClick={() => setFocusChild(k.id)}
              style={k.id === focus.id ? { borderColor: kt.accent, boxShadow: `0 6px 16px -10px ${kt.accent}` } : undefined}>
              <span className="dv-av" style={{ background: `linear-gradient(140deg,${kt.accent},${kt.deep})` }}>{kt.emoji}</span>
              <span className="dv-nm">{k.name}</span>
            </button>
          );
        })}
        <button className="dv-iconbtn" title="Add a child" onClick={() => { addChild(); setTab("settings"); }}>＋</button>
        <span style={{ flex: 1 }} />
        <button className="dv-iconbtn" title="Settings" onClick={() => setTab("settings")}>⚙</button>
      </div>

      <div className="dv-tabs">
        {([["insights", "Overview"], ["needs", "Needs"], ["plan", "Plan & tracker"], ["evaluate", "Evaluate"], ["review", "Review"], ["settings", "Settings"]] as const).map(([k, l]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "insights" && (
        <div>
          <GrowthSpine childId={focus.id} gantt={gantt} accent={t.accent} />
          <div className="dv-childhead">
            <div className="dv-big">{t.emoji}</div>
            <div>
              <div className="dv-eyebrow">Understanding · not monitoring</div>
              <h2 style={{ margin: "2px 0" }}>{focus.name}, {focus.age}</h2>
              <p className="muted" style={{ margin: 0 }}>Most active in: {d.most.join(" · ")} &nbsp;·&nbsp; Rarely chooses: {d.least.join(", ")}</p>
            </div>
          </div>
          <div className="dv-grid dv-g5 dv-summary">
            {([["Likes", d.likes], ["Dislikes", d.dislikes], ["Struggles", d.struggles], ["Gaps", d.gaps], ["Strengths", d.strengths]] as const).map(([lab, items]) => (
              <div className="dv-card" key={lab}><div className="dv-lab">{lab}</div>
                <ul>{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </div>
            ))}
          </div>
          <h3 style={{ margin: "22px 0 8px" }}>What we've learned</h3>
          <div className="dv-lessons">
            {lessons.map((l, i) => <div className="dv-lesson" key={i}><b>{l.lead}</b>{l.rest}</div>)}
          </div>
          <h3 style={{ margin: "24px 0 2px" }}>Recommendations</h3>
          <p className="muted" style={{ marginTop: 0 }}>One tap adds a nudge to {focus.name}'s plan — with the reason it was picked.</p>
          {(Object.keys(byDisc) as Discipline[]).map((disc) => (
            <div className="dv-disc" key={disc}>
              <h3><span className="dv-pill" style={{ background: DISC_COLORS[disc] + "22", color: DISC_COLORS[disc] }}>{disc}</span></h3>
              {(byDisc[disc] || []).map((nz) => {
                const isAdded = added.includes(nz.id);
                return (
                  <div className="dv-nudge" key={nz.id}>
                    <span className="dv-src" style={{ color: SRC_COLORS[nz.source], borderColor: SRC_COLORS[nz.source] + "66" }}>{nz.source}</span>
                    <div className="dv-body">
                      <div className="dv-t">{nz.title}</div>
                      <div className="dv-why"><b>Why:</b> {nz.why}</div>
                      <div className="dv-val"><b>Value:</b> {nz.value}</div>
                    </div>
                    <button className={"dv-add" + (isAdded ? " done" : "")} onClick={() => addNudge(nz)}>{isAdded ? "✓ Added" : "＋ Add to plan"}</button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {tab === "plan" && (
        <div>
          <div className="dv-card">
            <PlanTracker child={childCtx} accent={t.accent} onAdd={(items) => setGantt([...gantt, ...items])} />
          </div>
          <div className="dv-card" style={{ marginTop: 14 }}>
            <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>{focus.name}'s Gantt</h3>
              <span className="muted">Recommendations land here — also shows under Family, beside the planners.</span>
            </div>
            <GanttChart items={gantt} onChange={setGantt} accent={t.accent} />
          </div>
          <div className="dv-card" style={{ marginTop: 14 }}>
            <div className="dv-planbar">
              <div className="dv-chatrow">
                <input value={chat} onChange={(e) => setChat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onChat()}
                  placeholder={`Ask Coach: "create a plan for ${focus.name}"`} />
                <button className="dv-add" onClick={onChat}>Create</button>
              </div>
              <span className="muted">or a template:</span>
              {["Balanced", "Reading focus", "STEM week", "Confidence builder"].map((k) => (
                <button className="dv-tmpl" key={k} onClick={() => seedFrom(k)}>{k}</button>
              ))}
            </div>
            {msg && <div className="dv-assistant">🧭 {msg}</div>}
          </div>
          <div className="dv-card" style={{ marginTop: 14 }}>
            <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>{focus.name}'s week</h3>
              <span className="muted">{done}/{d.plan.length} done</span>
            </div>
            <div className="dv-progress"><div className="dv-bar"><span style={{ width: pct + "%" }} /></div><b>{pct}%</b></div>
            {d.plan.length > 0 && (
              <div className="dv-balance">
                {(Object.keys(balance) as Discipline[]).map((disc) => (
                  <span className="dv-bchip" key={disc} style={{ borderColor: DISC_COLORS[disc] + "66", color: DISC_COLORS[disc] }}>{disc}: {balance[disc]}</span>
                ))}
              </div>
            )}
            {d.plan.length === 0
              ? <div className="dv-empty">No plan yet. Ask Coach to "create a plan", pick a template, or add nudges from Insights — each lands here with its reason.</div>
              : (
                <div className="dv-week">
                  {DAYS.map((day) => (
                    <div className="dv-day" key={day}>
                      <h4>{day}</h4>
                      {d.plan.filter((p) => p.day === day).map((p) => (
                        <div className={"dv-item" + (p.done ? " done" : "") + (p.open ? " open" : "")} key={p.id}>
                          <div className="dv-ittop">
                            <button className={"dv-check" + (p.done ? " on" : "")} onClick={() => setPlan(d.plan.map((x) => (x.id === p.id ? { ...x, done: !x.done } : x)))}>{p.done ? "✓" : ""}</button>
                            <span className="dv-itt" style={{ flex: 1 }}>{p.title}</span>
                            <button className="dv-itx" title="Remove" onClick={() => setPlan(d.plan.filter((x) => x.id !== p.id))}>✕</button>
                          </div>
                          <div className="dv-itmeta">
                            <span className="dv-tag" style={{ background: DISC_COLORS[p.discipline] + "22", color: DISC_COLORS[p.discipline] }}>{p.discipline}</span>
                            <span className="dv-tag" style={{ background: SRC_COLORS[p.source] + "22", color: SRC_COLORS[p.source] }}>{p.source}</span>
                            <button className="dv-itx" style={{ fontSize: ".7rem" }} onClick={() => setPlan(d.plan.map((x) => (x.id === p.id ? { ...x, open: !x.open } : x)))}>{p.open ? "hide why" : "why?"}</button>
                          </div>
                          {p.open && <div className="dv-itwhy">{p.why}</div>}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      )}

      {tab === "needs" && (
        <div className="dv-card"><NeedsPanel childId={focus.id} childName={focus.name} accent={t.accent} /></div>
      )}
      {tab === "evaluate" && (
        <div className="dv-card"><EvaluatePanel childId={focus.id} childName={focus.name} childAge={focus.age} accent={t.accent} onAddGantt={(items) => setGantt([...gantt, ...items])} /></div>
      )}
      {tab === "review" && (
        <div className="dv-card"><ReviewPanel childId={focus.id} childName={focus.name} childAge={focus.age} accent={t.accent} gantt={gantt} onAddGantt={(items) => setGantt([...gantt, ...items])} /></div>
      )}
      {tab === "settings" && (
        <div className="dv-grid dv-g2">
          <div className="dv-card">
            <h3 style={{ marginTop: 0 }}>{focus.name}'s profile</h3>
            <p className="muted" style={{ marginTop: 0 }}>Edits here update the profile across the whole site.</p>
            <div className="dv-field"><label>Name</label><input value={focus.name} onChange={(e) => updateChild({ ...focus, name: e.target.value })} /></div>
            <div className="dv-field"><label>Age (sets the age range shown to this child)</label><input type="number" min={2} max={14} value={focus.age} onChange={(e) => updateChild({ ...focus, age: Number(e.target.value) || focus.age })} /></div>
            <div className="dv-field"><label>Gender (for pronouns & age-fit copy)</label>
              <select value={focus.gender} onChange={(e) => updateChild({ ...focus, gender: e.target.value as ChildProfile["gender"] })}>
                <option value="girl">girl</option><option value="boy">boy</option><option value="other">prefer not to say</option>
              </select>
            </div>
            <div className="dv-field"><label>Interests (drive the nudges & outputs)</label>
              <div className="dv-intchips">
                {["Animals", "Space", "Counting", "Building", "Comics", "Dinosaurs", "Music", "Nature", "Cars", "Cooking", "Sport", "Drawing", "Robots", "Dancing", "Painting", "Trains", "Sea life", "Bugs", "Baking", "Puzzles", "Superheroes", "Princesses", "Football", "Gardening", "Magic", "Stars", "Reading", "Dragons", "Cats & dogs", "Numbers"].map((x) => {
                  const on = focus.interests.includes(x);
                  return <button key={x} className={"dv-intchip" + (on ? " on" : "")} onClick={() => updateChild({ ...focus, interests: on ? focus.interests.filter((i) => i !== x) : [...focus.interests, x] })}>{x}</button>;
                })}
              </div>
            </div>
          </div>
          <div className="dv-card">
            <h3 style={{ marginTop: 0 }}>Theme</h3>
            <p className="muted" style={{ marginTop: 0 }}>Each child gets a distinct look. In their own profile it re-skins the entire site, so it's obvious at a glance whose profile is open.</p>
            <div className="dv-swatches">
              {(Object.keys(THEMES) as ThemeKey[]).map((k) => {
                const th = THEMES[k];
                return <button key={k} className={"dv-sw" + (focus.theme === k ? " on" : "")} title={th.name}
                  style={{ background: `linear-gradient(140deg,${th.accent},${th.deep})` }} onClick={() => updateChild({ ...focus, theme: k })}>{th.emoji}</button>;
              })}
            </div>
            <hr style={{ border: 0, borderTop: "1px solid var(--ring,#EadFce)", margin: "16px 0" }} />
            <h3 style={{ margin: "0 0 8px" }}>Profiles</h3>
            <div className="row" style={{ flexWrap: "wrap" }}>
              {children.map((k) => (
                <span key={k.id} className="dv-bchip" style={{ borderColor: THEMES[k.theme].accent }}>
                  {THEMES[k.theme].emoji} {k.name}
                  {children.length > 1 && <button className="dv-itx" title="Remove" onClick={() => removeChild(k.id)}>✕</button>}
                </span>
              ))}
            </div>
            <button className="dv-ghost" style={{ marginTop: 12 }} onClick={() => { addChild(); }}>＋ Add a child</button>
            <p className="muted" style={{ fontSize: ".8rem", marginTop: 14 }}>Profiles &amp; themes are shared site-wide. Insights/nudges still use seeded observations for now; they become live once Brain / Coach / Canvas feed them per child.</p>
          </div>
        </div>
      )}
    </div>
  );
}
