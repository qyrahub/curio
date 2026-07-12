/* Curate — specialised learning topics.

   Each topic bundles a set of "tiles" (tools) that give parents different
   angles on the same subject. ADHD is the first seeded topic; the shape here
   is designed so new topics (autism, dyslexia, anxiety, sleep, dyspraxia,
   giftedness, medication questions in general, etc.) are added by dropping
   another entry into TOPICS below.

   HONESTY DISCIPLINE — non-negotiable, must be preserved in every topic added:
   1. NOT a diagnosis. NOT medical advice. The banner in Curate.tsx says this
      on every screen; content copy repeats it where relevant.
   2. Every medication tile talks about *classes* (stimulants, non-stimulants)
      never brands, never doses. Anything specific is a decision between a
      family and their prescriber.
   3. Original wording — no copying from Wikipedia, CDC, NICE, AAP or textbooks.
      Where a claim needs a source, we say "widely accepted" or "current
      guidance" rather than fabricating a citation.
   4. Evidence quality is stated honestly — "strong", "moderate", "mixed",
      "limited". Never overclaim.
   5. Content never says "you should" — always "some families find", "a
      prescriber may suggest", "consider discussing with".                       */

export type TileKind = "overview" | "compare" | "practices" | "medications" | "questions" | "chat";

export interface CurateCompare {
  label: string;
  pros: string[];
  cons: string[];
  evidence: "strong" | "moderate" | "mixed" | "limited" | "emerging";
  note?: string;
}
export interface CurateSection {
  h: string;
  p?: string;
  list?: string[];
  compare?: CurateCompare[];
}
export interface CurateTile {
  id: string;
  title: string;
  brief: string;
  kind: TileKind;
  icon: string;
  sections?: CurateSection[]; // for content tiles
  chatSystem?: string;        // system prompt fragment for chat tiles
}
export interface CurateTopic {
  id: string;
  name: string;
  emoji: string;
  brief: string;
  intents: string[];        // lowercase keywords for matching a query to this topic
  tiles: CurateTile[];
}

