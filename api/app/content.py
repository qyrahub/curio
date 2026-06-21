"""Single source of truth for Curio's curated content.

This is where the data that the prototype kept in client-side JS now lives —
server-side, so the frontend stays dumb and portable. In production this moves
to a DB / generated corpus; the shape stays the same.

Activities are (title, desc, where, time, cost) tuples; helpers in modes.py
convert them to API models.
"""
from __future__ import annotations

# ---------------- Landing feeds (re-randomised per request) ----------------
FEED_WORLD = [
    "Finland keeps formal reading lessons until about age 7, leaning on play first — and still tops literacy tables.",
    "Singapore teaches every maths idea concretely, then pictorially, then symbolically (the C-P-A approach).",
    "UNESCO highlights play-based early learning as one of the strongest foundations for school success.",
    "Estonia weaves computational thinking into primary school as a core skill, not an add-on.",
    "Many schools now teach social-emotional learning alongside reading and maths — naming feelings improves focus.",
    "Outdoor 'forest schools' are spreading worldwide, linking time in nature to attention and wellbeing.",
    "Bilingual early exposure is linked to stronger flexible thinking, even when fluency comes later.",
]
FEED_TREND = [
    "Reading aloud daily — even to older children — keeps boosting vocabulary and bonding.",
    "Short movement breaks between focused tasks help young children concentrate for longer.",
    "Parents are trading screen-time battles for 'tech together' time: co-watching and talking about it.",
    "Consistent bedtimes track closely with mood and learning.",
    "Letting kids be a little bored sparks more imaginative, self-directed play.",
    "Praising effort and strategy (not 'you're so clever') builds a sturdier growth mindset.",
    "Device-free family meals are linked to better language and emotional regulation.",
]
FEED_TOOLS = [
    "Spaced repetition — revisiting ideas across days — is being built into more learning apps for stickier memory.",
    "Story-based maths apps frame sums as adventures, lifting engagement for reluctant learners.",
    "Voice-first tools let pre-readers ask questions and hear answers, widening who can explore.",
    "Project kits mixing science with art ('STEAM') are replacing single-subject worksheets.",
    "Simple at-home 'experiment of the week' routines turn kitchens into labs.",
    "Picture-led, one-idea-per-page formats cut overwhelm for young minds.",
    "Audio-plus-illustration combos help children who learn better by listening.",
]
FEED_FACT = [
    "A child can ask around 300 questions a day at peak curiosity — fuel it!",
    "Babies can hear and react to music before they're born.",
    "Octopuses have three hearts and blue blood.",
    "Honey never spoils — jars thousands of years old are still edible.",
    "Young brains form about a million new neural connections every second.",
    "A group of flamingos is called a 'flamboyance'.",
    "The Eiffel Tower can grow over 15cm taller in summer as the metal expands.",
    "A bolt of lightning is about five times hotter than the surface of the sun.",
    "Sloths can hold their breath longer than dolphins can.",
    "Wombats make cube-shaped poop.",
    "Bananas are berries, but strawberries are not.",
    "There are more stars in the universe than grains of sand on all Earth's beaches.",
    "A teaspoon of neutron star would weigh about a billion tonnes.",
    "Sharks existed before trees did.",
    "Your nose can remember around 50,000 different smells.",
    "Cows have best friends and get stressed when separated.",
    "The shortest war in history lasted about 38 minutes.",
    "A day on Venus is longer than its year.",
    "Hot water can freeze faster than cold water under some conditions.",
    "Butterflies taste with their feet.",
    "An adult human is made of about 37 trillion cells.",
    "Sound can't travel through empty space — space is silent.",
    "The human eye can distinguish about 10 million colours.",
    "Ants don't have lungs; they breathe through tiny holes in their bodies.",
    "A hummingbird's heart can beat over 1,200 times a minute.",
    "Earth is the only planet not named after a god.",
    "A jiffy is a real unit of time — about one hundredth of a second.",
    "Polar bears have black skin under their clear, hollow fur.",
    "The tongue is the strongest muscle relative to its size.",
    "A group of crows is called a 'murder'.",
    "Light from the sun takes about eight minutes to reach Earth.",
    "Some turtles can breathe through their back ends.",
    "Spider silk is, for its weight, stronger than steel.",
    "The Great Wall of China is not visible to the naked eye from space.",
    "Honeybees can recognise human faces.",
    "Your bones are about four times stronger than concrete.",
    "A cloud can weigh more than a million kilograms.",
    "Dolphins give each other names and call to one another.",
    "The dot over a lowercase 'i' or 'j' is called a tittle.",
    "Penguins propose to their mates with a pebble.",
    "Bamboo can grow almost a metre in a single day.",
    "The heart of a blue whale is so big a small child could crawl through its arteries.",
    "Rats laugh when they're tickled.",
    "There's enough DNA in your body to stretch to the sun and back many times.",
    "A snail can sleep for up to three years.",
    "Lightning strikes Earth about 8 million times a day.",
    "Some frogs can freeze solid in winter and thaw alive in spring.",
    "The smell of fresh rain has a name: petrichor.",
    "A shrimp's heart is in its head.",
    "Saturn would float if you could find a bathtub big enough.",
    "The longest English word without a true vowel is 'rhythms'.",
    "Elephants can recognise themselves in a mirror.",
    "A newborn kangaroo is about the size of a jellybean.",
    "Water can exist as solid, liquid and gas at the same time at one special point.",
    "Crocodiles have been around longer than dinosaurs were.",
    "The human brain uses about as much power as a dim lightbulb.",
    "Most of the oxygen we breathe comes from the ocean, not forests.",
    "A flea can jump over 100 times its own body length.",
    "Stars twinkle because their light bends as it passes through our air.",
    "Giraffes only need about 30 minutes of sleep a day.",
    "The Sahara was green and full of lakes a few thousand years ago.",
    "Your stomach gets a new lining every few days so it doesn't digest itself.",
    "A single Lego brick can bear the weight of hundreds of bricks stacked on it.",
]

