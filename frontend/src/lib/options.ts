// Presentation option lists (emoji + value). Values are what the API receives;
// emojis are purely client-side. Ported from the prototype.
export interface Opt { e: string; v: string; surprise?: boolean }

export const INTERESTS: Opt[] = [
  { e: "🐾", v: "animals" }, { e: "🦕", v: "dinosaurs" }, { e: "🚀", v: "space" },
  { e: "🌳", v: "nature & plants" }, { e: "🌊", v: "oceans" }, { e: "🚗", v: "transportation" },
  { e: "🏗️", v: "building & machines" }, { e: "🤖", v: "robots & tech" }, { e: "🧪", v: "science experiments" },
  { e: "⚙️", v: "how things work" }, { e: "🎨", v: "art & drawing" }, { e: "🎵", v: "music & dance" },
  { e: "📚", v: "stories & books" }, { e: "🔢", v: "numbers & puzzles" }, { e: "🍳", v: "cooking & food" },
  { e: "⚽", v: "sports & games" }, { e: "🏛️", v: "history & long ago" }, { e: "🌍", v: "people & cultures" },
  { e: "🗺️", v: "geography & maps" }, { e: "💪", v: "body & health" }, { e: "🎬", v: "entertainment" },
  { e: "🎉", v: "fun" }, { e: "🎲", v: "surprise me", surprise: true },
];
export const SUBJECTS: Opt[] = [
  { e: "➗", v: "Maths" }, { e: "📖", v: "English / Language" }, { e: "🔬", v: "Science" },
  { e: "🌱", v: "Biology" }, { e: "⚗️", v: "Chemistry" }, { e: "🧲", v: "Physics" },
  { e: "🗺️", v: "Geography" }, { e: "🏺", v: "History" }, { e: "💻", v: "Computing & Tech" },
  { e: "🎨", v: "Art & Design" }, { e: "🎻", v: "Music" }, { e: "🤸", v: "Physical Education" },
  { e: "🧠", v: "Life Skills" }, { e: "🗣️", v: "Second Language" },
];
export const OUTCOMES: Opt[] = [
  { e: "💡", v: "spark curiosity" }, { e: "🎒", v: "school readiness" }, { e: "📖", v: "reading & writing" },
  { e: "🧮", v: "numeracy" }, { e: "🗣️", v: "vocabulary" }, { e: "💪", v: "confidence" },
  { e: "🎯", v: "focus & attention" }, { e: "🤝", v: "kindness & empathy" }, { e: "🎨", v: "creativity" },
  { e: "🧩", v: "problem-solving" }, { e: "🧠", v: "memory" }, { e: "👋", v: "social skills" },
  { e: "🦅", v: "independence" }, { e: "🎤", v: "public speaking" }, { e: "🌱", v: "growth mindset" },
  // Broader nurture areas — physical, spiritual, financial, life-skill and
  // future-facing. Values chosen so they read naturally in plan copy and can
  // be mixed with the interests / subjects taxonomies without collision.
  { e: "🏃", v: "physical activity" }, { e: "⚽", v: "sports skills" }, { e: "🏋️", v: "fitness" },
  { e: "🩺", v: "health awareness" }, { e: "🕊️", v: "spirituality" }, { e: "❤️", v: "emotional regulation" },
  { e: "🌊", v: "resilience" }, { e: "🤲", v: "teamwork" }, { e: "🏆", v: "leadership" },
  { e: "⏰", v: "time management" }, { e: "💰", v: "money smarts" }, { e: "🚀", v: "entrepreneurship" },
  { e: "💻", v: "digital literacy" }, { e: "🌿", v: "environmental care" }, { e: "🌍", v: "world awareness" },
];
export const SPEECH_AUD: Opt[] = [
  { e: "👩‍🏫", v: "teachers" }, { e: "🧒", v: "kids" }, { e: "👪", v: "parents" }, { e: "👥", v: "everyone" },
];
export const SPEECH_PLACE: Opt[] = [
  { e: "🏫", v: "class" }, { e: "⛪", v: "church" }, { e: "🏆", v: "competition" }, { e: "🎪", v: "assembly" },
];
export const SPORTS: Opt[] = [
  { e: "⚽", v: "soccer" }, { e: "🏏", v: "cricket" }, { e: "🏉", v: "rugby" }, { e: "🏊", v: "swimming" },
  { e: "🏃", v: "athletics" }, { e: "🎾", v: "tennis" }, { e: "🏀", v: "basketball" },
];
export const FAITHS: Opt[] = [
  { e: "🕊️", v: "Christianity" }, { e: "☪️", v: "Islam" }, { e: "🕉️", v: "Hinduism" },
  { e: "✡️", v: "Judaism" }, { e: "☸️", v: "Buddhism" }, { e: "🌍", v: "world religions" },
];
export const CADENCES = ["every day", "weekdays", "weekends", "once off", "speech"] as const;
export const SCOPES = ["my country", "my continent", "the whole world"] as const;
export const MEDIUMS = ["illustration", "text", "both"] as const;
export const DETAILS = ["summary", "detailed"] as const;
export const SIZES = ["small", "medium", "large"] as const;

