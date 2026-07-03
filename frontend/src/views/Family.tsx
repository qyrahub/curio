import { useEffect, useState } from "react";
import { brand } from "../lib/brand";
import PageHero from "../components/PageHero";
import { api } from "../lib/api";
import type { EduItem, FamilyLifestyle, Itinerary } from "../types";
import FamilyPlanner from "./FamilyPlanner";
import InteractivePlanner from "./InteractivePlanner";
import GanttChart from "../components/GanttChart";
import { useProfile, THEMES } from "../lib/profile";
import { useGantt } from "../lib/devstore";

const OUTING_ICONS: [RegExp, string][] = [
  [/zoo|animal|bird|lemur|wildlife|safari/i, "\u{1F981}"],
  [/garden|botanic|park|nature|lawn|forest/i, "\u{1F333}"],
  [/science|discovery|experiment|lab|planetar/i, "\u{1F52C}"],
  [/museum|history|heritage|monument/i, "\u{1F3DB}\uFE0F"],
  [/beach|sea|ocean|coast/i, "\u{1F3D6}\uFE0F"],
  [/mountain|hike|trail|peak|nature reserve/i, "\u26F0\uFE0F"],
  [/aquar|fish|penguin|marine|shark/i, "\u{1F420}"],
  [/mine|gold|cave/i, "\u26CF\uFE0F"],
  [/art|gallery|craft|paint|theatre|theater/i, "\u{1F3A8}"],
  [/farm|fruit|pick|berry/i, "\u{1F69C}"],
  [/water|fall|river|dam|lake/i, "\u{1F4A7}"],
  [/ride|theme|fun|adventure|amusement|reef city/i, "\u{1F3A2}"],
  [/star|planet|space|observ/i, "\u{1F52D}"],
  [/market|food|eat|restaurant/i, "\u{1F37D}\uFE0F"],
  [/sport|game|stadium|soccer/i, "\u26BD"],
  [/book|library|story/i, "\u{1F4DA}"],
];
const OUTING_BANDS = ["#FF7A66", "#5AA7E6", "#5BBF8A", "#9B6DD6", "#2EC4B6", "#FFC94D"];
function outingIcon(o: { title: string; desc: string }): string {
  const s = (o.title + " " + o.desc).toLowerCase();
  for (const [re, e] of OUTING_ICONS) if (re.test(s)) return e;
  return "\u{1F4CD}";
}
const goChild = () => { window.location.hash = "#/child"; };

type Tab = "education" | "lifestyle" | "itinerary" | "planner" | "interactive" | "gantt";
const TAB_LABEL: Record<Tab, string> = { education: "Education", lifestyle: "Lifestyle", itinerary: "Itinerary", planner: "Calendar", interactive: "Interactive Planner", gantt: "Gantt" };

export default function Family() {
  const [tab, setTab] = useState<Tab>("education");
  return (
    <div className="view">
      <PageHero kind="family" eyebrow="Together" title={<>Things to <em>learn & do</em> as a family</>} tease="Education ideas, a lifestyle rhythm, real outings near you, and a whole-year planner — for the family." />
      <div className="tabs">
        {(["education", "lifestyle", "itinerary", "planner", "interactive", "gantt"] as const).map((t) => (
          <button key={t} className={tab === t ? "on" : ""} aria-pressed={tab === t} onClick={() => setTab(t)}>{TAB_LABEL[t]}</button>
        ))}
      </div>
      {tab === "education" && <Education />}
      {tab === "lifestyle" && <Lifestyle go={setTab} />}
      {tab === "itinerary" && <ItineraryTab />}
      {tab === "planner" && <FamilyPlanner embedded />}
      {tab === "interactive" && <InteractivePlanner embedded />}
      {tab === "gantt" && <FamilyGantt />}
    </div>
  );
}

function Education() {
  const [items, setItems] = useState<EduItem[]>([]);
  useEffect(() => { api.familyEducation().then(setItems).catch(() => {}); }, []);
  return (
    <>
      <div className="nudge-banner">
        <span className="nic">🎓</span>
        <div><b>Learn together, every day.</b><p className="muted">Pick one idea below and try it this week — small, consistent moments beat big rare ones.</p></div>
      </div>
      <div className="grid-cards g2">
        {items.map((e, i) => (
          <div key={i} className="nudge"><span className="nic">{e.icon}</span><div><b>{e.title}</b><p className="muted">{e.detail}</p></div></div>
        ))}
      </div>
      <div className="cta-wrap" style={{ marginTop: 20 }}>
        <button className="btn btn-primary" onClick={goChild}>✨ Turn this into a child plan</button>
        <span className="cta-note">Builds an illustrated, age-matched plan in one tap.</span>
      </div>
    </>
  );
}

