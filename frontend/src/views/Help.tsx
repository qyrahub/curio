import { useMemo, useState } from "react";
import PageHero from "../components/PageHero";
import "./help.css";

interface Topic { title: string; body: string; route?: string; keys?: string; }
interface Group { heading: string; note?: string; topics: Topic[]; }

const GUIDE: Group[] = [
  {
    heading: "Start here",
    note: "The core idea, in a nutshell.",
    topics: [
      { title: "What Curio is", body: "A cockpit for each child. You bring a real need — a worksheet, a hard evening, a worry — and Curio helps you understand it, turn it into a small plan, and watch how your child grows over time. It's guidance for families, not a diagnosis.", keys: "about overview intro what is curio start" },
      { title: "The core loop", body: "Develop → describe a need → get an honest review → build a plan → submit. Each submission adds a dated point, so Insights, the Brain and the Progress Report all build up a real picture over time.", route: "develop", keys: "loop cycle how it works flow develop" },
      { title: "Switching child", body: "Most screens (Develop, Insights, Brain, Journal) have a child switcher near the top. Pick the child you're working with and everything scopes to them.", keys: "child switch focus select zaiah khumo change" },
    ],
  },
  {
    heading: "The modules",
    note: "What each tab is for.",
    topics: [
      { title: "Develop", body: "The flagship. Describe a need five ways — type, paste a URL, upload a photo of schoolwork, upload a file (PDF/Word/text), or dictate — then Analyse, review the strengths and watch-points, choose recommendations into a plan, and Submit. Turn on Deep Thinking for clarifying questions first.", route: "develop", keys: "develop need review plan analyse photo file dictate deep thinking" },
      { title: "Insights", body: "How your child is really doing, over time: growth curve, issues-over-time with recurrence, ranked intelligence with a time-scrubber, the profile wheel, benchmarking radars, value tiles — and the shareable Progress Report at the top.", route: "insights", keys: "insights growth trends radar wheel progress report benchmark" },
      { title: "Brain", body: "A per-child memory you can watch learn: what it has absorbed (real events, including journal notes), its current read of the child (an AI portrait from history — an inference, not a diagnosis), and how that shapes guidance.", route: "brain", keys: "brain memory portrait read absorbed learning" },
      { title: "Journal", body: "Jot observations, wins and worries as they happen — scoped to a child, the family, or general. Over time it reveals honest patterns, and child entries feed that child's Brain.", route: "journal", keys: "journal notes diary observations patterns record" },
      { title: "Knowledge Centre", body: "The thinking behind Curio and practical guidance for families — articles, infographics and papers you can read, search and download, filtered by type, audience and discipline.", route: "learn", keys: "knowledge centre learn articles infographics library materials download" },
      { title: "Coach", body: "In-the-moment homework help for a child.", route: "coach", keys: "coach homework help" },
      { title: "Planner", body: "The interactive plan of tracked steps for a child — the Journal sits right beside it.", route: "planner", keys: "planner plan schedule steps gantt" },
      { title: "Library & Canvas", body: "Library holds books and materials; Canvas is a creative space for activities and games.", route: "library", keys: "library canvas books games activities" },
    ],
  },
  {
    heading: "How do I…?",
    note: "Common tasks, step by step.",
    topics: [
      { title: "Analyse a photo of schoolwork", body: "Develop → Needs → 📷 Photo → choose the photo → add a note (e.g. 'typed = teacher instructions, handwriting = the child') → Analyse. Curio reads how well the child followed each instruction.", route: "develop", keys: "photo worksheet scan analyse schoolwork upload image" },
      { title: "Generate the Brain's read", body: "Submit a review or two first, then open Brain → pick the child → Generate the read. Refresh it after new reviews to watch it sharpen.", route: "brain", keys: "brain read portrait generate refresh" },
      { title: "Share a progress report", body: "Insights → top of the page → your child's Progress Report → PDF / HTML / Copy / Email. It needs at least one submitted review.", route: "insights", keys: "progress report share export pdf teacher tutor" },
      { title: "Find and download materials", body: "Knowledge Centre → search or use the Type / For / Discipline filters → open a tile to read, or use the download button.", route: "learn", keys: "download material article search filter knowledge" },
      { title: "Record and review patterns", body: "Journal → pick a scope → add entries over time → Reveal patterns to see honest themes and trends.", route: "journal", keys: "journal patterns reveal record entries" },
    ],
  },
  {
    heading: "How your data works",
    note: "The honesty behind the numbers.",
    topics: [
      { title: "Real data only", body: "Levels and trends are computed from your child's own dated history — never seeded or simulated. Empty states say 'still learning' rather than inventing a picture.", keys: "data honest real seeded percentile trust" },
      { title: "Benchmarks are references, not rankings", body: "Where a benchmark shows, it's an admin-approved 'typical-for-age' reference, not a measured percentile. AI may propose values, but a person approves them first.", keys: "benchmark percentile ranking typical for age reference" },
      { title: "Inference, not diagnosis", body: "The Brain's read and the journal's patterns are inferences from history, clearly labelled as such. Curio is guidance and tracking for families — not a clinical or diagnostic instrument.", keys: "diagnosis inference clinical medical guidance disclaimer" },
    ],
  },
];

export default function Help() {
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return GUIDE;
    return GUIDE.map((g) => ({ ...g, topics: g.topics.filter((t) => (t.title + " " + t.body + " " + (t.keys || "")).toLowerCase().includes(needle)) })).filter((g) => g.topics.length);
  }, [q]);
  const total = groups.reduce((n, g) => n + g.topics.length, 0);

  return (
    <div className="hlp view">
      <PageHero kind="parent" eyebrow="Help & guide" title={<>Find your way <em>around</em></>}
        tease="What Curio has, how to navigate it, and how to get things done — search below or browse." />

      <input className="hlp-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search help… (e.g. photo, progress report, brain)" autoFocus />
      {q && <div className="hlp-count">{total} result{total === 1 ? "" : "s"}</div>}

      {groups.map((g) => (
        <section className="hlp-group" key={g.heading}>
          <div className="hlp-gh"><h2>{g.heading}</h2>{g.note && <span className="muted">{g.note}</span>}</div>
          <div className="hlp-topics">
            {g.topics.map((t) => (
              <div className="hlp-topic" key={t.title}>
                <div className="hlp-t-head">
                  <h3>{t.title}</h3>
                  {t.route && <button className="hlp-open" onClick={() => { window.location.hash = t.route as string; }}>Open →</button>}
                </div>
                <p>{t.body}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
      {total === 0 && <div className="hlp-empty">No help topics match “{q}”. Try a simpler word, or clear the search.</div>}

      <div className="hlp-foot">
        Still stuck? Use the <b>Feedback</b> tab to send a note — it goes straight to the team.
      </div>
    </div>
  );
}
