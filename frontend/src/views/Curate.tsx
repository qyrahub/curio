import { useEffect, useRef, useState } from "react";
import PageHero from "../components/PageHero";
import { useProfile, THEMES } from "../lib/profile";
import { TOPICS, findTopic, matchTopic, type CurateTile, type CurateTopic } from "../lib/curateTopics";
import { useDictation, dictationSupported } from "../lib/dictation";
import { askJSON } from "../lib/ai";
import { api } from "../lib/api";
import { extractFileText } from "../lib/fileParse";
import "./curate.css";

/* Curio · Curate — specialised learning tools for topics like ADHD.

   Non-negotiable design constraint: honesty rails on every screen. The
   disclaimer banner sits at the top of every view (landing / topic / tile),
   copy on medications tiles never mentions brands or doses, chat prompts
   include a hard "never diagnose, never prescribe" instruction that survives
   whatever the parent asks. See curateTopics.ts for the full rules the
   content is written under.                                                 */

type View =
  | { kind: "landing" }
  | { kind: "topic"; topicId: string; suggestedTiles?: CurateTile[] }
  | { kind: "tile"; topicId: string; tileId: string };

interface ChatTurn { who: "you" | "curio"; text: string; time: number; }

const EVIDENCE_LABEL: Record<string, { label: string; cls: string }> = {
  strong: { label: "Strong evidence", cls: "cev-strong" },
  moderate: { label: "Moderate evidence", cls: "cev-moderate" },
  mixed: { label: "Mixed evidence", cls: "cev-mixed" },
  limited: { label: "Limited evidence", cls: "cev-limited" },
  emerging: { label: "Emerging evidence", cls: "cev-emerging" },
};

export default function Curate() {
  const { focusChild } = useProfile();
  const [view, setView] = useState<View>({ kind: "landing" });

  // Landing state
  const [query, setQuery] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  const child = focusChild;
  const childTheme = child ? THEMES[child.theme] : null;

  /* Landing search — either matches a seeded topic (ADHD today, more later)
     or asks the AI to seed a Pandora of tile suggestions for the query. */
  const runSearch = async () => {
    const q = query.trim();
    if (!q) return;
    const match = matchTopic(q);
    if (match) { setView({ kind: "topic", topicId: match }); return; }
    // Fall back to AI-generated tiles for arbitrary topics.
    setSeeding(true);
    setSeedError(null);
    try {
      const suggested = await seedTilesForQuery(q);
      if (!suggested || suggested.length === 0) {
        setSeedError("Couldn't come up with tiles for that just now. Try a broader term, or one of the seeded topics below.");
        setSeeding(false);
        return;
      }
      setView({ kind: "topic", topicId: `custom:${q}`, suggestedTiles: suggested });
    } catch {
      setSeedError("Couldn't reach the assistant. Try again in a moment.");
    } finally {
      setSeeding(false);
    }
  };

  const openTopic = (id: string) => { setQuery(""); setView({ kind: "topic", topicId: id }); };
  const openTile = (topicId: string, tileId: string) => { setView({ kind: "tile", topicId, tileId }); };
  const backHome = () => { setQuery(""); setSeedError(null); setView({ kind: "landing" }); };
  const backTopic = (topicId: string) => {
    // If we're inside a custom topic, going back should return to the same
    // tile set — but the state for that is lost. Simpler UX: back to landing.
    if (topicId.startsWith("custom:")) backHome();
    else setView({ kind: "topic", topicId });
  };

  return (
    <div className="cu view">
      <PageHero kind="learn" eyebrow="Curate" title={<>Focused tools for <em>specific topics</em></>}
        tease="Pick a topic you're navigating with your child — ADHD, sleep, anxiety, learning differences — and Curio gives you a small toolkit for it: a plain-language overview, a fair look at the options, questions worth asking a professional, and a place to ask." />

      {/* Persistent disclaimer — visible on every screen inside Curate. */}
      <DisclaimerBanner />

      {view.kind === "landing" && (
        <Landing
          query={query} setQuery={setQuery} runSearch={runSearch}
          seeding={seeding} seedError={seedError}
          openTopic={openTopic}
        />
      )}
      {view.kind === "topic" && (
        <TopicView view={view} openTile={openTile} back={backHome} />
      )}
      {view.kind === "tile" && (
        <TileView topicId={view.topicId} tileId={view.tileId} back={() => backTopic(view.topicId)} childCtx={buildChildCtx(child, childTheme?.name)} />
      )}
    </div>
  );
}