# Extra world / trend / tool items so the landing feed stays fresh for months.
FEED_WORLD += [
    "Japan's schools have students help clean and serve lunch, teaching responsibility alongside academics.",
    "China emphasises mastery: children practise a skill until it's fluent before moving on.",
    "Reggio Emilia classrooms in Italy treat the environment as a 'third teacher'.",
    "The Netherlands ranks children among the world's happiest, with lots of free play and biking.",
    "Israel's 'chutzpah' culture encourages kids to question and debate ideas openly.",
    "Many Nordic schools start the day with outdoor time in almost any weather.",
    "Montessori classrooms let children choose their work and learn at their own pace.",
    "Feuerstein's approach teaches children *how* to think, not just what to think.",
]
FEED_TREND += [
    "Family 'question of the day' rituals build vocabulary and critical thinking at dinner.",
    "Letting children teach you something they learned cements it in their memory.",
    "Hands-on chores like cooking quietly build maths, sequencing and confidence.",
    "Naming emotions out loud helps children calm big feelings faster.",
    "Mixed-age play teaches leadership to older kids and stretches younger ones.",
    "A 'yes space' where everything is safe lets toddlers explore without constant 'no'.",
]
FEED_TOOLS += [
    "Bar-model drawing (from Singapore maths) makes word problems visual and solvable.",
    "Number bonds help children see how numbers break apart and join together.",
    "Concrete-pictorial-abstract sequencing builds deep understanding before symbols.",
    "Think-aloud modelling shows children the hidden steps of solving a problem.",
    "Retrieval practice — recalling without looking — beats re-reading for memory.",
    "Interleaving different topics in one session improves long-term retention.",
]

