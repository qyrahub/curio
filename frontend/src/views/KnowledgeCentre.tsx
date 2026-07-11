import { useMemo, useState } from "react";
import PageHero from "../components/PageHero";
import "./knowledgeCentre.css";

type Kind = "Article" | "Infographic" | "Working paper" | "One-page" | "Reference";
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
  { id: "onepage-traffic-jam", title: "Where is the traffic jam?", blurb: "One page: a diagram of how thinking flows through Input, Elaboration and Output — with the explanation beside it.", kind: "One-page", audience: ["Parent", "Family"], discipline: ["Cognitive"], file: "onepage-traffic-jam.html", mins: "3" },
  { id: "feuerstein-functions", title: "Cognitive strategies & functions", blurb: "Feuerstein's framework in full: the three stages, what each is made of, and how to coach a child through a mental block.", kind: "Working paper", audience: ["Parent", "Family"], discipline: ["Cognitive"], file: "feuerstein-functions.html", mins: "7" },
  { id: "feuerstein-checklist", title: "Cognitive functions checklist", blurb: "A working reference pairing each growth area with the cognitive function it corresponds to, across all three phases. Tickable.", kind: "Reference", audience: ["Parent", "Family"], discipline: ["Cognitive"], file: "feuerstein-checklist.html", mins: "6" },
];

const KIND_COLOR: Record<Kind, string> = { "Article": "var(--kc-teal)", "Infographic": "var(--kc-coral)", "Working paper": "var(--kc-blue)", "One-page": "var(--kc-gold)", "Reference": "var(--kc-blue)" };
const KINDS: Kind[] = ["Article", "Infographic", "Working paper", "One-page", "Reference"];
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
      <PageHero kind="learn" eyebrow="Knowledge Centre"
        title={<>Learn how a child's growth <em>becomes visible</em></>}
        tease="The thinking behind Curio, and practical guidance for parents and families — as articles, infographics and papers you can read, share and download." />

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

      {/* one-page learning — visual left, explanation right */}
      <div className="kc-onepage">
        <div className="kc-op-head">
          <div>
            <div className="kc-op-eyebrow">One-page learning</div>
            <h2>A single idea, seen and explained</h2>
            <p className="kc-op-dek">Each one-pager pairs a diagram with the thinking beside it — the whole concept in one sitting.</p>
          </div>
        </div>
        <div className="kc-op-grid">
          {MATERIALS.filter((m) => m.kind === "One-page").map((m) => (
            <article className="kc-op-card" key={m.id}>
              <div className="kc-op-preview">
                <iframe src={path(m.file)} title={m.title} loading="lazy" scrolling="no" />
              </div>
              <div className="kc-op-body">
                <h3>{m.title}</h3>
                <p>{m.blurb}</p>
                <div className="kc-op-actions">
                  <a className="kc-view" href={path(m.file)} target="_blank" rel="noopener">Open ↗</a>
                  <a className="kc-dl" href={path(m.file)} download title="Download">↓</a>
                </div>
              </div>
            </article>
          ))}
        </div>
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