/* ---------- Persistent disclaimer ---------- */
function DisclaimerBanner() {
  return (
    <div className="cu-disclaimer">
      <b>Not medical advice.</b> Curate is a learning tool for parents. Nothing here is a diagnosis, treatment plan, or prescription. For anything that could shape a medical decision, talk to your paediatrician, GP or a qualified specialist who knows your child.
    </div>
  );
}

/* ---------- Landing ---------- */
function Landing({ query, setQuery, runSearch, seeding, seedError, openTopic }: {
  query: string; setQuery: (v: string) => void; runSearch: () => void;
  seeding: boolean; seedError: string | null;
  openTopic: (id: string) => void;
}) {
  return (
    <>
      <div className="cu-search">
        <label className="cu-search-label">What are you exploring today?</label>
        <div className="cu-search-row">
          <input
            className="cu-search-input"
            placeholder="e.g. ADHD, homework anxiety, screen time, sleep patterns…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
          />
          <button className="cu-search-btn" onClick={runSearch} disabled={seeding || !query.trim()}>
            {seeding ? "Seeding tiles…" : "Explore"}
          </button>
        </div>
        <p className="cu-search-hint">If your topic is seeded, we open a curated toolkit for it. If not, Curio proposes a set of tools tailored to your query — you can chat with any of them.</p>
        {seedError && <div className="cu-flash">{seedError}</div>}
      </div>

      <h3 className="cu-section-h">Featured topics</h3>
      <div className="cu-topics">
        {TOPICS.map((t) => (
          <button key={t.id} className="cu-topic-card" onClick={() => openTopic(t.id)}>
            <div className="cu-topic-emoji">{t.emoji}</div>
            <div className="cu-topic-name">{t.name}</div>
            <div className="cu-topic-brief">{t.brief}</div>
            <div className="cu-topic-count">{t.tiles.length} tools →</div>
          </button>
        ))}
        <div className="cu-topic-card cu-topic-coming">
          <div className="cu-topic-emoji">✨</div>
          <div className="cu-topic-name">More coming</div>
          <div className="cu-topic-brief">Autism, dyslexia, anxiety, sensory processing, sleep, giftedness, school refusal — each built with the same honesty rails.</div>
          <div className="cu-topic-count">Ask via search meanwhile</div>
        </div>
      </div>
    </>
  );
}

/* ---------- Topic view (Pandora of tiles) ---------- */
function TopicView({ view, openTile, back }: {
  view: Extract<View, { kind: "topic" }>;
  openTile: (topicId: string, tileId: string) => void;
  back: () => void;
}) {
  const seeded = view.topicId.startsWith("custom:") ? null : findTopic(view.topicId);
  const tiles = seeded ? seeded.tiles : view.suggestedTiles || [];
  const name = seeded ? seeded.name : view.topicId.replace(/^custom:/, "");
  const emoji = seeded?.emoji || "✨";
  const brief = seeded?.brief || `A tailored toolkit for exploring "${name}".`;

  return (
    <>
      <button className="cu-back" onClick={back}>← All topics</button>
      <div className="cu-topic-head">
        <div className="cu-topic-head-emoji">{emoji}</div>
        <div>
          <div className="cu-topic-head-title">{name}</div>
          <div className="cu-topic-head-brief">{brief}</div>
        </div>
      </div>
      {!seeded && view.suggestedTiles && (
        <p className="cu-ai-note"><b>AI-suggested tiles.</b> These are proposals shaped by your query, not curated content. Every chat still carries the same honesty rails as the seeded topics.</p>
      )}
      <div className="cu-tiles">
        {tiles.map((tile) => (
          <button key={tile.id} className={"cu-tile k-" + tile.kind} onClick={() => openTile(view.topicId, tile.id)}>
            <div className="cu-tile-icon">{tile.icon}</div>
            <div className="cu-tile-title">{tile.title}</div>
            <div className="cu-tile-brief">{tile.brief}</div>
            <div className="cu-tile-cta">{tile.kind === "chat" ? "Chat →" : "Open →"}</div>
          </button>
        ))}
      </div>
    </>
  );
}

