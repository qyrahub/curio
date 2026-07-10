import { useMemo, useState } from "react";
import "./knowledgeCentre.css";

type Kind = "Article" | "Infographic" | "Working paper";
type Audience = "Parent" | "Family";
type Discipline = "Cognitive" | "School" | "Focus" | "General";

interface Material {
  id: string; title: string; blurb: string; kind: Kind;
  audience: Audience[]; discipline: Discipline[]; file: string; mins: string;
}

const MATERIALS: Material[] = [
  { id: "one-diagram", title: "Curio at a glance", blurb: "The whole story on one page — how a need becomes a visible path of growth for the family.", kind: "Infographic", audience: ["Parent", "Family"], discipline: ["General"], file: "one-diagram.html", mins: "2" },
  { id: "value-infographic", title: "How a child's growth becomes visible", blurb: "The value journey, with an animated growth curve built from real review points.", kind: "Infographic", audience: ["Parent"], discipline: ["General"], file: "value-infographic.html", mins: "3" },
  { id: "working-paper", title: "Making a child's development visible", blurb: "The working paper: how Curio assesses need honestly, builds a development ladder, and tracks growth over time.", kind: "Working paper", audience: ["Parent", "Family"], discipline: ["General"], file: "working-paper.html", mins: "9" },
  { id: "article-focus", title: "The ten-minute focus session", blurb: "Attention is a muscle built in short reps. Why fewer minutes, done daily, beat a frustrated hour.", kind: "Article", audience: ["Parent"], discipline: ["Focus"], file: "article-focus.html", mins: "4" },
  { id: "article-worksheet", title: "Reading a worksheet the way Curio does", blurb: "A marked worksheet is a rich signal — if you know how to separate the teacher's ask from the child's answer.", kind: "Article", audience: ["Parent"], discipline: ["School"], file: "article-worksheet.html", mins: "5" },
  { id: "article-evening", title: "When a hard homework evening becomes a data point", blurb: "The tears aren't a verdict — they're information. Lowering the temperature and reading the pattern.", kind: "Article", audience: ["Family"], discipline: ["Focus"], file: "article-evening.html", mins: "4" },
];

const KIND_COLOR: Record<Kind, string> = { "Article": "var(--kc-teal)", "Infographic": "var(--kc-coral)", "Working paper": "var(--kc-blue)" };
const KINDS: Kind[] = ["Article", "Infographic", "Working paper"];
const AUDIENCES: Audience[] = ["Parent", "Family"];
const DISCIPLINES: Discipline[] = ["Cognitive", "School", "Focus", "General"];
const path = (f: string) => `/knowledge/${f}`;

export default function KnowledgeCentre() {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<Kind | "All">("All");
  const [audience, setAudience] = useState<Audience | "All">("All");
  const [discipline, setDiscipline] = useState<Discipline | "All">("All");

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return MATERIALS.filter((m) =>
      (kind === "All" || m.kind === kind) &&
      (audience === "All" || m.audience.includes(audience)) &&
      (discipline === "All" || m.discipline.includes(discipline)) &&
      (!needle || (m.title + " " + m.blurb).toLowerCase().includes(needle)));
  }, [q, kind, audience, discipline]);

  const seg = <T extends string>(label: string, opts: T[], val: T | "All", set: (v: T | "All") => void) => (
    <div className="kc-filter">
      <span className="kc-flabel">{label}</span>
      <div className="kc-seg">
        <button className={val === "All" ? "on" : ""} onClick={() => set("All")}>All</button>
        {opts.map((o) => <button key={o} className={val === o ? "on" : ""} onClick={() => set(o)}>{o}</button>)}
      </div>
    </div>
  );

  return (
    <div className="kc view">
      <div className="kc-head">
        <div className="kc-eyebrow">Knowledge Centre</div>
        <h1>Learn how a child's growth <em>becomes visible</em></h1>
        <p className="kc-dek">The thinking behind Curio, and practical guidance for parents and families — as articles, infographics and papers you can read, share and download.</p>
      </div>

      {/* hero: the all-in-one diagram */}
      <div className="kc-hero">
        <div className="kc-hero-bar">
          <span className="kc-hero-tag">The whole story, one page</span>
          <div className="kc-hero-actions">
            <a href={path("one-diagram.html")} target="_blank" rel="noopener">Open full ↗</a>
            <a href={path("one-diagram.html")} download>Download</a>
          </div>
        </div>
        <iframe className="kc-frame" src={path("one-diagram.html")} title="Curio at a glance" loading="lazy" />
      </div>

      {/* library controls */}
      <div className="kc-controls">
        <input className="kc-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the library…" />
        <div className="kc-filters">
          {seg("Type", KINDS, kind, setKind)}
          {seg("For", AUDIENCES, audience, setAudience)}
          {seg("Discipline", DISCIPLINES, discipline, setDiscipline)}
        </div>
      </div>
      <div className="kc-count">{shown.length} of {MATERIALS.length} materials</div>

      {/* tiles */}
      <div className="kc-grid">
        {shown.map((m) => (
          <article className="kc-tile" key={m.id} style={{ ["--tile" as string]: KIND_COLOR[m.kind] }}>
            <div className="kc-thumb">
              <span className="kc-kind">{m.kind}</span>
              <span className="kc-strands"><i /><i /><i /></span>
            </div>
            <div className="kc-body">
              <h3>{m.title}</h3>
              <p>{m.blurb}</p>
              <div className="kc-meta">
                {m.audience.map((a) => <span key={a} className="kc-chip">{a}</span>)}
                {m.discipline.filter((d) => d !== "General").map((d) => <span key={d} className="kc-chip alt">{d}</span>)}
                <span className="kc-mins">{m.mins} min</span>
              </div>
            </div>
            <div className="kc-actions">
              <a className="kc-view" href={path(m.file)} target="_blank" rel="noopener">Read ↗</a>
              <a className="kc-dl" href={path(m.file)} download title="Download">↓</a>
            </div>
          </article>
        ))}
        {shown.length === 0 && <div className="kc-empty">Nothing matches those filters yet. Try clearing one.</div>}
      </div>
    </div>
  );
}
