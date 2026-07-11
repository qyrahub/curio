import { useEffect, useMemo, useState } from "react";
import PageHero from "../components/PageHero";
import { useProfile, THEMES } from "../lib/profile";
import { growth, type ReviewCycle, type GrowthNeed } from "../lib/growth";
import { themeLevels, normTag } from "../lib/themes";
import { fnStats, ranked, PHASES } from "../lib/feuerstein";
import { journal } from "../lib/journal";
import { addToPlanner, todayKey } from "../lib/plannerStore";
import "./checkin.css";

/* Check-in — a parent's read on each child, and what to do about it.
   Every nudge is derived from REAL history. No data -> we say so, we don't invent. */

interface Nudge { id: string; why: string; do_: string; tag: string; }

interface ChildState {
  id: string; name: string; theme: string;
  reviews: ReviewCycle[]; needs: GrowthNeed[];
  strength?: string; recurring?: { tag: string; n: number }; weakFn?: string; weakPhase?: string;
  lastSeen?: string; nudges: Nudge[];
}

export default function CheckIn() {
  const { children } = useProfile();
  const [data, setData] = useState<Record<string, { reviews: ReviewCycle[]; needs: GrowthNeed[] }>>({});
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [when, setWhen] = useState(todayKey());

  useEffect(() => {
    if (children.length === 0) { setLoaded(true); return; }
    Promise.all(children.map((c) =>
      Promise.all([
        growth.listReviews(c.id).catch(() => [] as ReviewCycle[]),
        growth.listNeeds(c.id).catch(() => [] as GrowthNeed[]),
      ]).then(([reviews, needs]) => [c.id, { reviews, needs }] as const)
    )).then((pairs) => {
      const m: Record<string, { reviews: ReviewCycle[]; needs: GrowthNeed[] }> = {};
      pairs.forEach(([id, v]) => { m[id] = v; });
      setData(m);
    }).finally(() => setLoaded(true));
  }, [children]);

  const states: ChildState[] = useMemo(() => children.map((c) => {
    const d = data[c.id] || { reviews: [], needs: [] };
    const reviews = d.reviews, needs = d.needs;
    const st: ChildState = { id: c.id, name: c.name, theme: c.theme, reviews, needs, nudges: [] };

    if (reviews.length) {
      const times = reviews.map((r) => new Date(r.created_at || r.period || 0).getTime()).sort((a, b) => b - a);
      st.lastSeen = new Date(times[0]).toLocaleDateString();

      const lv = themeLevels(reviews);
      const top = Array.from(lv.values()).filter((e) => e.strengths > 0).sort((a, b) => b.level - a.level)[0];
      if (top) st.strength = top.theme;

      const counts = new Map<string, number>();
      reviews.forEach((r) => (r.issues || []).map(normTag).filter(Boolean).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
      const rec = Array.from(counts.entries()).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1])[0];
      if (rec) st.recurring = { tag: rec[0], n: rec[1] };

      const stats = fnStats(reviews);
      const weakest = ranked(stats).slice(-1)[0];
      if (weakest && weakest.latest < 55) {
        st.weakFn = weakest.fn.name;
        st.weakPhase = PHASES.find((p) => p.id === weakest.fn.phase)?.label;
      }
    }

    // Nudges — only from what's real.
    if (reviews.length === 0) {
      st.nudges.push({ id: "first", why: `No reviews yet for ${c.name}.`, do_: `Run a first review in Develop — bring one real piece of work or a hard moment.`, tag: "start" });
    }
    if (st.recurring) {
      st.nudges.push({ id: "rec", why: `“${st.recurring.tag}” has come up ${st.recurring.n}× — it isn't resolving on its own.`, do_: `Plan a short, repeated session on ${st.recurring.tag.toLowerCase()} this week.`, tag: st.recurring.tag });
    }
    if (st.weakFn) {
      st.nudges.push({ id: "cog", why: `${st.weakPhase} is the weakest phase — “${st.weakFn}” is lagging.`, do_: `Coach the ${st.weakPhase?.toLowerCase()} stage: pause and work that step out loud together.`, tag: st.weakFn });
    }
    const open = needs.filter((n) => n.status !== "achieved");
    if (open.length >= 3) {
      st.nudges.push({ id: "load", why: `${open.length} needs are still open.`, do_: `Pick one to finish this week rather than pushing all of them.`, tag: "focus" });
    }
    if (st.strength && st.nudges.length < 4) {
      st.nudges.push({ id: "lean", why: `“${st.strength}” is ${c.name}'s clearest strength.`, do_: `Lean on it — tie this week's harder work to ${st.strength.toLowerCase()}.`, tag: st.strength });
    }
    return st;
  }), [children, data]);

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(""), 2600); };

  const toPlanner = (childId: string, name: string, text: string) => {
    flash(addToPlanner(childId, when, text, "education")
      ? `Added to ${name}'s planner on ${when}.`
      : "Couldn't write to the planner.");
  };
  const toJournal = async (childId: string, name: string, text: string) => {
    try { await journal.add({ scope: "child", child_id: childId, text, mood: "idea" }); flash(`Noted in ${name}'s journal.`); }
    catch { flash("Couldn't save to the journal — check you're signed in."); }
  };

  if (!loaded) return <div className="view"><p className="muted">Loading…</p></div>;

  return (
    <div className="ci view">
      <PageHero kind="parent" eyebrow="Check-in" title={<>How is <em>everyone</em> doing?</>}
        tease="A parent's read on each child — what's working, what keeps coming back, and one-click nudges you can act on right now." />

      {children.length === 0 && <div className="ci-empty">Add a child first, and their check-in will appear here.</div>}

      {children.length > 0 && (
        <div className="ci-when">
          <label>Add nudges to the planner for:</label>
          <input type="date" value={when} onChange={(e) => setWhen(e.target.value || todayKey())} />
          <span className="muted">Defaults to today.</span>
        </div>
      )}

      {msg && <div className="ci-msg">{msg}</div>}

      <div className="ci-grid">
        {states.map((s) => {
          const t = THEMES[s.theme as keyof typeof THEMES];
          return (
            <section className="ci-card" key={s.id} style={{ ["--ci" as string]: t.accent }}>
              <header className="ci-head">
                <span className="ci-av" style={{ background: `linear-gradient(140deg,${t.accent},${t.deep})` }}>{t.emoji}</span>
                <div>
                  <h3>{s.name}</h3>
                  <span className="muted">{s.reviews.length === 0 ? "No reviews yet" : `${s.reviews.length} review${s.reviews.length === 1 ? "" : "s"} · last ${s.lastSeen}`}</span>
                </div>
              </header>

              {s.reviews.length > 0 && (
                <div className="ci-facts">
                  {s.strength && <span className="ci-fact good">💪 {s.strength}</span>}
                  {s.recurring && <span className="ci-fact watch">⚠ {s.recurring.tag} ×{s.recurring.n}</span>}
                  {s.weakFn && <span className="ci-fact cog">◎ {s.weakFn}</span>}
                </div>
              )}

              <div className="ci-nudges">
                {s.nudges.map((n) => (
                  <div className="ci-nudge" key={n.id}>
                    <p className="ci-why">{n.why}</p>
                    <p className="ci-do">{n.do_}</p>
                    <div className="ci-acts">
                      <button onClick={() => toPlanner(s.id, s.name, n.do_)}>🗓 Planner</button>
                      <button onClick={() => toJournal(s.id, s.name, n.do_)}>📓 Journal</button>
                      <button onClick={() => { window.location.hash = "develop"; }}>🌱 Develop</button>
                      <button onClick={() => { window.location.hash = "coach"; }}>🎯 Coach</button>
                    </div>
                  </div>
                ))}
              </div>

              <footer className="ci-foot">
                <button className="ci-link" onClick={() => { window.location.hash = "insights"; }}>Full insights →</button>
                <button className="ci-link" onClick={() => { window.location.hash = "brain"; }}>The Brain →</button>
              </footer>
            </section>
          );
        })}
      </div>

      {children.length > 0 && <p className="ci-disc">Every nudge above is derived from {children.length === 1 ? "this child's" : "each child's"} own recorded history — never invented. Guidance, not diagnosis.</p>}
    </div>
  );
}