/* Extended child-profile taxonomies — seeded chip pools for personality traits,
   engagement preferences, dislikes, support needs and current priority areas.
   Values are plain strings (not the emoji Opt shape) — these describe a child,
   and emojis on personality/dislikes/needs would feel cutesy. They match the
   existing Develop→Interests chip pattern. Every value used here also flows into
   the Brain's "Declared focus" surface as parent intent (never as observation),
   and downstream Insights/nudges/reports can filter on these tags. */

export const PERSONALITIES = [
  "Curious", "Thoughtful", "Playful", "Sensitive", "Bold", "Cautious",
  "Sociable", "Independent", "Creative", "Analytical", "Empathetic", "Determined",
  "Cheerful", "Gentle", "Energetic", "Reflective", "Adventurous", "Detail-oriented",
  "Musical", "Athletic", "Funny", "Nurturing",
] as const;

export const PREFERENCES = [
  "Learns visually", "Learns by doing", "Learns by listening", "Loves stories",
  "Prefers routines", "Likes surprises", "Enjoys solo time", "Thrives in groups",
  "Morning person", "Evening person", "Prefers outdoors", "Prefers indoors",
  "Loves puzzles", "Loves music", "Loves movement", "Loves screens",
  "Loves art", "Loves reading", "Loves nature", "Loves numbers",
] as const;

export const DISLIKES = [
  "Loud noises", "Bright lights", "Crowds", "Being rushed", "Being interrupted",
  "Long tasks", "Sitting still", "Being wrong", "Trying new foods", "Sudden change",
  "Waiting", "Being told what to do", "Reading aloud", "Being watched",
  "Confrontation", "Losing games", "Bedtime", "Homework", "Chores", "Repetition",
] as const;

export const SUPPORT_NEEDS = [
  "Extra time", "Movement breaks", "Quiet space", "Clear instructions",
  "Visual aids", "Repetition", "One-on-one", "Advance warning", "Choice", "Structure",
  "Praise", "Independence", "Emotional check-ins", "Calm-down space", "Rest breaks",
  "Snacks", "Gentle touch", "Alone time", "Sensory input", "Extra reassurance",
] as const;

export const PRIORITY_AREAS = [
  "Homework habits", "Reading fluency", "Emotional regulation", "Sibling relationship",
  "Screen time", "Sleep habits", "Diet", "Confidence", "Attention", "Anxiety",
  "Making friends", "Handling frustration", "Independence", "Chores",
  "Physical activity", "Study skills", "Manners", "Sharing",
] as const;

/* Single source of truth for the countries Curio recognises. Used by:
   - Settings (child/parent creation)
   - Develop  (per-child country, for national benchmarking)
   - Feedback (admin benchmark authoring)
   Kept in sync across all three so a country in one place is a country in all. */
export const COUNTRIES = [
  "South Africa", "United Kingdom", "United States", "Nigeria", "Kenya",
  "Australia", "Canada", "India",
] as const;
export type Country = typeof COUNTRIES[number];