# ---------------- Parent ----------------
PARENT_SUMMARIES = [
    "Your child has been most drawn to animals and space lately, and breezes through counting games.",
    "Recent plans leaned into stories and nature — a great base for early reading.",
    "Curiosity is high around how things work; the puzzle breaks are a clear favourite.",
    "Strong streak on numbers, a little hesitant with longer stories — worth a gentle stretch.",
]
PARENT_NUDGES = [
    ("🍽️", "Talk about today's page at dinner", "Ask one open question — 'what surprised you about the butterfly?'"),
    ("🚶", "Take learning outside", "Spot three living things on a short walk and name them together."),
    ("📚", "Read aloud for 10 minutes", "Let them turn the pages and predict what happens next."),
    ("🎨", "Let them teach you", "Ask your child to explain today's idea back to you in their words."),
    ("⏱️", "Protect a 'boredom' window", "Unstructured time today — see what play they invent."),
    ("🌙", "Keep bedtime steady", "A consistent wind-down helps tomorrow's focus."),
    ("👏", "Praise the effort", "Notice how they tried, not just whether they got it right."),
    ("🧩", "Follow the spark", "They loved space? Add one space topic to this week's plan."),
]
TIPS_CHILD = [
    "Follow their questions — curiosity-led detours teach more than sticking to a script.",
    "Mix in movement; young bodies learn better when they're not still for long.",
    "Celebrate mistakes as 'not yet' — it keeps them brave enough to try hard things.",
    "Read together daily, even briefly; it compounds more than almost anything else.",
    "Give choices ('story or numbers first?') to build ownership and motivation.",
    "Name feelings out loud — it grows both vocabulary and self-control.",
    "Keep tasks just-a-bit-hard; too easy bores, too hard discourages.",
]
TIPS_SELF = [
    ("adopt", "Adopt a calm, curious tone — your child mirrors your attitude to learning."),
    ("adopt", "Adopt short, consistent routines over long, rare marathons."),
    ("adopt", "Model reading and wondering aloud yourself."),
    ("avoid", "Avoid comparing your child to siblings or other kids."),
    ("avoid", "Avoid rushing in with the answer — give a few seconds of thinking time."),
    ("avoid", "Be mindful: your own screen habits set the family's baseline."),
    ("avoid", "Avoid turning learning into a reward-or-punishment system."),
    ("adopt", "End on a win — finish while it's still fun."),
]

# ---------------- Family: education + lifestyle ----------------
FAMILY_EDU = [
    ("📖", "Family reading half-hour", "Everyone reads — together or side by side — three evenings a week."),
    ("🌍", "One world topic a week", "Pick a country; cook a dish, find it on a map, learn three words."),
    ("🧪", "Experiment of the week", "A simple kitchen-science moment everyone watches and guesses."),
    ("🗣️", "Dinner-table question", "One big 'what if' question to discuss with no wrong answers."),
    ("🎨", "Make something by hand", "Build, draw or craft together — no screens, just making."),
    ("♻️", "A kindness or care task", "One small act for a neighbour, nature or each other."),
]
# (category, color, title, activity, where, time, cost)
LIFESTYLE = [
    ("Mind", "#5AA7E6", "Puzzle night", "Tackle a jigsaw or board game as a team", "Living room", "Evening, 45 min", "Free"),
    ("Soul", "#9B6DD6", "Gratitude circle", "Each person shares one good thing from the day", "Dinner table", "Suppertime, 10 min", "Free"),
    ("Spirit", "#5BBF8A", "Nature walk", "Walk a trail and notice five living things", "Local park / trail", "Morning, 1 hr", "Free"),
    ("Fun", "#FF7A66", "Family game tournament", "Three quick games and a silly scoreboard", "Home", "Saturday, 1.5 hr", "Free"),
    ("Entertainment", "#FFC94D", "Movie + talk night", "Watch together, then share favourite moments", "Lounge", "Friday, 2 hr", "Snacks ~ low"),
    ("Relaxation", "#2EC4B6", "Calm-down stretch", "Gentle stretches and slow breathing before bed", "Bedrooms", "Bedtime, 15 min", "Free"),
    ("Mind", "#5AA7E6", "Library visit", "Each person borrows one new book", "Local library", "Weekend, 1 hr", "Free"),
    ("Soul", "#9B6DD6", "Help someone", "A small kind act for a neighbour or each other", "Neighbourhood", "Anytime, 30 min", "Free"),
    ("Spirit", "#5BBF8A", "Garden moment", "Plant, water or tidy a green corner together", "Garden / pots", "Morning, 30 min", "Seeds ~ low"),
    ("Fun", "#FF7A66", "Cook-off", "Make a simple dish as a team and taste-test", "Kitchen", "Sunday, 1 hr", "Ingredients ~ med"),
    ("Entertainment", "#FFC94D", "Story or music night", "Tell tales or play instruments and sing", "Living room", "Evening, 1 hr", "Free"),
    ("Relaxation", "#2EC4B6", "Screen-free wind-down", "Quiet reading or drawing, lights low", "Anywhere comfy", "Evening, 30 min", "Free"),
    ("Mind", "#5AA7E6", "Curiosity quest", "Pick one 'why' question and find the answer", "Home / online", "Weekend, 45 min", "Free"),
    ("Fun", "#FF7A66", "Park playdate", "Run, climb and play in the open air", "Park", "Afternoon, 1.5 hr", "Free"),
]

