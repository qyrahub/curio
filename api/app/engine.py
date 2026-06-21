"""Curio curation engine.

================================ CONFIDENTIAL ==================================
This is Curio's own pedagogy/curation logic (distinct from the ΩSCORE
methodology, which lives elsewhere and is separately confidential). Keep it
server-side; public-facing descriptions stay deliberately vague.

Pipeline:
  resolve_stage -> build_domain_mix -> score & select cards
  -> arrange with rhythm/spacing -> safety_pass -> Plan
The content library below is intentionally small but real; in production this
becomes a larger curated/generated corpus, likely DB-backed.
================================================================================
"""
from __future__ import annotations

import random
import uuid
from datetime import datetime, timezone

from .models import Page, Plan, PlanRequest

_SIZE = {"small": 10, "medium": 25, "large": 50}

# Map school subjects -> internal domains
_SUBJECT_DOMAIN = {
    "maths": "maths",
    "english / language": "language",
    "science": "science",
    "biology": "biology",
    "chemistry": "science",
    "physics": "science",
    "geography": "geography",
    "history": "history",
    "computing & tech": "technology",
    "art & design": "arts",
    "music": "arts",
    "physical education": "health",
    "life skills": "health",
    "second language": "language",
}

# Loose interest -> (domain, tag) hints
_INTEREST_HINT = {
    "animals": ("biology", "animals"),
    "dinosaurs": ("history", "dinosaurs"),
    "space": ("science", "space"),
    "nature & plants": ("biology", "plants"),
    "oceans": ("biology", "ocean"),
    "transportation": ("technology", "machines"),
    "building & machines": ("technology", "machines"),
    "robots & tech": ("technology", "robots"),
    "science experiments": ("science", "experiment"),
    "how things work": ("technology", "machines"),
    "art & drawing": ("arts", "art"),
    "music & dance": ("arts", "music"),
    "stories & books": ("language", "story"),
    "numbers & puzzles": ("maths", "puzzle"),
    "cooking & food": ("health", "food"),
    "sports & games": ("health", "movement"),
    "history & long ago": ("history", "history"),
    "people & cultures": ("geography", "culture"),
    "geography & maps": ("geography", "maps"),
    "body & health": ("health", "body"),
    "entertainment": ("arts", "music"),
    "fun": ("fun", "fun"),
}

