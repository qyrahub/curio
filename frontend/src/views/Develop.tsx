import { useState, type CSSProperties } from "react";
import PageHero from "../components/PageHero";
import { useProfile, THEMES, type ChildProfile, type ThemeKey } from "../lib/profile";
import GrowthFlow, { type FlowCtx } from "../components/GrowthFlow";

/* Curio · Develop — parent cockpit. Profiles/themes/focused child come from the
   shared profile context. Per-child observations live read-only in a side-store
   (curio.develop.v1); the Gantt inside the flow owns its own writes via useGantt,
   so Develop never writes that key (no clobber). */

interface Details { likes: string[]; dislikes: string[]; strengths: string[]; struggles: string[]; gaps: string[]; }

const SEED: Record<string, Details> = {
  sunshine: {
    likes: ["Bubble pop", "Counting games", "Animal picture books"],
    dislikes: ["Long writing tasks", "Sitting still for long stories"],
    strengths: ["Number sense", "Curiosity — asks lots of questions", "Pattern spotting"],
    struggles: ["Staying with a longer story", "Forming letters neatly"],
    gaps: ["Reading stamina", "Tricky letter sounds (sh, th)"],
  },
  sage: {
    likes: ["Comic builder", "Tetris", "Search & find"],
    dislikes: ["Spelling drills", "Finishing written work"],
    strengths: ["Creativity & storytelling", "Spatial / building", "Persistence on puzzles"],
    struggles: ["Spelling longer words", "Reading fluency aloud"],
    gaps: ["Times-tables recall (6–9)", "Editing his own writing"],
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
  };
}

const DKEY = "curio.develop.v1";
function loadDetails(): Record<string, Details> {
  try { const r = localStorage.getItem(DKEY); if (r) return JSON.parse(r) as Record<string, Details>; } catch { /* ignore */ }
  return { ...SEED };
}

export default function Develop() {
  const { children, focusChild, setFocusChild, addChild, updateChild, removeChild } = useProfile();
  const [showSettings, setShowSettings] = useState(false);
  const [detailsAll] = useState<Record<string, Details>>(loadDetails); // read-only

  if (!focusChild) return <div className="view"><p className="muted">Add a child profile to begin.</p></div>;
  const focus = focusChild;
  const d = detailsAll[focus.id] || defaultDetails(focus);
  const t = THEMES[focus.theme];
  const themeStyle = { "--dv-accent": t.accent, "--dv-deep": t.deep, "--dv-t1": t.t1, "--dv-t2": t.t2 } as CSSProperties;
  const ctx: FlowCtx = {
    id: focus.id, name: focus.name, age: focus.age, gender: focus.gender, interests: focus.interests,
    strengths: d.strengths, struggles: d.struggles, gaps: d.gaps, likes: d.likes, dislikes: d.dislikes,
  };

  return (
    <div className="view dv" style={themeStyle}>
      <PageHero kind="parent" eyebrow="Develop" title={<>A <em>cockpit</em> for each child</>}
        tease="Understand where they are, describe a need, and turn the plan into tracked progress you can see grow over time." />

      <div className="dv-switcher">
        {children.map((k) => {
          const kt = THEMES[k.theme];
          return (
            <button key={k.id} className={"dv-chip" + (k.id === focus.id ? " active" : "")} onClick={() => { setFocusChild(k.id); setShowSettings(false); }}
              style={k.id === focus.id ? { borderColor: kt.accent, boxShadow: `0 6px 16px -10px ${kt.accent}` } : undefined}>
              <span className="dv-av" style={{ background: `linear-gradient(140deg,${kt.accent},${kt.deep})` }}>{kt.emoji}</span>
              <span className="dv-nm">{k.name}</span>
            </button>
          );
        })}
        <button className="dv-iconbtn" title="Add a child" onClick={() => { addChild(); setShowSettings(true); }}>＋</button>
        <span style={{ flex: 1 }} />
        <button className={"dv-gear" + (showSettings ? " on" : "")} title="Settings" aria-label="Settings" onClick={() => setShowSettings((s) => !s)}>⚙</button>
      </div>

      {!showSettings && <GrowthFlow ctx={ctx} accent={t.accent} onGoInsights={() => { window.location.hash = "insights"; }} />}

      {showSettings && (
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
            <div className="dv-field"><label>Interests (drive the outputs)</label>
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
            <p className="muted" style={{ marginTop: 0 }}>Each child gets a distinct look. In their own profile it re-skins the entire site.</p>
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
            <button className="dv-ghost" style={{ marginTop: 12 }} onClick={() => addChild()}>＋ Add a child</button>
          </div>
        </div>
      )}
    </div>
  );
}