# ---------------- Family: itinerary (real South African places) ----------------
_WCAPE = [
    ("Cape Point & Cape of Good Hope", "Lighthouse, cliffs and curious baboons", "Cape Peninsula", "Full day", "Medium"),
    ("Spier wine farm family day", "Picnics, eagle encounter and big lawns", "Stellenbosch", "Full day", "Low-Medium"),
    ("Hermanus whale watching", "Spot whales from the cliff path (Jun-Nov)", "Hermanus", "Day trip", "Free-Medium"),
    ("Table Mountain cableway", "Ride up for sweeping city and sea views", "Cape Town", "Half day", "Medium"),
]
_GAUTENG = [
    ("Cradle of Humankind (Maropeng)", "Human-origins centre and Sterkfontein Caves", "Gauteng", "Full day", "Medium"),
    ("Lion & Safari Park", "Self-drive among lions and a cub area", "Hartbeespoort", "Half day", "Medium"),
    ("Hartbeespoort Dam & cableway", "Cable-car views and dam activities", "North West edge", "Day trip", "Low-Medium"),
    ("Pretoria day out", "National Zoo and Union Buildings gardens", "Pretoria", "Full day", "Low"),
]
_KZN = [
    ("Drakensberg day hike", "Mountains, waterfalls and San rock art", "uKhahlamba-Drakensberg", "Full day", "Low"),
    ("PheZulu / Tala safari", "Game drives near the city", "Valley of 1000 Hills", "Half day", "Medium"),
    ("Midlands Meander", "Crafts, cheese and farm stops", "KZN Midlands", "Day trip", "Low-Medium"),
    ("Coast weekend", "uShaka and Golden Mile beach time", "Durban", "2 days", "Higher"),
]
_ECAPE = [
    ("Addo Elephant National Park", "Big-five game drive near the coast", "Addo", "Full day", "Medium"),
    ("Tsitsikamma / Storms River", "Suspension bridge and forest trails", "Garden Route edge", "Day trip", "Low-Medium"),
    ("Jeffreys Bay", "Beaches and gentle surf lessons", "J-Bay", "Day trip", "Low"),
    ("Hogsback", "Misty forests and waterfalls", "Amathole", "Weekend", "Higher"),
]
_FSTATE = [
    ("Golden Gate Highlands NP", "Sandstone cliffs and easy trails", "Eastern Free State", "Day trip", "Low-Medium"),
    ("Clarens village", "Art, ziplines and a brewery garden", "Clarens", "Weekend", "Higher"),
    ("Gariep Dam", "Boat trips and the big dam wall", "Gariep", "Day trip", "Low-Medium"),
    ("Maselspoort resort", "Swimming and river fun", "near Bloemfontein", "Half day", "Low"),
]
_MPUM = [
    ("Blyde River Canyon", "Three Rondavels and Bourke's Luck Potholes", "Panorama Route", "Day trip", "Low-Medium"),
    ("God's Window & Graskop Gorge lift", "Viewpoints and a glass lift into the gorge", "Graskop", "Day trip", "Low-Medium"),
    ("Kruger overnight safari", "Two days of big-five game viewing", "Kruger NP", "2 days", "Higher"),
    ("Sudwala Caves", "Guided cave tour and dinosaur park", "near Sabie", "Half day", "Low-Medium"),
]
ITIN_AREAS = {
    "Cape Town": {"provincial": _WCAPE, "local": [
        ("Table Mountain by cableway", "Ride up for views over the city and sea", "Table Mountain", "Half day", "Medium"),
        ("V&A Waterfront", "Harbour, food, the big wheel and street acts", "V&A Waterfront", "Half day", "Free entry"),
        ("Kirstenbosch Gardens", "Tree-canopy walkway and picnic lawns", "Newlands", "2-3 hrs", "Low"),
        ("Two Oceans Aquarium", "Meet sharks, rays and penguins", "V&A Waterfront", "2 hrs", "Medium"),
        ("Boulders Beach penguins", "See African penguins up close", "Simon's Town", "2-3 hrs", "Low"),
    ]},
    "Stellenbosch": {"provincial": _WCAPE, "local": [
        ("Stellenbosch Botanical Garden", "Small, lush university garden", "Stellenbosch", "1-2 hrs", "Free-Low"),
        ("Spier wine farm", "Picnics, eagle encounter and lawns", "Stellenbosch", "Full day", "Low-Medium"),
        ("Jonkershoek Nature Reserve", "Easy mountain trails and streams", "Stellenbosch", "Half day", "Low"),
        ("Giraffe House", "Meet giraffes and farmyard animals", "R304", "2-3 hrs", "Low"),
        ("Historic Dorp Street walk", "Old streets and the village museum", "Stellenbosch", "1-2 hrs", "Low"),
    ]},
    "Garden Route (Knysna)": {"provincial": _WCAPE, "local": [
        ("Knysna Heads & lagoon", "Viewpoints and a lagoon boat trip", "Knysna", "Half day", "Low-Medium"),
        ("Featherbed Nature Reserve", "Ferry, guided walk and eco-tour", "Knysna", "Half day", "Medium"),
        ("Plettenberg Bay beaches", "Swim, dolphins and sandcastles", "Plettenberg Bay", "Half day", "Free"),
        ("Knysna Elephant Park", "Walk with rescued elephants", "near Plett", "2-3 hrs", "Medium"),
        ("Garden of Eden forest walk", "Easy boardwalk through tall trees", "near Plett", "1-2 hrs", "Low"),
    ]},
    "Johannesburg": {"provincial": _GAUTENG, "local": [
        ("Johannesburg Zoo", "Walk the enclosures and catch feed times", "Parkview", "Half day", "Low"),
        ("Sci-Bono Discovery Centre", "Hands-on science exhibits", "Newtown", "2-3 hrs", "Low"),
        ("Gold Reef City", "Rides and a gold-mine tour", "Ormonde", "Full day", "Medium"),
        ("Walter Sisulu Botanical Garden", "Waterfall, eagles and picnic lawns", "Roodepoort", "Half day", "Low"),
        ("Montecasino Bird Gardens", "Birds, lemurs and a flight show", "Fourways", "2-3 hrs", "Low"),
    ]},
    "Pretoria": {"provincial": _GAUTENG, "local": [
        ("National Zoological Garden", "One of the world's largest zoos", "Pretoria CBD", "Half day", "Low"),
        ("Union Buildings gardens", "Lawns, statues and city views", "Arcadia", "1-2 hrs", "Free"),
        ("Pretoria Botanical Garden", "Trails and indigenous plants", "Brummeria", "2-3 hrs", "Low"),
        ("Voortrekker Monument", "History and hilltop views", "Groenkloof", "Half day", "Low"),
        ("Sci-Enza science centre", "Interactive science at the university", "Hatfield", "2 hrs", "Low"),
    ]},
    "Durban": {"provincial": _KZN, "local": [
        ("uShaka Marine World", "Aquarium and water park", "Point, Durban", "Full day", "Medium"),
        ("Durban Botanic Gardens", "Africa's oldest surviving botanic garden", "Berea", "2 hrs", "Free-Low"),
        ("Moses Mabhida SkyCar", "Ride to the stadium arch", "Stamford Hill", "1-2 hrs", "Low"),
        ("Golden Mile beachfront", "Promenade, sand and bike rides", "Durban beachfront", "Half day", "Free"),
        ("Mitchell Park Zoo", "Small zoo and tea garden", "Morningside", "2 hrs", "Low"),
    ]},
    "Gqeberha (Port Elizabeth)": {"provincial": _ECAPE, "local": [
        ("Bayworld", "Museum, oceanarium and snake park", "Humewood", "Half day", "Low"),
        ("Hobie Beach & promenade", "Swim, build sandcastles and walk", "Summerstrand", "Half day", "Free"),
        ("Kragga Kamma Game Park", "See cheetah, rhino and zebra", "PE outskirts", "Half day", "Medium"),
        ("SAMREC penguin centre", "Learn about rescued penguins", "Cape Recife", "2 hrs", "Low"),
        ("Boardwalk complex", "Family entertainment and a lake", "Summerstrand", "2-3 hrs", "Free-Low"),
    ]},
    "Bloemfontein": {"provincial": _FSTATE, "local": [
        ("Naval Hill & Franklin Reserve", "City game reserve with giraffe and zebra", "Naval Hill", "Half day", "Free-Low"),
        ("Free State Botanical Garden", "Trails and birdlife", "Dan Pienaar", "2 hrs", "Low"),
        ("Oliewenhuis Art Museum", "Art in a garden setting", "Heuwelsig", "1-2 hrs", "Free"),
        ("Loch Logan Waterfront", "Shops, food and a small aquarium", "CBD", "2-3 hrs", "Free-Low"),
        ("Maselspoort resort", "Swimming and river fun", "outside town", "Half day", "Low"),
    ]},
    "Nelspruit (Mbombela)": {"provincial": _MPUM, "local": [
        ("Lowveld Botanical Garden", "Rivers, rainforest and waterfalls", "Mbombela", "Half day", "Low"),
        ("Chimp Eden sanctuary", "Meet rescued chimpanzees", "near Mbombela", "Half day", "Medium"),
        ("Sabie waterfalls route", "Lone Creek and Bridal Veil falls", "Sabie", "Day trip", "Low"),
        ("Sudwala Caves", "Cave tour and dinosaur park", "near Sabie", "Half day", "Low-Medium"),
        ("Kruger day safari", "Big-five drive via Numbi/Phabeni gate", "Kruger gate", "Full day", "Medium"),
    ]},
}
ITIN_NATIONAL = [
    ("Kruger National Park safari", "Big-five game drives and rest camps", "Mpumalanga / Limpopo", "2-3 days", "Higher"),
    ("Drakensberg mountains", "Hikes, waterfalls and San rock art", "KwaZulu-Natal", "Weekend", "Medium-Higher"),
    ("Robben Island & V&A", "History tour by ferry", "Cape Town", "Full day", "Medium"),
    ("Cradle of Humankind", "Human-origins centre and caves", "Gauteng", "Full day", "Medium"),
    ("Addo Elephant Park", "Big-five close to the coast", "Eastern Cape", "Day-weekend", "Medium"),
    ("Sun City resort", "Water park, mazes and family fun", "North West", "Weekend", "Higher"),
    ("Blyde River Canyon & Panorama", "Canyons, falls and viewpoints", "Mpumalanga", "Weekend", "Medium-Higher"),
    ("Garden Route road trip", "Beaches, forests and lagoons", "Western / Eastern Cape", "3-5 days", "Higher"),
]
ITIN_INTL = [
    ("Island beach holiday", "Warm sea, snorkelling and family resorts", "e.g. Mauritius or Zanzibar", "~1 week", "Higher"),
    ("Neighbouring-country safari", "Wildlife in Botswana or Namibia", "Southern Africa", "4-7 days", "Higher"),
    ("European city break", "Museums, parks and old towns", "e.g. London or Lisbon", "~1 week", "Higher"),
    ("Theme-park trip", "Big rides and character days", "e.g. Dubai or Orlando", "~1 week", "Higher"),
    ("Cultural city tour", "Food, landmarks and kid-friendly museums", "a major world city", "4-6 days", "Higher"),
    ("Cruise getaway", "All-in family cruise with daily activities", "regional port", "3-5 days", "Higher"),
]
ITIN_EVENTS = {
    "Christmas": [
        ("Carols by candlelight", "Sing along at a community evening", "Local park or church", "Evening", "Free-Low"),
        ("Festive lights drive", "Tour neighbourhood and mall displays", "Around your city", "Evening", "Free"),
        ("Family Christmas market", "Crafts, treats and gifts", "Local market", "Half day", "Free entry"),
        ("Make & bake at home", "Decorate cookies and the tree together", "Home", "Afternoon", "Low"),
    ],
    "Halloween": [
        ("Pumpkin patch visit", "Pick and decorate a pumpkin", "Local farm/market", "Half day", "Low"),
        ("Costume craft day", "Make simple costumes and masks", "Home", "Afternoon", "Low"),
        ("Safe trick-or-treat trail", "Join an organised mall or estate event", "Local venue", "Evening", "Free-Low"),
        ("Spooky story night", "Gentle, age-right tales and snacks", "Home", "Evening", "Free"),
    ],
    "Guy Fawkes": [
        ("Public fireworks display", "Watch an organised, supervised show", "Approved venue", "Evening", "Free-Low"),
        ("Community gathering", "A safe, family-friendly get-together", "Local venue", "Evening", "Free-Low"),
        ("Fireworks craft (no flame)", "Make glittery 'fireworks' art", "Home", "Afternoon", "Low"),
        ("Stargazing wind-down", "Spot stars away from the noise", "Backyard", "Evening", "Free"),
    ],
    "Mother's Day": [
        ("Breakfast picnic", "Pack a basket and head to a garden", "Local park/garden", "Morning", "Low"),
        ("Handmade-gift morning", "Kids craft a card and a small gift", "Home", "Morning", "Low"),
        ("Botanical garden visit", "A gentle walk and tea together", "Botanical garden", "Half day", "Low"),
        ("Family meal out", "A relaxed lunch together", "Local restaurant", "Midday", "Medium"),
    ],
    "Father's Day": [
        ("Sports outing", "Catch or play a favourite game", "Local field/stadium", "Half day", "Free-Medium"),
        ("Braai & backyard games", "Cook out and play together", "Home", "Afternoon", "Low"),
        ("Build-something afternoon", "A small DIY or model project", "Home", "Afternoon", "Low"),
        ("Adventure walk or ride", "A trail walk or bike outing", "Local trail", "Half day", "Free"),
    ],
}
ITIN_GUY_FAWKES_NOTE = ("Safety first: attend only licensed public displays — "
                        "private fireworks are restricted in many SA municipalities.")