# Content library. Each card: domain, age band, tags, and the page payload.
# (topic, anchor_emoji, anchor_desc, guideline, challenge, bloom)
_LIB = [
    # ---------- biology ----------
    ("biology", 3, 7, ["animals", "insects"], "The Butterfly", "🦋",
     "egg, caterpillar, chrysalis and a butterfly on one branch",
     "A caterpillar changes into a butterfly through four stages.",
     "Point to each stage in order. What changes inside the chrysalis?",
     "Inside the chrysalis the caterpillar's body breaks down and rebuilds into a butterfly — this is called metamorphosis.",
     "understand"),
    ("biology", 4, 9, ["animals", "mammals"], "Mighty Mammals", "🐘",
     "an elephant family at a watering hole",
     "Elephants are the biggest land animals and live in close families.",
     "Name two things an elephant uses its trunk for.",
     "An elephant's trunk can drink and spray water, grab food, smell, trumpet, and greet other elephants.",
     "understand"),
    ("biology", 3, 7, ["plants", "nature"], "From Seed to Plant", "🌱",
     "a seed, a sprout and a tall sunflower in a row",
     "Tiny seeds grow into plants with water, soil and sunlight.",
     "Plant a seed and check it each day. What do you see first?",
     "The root usually appears first, growing down, then a green shoot pushes up toward the light.",
     "apply"),
    ("biology", 5, 10, ["animals", "oceans"], "Ocean Giants", "🐋",
     "a blue whale beside a tiny fish for scale",
     "The blue whale is the largest animal that has ever lived.",
     "Guess how long a blue whale is, then compare it to a school bus.",
     "A blue whale is about 30 metres — roughly three school buses parked end to end.",
     "understand"),
    ("biology", 6, 11, ["animals", "nature"], "Food Chains", "🦅",
     "grass, a grasshopper, a frog and a hawk linked by arrows",
     "Energy passes along a food chain from plants to predators.",
     "Build a food chain with three living things from your garden.",
     "A simple chain is grass → grasshopper → frog → hawk; arrows point the way energy flows.",
     "apply"),
    ("biology", 8, 13, ["body", "health"], "Your Amazing Heart", "❤️",
     "a friendly cross-section of a beating heart with arrows",
     "The heart is a muscle that pumps blood to every part of you.",
     "Find your pulse and count the beats in 15 seconds, then multiply by four.",
     "That number is your heart rate per minute — a resting child's is usually about 70–100 beats.",
     "apply"),
    ("biology", 10, 16, ["body", "science"], "Cells & DNA", "🧬",
     "a single cell with a glowing DNA spiral inside",
     "Every living thing is built from cells that carry instructions in DNA.",
     "Explain in your own words why DNA is called an 'instruction manual'.",
     "DNA stores coded instructions that tell cells how to grow, work and make copies of themselves.",
     "analyse"),
    ("biology", 11, 16, ["nature", "science"], "Ecosystems in Balance", "🌍",
     "a forest scene linking plants, animals, soil and weather",
     "Living things and their environment depend on each other in an ecosystem.",
     "Pick one animal and describe what would happen if it disappeared.",
     "Removing one species can break the chain — prey may overpopulate or predators may starve, shifting the whole balance.",
     "evaluate"),
    ("biology", 12, 16, ["body", "health"], "How Vaccines Work", "💉",
     "a shield protecting a cell from a virus",
     "Vaccines train the immune system to recognise a threat in advance.",
     "Describe how a vaccine is like a 'practice run' for your body.",
     "A vaccine shows the immune system a harmless piece of a germ so it can build defences before meeting the real one.",
     "analyse"),

    # ---------- maths ----------
    ("maths", 3, 6, ["numbers", "puzzles"], "Counting Friends", "🔢",
     "five smiling animals lined up to be counted",
     "Numbers tell us how many things there are.",
     "Count the animals out loud, then find five objects in the room.",
     "There are five — and any five objects (fingers, blocks, socks) match the same number.",
     "understand"),
    ("maths", 4, 8, ["numbers", "shapes"], "Shapes Everywhere", "🔺",
     "a house drawn from circles, squares and triangles",
     "Shapes have names and special features like sides and corners.",
     "Find a triangle, a circle and a square somewhere in your home.",
     "A triangle has 3 sides, a square has 4 equal sides, and a circle has none — just one curved edge.",
     "apply"),
    ("maths", 5, 9, ["numbers", "puzzles"], "Patterns & Sequences", "🔁",
     "a repeating pattern of red, blue, red, blue blocks",
     "Patterns repeat in a predictable way we can continue.",
     "Make a pattern with two colours, then ask someone to continue it.",
     "A pattern continues by repeating its rule — red, blue, red, blue means blue comes next.",
     "apply"),
    ("maths", 7, 12, ["numbers", "puzzles"], "Fractions Are Fair Shares", "🍕",
     "a pizza cut into equal slices",
     "A fraction shows equal parts of a whole.",
     "Cut a snack into four equal parts. What fraction is one part?",
     "One part of four equal parts is one quarter, written 1/4.",
     "apply"),
    ("maths", 8, 13, ["numbers", "puzzles"], "The Power of Zero", "0️⃣",
     "a number line stretching past a glowing zero",
     "Zero is a real number and a place-holder that makes big numbers work.",
     "Explain why 305 is different from 35.",
     "The zero in 305 holds the tens place empty, so it means 3 hundreds, 0 tens and 5 ones — much bigger than 35.",
     "analyse"),
    ("maths", 10, 16, ["numbers", "puzzles"], "Percentages in Real Life", "％",
     "a price tag with a 25% off sticker",
     "Percentages compare amounts out of one hundred.",
     "A R200 item is 25% off. How much do you save and pay?",
     "25% of 200 is 50, so you save R50 and pay R150.",
     "apply"),
    ("maths", 11, 16, ["numbers", "puzzles"], "Intro to Algebra", "🅰️",
     "a balance scale with x on one side and numbers on the other",
     "Algebra uses letters to stand for unknown numbers.",
     "Solve for x: x + 7 = 12.",
     "x = 5, because 12 − 7 = 5.",
     "apply"),
    ("maths", 12, 16, ["numbers", "puzzles"], "Probability & Chance", "🎲",
     "two dice with a spread of possible totals",
     "Probability measures how likely an event is, from 0 to 1.",
     "What is the chance of rolling a 6 on one fair die?",
     "One face in six, so the probability is 1/6 (about 17%).",
     "analyse"),

    # ---------- language ----------
    ("language", 3, 7, ["stories", "language"], "Rhyme Time", "📖",
     "a cat in a hat sitting on a mat",
     "Rhyming words end with the same sound and make language playful.",
     "Say three words that rhyme with 'cat'.",
     "Many words rhyme with cat — hat, mat, bat, sat, rat.",
     "understand"),
    ("language", 5, 10, ["stories", "language"], "Story Mountain", "⛰️",
     "a mountain shape labelled beginning, middle and end",
     "Most stories have a beginning, a build-up, a problem and an ending.",
     "Tell a tiny story about your day with a beginning, middle and end.",
     "A good story sets the scene, builds to a problem or peak, then resolves it at the end.",
     "apply"),
    ("language", 8, 13, ["language", "stories"], "Similes & Metaphors", "🪄",
     "a heart drawn as a glowing sun to show comparison",
     "Writers compare things to paint pictures with words.",
     "Finish the simile: 'as brave as a ___'.",
     "Common answers are 'as brave as a lion' — a simile uses like or as to compare.",
     "apply"),
    ("language", 10, 16, ["language", "stories"], "Persuasive Writing", "✍️",
     "a speech bubble with a strong underlined point",
     "Persuasive writing uses reasons and evidence to convince a reader.",
     "Write one sentence arguing for more break time, with a reason.",
     "A strong answer states the view and a reason, e.g. 'We need longer breaks because rested minds focus better.'",
     "evaluate"),
    ("language", 12, 16, ["language", "stories"], "Spot the Bias", "🧐",
     "two newspapers describing the same event differently",
     "The same facts can be framed to push different opinions.",
     "Name one word that could make a news headline sound negative.",
     "Loaded words like 'slammed', 'chaos' or 'failed' add emotion and signal bias rather than neutral facts.",
     "evaluate"),

    # ---------- geography ----------
    ("geography", 4, 9, ["geography", "maps", "nature"], "Continents & Oceans", "🗺️",
     "a simple globe showing seven continents",
     "Earth has seven continents and five oceans.",
     "Find the continent you live on, then name the ocean nearest you.",
     "If you live in South Africa you're on Africa, with the Atlantic and Indian Oceans on either side.",
     "understand"),
    ("geography", 6, 11, ["geography", "nature"], "Volcanoes", "🌋",
     "a cutaway volcano with glowing magma below",
     "Volcanoes form where hot magma escapes from inside the Earth.",
     "Describe what comes out of a volcano when it erupts.",
     "Erupting volcanoes release lava, ash, gases and rock from melted material deep underground.",
     "understand"),
    ("geography", 9, 14, ["geography", "maps"], "Reading a Map", "🧭",
     "a treasure map with a compass rose and a scale bar",
     "Maps use symbols, a scale and compass directions to show real places.",
     "If north is up, which way do you go to reach a place on the right?",
     "Right of north is east — turning clockwise gives north, east, south, west.",
     "apply"),
    ("geography", 11, 16, ["geography", "nature"], "Climate vs Weather", "🌦️",
     "a calendar beside a long-term temperature graph",
     "Weather is day to day; climate is the long-term pattern.",
     "Explain the difference using your own town as an example.",
     "Weather is today's rain or sun; climate is what your town is usually like across many years.",
     "analyse"),
    ("geography", 12, 16, ["geography", "people"], "Why Cities Grow", "🏙️",
     "a town expanding into a city around a river and road",
     "Cities grow where there are jobs, water, transport and trade.",
     "List two reasons people move from villages to cities.",
     "Common reasons are more jobs and better access to schools, hospitals and services.",
     "analyse"),

    # ---------- history ----------
    ("history", 5, 10, ["history", "people"], "Long, Long Ago", "🦕",
     "a friendly dinosaur beside a layered rock timeline",
     "The past stretches back far beyond living memory.",
     "Put these in order: dinosaurs, your grandparents, you.",
     "Dinosaurs came first (millions of years ago), then your grandparents, then you.",
     "understand"),
    ("history", 7, 12, ["history", "people"], "People Who Changed the World", "🌟",
     "portraits of inventors and leaders in a row",
     "Individuals can shape history through ideas and courage.",
     "Name someone you admire and one thing they changed.",
     "Any reasoned answer works — e.g. Nelson Mandela helped end apartheid and unite South Africa.",
     "evaluate"),
    ("history", 10, 16, ["history", "people"], "Ancient Civilisations", "🏺",
     "pyramids, Greek columns and a Roman arch together",
     "Early civilisations gave us writing, laws, maths and architecture.",
     "Name one thing we still use from an ancient civilisation.",
     "Examples include the alphabet, calendars, democracy, arches and the number system.",
     "analyse"),
    ("history", 12, 16, ["history", "people"], "Reading the Past", "📜",
     "a historian comparing two old documents",
     "Historians weigh sources to work out what really happened.",
     "Why might two eyewitnesses describe the same event differently?",
     "People notice different things, have different views, and memory changes — so sources must be compared.",
     "evaluate"),

    # ---------- health ----------
    ("health", 3, 7, ["body", "health"], "Wash Those Hands", "🧼",
     "bubbly hands under a tap with a happy timer",
     "Washing hands removes germs that can make us sick.",
     "Wash your hands while singing 'Happy Birthday' twice.",
     "Two rounds of the song is about 20 seconds — long enough to wash germs away.",
     "apply"),
    ("health", 5, 10, ["body", "health"], "Fuel Your Body", "🥗",
     "a colourful plate split into food groups",
     "Different foods give the body different kinds of energy.",
     "Plan a plate with a fruit, a vegetable and a protein.",
     "A balanced plate might be an apple, some spinach, and an egg or beans for protein.",
     "apply"),
    ("health", 8, 14, ["body", "health"], "Sleep Superpower", "😴",
     "a brain tidying itself while a child sleeps",
     "Sleep helps the brain store memories and the body repair itself.",
     "Work out your bedtime if you wake at 6am and need 10 hours.",
     "Ten hours before 6am means an 8pm bedtime.",
     "apply"),
    ("health", 11, 16, ["body", "health"], "Stress & Your Brain", "🧠",
     "a calm brain beside a stormy one with breathing arrows",
     "Stress is normal, and simple tools can help you manage it.",
     "Try slow breathing: in for 4, hold for 4, out for 4. How do you feel?",
     "Slow breathing signals the body to calm down, lowering heart rate and easing tension.",
     "apply"),

    # ---------- technology ----------
    ("technology", 5, 10, ["robots", "machines", "tech"], "How Machines Help", "⚙️",
     "gears turning to lift a heavy box easily",
     "Simple machines make hard jobs easier.",
     "Find a lever at home (like a door handle) and show how it works.",
     "A door handle is a lever — a small push at the end turns the latch with less effort.",
     "understand"),
    ("technology", 8, 13, ["tech", "machines"], "Stay Safe Online", "🔐",
     "a strong padlock guarding a friendly screen",
     "Good habits keep your information safe on the internet.",
     "Make up a strong password rule you could actually remember.",
     "A strong rule mixes a long phrase, numbers and symbols, and is never shared — e.g. three random words plus a number.",
     "apply"),
    ("technology", 9, 15, ["tech", "robots"], "What Is an Algorithm?", "🤖",
     "a flowchart of steps making a sandwich",
     "An algorithm is a clear set of steps to complete a task.",
     "Write the exact steps to make a jam sandwich.",
     "A good answer lists ordered steps: get bread, open jam, spread it, close the sandwich — precision matters to a computer.",
     "apply"),
    ("technology", 12, 16, ["tech", "robots"], "How AI Learns", "🧩",
     "a model spotting patterns in a stream of pictures",
     "AI learns patterns from lots of examples rather than fixed rules.",
     "Why might an AI trained only on cat photos struggle with dogs?",
     "It only learned cat patterns; with no dog examples it has nothing to recognise, so it guesses poorly.",
     "evaluate"),

    # ---------- arts ----------
    ("arts", 3, 8, ["art", "drawing", "creativity"], "Mixing Colours", "🎨",
     "blue and yellow paint swirling into green",
     "Primary colours mix to make brand-new colours.",
     "Mix two colours and predict what you'll get before you do.",
     "Blue + yellow makes green, red + blue makes purple, red + yellow makes orange.",
     "apply"),
    ("arts", 6, 12, ["art", "music", "creativity"], "Rhythm & Beat", "🥁",
     "hands clapping with sound waves rippling out",
     "Music is built from steady beats and patterns of sound.",
     "Clap a steady beat, then clap a pattern on top of it.",
     "A beat is the steady pulse; a rhythm is the pattern of claps you layer over that pulse.",
     "apply"),
    ("arts", 10, 16, ["art", "creativity"], "Perspective in Drawing", "✏️",
     "railway tracks meeting at a vanishing point",
     "Artists create depth using a vanishing point and horizon line.",
     "Draw a road that gets smaller as it goes away from you.",
     "Lines that move toward a single vanishing point on the horizon make a flat drawing look 3-D.",
     "apply"),

    # ---------- science ----------
    ("science", 4, 9, ["experiment", "nature"], "Float or Sink?", "🛁",
     "a cork floating and a coin sinking in a tub",
     "Whether something floats depends on how heavy it is for its size.",
     "Test three objects in water and predict each one first.",
     "Light-for-their-size things (cork, wood) float; dense things (coins, stones) sink.",
     "apply"),
    ("science", 5, 10, ["experiment", "space"], "Day and Night", "🌗",
     "the Earth turning between the sun and the stars",
     "Day and night happen because the Earth slowly spins.",
     "Use a ball and a torch to show day turning to night.",
     "The side of the ball facing the torch is day; as it spins, that side turns away into night.",
     "understand"),
    ("science", 6, 11, ["experiment", "nature"], "The Water Cycle", "💧",
     "sun, cloud, rain and a river in a loop",
     "Water moves in a cycle of evaporation, clouds and rain.",
     "Explain how a puddle disappears on a sunny day.",
     "The sun's heat evaporates the puddle into invisible water vapour that rises into the air.",
     "understand"),
    ("science", 8, 14, ["experiment", "space"], "Gravity & Falling", "🍎",
     "an apple and a feather falling beside a planet",
     "Gravity pulls objects toward each other; bigger objects pull harder.",
     "Drop a sheet of paper flat, then crumpled. Which lands first and why?",
     "The crumpled paper lands first because flat paper catches more air resistance, not because it's heavier.",
     "analyse"),
    ("science", 10, 16, ["experiment", "space"], "States of Matter", "🧊",
     "ice, water and steam from one substance",
     "Matter changes between solid, liquid and gas with energy.",
     "Describe what happens to water molecules as ice melts then boils.",
     "Adding heat makes molecules move faster — fixed in ice, flowing as water, flying apart as steam.",
     "analyse"),
    ("science", 11, 16, ["experiment", "science"], "Energy Can't Vanish", "⚡",
     "a roller coaster swapping height for speed",
     "Energy is never lost, only changed from one form to another.",
     "Where does a roller coaster's energy go at the bottom of a drop?",
     "Height energy (potential) converts into movement energy (kinetic), plus a little heat from friction.",
     "evaluate"),
    ("science", 12, 16, ["experiment", "science"], "The Scientific Method", "🔬",
     "a loop of question, guess, test and conclude",
     "Science tests ideas with fair experiments rather than opinions.",
     "Design a fair test for which paper towel soaks up most water.",
     "Use the same amount of water and towel size, change only the brand, and measure what's absorbed.",
     "evaluate"),
    # ===== Singapore method: Concrete–Pictorial–Abstract, number bonds, bar models =====
    ("maths", 4, 7, ["numbers", "puzzles"], "Number Bonds to 10", "🧮",
     "two groups of dots joining into ten",
     "Singapore method: see how two numbers 'bond' to make ten.",
     "Show two handfuls of objects that together make 10.",
     "Pairs that bond to 10 include 6 and 4, 7 and 3, 8 and 2 — the same ten, split differently.",
     "apply"),
    ("maths", 6, 10, ["numbers", "puzzles"], "Bar Models", "📊",
     "a long bar split into labelled parts for a word problem",
     "Singapore method: draw a bar to picture a word problem before solving.",
     "Draw a bar for: Sam has 8 sweets and gives away 3. How many are left?",
     "The whole bar is 8; shade 3 as 'given away', leaving 5 — so 8 − 3 = 5.",
     "apply"),
    ("maths", 5, 9, ["numbers", "puzzles"], "Concrete, Picture, Symbol", "🔤",
     "blocks, then a drawing, then the sum 2+3=5",
     "Singapore method: touch it, draw it, then write it as numbers.",
     "Make 2+3 with objects, sketch it, then write the sum.",
     "All three show the same idea: two and three objects, a drawing of five, and 2 + 3 = 5.",
     "understand"),
    ("maths", 8, 13, ["numbers", "puzzles"], "Part-Whole Thinking", "🧩",
     "a whole circle split into known and unknown parts",
     "Singapore method: find a missing part when you know the whole.",
     "A team scored 15 goals; 9 were by girls. How many by boys?",
     "Whole 15, known part 9, so the missing part is 15 − 9 = 6.",
     "apply"),
    ("maths", 10, 16, ["numbers", "puzzles"], "Model the Ratio", "⚖️",
     "two bars of unequal length showing a 2-to-3 ratio",
     "Singapore method: bars make ratios and proportions easy to see.",
     "Share R50 in the ratio 2:3. How much is each share?",
     "Five equal parts of R50 are R10 each, so the shares are R20 and R30.",
     "analyse"),

    # ===== Feuerstein: mediated learning & thinking skills (learning how to think) =====
    ("language", 4, 8, ["puzzles", "creativity"], "Compare and Contrast", "🔍",
     "two friendly objects side by side with a magnifier",
     "Feuerstein thinking skill: notice how two things are alike and different.",
     "Pick two fruits. Say one way they're the same and one way they differ.",
     "For example an apple and orange are both round fruit, but one is usually red and one is orange and peels.",
     "analyse"),
    ("language", 5, 10, ["puzzles", "creativity"], "Sort Into Groups", "🗂️",
     "mixed shapes being sorted into labelled baskets",
     "Feuerstein skill: classification — grouping things by a shared rule.",
     "Sort your toys into three groups and name the rule for each group.",
     "Any clear rule works — by colour, by size, or by what they do — as long as each group fits the rule.",
     "analyse"),
    ("maths", 6, 11, ["puzzles", "numbers"], "What Comes Next?", "➡️",
     "a sequence of growing dot patterns with a blank at the end",
     "Feuerstein skill: spot the rule in a pattern and continue it.",
     "Continue: 2, 4, 6, 8, __ . What is the rule?",
     "The next is 10; the rule is 'add 2 each time'.",
     "analyse"),
    ("language", 7, 13, ["puzzles", "creativity"], "Plan Before You Start", "🗺️",
     "a numbered plan leading to a finished tower",
     "Feuerstein skill: make a plan and check your steps as you go.",
     "Before building something, list your three first steps out loud.",
     "A good plan names a goal, the order of steps, and a way to check each step worked.",
     "apply"),
    ("language", 8, 14, ["puzzles", "creativity"], "Think About Your Thinking", "💭",
     "a child looking at a thought-bubble of their own steps",
     "Feuerstein skill: metacognition — noticing how you solved something.",
     "After a puzzle, explain *how* you worked it out, not just the answer.",
     "Strong answers describe the strategy — 'I looked for the corners first', not only the final result.",
     "evaluate"),
    ("language", 5, 9, ["puzzles", "language"], "Be Precise", "🎯",
     "a fuzzy arrow becoming a sharp one hitting a target",
     "Feuerstein skill: gather all the clues before answering.",
     "Describe an object so well a partner guesses it without seeing it.",
     "Precise clues name colour, size, shape and use — vague clues lead to wrong guesses.",
     "apply"),

    # ===== China-style: mastery, fluency, and disciplined practice =====
    ("maths", 6, 10, ["numbers", "puzzles"], "Times-Table Fluency", "✖️",
     "a tidy multiplication grid lighting up",
     "Mastery approach: quick, accurate recall frees the brain for harder ideas.",
     "Say the 2, 5 and 10 times tables as fast as you can, accurately.",
     "Fluency means answering without counting — practise a little daily until it's automatic.",
     "apply"),
    ("maths", 8, 13, ["numbers", "puzzles"], "Master Before Moving On", "🏆",
     "stepping stones where each must be solid before the next",
     "Mastery approach: be secure in one idea before building the next.",
     "Pick a tricky sum type and practise five until all five are correct.",
     "Mastery is shown when you can get them right consistently and explain why.",
     "evaluate"),
    ("maths", 10, 16, ["numbers", "puzzles"], "Mental Maths Tricks", "🧠",
     "a brain quickly splitting 99 into 100 minus 1",
     "Mastery approach: smart strategies make hard sums quick.",
     "Add 99 + 47 in your head using a shortcut.",
     "Treat 99 as 100 − 1: 100 + 47 = 147, then subtract 1 to get 146.",
     "apply"),

    # ===== more breadth so plans rarely repeat =====
    ("language", 3, 7, ["stories", "language"], "First Sounds", "🔡",
     "letters making their sounds with friendly mouths",
     "Hearing the first sound in a word is the start of reading.",
     "Say three things that start with the same sound as your name.",
     "Listen for the opening sound — e.g. for 'Sam': sun, sock, soup.",
     "understand"),
    ("biology", 4, 9, ["animals", "nature"], "Animal Homes", "🏠",
     "a nest, a burrow and a hive side by side",
     "Different animals build different homes to stay safe.",
     "Match an animal to its home: bird, rabbit, bee.",
     "Birds use nests, rabbits dig burrows, and bees live in hives.",
     "understand"),
    ("geography", 6, 12, ["geography", "maps"], "Where Does Water Come From?", "🚰",
     "rain to river to reservoir to a kitchen tap",
     "Tap water travels a long journey from rain to home.",
     "Trace how water reaches your tap in three steps.",
     "Rain fills rivers and dams, it's cleaned at a treatment plant, then piped to your tap.",
     "understand"),
    ("history", 8, 14, ["history", "people"], "How We Know About the Past", "🔎",
     "a fossil, a coin and an old letter as clues",
     "Historians and scientists read clues left behind to picture the past.",
     "Name three kinds of clues that tell us about long ago.",
     "Fossils, old objects and written records (and art) are all clues to the past.",
     "analyse"),
    ("health", 6, 12, ["body", "health"], "Strong Bones, Strong You", "🦴",
     "a glass of milk beside a jumping child",
     "Movement and good food build strong bones for life.",
     "Name two activities that help build strong bones.",
     "Jumping, running, dancing and climbing load bones so they grow stronger.",
     "understand"),
    ("technology", 7, 13, ["tech", "robots"], "Debugging", "🐞",
     "a magnifier finding the broken step in a sequence",
     "Finding and fixing mistakes is a core thinking skill in tech.",
     "A recipe says 'bake, then mix'. Spot and fix the mistake.",
     "The steps are out of order — you mix first, then bake.",
     "analyse"),
    ("arts", 5, 11, ["art", "creativity"], "Warm and Cool Colours", "🌈",
     "a colour wheel split into warm and cool halves",
     "Colours can feel warm (reds, oranges) or cool (blues, greens).",
     "Find one warm and one cool object in the room.",
     "Reds, oranges and yellows feel warm; blues, greens and purples feel cool.",
     "understand"),
    ("science", 7, 13, ["experiment", "nature"], "Magnets", "🧲",
     "a magnet pulling paperclips through the air",
     "Magnets pull some metals and have two poles.",
     "Predict three things at home a magnet will and won't stick to.",
     "Magnets grab iron and steel (fridge, paperclips) but not plastic, wood or aluminium.",
     "apply"),
    ("science", 9, 15, ["experiment", "science"], "Acids and Bases", "🧪",
     "red cabbage water turning colours in two cups",
     "Some liquids are acids, some are bases — indicators reveal which.",
     "Guess if lemon juice is an acid or a base, then explain why.",
     "Lemon juice is an acid — it tastes sour and would turn indicator paper a warm colour.",
     "analyse"),
    ("biology", 9, 15, ["body", "health"], "How Your Brain Learns", "🧠",
     "neurons linking up brighter with practice",
     "Practice physically strengthens the connections in your brain.",
     "Explain why practising something hard makes it easier over time.",
     "Repeating a skill strengthens the neural pathways for it, so it needs less effort each time.",
     "evaluate"),
    ("language", 10, 16, ["language", "stories"], "Summarise It", "📝",
     "a long paragraph shrinking into one neat sentence",
     "Summarising forces you to find the single most important idea.",
     "Read a short paragraph and retell it in one sentence.",
     "A good summary keeps the main point and drops the extra detail.",
     "evaluate"),
    ("geography", 10, 16, ["geography", "people"], "Push and Pull Migration", "🧳",
     "arrows leaving a dry region toward a city of lights",
     "People move because of 'push' problems and 'pull' opportunities.",
     "Give one push and one pull reason people migrate.",
     "A push is drought or conflict; a pull is jobs or safety somewhere new.",
     "analyse"),
]

