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

export type TileKind = "overview" | "compare" | "practices" | "medications" | "questions" | "chat" | "nutrition" | "natural" | "references";

export interface CurateCompare {
  label: string;
  pros: string[];
  cons: string[];
  evidence: "strong" | "moderate" | "mixed" | "limited" | "emerging";
  note?: string;
}
export interface CurateRef {
  label: string;
  source: string;
  url?: string;
  note?: string;
  kind: "guideline" | "journal" | "organisation" | "book" | "database" | "resource";
}
export interface CurateSection {
  h: string;
  p?: string;
  list?: string[];
  compare?: CurateCompare[];
  refs?: CurateRef[];
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
    id: "nutrition",
    title: "Food and nutrition",
    brief: "Everyday food strategies and micronutrients — what has evidence, what doesn't.",
    kind: "nutrition",
    icon: "🥗",
    sections: [
      { h: "How to read this tile", p: "Food isn't a cure for ADHD, but what a child eats does influence attention, energy, sleep and mood — and those in turn shape the difficulty of a day. This tile focuses on foundations most families can act on, and honest evidence on more contentious options. As always: individualised advice belongs with your paediatrician, GP or a paediatric dietitian." },
      { h: "The foundations", list: [
        "Protein at breakfast — steadier morning focus for many children. Eggs, dairy, beans, nut butters, leftovers.",
        "Regular meals — three meals plus one or two snacks helps keep blood sugar steady. Long gaps often show up as irritability and inattention.",
        "Complex carbohydrates (oats, whole grains, legumes, fruit) rather than sugary drinks and refined snacks — reduces the spike-and-crash pattern.",
        "Hydration matters more than most families think. Dehydration mimics inattention. Water bottle at the desk, refill at meals.",
        "Sleep and eating shape each other. Late heavy meals worsen sleep; short sleep worsens next-day appetite regulation and focus.",
      ]},
      { h: "Micronutrients worth attention", p: "For children with ADHD, four nutrients come up repeatedly in the research — mostly because deficiency correlates with worse symptoms, and correcting a real deficiency usually helps.", compare: [
        {
          label: "Iron",
          pros: [
            "Low ferritin (a body-iron marker) is more common in children with ADHD in several studies.",
            "Correcting iron deficiency has been associated with meaningful symptom improvement.",
            "Food sources: red meat, poultry, beans, lentils, fortified cereals, dark leafy greens.",
          ],
          cons: [
            "Only helpful if there's actually a deficiency — supplementing without a test is unnecessary and can cause side effects.",
            "Requires a blood test to know; ferritin is the useful measure.",
          ],
          evidence: "moderate",
          note: "If you're curious, ask your GP for a ferritin test. Don't self-supplement iron in children.",
        },
        {
          label: "Zinc",
          pros: [
            "Low zinc has been linked with worse attention in some studies.",
            "Correcting deficiency may reduce symptom intensity.",
            "Food sources: meat, seafood, dairy, legumes, seeds.",
          ],
          cons: [
            "Evidence is more limited than for iron.",
            "Serum zinc tests are less reliable than iron tests; interpret with a clinician.",
          ],
          evidence: "limited",
        },
        {
          label: "Magnesium",
          pros: [
            "Deficiency is common in modern diets; correcting it helps sleep and stress regulation.",
            "Food sources: nuts, seeds, whole grains, dark chocolate, leafy greens.",
          ],
          cons: [
            "Direct evidence for ADHD symptom improvement is limited.",
            "High-dose supplements can cause loose stools.",
          ],
          evidence: "limited",
        },
        {
          label: "Omega-3 (EPA/DHA)",
          pros: [
            "Best-studied nutritional intervention in ADHD. Multiple randomised trials.",
            "Small but consistent effect on attention in meta-analyses.",
            "Food sources: oily fish (salmon, sardines, mackerel), some fortified eggs.",
          ],
          cons: [
            "Effect size is small — not a substitute for other supports.",
            "Supplement quality varies widely; look for products with EPA + DHA quantified on the label.",
            "Slow onset — trials usually run 8–16 weeks.",
          ],
          evidence: "moderate",
          note: "The Cochrane review on PUFA supplementation in ADHD is a good honest read on the evidence — see the References tile.",
        },
      ]},
      { h: "What can worsen focus", list: [
        "Sugary drinks and sweets on an empty stomach — the blood-sugar spike and crash often shows up as irritability and drift within an hour or two.",
        "Skipping breakfast — especially before demanding tasks like school.",
        "Ultra-processed foods that displace nutrient-dense meals — the issue is usually what they replace, not any single ingredient.",
        "Heavy meals right before homework or sport — some children focus better on a lighter snack plus water.",
      ]},
      { h: "The elimination diet question", p: "Some children respond to removing specific foods, additives, or colour groups. The evidence is uneven — small subsets of children respond strongly, most don't. Two approaches families sometimes try:", compare: [
        {
          label: "Feingold-style diet (removing artificial colours, preservatives, salicylates)",
          pros: [
            "Some children with strong dietary sensitivities show meaningful improvement.",
            "Removing artificial food colouring in particular has some supporting evidence.",
          ],
          cons: [
            "Effect only in a subset of children.",
            "Restrictive; can be socially isolating and hard to sustain.",
            "Risk of nutritional gaps without dietitian guidance.",
          ],
          evidence: "mixed",
        },
        {
          label: "Few Foods (oligoantigenic) diet",
          pros: [
            "In trials, a subset of children shows clear symptom improvement.",
            "Follow-up trials identify specific trigger foods for each responder.",
          ],
          cons: [
            "Extremely restrictive during the initial phase.",
            "Requires close supervision by a paediatric dietitian.",
            "Doesn't work for most children.",
          ],
          evidence: "mixed",
          note: "If you're going down this road, don't DIY — the initial elimination phase needs professional oversight to protect nutrition.",
        },
      ]},
      { h: "A note on supplements versus food", p: "Where possible, food form is preferable to a supplement — better absorbed, comes with the other nutrients that support it, cheaper, no purity or quality-control concerns. Supplements make sense when there's a diagnosed deficiency or a specific reason a food source isn't practical. Either way: discuss additions with your child's clinician, especially if any medication is also in play." },
      { h: "For picky eaters", p: "Many children with ADHD have narrow diets, sensory sensitivities around food textures, or appetite suppression on stimulant medication. Progress here is slow and non-linear. Some things that help: predictable snack times, small amounts of a new food alongside a favourite, involving the child in cooking, and reducing pressure at the table. If weight or growth is affected, involve a paediatric dietitian." },
    ],
  },
  {
    id: "natural",
    title: "Natural remedies — what the research says",
    brief: "Herbs, plants and supplements studied for ADHD, with honest evidence labels and safety flags.",
    kind: "natural",
    icon: "🌿",
    sections: [
      { h: "Read this first", p: "This tile is informational. Nothing here is a treatment recommendation. Herbal and nutritional supplements aren't regulated the same way as medications — potency varies widely between brands, quality control is uneven, and drug interactions are common and often underestimated. If your child is on any medication (especially a stimulant, SSRI, or anticonvulsant), do not add a supplement without discussing it with the prescriber first." },
      { h: "The general principle", p: "For most herbs studied in ADHD, the evidence is limited, mixed, or emerging. None has evidence approaching stimulants or well-established behavioural work. That doesn't mean they're useless — some families find one or two useful additions, and some responders exist for most of these. It does mean: expect small effects at best, be sceptical of confident marketing, and never treat a herb as a replacement for clinical care." },
      { h: "Herbs and plant extracts studied in ADHD", compare: [
        {
          label: "Saffron (Crocus sativus)",
          pros: [
            "The most-studied herbal option in recent years.",
            "Several small randomised trials in children have compared it to methylphenidate and shown similar symptom reduction over 6–8 weeks.",
            "Well-tolerated in the studies at the doses used.",
          ],
          cons: [
            "Trials are small; independent replication is still limited.",
            "Product quality varies — much on the market is adulterated.",
            "Can interact with SSRIs and anticoagulants.",
          ],
          evidence: "emerging",
          note: "A promising area to watch, not a decided answer. Discuss with your prescriber before starting.",
        },
        {
          label: "Pycnogenol (French maritime pine bark extract)",
          pros: [
            "A few small trials in children have shown attention and hyperactivity improvements.",
            "Antioxidant profile is well-characterised.",
          ],
          cons: [
            "Small evidence base.",
            "Expensive relative to other options.",
            "May affect blood pressure — caution with certain medications.",
          ],
          evidence: "emerging",
        },
        {
          label: "Bacopa monnieri (Brahmi)",
          pros: [
            "Some studies in children and adults show improvements in memory and attention over 3–4 months.",
            "Well-tolerated in trials.",
          ],
          cons: [
            "Slow onset — needs 8–12 weeks to assess effect.",
            "Occasional GI upset.",
            "Evidence base for ADHD specifically (rather than general cognition) is limited.",
          ],
          evidence: "limited",
        },
        {
          label: "Ginkgo biloba",
          pros: [
            "Some early trials showed benefit, especially combined with panax ginseng.",
            "Broadly available.",
          ],
          cons: [
            "Larger and more recent trials have not consistently confirmed early results.",
            "Significant bleeding-risk interaction with blood thinners, ibuprofen, and SSRIs.",
          ],
          evidence: "mixed",
          note: "Bleeding risk is real — check with the prescriber before any surgical or dental procedure.",
        },
        {
          label: "Ashwagandha (Withania somnifera)",
          pros: [
            "Reduces cortisol and self-reported stress in adult studies.",
            "May indirectly support sleep and irritability.",
          ],
          cons: [
            "Direct evidence for ADHD in children is very limited.",
            "Not recommended in pregnancy or with thyroid conditions without clinician guidance.",
          ],
          evidence: "limited",
        },
        {
          label: "Rhodiola rosea",
          pros: [
            "Used as a general adaptogen for stress and fatigue.",
            "Some evidence for reducing mental fatigue in short-term studies.",
          ],
          cons: [
            "Very limited ADHD-specific evidence.",
            "Can be over-stimulating for some children (jitteriness, sleep disruption).",
          ],
          evidence: "limited",
        },
      ]},
      { h: "A note on herbal quality", p: "Supplement products vary enormously in the amount of active compound they actually contain. Independent testing organisations regularly find products with a fraction of the labelled dose — or none at all. Look for products with third-party testing (ConsumerLab, USP verification, NSF Certified for Sport). And still: discuss with the prescriber before starting, especially for children." },
      { h: "The interaction risks that matter most", list: [
        "Stimulant medications (methylphenidate, amphetamines) — several herbs can raise blood pressure or heart rate, compounding stimulant effects.",
        "SSRIs and other serotonergic medicines — combining with St John's Wort, saffron, or 5-HTP raises serotonin syndrome risk.",
        "Blood thinners and NSAIDs — ginkgo, ginseng and turmeric can increase bleeding risk.",
        "Anticonvulsants — several herbs affect drug metabolism and blood levels.",
        "Surgery — stop most herbal supplements two weeks before any planned surgery; inform your anaesthetist.",
      ]},
      { h: "The bottom line", p: "None of these is a substitute for the well-established supports — behavioural strategies, educational accommodations, sleep, and, where a family chooses it, medication under a prescriber. Where a herb feels worth trying, treat it as a supervised trial: agree with the prescriber what to try, at what dose, for how long, and what \"working\" would look like. If nothing changes in 6–8 weeks, stop. Same rigour as with any other tool." },
    ],
  },
  {
    id: "references",
    title: "References and further reading",
    brief: "Reputable guidelines, organisations, journals and databases for going deeper.",
    kind: "references",
    icon: "📚",
    sections: [
      { h: "How to use this section", p: "These are the sources Curate leans on and where you can go for authoritative reading. Links open on the source site — Curate doesn't rehost or excerpt these; it points to them. If a link goes stale, the organisation name should be enough to navigate to their current page." },
      { h: "Clinical guidelines", refs: [
        { label: "NICE Guideline NG87: Attention deficit hyperactivity disorder — diagnosis and management", source: "National Institute for Health and Care Excellence (UK)", url: "https://www.nice.org.uk/guidance/ng87", note: "The UK's authoritative reference. Sections on children and young people are the most relevant for parents.", kind: "guideline" },
        { label: "Clinical Practice Guideline for the Diagnosis, Evaluation, and Treatment of ADHD in Children and Adolescents", source: "American Academy of Pediatrics", url: "https://publications.aap.org/pediatrics", note: "The US-facing equivalent. Search 'ADHD clinical practice guideline' on the AAP publications site.", kind: "guideline" },
        { label: "Canadian ADHD Practice Guidelines (CAP-G)", source: "Canadian ADHD Resource Alliance (CADDRA)", url: "https://www.caddra.ca/", note: "Comprehensive Canadian guideline set for children and adults.", kind: "guideline" },
      ]},
      { h: "Reputable organisations", refs: [
        { label: "ADHD in children — CDC", source: "US Centers for Disease Control and Prevention", url: "https://www.cdc.gov/adhd/", note: "Solid, plain-language overview of diagnosis, treatment and current data.", kind: "organisation" },
        { label: "CHADD", source: "Children and Adults with Attention-Deficit/Hyperactivity Disorder", url: "https://chadd.org", note: "Long-standing US advocacy and education organisation. Their National Resource Center on ADHD is a good starting point.", kind: "organisation" },
        { label: "ADDA — Attention Deficit Disorder Association", source: "ADDA", url: "https://add.org", note: "Adult-focused but includes parenting resources; good webinars.", kind: "organisation" },
        { label: "Understood.org", source: "Understood", url: "https://www.understood.org", note: "Learning differences and thinking differences — parent-facing, medically reviewed.", kind: "organisation" },
        { label: "Mental health topics — WHO", source: "World Health Organization", url: "https://www.who.int/health-topics/mental-health", note: "Global reference; ADHD sits within child and adolescent mental health resources.", kind: "organisation" },
      ]},
      { h: "Peer-reviewed journals worth searching", refs: [
        { label: "Journal of the American Academy of Child & Adolescent Psychiatry (JAACAP)", source: "Elsevier / AACAP", url: "https://www.jaacap.org", note: "Leading journal for child and adolescent psychiatry, including ADHD.", kind: "journal" },
        { label: "Pediatrics", source: "American Academy of Pediatrics", url: "https://publications.aap.org/pediatrics", note: "AAP's flagship journal; publishes major ADHD guidelines and studies.", kind: "journal" },
        { label: "The Lancet Psychiatry", source: "The Lancet", url: "https://www.thelancet.com/journals/lanpsy", note: "Landmark meta-analyses on ADHD medication and treatment approaches have appeared here.", kind: "journal" },
        { label: "Journal of Attention Disorders", source: "Sage Journals", url: "https://journals.sagepub.com/home/jad", note: "Dedicated ADHD journal covering research across the lifespan.", kind: "journal" },
        { label: "New England Journal of Medicine", source: "Massachusetts Medical Society", url: "https://www.nejm.org", note: "Major landmark ADHD studies (including MTA follow-ups) have appeared here.", kind: "journal" },
      ]},
      { h: "Meta-analysis and evidence databases", refs: [
        { label: "Cochrane Library", source: "Cochrane Collaboration", url: "https://www.cochranelibrary.com", note: "Systematic reviews are the gold standard for evidence synthesis. Search 'ADHD', 'methylphenidate', 'PUFA supplementation ADHD', 'dietary interventions ADHD'.", kind: "database" },
        { label: "PubMed", source: "US National Library of Medicine", url: "https://pubmed.ncbi.nlm.nih.gov", note: "Free-to-search database of biomedical literature. Free access to abstracts; some papers full-text.", kind: "database" },
        { label: "ClinicalTrials.gov", source: "US National Library of Medicine", url: "https://clinicaltrials.gov", note: "Registry of current and past clinical trials — useful if you want to see what's being actively researched.", kind: "database" },
      ]},
      { h: "Landmark studies to know about", p: "The MTA Study (Multimodal Treatment of Children with ADHD) is the single most-cited long-term trial in childhood ADHD, funded by the US NIMH and initially published in 1999 with follow-ups continuing for decades. It compared behavioural therapy, medication, combined treatment, and community care. Searching 'MTA Study ADHD' on Cochrane or PubMed will surface the follow-up papers." },
      { h: "Books worth reading", refs: [
        { label: "Taking Charge of ADHD (4th edition)", source: "Russell A. Barkley — Guilford Press", note: "Probably the most-recommended parent-facing science book on ADHD. Barkley is one of the field's most prolific researchers.", kind: "book" },
        { label: "Smart but Scattered", source: "Peg Dawson and Richard Guare — Guilford Press", note: "Practical, executive-function-focused. Aimed at parents; strategies that also help without ADHD.", kind: "book" },
        { label: "Driven to Distraction", source: "Edward M. Hallowell and John J. Ratey", note: "Classic accessible introduction to ADHD across the lifespan; adult-focused but widely respected.", kind: "book" },
      ]},
      { h: "Parent-facing publications (with a caveat)", refs: [
        { label: "ADDitude Magazine", source: "ADDitude", url: "https://www.additudemag.com", note: "Consumer publication, articles vary from strong to editorial. Use it for orientation and community; cross-check clinical claims against the guidelines above.", kind: "resource" },
      ]},
      { h: "How to read a claim about ADHD", p: "If a source says 'X helps ADHD', ask: was this a randomised trial or an observational study? How large was the sample? Was it in children or adults? Was it independently replicated? What was the actual effect size — meaningful, or small enough that it could be noise? A source that doesn't answer these is worth reading warily. The Cochrane reviews are usually the fastest way to get an honest read on the current state of evidence for a given intervention." },
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
