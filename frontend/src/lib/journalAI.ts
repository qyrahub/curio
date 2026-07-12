import { askJSON } from "./ai";

/* Client-side AI analysis for Journal conversation & dialogue entries.

   The current backend JournalEntry schema doesn't have fields for AI-generated
   summary / themes / recommendations. Rather than gate this feature on a
   backend migration, we cache the AI output in localStorage keyed by entry id.
   When the backend eventually accepts these fields, hydration falls back
   naturally (server value wins if present).

   Recommendations carry a "kind" so the UI can offer the right action:
   - planner  → "Add to planner" button routes to the interactive planner
   - coach    → link to Coach for follow-up guidance
   - develop  → link to Develop to record as a Need
   - brain    → informs the child's Brain declared focus (surfaced next refresh)
   - reflect  → no side-effect, just a note back to the parent

   Downstream honesty rule preserved: this is inference from what the parent
   wrote/dictated, clearly labelled in the UI, and never treated as observed
   evidence about the child. */

export type JournalMode = "personal" | "conversation" | "dialogue";
export type RecKind = "planner" | "coach" | "develop" | "brain" | "reflect";
export interface JournalRec { text: string; kind: RecKind; }
export interface JournalAnalysis {
  summary: string;
  themes: string[];
  recommendations: JournalRec[];
  tone: string;
}

const CACHE_KEY = "curio.journal.ai.v1";

function loadCache(): Record<string, JournalAnalysis> {
  try { const raw = localStorage.getItem(CACHE_KEY); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
function saveCache(next: Record<string, JournalAnalysis>) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch { /* quota / private mode */ }
}

export const journalAI = {
  get(entryId: string): JournalAnalysis | null {
    return loadCache()[entryId] || null;
  },
  set(entryId: string, a: JournalAnalysis) {
    const c = loadCache(); c[entryId] = a; saveCache(c);
  },
  drop(entryId: string) {
    const c = loadCache(); delete c[entryId]; saveCache(c);
  },
};

/* Analyse a conversation transcript (two parents) or a parent-child dialogue.
   Returns null on any failure so callers can degrade gracefully. */
export async function analyseJournal({
  mode, transcript, participants, childName, childAge,
}: {
  mode: JournalMode;
  transcript: string;
  participants: string[];
  childName?: string;
  childAge?: number;
}): Promise<JournalAnalysis | null> {
  if (!transcript.trim()) return null;

  const ctx = mode === "conversation"
    ? `This is a conversation between ${participants[0] || "one parent"} and ${participants[1] || "another parent"}, discussing a matter, event or situation together.`
    : mode === "dialogue"
      ? `This is a dialogue between a parent (${participants[0] || "the parent"}) and their child ${childName ? childName : participants[1] || "the child"}${childAge ? `, aged ${childAge}` : ""}.`
      : `This is a personal journal entry written by a parent.`;

  const prompt = [
    `You are helping a parent make sense of what they just journalled. ${ctx}`,
    "",
    "TRANSCRIPT (verbatim, as captured):",
    transcript.trim(),
    "",
    "Read it as a warm, thoughtful listener. Return a short, honest analysis.",
    "- summary: 1-2 concise sentences saying what was actually discussed. Neutral, not therapy-speak.",
    "- themes: 1-4 short tags (2-4 words each) naming the main subjects — e.g. 'bedtime routine', 'school anxiety', 'chore fairness'.",
    "- recommendations: 0-4 concrete follow-up actions the parent could take. Each has {text, kind}, where kind is one of:",
    "    * 'planner'  — something to schedule (e.g. 'Reserve Sunday morning for a family talk')",
    "    * 'coach'    — a parenting approach worth discussing with the Coach",
    "    * 'develop'  — record as a growth need for a specific child in Develop",
    "    * 'brain'    — a signal to add to a child's declared focus in the Brain",
    "    * 'reflect'  — no action, just something worth sitting with",
    "  If the transcript is too thin, return an empty recommendations array. Don't invent.",
    "- tone: 1-3 words describing the emotional register (e.g. 'warm and curious', 'tense', 'reflective').",
    "",
    "Ground everything in what the transcript actually says. Do NOT project onto the child; if you can't tell, say so.",
    "",
    'Return ONLY JSON: {"summary": string, "themes": [string], "recommendations": [{"text": string, "kind": string}], "tone": string}',
  ].join("\n");

  const raw = await askJSON<{
    summary?: string;
    themes?: string[];
    recommendations?: { text?: string; kind?: string }[];
    tone?: string;
  }>(prompt);
  if (!raw) return null;

  const allowedKinds: RecKind[] = ["planner", "coach", "develop", "brain", "reflect"];
  const recs: JournalRec[] = (raw.recommendations || [])
    .filter((r) => r && typeof r.text === "string" && r.text.trim())
    .map((r) => ({
      text: (r.text as string).trim(),
      kind: (allowedKinds.includes(r.kind as RecKind) ? r.kind : "reflect") as RecKind,
    }));

  return {
    summary: (raw.summary || "").trim(),
    themes: (raw.themes || []).filter((t) => typeof t === "string" && t.trim()).map((t) => t.trim()).slice(0, 8),
    recommendations: recs.slice(0, 6),
    tone: (raw.tone || "").trim(),
  };
}