# Fun / decompression cards (topic, emoji, desc, guide, challenge, answer)
_FUN = [
    ("Riddle Time", "🧩", "a friendly question mark among puzzle pieces",
     "A quick riddle to stretch your thinking and smile.",
     "Riddle: I flutter and I'm colourful — what am I?",
     "A butterfly!"),
    ("Word Game", "🔤", "letters tumbling into a happy word",
     "Play with words to grow a sharp, speedy brain.",
     "How many small words can you make from 'BUTTERFLY'?",
     "Lots are hidden — try but, fly, true, lift, belt, true, rut, fur.",),
    ("Spot the Difference", "🔍", "two almost-matching cheerful pictures",
     "Look closely and relax while you hunt for changes.",
     "Find three things that are different in the two pictures.",
     "Compare top-to-bottom and left-to-right in sections so no detail is missed."),
    ("Maze Break", "🌀", "a simple maze with a star at the centre",
     "A calm little maze to reset before the next adventure.",
     "Trace the path to the star without lifting your pencil.",
     "Tip: start from the centre star and work outwards — it's often easier."),
    ("Memory Flash", "🧠", "three colourful cards flipping over",
     "A speedy game to sharpen focus and memory.",
     "Look at five objects for ten seconds, cover them, and list them.",
     "Grouping items into a little story helps you remember more of them."),
    ("Brain Teaser", "💡", "a glowing lightbulb over a tricky shape",
     "One clever puzzle to make you think sideways.",
     "What has hands but cannot clap?",
     "A clock!"),
    ("Find a Number", "🔢", "a friendly grid of mixed-up numbers",
     "A quick hunt to sharpen focus and number spotting.",
     "Find every number 7 in this row: 1 7 4 7 9 7 2. How many?",
     "There are three 7s."),
    ("Odd One Out", "🦄", "four pictures where one doesn't belong",
     "Spot the item that breaks the pattern.",
     "Which is the odd one out: apple, banana, carrot, grape?",
     "The carrot — it's a vegetable; the rest are fruit."),
    ("Quick Count", "⏱️", "a burst of stars to count fast",
     "Count under gentle time pressure to build number sense.",
     "How many letters are in the word ELEPHANT?",
     "Eight letters."),
    ("I Spy", "👀", "a cheerful room full of hidden things",
     "A classic looking-and-listening game for anywhere.",
     "I spy something that starts with the same sound as 'ball'.",
     "Any matching item works — book, box, banana, bear."),
]