/* --- ADHD --- */
const ADHD_TILES: CurateTile[] = [
  {
    id: "overview",
    title: "ADHD in plain language",
    brief: "What it is, what it isn't, and how it usually shows up.",
    kind: "overview",
    icon: "🧭",
    sections: [
      { h: "What ADHD is", p: "ADHD is a lifelong difference in how attention, activity level and impulse control regulate day-to-day. It shows up in childhood and, for most people, continues into adulthood in a shifted form. It is understood as neurodevelopmental — a variation in how certain brain systems mature and self-regulate, not a moral failing or a discipline problem." },
      { h: "What ADHD isn't", list: [
        "Not caused by parenting choices, screen time, or sugar.",
        "Not a phase children simply grow out of, though presentation changes with age.",
        "Not the same as being energetic, distracted, or bored — those are common; ADHD is persistent and impairing across settings.",
        "Not a single symptom — it's a pattern that includes attention, activity, impulse and often emotional regulation.",
      ]},
      { h: "How it usually presents", list: [
        "Predominantly inattentive: difficulty sustaining focus, missing details, drifting off during tasks, forgetful, easily overwhelmed.",
        "Predominantly hyperactive-impulsive: constant motion, difficulty waiting, blurting, jumping between activities.",
        "Combined: features of both.",
      ]},
      { h: "When it warrants a professional look", p: "The current guidance across major clinical bodies is that ADHD is only recognised when symptoms are (a) present across multiple settings (home AND school), (b) inconsistent with age and development, and (c) causing meaningful difficulty for the child or family. Difficulty in one setting only — say, a child who's fine at home but struggles in class — is a signal to look more broadly, not proof of ADHD." },
      { h: "Common companions", p: "ADHD often overlaps with anxiety, sleep problems, learning differences (dyslexia, dyscalculia), sensory processing differences, and — for some — autism. A good assessment looks at these together, not in isolation." },
    ],
  },
  {
    id: "compare",
    title: "Approaches compared",
    brief: "Behavioural, medical, environmental, dietary — pros, cons, evidence.",
    kind: "compare",
    icon: "⚖️",
    sections: [
      { h: "What this is", p: "Different families choose very different combinations of support depending on age, severity, values, and access. Below is an honest read on the main options — none is universally right, and most successful plans combine several. All decisions belong with your family's clinician." },
      { h: "The main approaches", compare: [
        {
          label: "Behavioural & parenting support",
          pros: [
            "Skills that stay with the family long-term.",
            "No side effects; works alongside anything else.",
            "Often first-recommended for younger children (under 6).",
          ],
          cons: [
            "Takes time and consistency to see effects.",
            "Requires access to trained coaches or therapists.",
            "May not be enough on its own for more severe presentations.",
          ],
          evidence: "strong",
          note: "For younger children, this is the first-line support in most current guidelines.",
        },
        {
          label: "Educational accommodations",
          pros: [
            "Directly changes the environment where struggle happens.",
            "Extra time, movement breaks, seating changes, task chunking.",
            "Free where the school system supports it.",
          ],
          cons: [
            "Depends heavily on school willingness and resources.",
            "Requires advocacy from the family.",
          ],
          evidence: "strong",
          note: "Look for the formal accommodation process in your region — IEPs, 504s in the US; SENCO in the UK; South Africa uses SIAS.",
        },
        {
          label: "Medication (stimulants and non-stimulants)",
          pros: [
            "Often the fastest way to reduce core symptoms.",
            "Well-studied in children over 6.",
            "Can make behavioural and educational supports easier to land.",
          ],
          cons: [
            "Side effects (appetite, sleep, mood) that need monitoring.",
            "Doesn't teach skills — reduces intensity while other supports do that work.",
            "Reversible if it doesn't suit; not permanent.",
          ],
          evidence: "strong",
          note: "See the 'Medications explained' tile for how the families of medication work at a general level.",
        },
        {
          label: "Environmental & lifestyle",
          pros: [
            "Sleep, movement, routines and sensory-aware spaces help almost everyone.",
            "Low-risk, complements everything else.",
          ],
          cons: [
            "Rarely enough on its own for meaningful presentations.",
            "Requires household buy-in.",
          ],
          evidence: "moderate",
        },
        {
          label: "Dietary changes",
          pros: [
            "Some children do respond to specific eliminations (artificial colours, certain preservatives).",
            "Correcting iron or zinc deficiencies helps if the child was low to start.",
            "Omega-3 has small but real effects in some studies.",
          ],
          cons: [
            "Strict elimination diets are hard to sustain and risk nutrition gaps.",
            "Effects are usually small; individual responses vary widely.",
          ],
          evidence: "mixed",
          note: "Best done under guidance from a paediatric dietitian rather than DIY.",
        },
        {
          label: "Alternative therapies",
          pros: [
            "Neurofeedback, mindfulness training and some coaching approaches show small positive effects in some studies.",
            "Low physical risk.",
          ],
          cons: [
            "Evidence is uneven; effect sizes tend to be smaller than medication or behavioural work.",
            "Cost and time investment can be significant.",
          ],
          evidence: "emerging",
          note: "Worth asking about after core supports are in place, not as a replacement for them.",
        },
      ]},
    ],
  },
  {
    id: "practices",
    title: "Everyday practices that help",
    brief: "Low-risk daily habits that support most children with ADHD.",
    kind: "practices",
    icon: "🌱",
    sections: [
      { h: "Sleep first", p: "Sleep is the single biggest lever most families have. ADHD symptoms are almost always worse when sleep is short or broken. Aim for consistent bedtimes, dim light in the hour before sleep, and a screen-free wind-down. Ask your GP if sleep is a persistent struggle — sleep problems and ADHD often need addressing together." },
      { h: "Movement before focus", list: [
        "A short bout of physical activity before a demanding task (homework, reading) makes it noticeably easier for many children.",
        "Movement breaks every 20–30 minutes are more effective than one long sit.",
        "Regular exercise most days helps at a background level.",
      ]},
      { h: "Structure that shows itself", list: [
        "Visual schedules a child can see are much easier than remembered ones.",
        "Break big tasks into small steps, and only show the current step.",
        "Predictable morning and evening routines lower the daily cognitive load.",
        "Timers set outside the child (not internal) work better than 'you have five minutes'.",
      ]},
      { h: "Environment that supports focus", list: [
        "Reduce visual clutter in work areas.",
        "Try headphones or a quieter room for tasks that need concentration.",
        "Small, contained fidget items help many children keep hands busy while listening.",
      ]},
      { h: "Food and hydration", p: "A protein-rich breakfast steadies morning focus for many children. Frequent small meals often work better than three big ones. Hydration matters more than most families think — dehydration mimics inattention." },
      { h: "Screens", p: "Screens aren't a cause of ADHD, but they interact with it. Fast-paced, algorithmic content tends to make self-regulation harder in the hour or two afterwards. Bedtime screens interfere with sleep, which then makes everything worse the next day." },
      { h: "Warmth and consistency", p: "Children with ADHD often hear more corrections in a day than their peers. A deliberately high ratio of positive attention to correction — one common target is five to one — protects the parent-child relationship and, over time, makes correction more effective." },
    ],
  },
  {
    id: "medications",
    title: "Medications explained",
    brief: "Families of medication — not brands, not doses. That's a prescriber's job.",
    kind: "medications",
    icon: "💊",
    sections: [
      { h: "Before anything else", p: "This tile does not recommend, name brands, or discuss doses. Medication decisions belong with a prescriber who knows your child. The goal here is to help you walk into that conversation informed, not to replace it." },
      { h: "The two broad families", compare: [
        {
          label: "Stimulants",
          pros: [
            "The most-studied and most-effective class for the majority of children with ADHD.",
            "Fast acting (usually within an hour) and reversible if stopped.",
            "Both immediate-release and long-acting formulations exist.",
          ],
          cons: [
            "Appetite reduction, sleep changes, mood shifts and irritability are the most common side effects.",
            "Not for everyone — cardiac history, certain mental health conditions or family circumstances may make a prescriber recommend against.",
            "Controlled substance in most countries; access and prescription rules vary.",
          ],
          evidence: "strong",
        },
        {
          label: "Non-stimulants",
          pros: [
            "An option when stimulants don't suit — either due to side effects or personal choice.",
            "Work differently, and can help sleep or anxiety alongside ADHD.",
            "Longer to take effect than stimulants.",
          ],
          cons: [
            "Effect sizes are typically smaller than stimulants for core ADHD symptoms.",
            "Different side effect profile (sedation, blood pressure changes, and others depending on the medicine).",
          ],
          evidence: "strong",
        },
      ]},
      { h: "How families usually approach this", p: "In most current guidelines: behavioural and educational support first for younger children; medication considered when symptoms are significantly impairing school, relationships or self-esteem. Medication is not a permanent decision — it's a trial. A good prescriber will start low, monitor closely, adjust or stop if it isn't working." },
      { h: "Practical questions worth asking a prescriber", list: [
        "Which family of medication would you consider first for our child, and why?",
        "What side effects should we watch for in the first weeks?",
        "How will we know if it's working — what specifically should improve?",
        "How will we know when to stop or change?",
        "How does this interact with any other medication or condition our child has?",
        "What non-medication support should we keep going alongside?",
      ]},
      { h: "If a family chooses no medication", p: "This is a valid path many families take. Behavioural support, educational accommodations and environmental structure can carry a lot of children well. The right answer is the one that matches your child, your values and your circumstances — with your clinician." },
    ],
  },
  {
    id: "questions",
    title: "Questions for the professional",
    brief: "A crib sheet for the paediatrician, psychologist or educational assessor.",
    kind: "questions",
    icon: "❓",
    sections: [
      { h: "For diagnosis or first assessment", list: [
        "What presentation pattern do you see — mostly inattentive, mostly hyperactive-impulsive, or combined?",
        "What other conditions could look like this? How are you ruling those in or out?",
        "How impaired do you think this is at home versus at school?",
        "What would you recommend we try first before considering medication?",
        "What is your view on the strength of the evidence you're seeing?",
      ]},
      { h: "For medication conversations", list: [
        "Given our child's picture, which family of medication would you consider first, and why?",
        "What are the side effects we should watch for in the first two weeks?",
        "How will we measure if it's working — what will we see change?",
        "How long is a fair trial before we decide to continue, adjust or stop?",
        "How does this interact with anything else our child is on or any other condition they have?",
      ]},
      { h: "For school and educational support", list: [
        "What accommodations are available to us here (extra time, movement breaks, quieter test settings, task chunking, small group work)?",
        "Who signs off on those, and how long does the process take?",
        "How will teachers know what has been put in place?",
        "How do we review this each term?",
      ]},
      { h: "For families weighing options", list: [
        "What's the best-case and worst-case outcome of each of the paths we've talked about?",
        "What would you do if this were your child?",
        "What am I not asking that I should be?",
      ]},
    ],
  },
  {
    id: "chat",
    title: "Ask a question",
    brief: "Open Q&A about ADHD, grounded in your child's profile.",
    kind: "chat",
    icon: "💬",
    chatSystem: "You are a warm, careful parenting guide answering a parent's questions about ADHD. Never diagnose. Never recommend specific medications, brands, or doses. Always point back to the child's paediatrician or GP for any question that could shape a medical decision. When evidence is uneven, say so. When you don't know, say so. Use the child's declared profile (personality, priority areas, needs) to make guidance concrete where you can, but never treat it as evidence of a diagnosis. Every response should feel like a knowledgeable friend, not a clinical authority.",
  },
];

export const TOPICS: CurateTopic[] = [
  {
    id: "adhd",
    name: "ADHD",
    emoji: "🧠",
    brief: "Attention, hyperactivity and impulsivity — what it is, how families support it, what to ask your paediatrician.",
    intents: ["adhd", "attention deficit", "hyperactivity", "hyperactive", "impulsivity", "impulsive", "attention", "focus difficulty", "distractibility", "add", "attention deficit disorder"],
    tiles: ADHD_TILES,
  },
  // Future: autism, dyslexia, anxiety, sleep, sensory, dyspraxia, giftedness,
  // school refusal. Same shape — copy the ADHD block and rewrite content
  // with the same honesty rules (no diagnosis, no brands/doses, mark evidence
  // honestly, always point to clinician for medical decisions).
];

/* Try to match a free-form query to a seeded topic. Returns the topic id or
   null if nothing seeded fits — in which case Curate falls back to AI-generated
   tile suggestions for the query. */
export function matchTopic(query: string): string | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  for (const t of TOPICS) {
    if (t.intents.some((intent) => q.includes(intent))) return t.id;
  }
  return null;
}

export function findTopic(id: string): CurateTopic | undefined {
  return TOPICS.find((t) => t.id === id);
}
