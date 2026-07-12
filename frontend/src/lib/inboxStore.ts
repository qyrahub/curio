/* Inbox — a small feed of curated news, findings and suggestions for the
   parent. This deploy ships the client-side scaffolding: a seed of items
   defined here in code, plus localStorage-tracked read state. Later deploys
   can promote this to a backend-driven feed (admin CRUD + AI-generated
   weekly notices) without any change to the Inbox.tsx render — as long as
   the shape stays the same.

   How to add an item: append to SEED_ITEMS below. Use one of the four kinds
   (news, finding, suggestion, welcome). New items appear at the top by
   virtue of the sort by createdAt desc. */

export type InboxKind = "news" | "finding" | "suggestion" | "welcome";

export interface InboxItem {
  id: string;
  kind: InboxKind;
  title: string;
  brief: string;      // one-line hook shown in the list
  body: string;       // full text shown on expand — plain text with line breaks
  createdAt: string;  // ISO
  href?: string;      // optional in-app anchor (e.g. "#curate")
  linkLabel?: string; // label for the CTA button when href is set
}

/* Seed items. Extend freely. */
export const SEED_ITEMS: InboxItem[] = [
  {
    id: "welcome-2026",
    kind: "welcome",
    title: "Welcome to your Inbox",
    brief: "The place we'll quietly leave you notes, curated findings and small nudges.",
    body:
      "This is your Inbox — a small feed we'll use to share things that seem worth your attention without needing to hunt for them.\n\n" +
      "Four kinds of items you might see here:\n" +
      "• Welcome — orientation notes, like this one.\n" +
      "• News — new features or capabilities.\n" +
      "• Findings — patterns Curio is noticing in the data you've added (only when there's enough to say something honest).\n" +
      "• Suggestions — small, low-effort things a parent could try this week.\n\n" +
      "The unread count sits as a badge on the Inbox icon in the top nav so you don't need to check.",
    createdAt: "2026-07-12T00:00:00Z",
  },
  {
    id: "news-curate-adhd",
    kind: "news",
    title: "Curate: a new tool under Learn",
    brief: "Specialised topic toolkits. First seeded topic: ADHD. More on the way.",
    body:
      "Learn now has a second submenu: Curate.\n\n" +
      "Each Curate topic bundles a small set of tools — a plain-language overview, a fair look at the options with pros/cons and honest evidence labels, a questions-for-the-professional crib sheet, and a chat where you can ask anything scoped to that topic.\n\n" +
      "The first seeded topic is ADHD. Coming next: expanded food and natural remedies content for ADHD, a references section pointing to reputable journals and organisations, and additional topics (autism, dyslexia, anxiety, sleep, sensory processing).\n\n" +
      "Every screen inside Curate carries the same disclaimer: it's a learning tool, not a diagnosis or treatment plan.",
    createdAt: "2026-07-12T00:00:00Z",
    href: "#curate",
    linkLabel: "Open Curate",
  },
  {
    id: "news-planner-redesign",
    kind: "news",
    title: "Interactive planner: two-panel redesign",
    brief: "Week strip on top, focused-day panel below — everything editable, no more cropping.",
    body:
      "The Interactive Planner used to squeeze seven day columns onto one row, which meant long priorities and tasks kept wrapping oddly and cropping at the edges. That's fixed with a real redesign rather than more CSS patches.\n\n" +
      "Now the top of the view is a compact seven-day strip showing each day's progress ring, intent and task count at a glance. Below it is a wide focused-day panel showing every section for the day you're on — priorities, tasks, schedule, notes, what went well, and what you're grateful for — with plenty of column width so text sits cleanly on one or two lines.\n\n" +
      "Click any day in the strip to focus it. Download PDF still exports the full seven-day sheet exactly as before.",
    createdAt: "2026-07-12T00:00:00Z",
    href: "#planner",
    linkLabel: "Open the planner",
  },
  {
    id: "suggestion-declared-focus",
    kind: "suggestion",
    title: "Try seeding a child's declared focus",
    brief: "Under Develop → ⚙ or Settings when creating a child, tick the fields you know.",
    body:
      "The Brain reads the reviews you record as observed evidence, and separately reads your declared focus (personality, preferences, dislikes, needs, priority areas, history) as parent intent.\n\n" +
      "The declared side never gets treated as evidence of what your child can already do — but it does shape how the Brain frames its language and what it pays attention to when the review history is thin.\n\n" +
      "Ten minutes filling these in early gives every downstream module (Insights, Coach, Curate chat) something to work with while you're building up review history.",
    createdAt: "2026-07-12T00:00:00Z",
    href: "#develop",
    linkLabel: "Open Develop",
  },
];

/* --- localStorage read-state --- */

const READ_KEY = "curio.inbox.read.v1";

function loadRead(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch { return new Set(); }
}

function saveRead(read: Set<string>): void {
  try { localStorage.setItem(READ_KEY, JSON.stringify(Array.from(read))); } catch { /* quota / private mode */ }
}

export const inbox = {
  all(): InboxItem[] {
    // Newest first.
    return [...SEED_ITEMS].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  },
  isRead(id: string): boolean {
    return loadRead().has(id);
  },
  markRead(id: string): void {
    const r = loadRead(); r.add(id); saveRead(r);
  },
  markAllRead(): void {
    const r = loadRead(); SEED_ITEMS.forEach((it) => r.add(it.id)); saveRead(r);
  },
  unreadCount(): number {
    const r = loadRead();
    return SEED_ITEMS.reduce((n, it) => n + (r.has(it.id) ? 0 : 1), 0);
  },
};