def resolve_stage(age: int) -> dict:
    if age <= 2:
        stage = "sensorimotor"
    elif age <= 6:
        stage = "preoperational"
    elif age <= 11:
        stage = "concrete_operational"
    else:
        stage = "formal_operational"
    young = age <= 4
    return {
        "stage": stage,
        "fun_every": 3 if young else 4,
        "bloom_ceiling": "understand" if young else ("apply" if age <= 11 else "analyse"),
        "age_slack": 1 if not young else 0,
    }


def build_domain_mix(req: PlanRequest) -> dict[str, float]:
    """Weighted domains. Balanced baseline, re-weighted by subjects/interests."""
    base = {
        "biology": 1.0, "maths": 1.0, "language": 1.0, "geography": 1.0,
        "history": 1.0, "health": 1.0, "technology": 1.0, "arts": 1.0,
        "science": 1.0,
    }
    for s in req.subjects:
        d = _SUBJECT_DOMAIN.get(s.lower())
        if d in base:
            base[d] += 3.0  # subjects steer hard
    for it in req.interests:
        hint = _INTEREST_HINT.get(it.lower())
        if hint and hint[0] in base:
            base[hint[0]] += 1.5
    return base


def _interest_tags(req: PlanRequest) -> set[str]:
    tags: set[str] = set()
    for it in req.interests:
        hint = _INTEREST_HINT.get(it.lower())
        if hint:
            tags.add(hint[1])
    return tags