/* ---------- Tile view — content or chat ---------- */
function TileView({ topicId, tileId, back, childCtx }: {
  topicId: string; tileId: string; back: () => void; childCtx: string;
}) {
  const topic = topicId.startsWith("custom:") ? null : findTopic(topicId);
  // Seeded tile only comes from a real topic; AI-generated tiles all go into
  // chat mode (there's no pre-written content behind them).
  const tile = topic?.tiles.find((t) => t.id === tileId);

  if (!tile) {
    // Custom / AI-suggested tile — reconstruct the minimal metadata from ids
    // and render as a chat scoped to the tile "angle" implied by the id.
    const angle = tileId.replace(/[-_]/g, " ");
    return (
      <>
        <button className="cu-back" onClick={back}>← Back</button>
        <div className="cu-tile-head">
          <div className="cu-tile-head-icon">💬</div>
          <div>
            <div className="cu-tile-head-title">{angle}</div>
            <div className="cu-tile-head-brief">Open chat scoped to this angle.</div>
          </div>
        </div>
        <ChatBox
          topic={topicId.replace(/^custom:/, "")}
          angle={angle}
          system="You are a warm, careful parenting guide. Never diagnose. Never recommend specific medications, brands or doses. Point back to a qualified professional for any medical or safety decision. When evidence is uneven, say so. Use the child's declared profile to make guidance concrete only where it's clearly helpful, and never treat it as evidence of a diagnosis."
          childCtx={childCtx}
        />
      </>
    );
  }

  return (
    <>
      <button className="cu-back" onClick={back}>← Back to {topic?.name || "topic"}</button>
      <div className="cu-tile-head">
        <div className="cu-tile-head-icon">{tile.icon}</div>
        <div>
          <div className="cu-tile-head-title">{tile.title}</div>
          <div className="cu-tile-head-brief">{tile.brief}</div>
        </div>
      </div>

      {tile.kind === "chat" && (
        <ChatBox
          topic={topic!.name}
          angle={tile.title}
          system={tile.chatSystem || ""}
          childCtx={childCtx}
        />
      )}

      {tile.kind !== "chat" && tile.sections && (
        <div className="cu-content">
          {tile.sections.map((sec, i) => (
            <div key={i} className="cu-sec">
              <h4>{sec.h}</h4>
              {sec.p && <p>{sec.p}</p>}
              {sec.list && (
                <ul>{sec.list.map((it, j) => <li key={j}>{it}</li>)}</ul>
              )}
              {sec.compare && (
                <div className="cu-compare">
                  {sec.compare.map((c, j) => {
                    const ev = EVIDENCE_LABEL[c.evidence];
                    return (
                      <div className="cu-compare-card" key={j}>
                        <div className="cu-compare-head">
                          <b>{c.label}</b>
                          <span className={"cu-ev " + ev.cls}>{ev.label}</span>
                        </div>
                        <div className="cu-compare-body">
                          <div className="cu-pros">
                            <div className="cu-pros-h">Pros</div>
                            <ul>{c.pros.map((p, k) => <li key={k}>{p}</li>)}</ul>
                          </div>
                          <div className="cu-cons">
                            <div className="cu-cons-h">Trade-offs</div>
                            <ul>{c.cons.map((p, k) => <li key={k}>{p}</li>)}</ul>
                          </div>
                        </div>
                        {c.note && <div className="cu-compare-note">{c.note}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
              {sec.refs && (
                <div className="cu-refs">
                  {sec.refs.map((r, k) => (
                    <div className="cu-ref" key={k}>
                      <span className={"cu-ref-kind r-" + r.kind}>{r.kind}</span>
                      <div className="cu-ref-body">
                        <div className="cu-ref-label">
                          {r.url ? (
                            <a href={r.url} target="_blank" rel="noopener noreferrer">{r.label} <span aria-hidden>↗</span></a>
                          ) : r.label}
                        </div>
                        <div className="cu-ref-source">{r.source}</div>
                        {r.note && <div className="cu-ref-note">{r.note}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {tile.kind === "medications" && (
            <div className="cu-callout">
              <b>Reminder:</b> This tile talks about families of medication only — not brand names, not doses. Specific decisions belong with your child's prescriber.
            </div>
          )}
          {tile.kind === "natural" && (
            <div className="cu-callout">
              <b>Safety reminder:</b> Herbs and supplements can interact with medications. If your child takes anything prescribed, discuss any addition with their prescriber before starting.
            </div>
          )}
          {tile.kind === "nutrition" && (
            <div className="cu-callout">
              <b>A note:</b> Nutrition is one input among many. For anything that could affect growth, weight, or a diagnosed condition, a paediatric dietitian or your GP is the right first stop.
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* ---------- Chat with text, voice, URL, file ---------- */
function ChatBox({ topic, angle, system, childCtx }: {
  topic: string; angle: string; system: string; childCtx: string;
}) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [urlFetched, setUrlFetched] = useState<{ title: string; text: string; url: string } | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const [fileNote, setFileNote] = useState("");
  const flashSoon = (t: string) => { setFlash(t); setTimeout(() => setFlash(""), 3200); };
  const scrollRef = useRef<HTMLDivElement>(null);

  const dict = useDictation({
    onResult: (t) => setInput((cur) => (cur ? cur.trimEnd() + " " : "") + t),
    onError: flashSoon,
  });

  useEffect(() => {
    // Auto-scroll to bottom on new turn.
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns.length, busy]);

  const send = async () => {
    const message = input.trim();
    if (!message) return;
    setInput("");
    const nextTurns: ChatTurn[] = [...turns, { who: "you", text: message, time: Date.now() }];
    setTurns(nextTurns);
    setBusy(true);
    try {
      // Build the prompt with the topic scope, honesty rails, and child context.
      const historyText = nextTurns.slice(-6).map((t) => `${t.who === "you" ? "Parent" : "Curio"}: ${t.text}`).join("\n");
      const contextText = [
        childCtx,
        fileNote ? `\nDocument the parent shared (excerpt): ${fileNote.slice(0, 3000)}` : "",
        urlFetched ? `\nWeb page the parent shared: "${urlFetched.title}" (${urlFetched.url})\n---\n${urlFetched.text.slice(0, 6000)}\n---` : "",
      ].filter(Boolean).join("\n");
      const prompt = [
        system || "You are a warm, careful parenting guide.",
        `Topic: ${topic}. Current angle: ${angle}.`,
        "NON-NEGOTIABLE:",
        "- NEVER diagnose, and NEVER give a diagnostic label to a specific child.",
        "- NEVER recommend specific medication brands, names or doses.",
        "- Redirect any medical or safety decision to a qualified professional.",
        "- Be honest about evidence quality — 'strong / moderate / mixed / limited / emerging'.",
        "- Use the parent's declared child context to make guidance concrete only where clearly helpful; never treat it as evidence of a diagnosis.",
        "- Reply in warm, plain English (2-6 short paragraphs typically). Use bullet points only when they help clarity.",
        "",
        contextText ? `Context from the parent:\n${contextText}` : "",
        "",
        `Conversation so far:\n${historyText}`,
        "",
        "Now respond to the parent's latest message.",
      ].filter(Boolean).join("\n");

      const res = await api.ask(prompt, { mode: "coach" });
      const reply = (res.reply || "").trim() || "I couldn't come up with a helpful answer just now — try rephrasing?";
      setTurns((prev) => [...prev, { who: "curio", text: reply, time: Date.now() }]);
    } catch {
      setTurns((prev) => [...prev, { who: "curio", text: "Sorry — I couldn't reach the assistant just now. Try again in a moment.", time: Date.now() }]);
    } finally { setBusy(false); }
  };

  const attachFile = async (file: File) => {
    if (!file) return;
    // Audio file → route to Whisper via useDictation.transcribeFile if we
    // had it exported here. Simpler: try text extraction; if that fails and
    // it's audio, we fall back to just noting it.
    if (file.type.startsWith("audio/")) {
      flashSoon("Audio in chat: use the 🎤 mic to dictate directly. To transcribe an existing recording, use the Journal's paperclip button.");
      return;
    }
    try {
      const text = await extractFileText(file);
      const cleaned = (text || "").trim();
      if (!cleaned) { flashSoon("Couldn't pull text from that file — try a plain text, PDF or docx."); return; }
      setFileNote(cleaned);
      flashSoon(`Attached '${file.name}' as reference. Sent with your next message.`);
    } catch {
      flashSoon("Couldn't read that file. Text, PDF and docx work best.");
    }
  };

  const fetchUrl = async () => {
    const url = urlInput.trim();
    if (!url) return;
    // Basic client-side check — the backend does the real validation.
    if (!/^https?:\/\//i.test(url)) {
      flashSoon("URLs need to start with https:// or http://");
      return;
    }
    setUrlLoading(true);
    try {
      const res = await api.urlFetch(url);
      setUrlFetched(res);
      setUrlInput("");
      flashSoon(`Fetched '${res.title}' — sent as context with your next message.`);
    } catch (e) {
      // Backend already sanitises the error — safe to surface directly.
      const raw = e instanceof Error ? e.message : "Couldn't fetch that URL.";
      flashSoon(raw);
    } finally {
      setUrlLoading(false);
    }
  };

  return (
    <div className="cu-chat">
      <div className="cu-chat-turns" ref={scrollRef}>
        {turns.length === 0 && (
          <div className="cu-chat-empty">
            <b>Ask anything about {topic.toLowerCase()}.</b>
            <p>Type your question, dictate it with the mic, or attach a document or URL for context. I'll answer in plain language — and I'll point you back to a professional for anything that could shape a medical decision.</p>
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className={"cu-turn t-" + t.who}>
            <div className="cu-turn-who">{t.who === "you" ? "You" : "Curio"}</div>
            <div className="cu-turn-text">{t.text}</div>
          </div>
        ))}
        {busy && <div className="cu-turn t-curio"><div className="cu-turn-who">Curio</div><div className="cu-turn-text cu-typing">Thinking…</div></div>}
      </div>

      {(fileNote || urlFetched) && (
        <div className="cu-chat-context">
          {fileNote && (
            <div className="cu-chip">📎 File attached · {fileNote.length.toLocaleString()} chars <button onClick={() => setFileNote("")}>×</button></div>
          )}
          {urlFetched && (
            <div className="cu-chip" title={urlFetched.url}>🌐 {urlFetched.title.slice(0, 60)}{urlFetched.title.length > 60 ? "…" : ""} · {urlFetched.text.length.toLocaleString()} chars <button onClick={() => setUrlFetched(null)}>×</button></div>
          )}
        </div>
      )}

      {flash && <div className="cu-flash">{flash}</div>}

      <div className="cu-chat-inputs">
        <div className="cu-chat-row">
          <textarea
            className="cu-chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }}
            rows={2}
            placeholder={`Ask about ${topic.toLowerCase()}… (Ctrl/⌘ + Enter to send)`}
            disabled={busy}
          />
          <div className="cu-chat-tools">
            {dictationSupported && (
              <button className={"cu-mic" + (dict.listening ? " on" : "")}
                onClick={() => (dict.listening ? dict.stop() : dict.start())}
                title={dict.listening ? "Stop recording" : "Dictate"}>
                {dict.listening ? "🎙️" : "🎤"}
              </button>
            )}
            <label className="cu-attach" title="Attach a document (txt, pdf, docx)">
              📎
              <input type="file" accept=".txt,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) attachFile(f); e.currentTarget.value = ""; }} />
            </label>
            <button className="cu-send" disabled={busy || !input.trim()} onClick={send}>
              {busy ? "…" : "Send"}
            </button>
          </div>
        </div>
        <div className="cu-chat-row">
          <input className="cu-url-input" type="url"
            placeholder={urlFetched ? "Fetch another URL…" : "Paste a URL and click Fetch — we'll pull the page text as context"}
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); fetchUrl(); } }}
            disabled={urlLoading} />
          <button className="cu-url-btn" onClick={fetchUrl} disabled={urlLoading || !urlInput.trim()}>
            {urlLoading ? "Fetching…" : "🌐 Fetch"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */
function buildChildCtx(child: ReturnType<typeof useProfile>["focusChild"], _themeName?: string): string {
  if (!child) return "";
  const bits: string[] = [
    `Focused child for the parent's context (INTENT AND BACKGROUND, NOT OBSERVATION): ${child.name}, age ${child.age}.`,
  ];
  const list = (label: string, arr?: string[]) => { if (arr && arr.length) bits.push(`${label}: ${arr.join(", ")}.`); };
  list("Interests", child.interests);
  list("Nurture goals", child.outcomes);
  list("Personality (parent's view)", child.personality);
  list("Preferences", child.preferences);
  list("Dislikes / friction", child.dislikes);
  list("Support needs / accommodations", child.needs);
  list("Priority areas", child.priorityAreas);
  if (child.history) bits.push(`History note from parent: ${child.history}`);
  bits.push("Never treat any of the above as evidence of a diagnosis or of what the child can already do.");
  return bits.join(" ");
}

/* AI-generated tile Pandora for queries that don't match a seeded topic. */
async function seedTilesForQuery(query: string): Promise<CurateTile[] | null> {
  const prompt = [
    `A parent is exploring the topic: "${query}"`,
    "",
    "Propose 4 to 6 tile suggestions — each is a different angle or tool the parent might want.",
    "Each tile has: id (kebab-case, unique), title (5–8 words), brief (one sentence), kind (one of 'overview', 'compare', 'practices', 'questions', 'chat'), icon (one emoji).",
    "Prefer kinds='chat' for a topic that mostly needs open discussion.",
    "",
    'Return ONLY JSON: {"tiles": [{"id": string, "title": string, "brief": string, "kind": string, "icon": string}]}',
  ].join("\n");

  const res = await askJSON<{ tiles?: { id?: string; title?: string; brief?: string; kind?: string; icon?: string }[] }>(prompt);
  if (!res || !Array.isArray(res.tiles)) return null;

  const allowedKinds = new Set(["overview", "compare", "practices", "questions", "chat"]);
  const out: CurateTile[] = res.tiles
    .filter((t) => t && typeof t.title === "string" && t.title.trim())
    .map((t) => ({
      id: (t.id || String(Math.random()).slice(2, 8)).toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      title: (t.title || "").trim(),
      brief: (t.brief || "").trim(),
      kind: (allowedKinds.has(t.kind || "") ? t.kind : "chat") as CurateTile["kind"],
      icon: (t.icon || "💡").slice(0, 4),
    }))
    .slice(0, 6);
  return out.length > 0 ? out : null;
}

/* Re-export CurateTopic so tsc doesn't complain about unused import when the
   type is only referenced structurally above. */
export type { CurateTopic };