function Lifestyle({ go }: { go: (t: Tab) => void }) {
  const [range, setRange] = useState("week");
  const [data, setData] = useState<FamilyLifestyle | null>(null);
  useEffect(() => { api.familyLifestyle(range).then(setData).catch(() => {}); }, [range]);
  return (
    <>
      <div className="nudge-banner">
        <span className="nic">🌿</span>
        <div><b>A gentle family rhythm.</b><p className="muted">A balanced mix of learning, movement, rest and connection — choose a view to plan around.</p></div>
      </div>
      <div className="seg">
        {["day", "week", "month"].map((r) => (
          <button key={r} className={range === r ? "on" : ""} aria-pressed={range === r} onClick={() => setRange(r)}>{r}</button>
        ))}
      </div>
      <div className="cal">
        {data?.blocks.map((b, i) => (
          <div key={i} className="cal-block" style={{ borderLeftColor: b.color }}>
            {b.day_label && <div className="dl">{b.day_label}</div>}
            <b>{b.title}</b><span className="pill-tag" style={{ background: b.color }}>{b.category}</span>
            <p className="muted">{b.activity}</p>
            <p className="meta">{b.where} · {b.time} · {b.cost}</p>
          </div>
        ))}
      </div>
      <div className="cta-wrap" style={{ marginTop: 20 }}>
        <button className="btn btn-primary" onClick={() => go("itinerary")}>📍 Plan a family outing</button>
        <span className="cta-note">Real places near you, matched to your week.</span>
      </div>
    </>
  );
}

function ItineraryTab() {
  const [areas, setAreas] = useState<string[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [area, setArea] = useState("");
  const [scope, setScope] = useState<"local" | "provincial" | "national" | "international">("local");
  const [when, setWhen] = useState<"week" | "weekend" | "duration" | "events">("week");
  const [chosenEvents, setChosenEvents] = useState<string[]>([]);
  const [res, setRes] = useState<Itinerary | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.itineraryOptions().then((o) => { setAreas(o.areas); setEvents(o.events); setArea(o.areas[0] ?? ""); }).catch(() => {});
  }, []);

  const plan = () => {
    setBusy(true);
    api.itinerary({
      area, scope, when, days: 2,
      events: when === "events" ? (chosenEvents.length ? chosenEvents : [events[0]]) : [],
    }).then(setRes).catch(() => {}).finally(() => setBusy(false));
  };

  return (
    <>
      <div className="nudge-banner">
        <span className="nic">🗺️</span>
        <div><b>Turn a free day into an adventure.</b><p className="muted">Choose where, how far and when — {brand.name} suggests real outings the whole family will enjoy.</p></div>
      </div>
      <div className="grid g3">
        <div className="field"><label className="lbl">Area</label>
          <select value={area} onChange={(e) => setArea(e.target.value)}>
            {areas.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div className="field"><label className="lbl">How far</label>
          <div className="seg wrap">
            {(["local", "provincial", "national", "international"] as const).map((s) => (
              <button key={s} className={scope === s ? "on" : ""} aria-pressed={scope === s} onClick={() => setScope(s)}>{s}</button>
            ))}
          </div>
        </div>
        <div className="field"><label className="lbl">When</label>
          <div className="seg wrap">
            {(["week", "weekend", "duration", "events"] as const).map((w) => (
              <button key={w} className={when === w ? "on" : ""} aria-pressed={when === w} onClick={() => setWhen(w)}>{w}</button>
            ))}
          </div>
        </div>
      </div>
      {when === "events" && (
        <div className="pills" style={{ marginTop: 14 }}>
          {events.map((ev) => (
            <button key={ev} className="pill" aria-pressed={chosenEvents.includes(ev)}
              onClick={() => setChosenEvents((c) => c.includes(ev) ? c.filter((x) => x !== ev) : [...c, ev])}>{ev}</button>
          ))}
        </div>
      )}
      <div className="cta-wrap"><button className="btn btn-primary" disabled={busy} onClick={plan}>{busy ? "Finding outings…" : "📍 Plan outings"}</button></div>
      {res?.note && <p className="hint">⚠ {res.note}</p>}
      <div className="grid-cards g2">
        {res?.items.map((o, i) => {
          const band = OUTING_BANDS[i % OUTING_BANDS.length];
          return (
            <div key={i} className="outing">
              <div className="outing-top" style={{ background: `linear-gradient(135deg, ${band}, ${band}cc)` }}>
                <span className="outing-emoji">{outingIcon(o)}</span>
                <span className="badge-cat">{o.label}</span>
              </div>
              <div className="outing-body">
                <b>{o.title}</b>
                <p className="muted">{o.desc}</p>
                <p className="meta">{o.where} · {o.time} · {o.cost}</p>
              </div>
            </div>
          );
        })}
      </div>
      {res && res.items.length > 0 && (
        <div className="cta-wrap" style={{ marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={goChild}>✨ Build a learning plan around the trip</button>
        </div>
      )}
    </>
  );
}

function FamilyGantt() {
  const { children, focusChild } = useProfile();
  const [cid, setCid] = useState(focusChild?.id || children[0]?.id || "");
  const child = children.find((c) => c.id === cid) || children[0];
  const [items, setItems] = useGantt(child?.id || "");
  if (!child) return <p className="muted">Add a child profile to use the Gantt.</p>;
  const th = THEMES[child.theme];
  return (
    <>
      <div className="nudge-banner">
        <span className="nic">📊</span>
        <div><b>{child.name}'s Gantt</b><p className="muted">Plans built under Develop → Plan &amp; Tracker land here. Update progress and status as you go.</p></div>
      </div>
      <div className="seg wrap" style={{ marginBottom: 14 }}>
        {children.map((k) => (
          <button key={k.id} className={k.id === cid ? "on" : ""} onClick={() => setCid(k.id)}>{THEMES[k.theme].emoji} {k.name}</button>
        ))}
      </div>
      <GanttChart items={items} onChange={setItems} accent={th.accent} />
    </>
  );
}