def _select_focused(req: PlanRequest, stage: dict, n: int) -> list[tuple]:
    mix = build_domain_mix(req)
    want_tags = _interest_tags(req)
    surprise = "surprise me" in [i.lower() for i in req.interests]
    slack = 2 if surprise else stage["age_slack"]
    lo, hi = req.age - slack, req.age + slack

    scored = []
    for card in _LIB:
        domain, amin, amax = card[0], card[1], card[2]
        if hi < amin or lo > amax:
            continue
        score = mix.get(domain, 1.0)
        score += 2.0 * len(want_tags.intersection(card[3]))
        score += random.uniform(0, 1.6 if surprise else 0.6)
        scored.append((score, card))

    # Fallback: if nothing matched the age window (e.g. an age beyond the
    # library's range), score every card by domain fit and age closeness so we
    # always return the most suitable available content rather than nothing.
    if not scored:
        for card in _LIB:
            domain, amin, amax = card[0], card[1], card[2]
            mid = (amin + amax) / 2
            distance = abs(req.age - mid)
            score = mix.get(domain, 1.0) + 2.0 * len(want_tags.intersection(card[3]))
            score -= distance * 0.15
            score += random.uniform(0, 0.6)
            scored.append((score, card))

    scored.sort(key=lambda x: x[0], reverse=True)

    # greedy pick avoiding back-to-back same domain
    picked: list[tuple] = []
    last_domain = None
    pool = [c for _, c in scored]
    while len(picked) < n and pool:
        chosen = None
        for c in pool:
            if c[0] != last_domain:
                chosen = c
                break
        if chosen is None:
            chosen = pool[0]
        picked.append(chosen)
        pool.remove(chosen)
        last_domain = chosen[0]
        if not pool:  # allow reuse if library smaller than n
            pool = [c for _, c in scored]
            random.shuffle(pool)
    return picked