# ---------------- Canvas tools ----------------
CANVAS_EDU = [
    ("Professor Sparks", "#2EC4B6", "🔬", "STEM projects", "Plan, build and source info for science, tech & maths."),
    ("Picasso", "#FF7A66", "🎨", "Art projects", "Ideas, techniques and references for art assignments."),
    ("Wordsworth", "#9B6DD6", "📖", "Literature", "Structure essays, book reports and creative writing."),
    ("Time Traveller", "#5AA7E6", "🏺", "History projects", "Research, timelines and sources, step by step."),
    ("Lab Buddy", "#5BBF8A", "🧪", "Science fair", "From hypothesis to display board, guided."),
    ("Maker Max", "#FFC94D", "🛠️", "Build & design", "Turn an idea into a model, poster or prototype."),
]
CANVAS_FUN = [
    ("Captain Story", "#FF7A66", "📚", "Story maker", "Build a tale with a hero, a problem and a happy twist."),
    ("DJ Doodle", "#9B6DD6", "🎧", "Song studio", "Make beats and silly songs about anything."),
    ("Comic Lab", "#5AA7E6", "💥", "Comic builder", "Turn an idea into a 4-panel comic strip."),
]
CANVAS_PLAY = [
    ("Picasso", "#FF7A66", "🎨", "Painting studio", "Splash colours and create freely on a blank canvas."),
    ("Trivia Tower", "#FFC94D", "❓", "Trivia", "Climb the tower with quick, fun questions."),
    ("Puzzle Park", "#5BBF8A", "🧩", "Puzzles", "Mazes, matches and brain-ticklers to relax with."),
    ("Word Wizard", "#9B6DD6", "🔤", "Word games", "Spell, rhyme and unscramble your way to wins."),
]

