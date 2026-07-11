import { useEffect, useState } from "react";
import { brand } from "../lib/brand";
import AskCurio from "../components/AskCurio";
import { api } from "../lib/api";
import { PreviewArt } from "../components/heroArt";
import { useWonder } from "../lib/wonderPool";
import type { Feeds } from "../types";

export default function Home({ nav }: { nav: (r: string) => void }) {
  const { wonder } = useWonder();
  const [feeds, setFeeds] = useState<Feeds | null>(null);
  const load = (shuffle = false) => api.feeds(shuffle).then(setFeeds).catch(() => setFeeds(null));
  useEffect(() => { load(); }, []);

  const modes: [string, string, string, string][] = [
    ["child", "🧒", "For your child", "A curated, illustrated learning adventure from one thing: their age."],
    ["parent", "👪", "For you, the parent", "A gentle snapshot, daily nudges and tips that actually help."],
    ["family", "🏡", "For the family", "Learning, lifestyle and outings to do together."],
    ["canvas", "🎨", "Canvas", "Make projects, books and playful things together."],
    ["brain", "🧠", "The Brain", `What ${brand.name} is learning to make every plan better.`],
  ];
  const cards: [string, string | undefined][] = [
    ["🌍 Around the world", feeds?.world], ["📈 Parenting trend", feeds?.trend],
    ["🧰 New tools", feeds?.tools], ["✨ Did you know", feeds?.fact],
  ];

  return (
    <div className="view">
      <section className="hero">
        <div>
          <h1>Make today's <em>learning adventure</em> for your child.</h1>
          <p>Tell us how old they are — that's all we need. Press one button and {brand.name} builds a bright, balanced plan to explore together.</p>
          <div className="cta-wrap">
            <button className="cta" onClick={() => nav("child")}>✨ Build a plan</button>
            <span className="cta-note">Only the age is required.</span>
          </div>
        </div>
        <div className="card" aria-label="Example of what one page looks like">
          <div className="card-head">
            <span className="dot" style={{ background: "var(--leaf)" }} />
            <span className="topic">{wonder.tag} · Today's spark</span>
            <span className="pageno">Preview</span>
          </div>
          <div className="card-body">
            <div className="anchor"><PreviewArt /></div>
            <div className="guide">
              <div className="lead">{wonder.lead}
                <small>{wonder.small}</small>
              </div>
              <div className="challenge">
                <b>{wonder.kind === "try" ? "Try this" : "Did you know"}</b>
                {wonder.body}
              </div>
            </div>
          </div>
        </div>
      </section>
      <AskCurio />

      <div className="modes">
        {modes.map(([r, e, t, d]) => (
          <button key={r} className="mode-card" onClick={() => nav(r)}>
            <div className="mh"><span className="mg">{e}</span><b>{t}</b></div>
            <p className="muted">{d}</p>
          </button>
        ))}
      </div>

      <div className="refresh-row">
        <h3>From the world of learning</h3>
        <button className="btn btn-primary btn-sm refresh-btn" onClick={() => load(true)}>↻ Refresh</button>
      </div>
      <div className="grid-cards g4">
        {cards.map(([t, body]) => (
          <div key={t} className="feed-card">
            <div className="ftag">{t}</div>
            <p className="fbody">{body ?? "…"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