def _page(order, archetype, domain, topic, emoji, desc, guide, challenge, answer, bloom) -> Page:
    return Page(
        id=f"pg_{uuid.uuid4().hex[:8]}", order=order, archetype=archetype,
        domain=domain, topic=topic, anchor_visual=f"{emoji}|{desc}",
        guideline=guide, challenge=challenge, answer=answer, bloom_level=bloom,
    )


def _assemble(req: PlanRequest, stage: dict, n: int) -> list[Page]:
    focused = _select_focused(req, stage, n)  # may include extra to absorb fun slots
    fun_every = stage["fun_every"]
    pages: list[Page] = []
    fi = 0
    funi = 0
    for order in range(1, n + 1):
        if order % (fun_every + 1) == 0:
            t, e, d, g, ch, ans = _FUN[funi % len(_FUN)]
            funi += 1
            pages.append(_page(order, "fun", "fun", t, e, d, g, ch, ans, "understand"))
        else:
            card = focused[fi % len(focused)]
            fi += 1
            domain, _, _, _, topic, emoji, desc, guide, challenge, answer, bloom = card
            pages.append(_page(order, "focused", domain, topic, emoji, desc, guide, challenge, answer, bloom))
    return pages


def _speech_outline(req: PlanRequest) -> list[Page]:
    aud = (req.speech_audience or ["the audience"])[0]
    where = req.speech_place or "the room"
    length = req.speech_length or "short"
    topic = (req.subjects or [i for i in req.interests if i != "surprise me"] or ["my favourite thing"])[0]
    parts = [
        ("Opening hook", "🎤", "a confident child greeting a crowd",
         f"Start with a question or surprising fact to grab {aud}.",
         "Practise your first line out loud, smiling.",
         "A great hook is a question, a surprising fact, or a short story that makes people want to hear more."),
        (f"Main point about {topic}", "💬", "a clear idea with one simple picture",
         f"Say it simply, with one example {aud} will remember.",
         "Tell it to a mirror, then to a grown-up.",
         "One clear point with a single memorable example beats lots of facts crammed together."),
        ("Keep to time", "⏱️", "a stopwatch and a calm breath",
         f"A {length} speech for {where} - short, clear, confident.",
         "Time yourself and adjust the pace.",
         "If you run over, cut details, not your main point; pauses are fine and help the audience follow."),
        ("Strong ending", "🌟", "a child taking a proud little bow",
         "Finish with one line they'll clap for.",
         "Practise the last line three times.",
         "End by repeating your main message or a call to action — the last line is what people remember."),
    ]
    return [
        _page(i + 1, "focused", "speech", t, e, d, g, c, ans, "apply")
        for i, (t, e, d, g, c, ans) in enumerate(parts)
    ]


def safety_pass(pages: list[Page]) -> list[Page]:
    """Age-appropriateness / accuracy / sensitivity guard. Mandatory for a
    children's product. Library content is pre-vetted; this stays as the hook
    for generated content."""
    return pages


def curate(req: PlanRequest) -> Plan:
    stage = resolve_stage(req.age)
    if req.cadence == "speech":
        pages = safety_pass(_speech_outline(req))
    else:
        n = _SIZE[req.size]
        if req.cadence == "once off":
            n = min(n, 4)
        pages = safety_pass(_assemble(req, stage, n))
    return Plan(
        id=f"plan_{uuid.uuid4().hex[:10]}", request=req, pages=pages,
        created_at=datetime.now(timezone.utc),
    )