# ---------------- Books (Curio Press) ----------------
BOOK_TYPES = ["Sleep-time", "Literacy", "English", "Maths", "Science", "History stories"]
BOOK_TITLES = {
    "Sleep-time": ["Goodnight, Little Star", "The Sleepy Moon", "Dreamtime Friends", "When the Sun Says Night-Night"],
    "Literacy": ["My First Letters", "A is for Adventure", "Sounds All Around", "The Alphabet Parade"],
    "English": ["Words We Love", "The Big Book of Little Words", "Storytime Sentences", "Reading Together"],
    "Maths": ["Counting Critters", "Numbers on Parade", "Shapes and Sizes", "One, Two, Off We Go"],
    "Science": ["Why Is the Sky Blue?", "The Curious Little Scientist", "How Things Grow", "Wonders of Water"],
    "History stories": ["Long Ago and Far Away", "Tales from Times Past", "When Grandparents Were Small", "Heroes of History"],
}
BOOK_COVERS = {
    "Sleep-time": "🌙", "Literacy": "🔤", "English": "📖",
    "Maths": "🔢", "Science": "🔬", "History stories": "🏺",
}

# ---------------- Brain seed log ----------------
BRAIN_SEED = [
    ("🌿", "Play-based early learning", "fed into child plans for under-7s"),
    ("😴", "Sleep & focus link", "added a bedtime nudge to parent tips"),
    ("🇸🇬", "Concrete-pictorial-abstract maths", "shaping how numbers pages are built"),
]
