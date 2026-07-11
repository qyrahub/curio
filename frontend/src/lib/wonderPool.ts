import { tierOf, type Tier } from "../components/heroArt";
import { useProfile } from "./profile";

/* Daily "wonder" pool.
   The Home preview card used to hardcode one topic per maturity tier — a single
   claim/evidence/reasoning diagram for older kids that felt static and had a
   dark-mode text-visibility bug. This replaces that with a rotating pool: for
   every tier there are ~25 curated wonders, and each day the card shows one
   from that tier's pool, chosen deterministically by date.

   Contract:
   - Every wonder has a short topic tag, a lead question/hook, a one-line
     context, then a box that is either "TRY THIS" (an activity a parent
     can do with the child now) or "DID YOU KNOW" (a verifiable fact).
   - Facts are things widely accepted as true and written in original words —
     no copyrighted source text, no popular "fun facts" that are actually myths.
   - Activities are safe, no-equipment or common-equipment, and doable in a
     few minutes.
   - Everything is calibrated to the tier's reading level and attention span.

   Rotation: (daysSinceEpoch + tier*3) % pool.length. The tier offset means
   siblings of different ages don't hit the same wonder on the same day. Refresh
   in a browser at midnight and the wonder rolls forward. */

export type WonderKind = "try" | "know";
export interface Wonder { tag: string; lead: string; small: string; kind: WonderKind; body: string; }

/* Pool size per tier is 25 — cycles about once a month per tier. Extend
   toward 60+ per tier over time to reach a six-month cycle without repeats. */

const T1: Wonder[] = [
  { tag: "Sky", lead: "Why is the sky blue?", small: "Sunlight is made of many colours; blue scatters most in the air.", kind: "know", body: "At sunset the light travels further and orange wins." },
  { tag: "Nature", lead: "Where does a puddle go?", small: "The sun turns puddle water into invisible cloud.", kind: "try", body: "Draw around a puddle with chalk. Look again after a nap — is it smaller?" },
  { tag: "Body", lead: "Why do we yawn?", small: "A big breath wakes up sleepy lungs.", kind: "know", body: "Puppies and kittens yawn too." },
  { tag: "Animals", lead: "Do fish sleep?", small: "They rest, floating still with their eyes open.", kind: "know", body: "Fish don't have eyelids, so their eyes stay open." },
  { tag: "Food", lead: "What makes bread puffy?", small: "Tiny bubbles of gas from yeast fill it with air.", kind: "try", body: "Squish a piece of soft bread. Feel the bubbles pop back." },
  { tag: "Colours", lead: "Where do rainbows come from?", small: "Sunlight through raindrops splits into all its colours.", kind: "try", body: "Spray water in the sun with your back to it. Look for a rainbow." },
  { tag: "Weather", lead: "Why is snow white?", small: "One snowflake is see-through; many piled up look white.", kind: "know", body: "A single snowflake is clear like glass." },
  { tag: "Body", lead: "Why do we have belly buttons?", small: "It's where you were joined to your mum before you were born.", kind: "know", body: "Every person has one." },
  { tag: "Nature", lead: "How do trees drink?", small: "Roots pull water up through the trunk to every leaf.", kind: "try", body: "Put celery in coloured water. Wait — the leaves change colour!" },
  { tag: "Animals", lead: "How do ants find food?", small: "They leave a smelly trail so their friends can follow.", kind: "know", body: "One ant tells hundreds of others where the crumbs are." },
  { tag: "Body", lead: "Why do we sneeze?", small: "Your nose pushes a big rush of air out to clear it.", kind: "try", body: "Cover your sneeze with your elbow — it keeps germs in." },
  { tag: "Sky", lead: "What is a shadow?", small: "The shape your body makes when it blocks the light.", kind: "try", body: "Stand in the sun and wiggle. Watch your shadow wiggle too." },
  { tag: "Sound", lead: "How do ears hear?", small: "Sounds are tiny wiggles in the air your ears catch.", kind: "try", body: "Cup your hands behind your ears. Sounds get louder." },
  { tag: "Water", lead: "Why does ice float?", small: "Ice weighs less than the same amount of water.", kind: "know", body: "That's why an ice cube bobs up in your drink." },
  { tag: "Animals", lead: "Why do cats purr?", small: "Purring can mean happy — or feeling better after being sad.", kind: "know", body: "A cat's purr may even help their bones stay strong." },
  { tag: "Nature", lead: "Why do leaves fall?", small: "Trees rest in winter and drop their leaves to save energy.", kind: "try", body: "Collect three different leaves. Are any two the same shape?" },
  { tag: "Food", lead: "Where does milk come from?", small: "From cows, goats and sheep — animals who feed milk to their babies.", kind: "know", body: "Baby cows are called calves." },
  { tag: "Body", lead: "Why do teeth wobble?", small: "New grown-up teeth are pushing the little baby teeth out.", kind: "know", body: "You'll grow twenty baby teeth, then even more big ones." },
  { tag: "Sky", lead: "Why do stars twinkle?", small: "Air between us and the stars wiggles their light.", kind: "try", body: "On a clear night, count 5 stars. Which twinkles most?" },
  { tag: "Animals", lead: "How do birds fly?", small: "Their wings push air down; the air pushes them up.", kind: "try", body: "Flap a piece of paper fast. Feel the wind you make." },
  { tag: "Weather", lead: "What is thunder?", small: "The sound the air makes when lightning heats it super fast.", kind: "know", body: "Light is faster than sound — that's why you see the flash first." },
  { tag: "Nature", lead: "How do bees make honey?", small: "They gather sweet drops from flowers and slowly dry them.", kind: "know", body: "One bee makes only a tiny drop in her whole life." },
  { tag: "Body", lead: "Why do goosebumps happen?", small: "Your skin puffs up to try to keep you warm.", kind: "try", body: "Blow gently on your arm. Do you feel the shiver?" },
  { tag: "Nature", lead: "How does a seed grow?", small: "It drinks water and reaches for the sun.", kind: "try", body: "Wrap a bean seed in a damp paper towel. Watch it sprout in a few days." },
  { tag: "Water", lead: "Why do bubbles pop?", small: "Their thin skin dries out — pop!", kind: "try", body: "Try to catch a bubble on a wet hand. Wet fingers help." },
];

const T2: Wonder[] = [
  { tag: "Space", lead: "Why does the moon change shape?", small: "We see different amounts of its sunlit side each night.", kind: "try", body: "Draw the moon three nights in a row. Notice how it changes." },
  { tag: "Nature", lead: "How does a caterpillar become a butterfly?", small: "Inside the chrysalis, it rearranges itself completely.", kind: "know", body: "Its body almost turns to soup, then rebuilds as a butterfly." },
  { tag: "Body", lead: "How many bones are in your body?", small: "About 206 as an adult — you were born with more.", kind: "know", body: "Some bones fuse together as you grow." },
  { tag: "Animals", lead: "How do fish breathe?", small: "Gills take oxygen straight out of the water.", kind: "know", body: "That's why fish can't breathe in air." },
  { tag: "Weather", lead: "What makes wind?", small: "Warm air rises; cool air rushes in to take its place.", kind: "try", body: "Hold a tissue at an open window on a breezy day. Watch it dance." },
  { tag: "Food", lead: "Why does bread get hard?", small: "The water inside evaporates when it sits out.", kind: "try", body: "Put half a slice in a bag and half out. Compare tomorrow." },
  { tag: "Sound", lead: "How does an echo work?", small: "Sound bounces off a hard surface back to your ears.", kind: "try", body: "Shout softly at a wall. Listen for the echo." },
  { tag: "Space", lead: "Why is the sun so hot?", small: "It's a giant ball of glowing gas — the closest star to us.", kind: "know", body: "The sun is much bigger than Earth even though it looks small." },
  { tag: "Nature", lead: "How do plants eat?", small: "Their leaves make food from sunlight, water and air.", kind: "know", body: "This is called photosynthesis." },
  { tag: "Body", lead: "Why do fingers wrinkle in water?", small: "Your skin quietly changes shape to grip wet things better.", kind: "try", body: "Soak your hand for five minutes. Check the fingertips." },
  { tag: "Animals", lead: "Why do zebras have stripes?", small: "The pattern confuses biting flies and may help hide in the herd.", kind: "know", body: "No two zebras have exactly the same stripes." },
  { tag: "Water", lead: "How do fish stay under water?", small: "Most have a little air sac inside called a swim bladder.", kind: "know", body: "They can fill or empty it to rise or sink." },
  { tag: "Sky", lead: "What are clouds made of?", small: "Tiny drops of water floating in the air.", kind: "try", body: "Breathe onto a cold window. That little cloud is the same thing." },
  { tag: "Colours", lead: "How do you make orange?", small: "Mix red and yellow.", kind: "try", body: "Try it with crayons, then paints. Are the oranges the same?" },
  { tag: "Body", lead: "Why do we blink?", small: "Blinking spreads tears and keeps your eyes clean.", kind: "know", body: "You blink around 15 times a minute without noticing." },
  { tag: "Nature", lead: "Why are leaves green?", small: "A green chemical called chlorophyll catches sunlight to make food.", kind: "know", body: "Autumn colours were in the leaf all along — hidden by green." },
  { tag: "Animals", lead: "How do frogs jump so far?", small: "Long back legs act like springs to launch them.", kind: "try", body: "Bend low, arms behind you, then jump. Feel your legs spring." },
  { tag: "Weather", lead: "Why does it rain?", small: "Clouds fill with water drops until they're too heavy to hold.", kind: "know", body: "The water in rain is the same water that fell on dinosaurs." },
  { tag: "Space", lead: "How many planets are there?", small: "Eight planets travel around our sun.", kind: "try", body: "Try naming them in order. Start with the closest to the sun." },
  { tag: "Food", lead: "Why is chocolate sweet?", small: "Sugar is added to cocoa, which is naturally bitter.", kind: "know", body: "Plain cocoa tastes nothing like a chocolate bar." },
  { tag: "Sound", lead: "How high can you hear?", small: "Kids can hear higher sounds than adults.", kind: "try", body: "Ask a grown-up to hum higher and higher. When do they stop hearing it?" },
  { tag: "Nature", lead: "Where do rivers go?", small: "Most flow downhill until they reach the sea.", kind: "know", body: "Water then evaporates, becomes rain, and starts again." },
  { tag: "Body", lead: "Why do we get hiccups?", small: "A muscle under your lungs twitches by mistake.", kind: "try", body: "Slow breaths often help. See what works for you." },
  { tag: "Animals", lead: "How do octopuses change colour?", small: "Tiny colour bags in their skin open and close.", kind: "know", body: "They can match a rock so well they seem to disappear." },
  { tag: "Sky", lead: "Why is night dark?", small: "Our side of Earth is turned away from the sun.", kind: "try", body: "Shine a torch at a ball. Spin it — one side is always in shadow." },
];

const T3: Wonder[] = [
  { tag: "Space", lead: "Why doesn't the moon fall?", small: "It's falling — but moving sideways fast enough to keep missing Earth.", kind: "know", body: "That endless miss is what we call an orbit." },
  { tag: "Body", lead: "How fast can messages travel in your body?", small: "Nerves fire signals up to about 120 metres per second.", kind: "try", body: "Touch your toe with your eyes closed. The signal was almost instant." },
  { tag: "Nature", lead: "Why do onions make you cry?", small: "Cut onions release a gas that stings your eyes.", kind: "try", body: "Try chilling an onion in the fridge first. Notice any difference." },
  { tag: "Animals", lead: "Do dogs really see in black and white?", small: "No — they see blues and yellows, just not reds and greens.", kind: "know", body: "Their eyes are built for movement and low light, not colour." },
  { tag: "Weather", lead: "What is a rainbow made of?", small: "White sunlight split into every colour by raindrops.", kind: "try", body: "Hold a glass of water in sunlight over white paper. Look for a mini rainbow." },
  { tag: "Sound", lead: "Why do voices sound weird on a recording?", small: "You normally hear your own voice partly through your skull, which makes it sound deeper.", kind: "know", body: "The recording is closer to how others hear you." },
  { tag: "Science", lead: "What is the smallest thing you can see?", small: "Roughly a strand of your hair — about a tenth of a millimetre.", kind: "try", body: "Pluck a hair and hold it against paper. That's about the limit." },
  { tag: "Food", lead: "Why does cooking food change it?", small: "Heat rearranges the tiny pieces that make it up.", kind: "know", body: "That's why raw egg and cooked egg feel completely different." },
  { tag: "Space", lead: "How far away is the sun?", small: "About 150 million kilometres — light from it takes 8 minutes to reach us.", kind: "know", body: "The sunlight you feel now left the sun 8 minutes ago." },
  { tag: "Nature", lead: "Why do some fruits float and others sink?", small: "It depends on how much air is inside them.", kind: "try", body: "Test an apple, an orange in its skin, and an orange peeled. What happens?" },
  { tag: "Body", lead: "Why does your heart beat faster when you run?", small: "Your muscles need more oxygen, so the heart pumps blood faster.", kind: "try", body: "Feel your pulse, run in place for 30 seconds, then feel it again." },
  { tag: "Animals", lead: "How do sharks find food?", small: "They can sense tiny electric signals every living thing makes.", kind: "know", body: "Their skin has hundreds of little sensors around the snout." },
  { tag: "Weather", lead: "Why is lightning followed by thunder?", small: "Light travels almost instantly; sound is much slower.", kind: "try", body: "Count seconds between flash and boom. Divide by 3 for kilometres away." },
  { tag: "Science", lead: "What is friction?", small: "The force that slows things sliding against each other.", kind: "try", body: "Slide a shoe on carpet, then on tiles. Feel which grips more." },
  { tag: "Space", lead: "How many stars can you see at night?", small: "From a dark spot, about two to three thousand with your eyes alone.", kind: "know", body: "Away from city lights, the Milky Way looks like a cloudy river." },
  { tag: "Nature", lead: "How do plants know which way is up?", small: "Special cells sense gravity and steer growth.", kind: "try", body: "Plant a seed sideways. In a few days, watch it curve upward." },
  { tag: "Body", lead: "Why does your mouth water for food?", small: "Saliva helps break food down before it even enters your mouth.", kind: "know", body: "Just thinking about a favourite food can start it flowing." },
  { tag: "Animals", lead: "How do bats fly in the dark?", small: "They make squeaks and listen for the echo to picture their surroundings.", kind: "know", body: "This is called echolocation. Dolphins do it too." },
  { tag: "Water", lead: "Why is the sea salty?", small: "Rivers carry tiny amounts of salt from rocks — over millions of years it built up.", kind: "know", body: "That's why lakes fed by rivers can turn salty too." },
  { tag: "Science", lead: "Can you unmix water and food colouring?", small: "Not by mixing more — but heat and steam can help.", kind: "try", body: "Try leaving a cup of coloured water in the sun. What's on the sides after a day?" },
  { tag: "Sky", lead: "Why is the sky red at sunset?", small: "Sunlight travels through more air, and blue is scattered away.", kind: "know", body: "Dust or smoke can make sunsets even redder." },
  { tag: "Nature", lead: "How old can a tree get?", small: "Some living trees are more than 4,000 years old.", kind: "know", body: "Each ring in a trunk is roughly one year of growth." },
  { tag: "Body", lead: "Why do we sweat?", small: "Sweat cools you down as it evaporates from your skin.", kind: "try", body: "Wet the back of your hand and blow on it. That cool feeling is evaporation." },
  { tag: "Animals", lead: "How do birds know where to fly for winter?", small: "They use the sun, stars, landmarks and even Earth's magnetic field.", kind: "know", body: "Young birds often learn the route from older ones." },
  { tag: "Science", lead: "Why does soap clean?", small: "Soap sticks to both water and oil, so it can carry grease away.", kind: "try", body: "Sprinkle pepper on water. Dip a soapy finger in — watch the pepper flee." },
];

const T4: Wonder[] = [
  { tag: "Space", lead: "Why does the sun look yellow?", small: "It's actually white — our atmosphere scatters the blue away.", kind: "know", body: "From space, above the air, the sun looks pure white." },
  { tag: "Science", lead: "What actually causes something to change?", small: "The trick is telling causes apart from things that just happen at the same time.", kind: "try", body: "Find one thing that changed this week. What caused it — and how could you check?" },
  { tag: "Body", lead: "How does memory work?", small: "Groups of brain cells strengthen their links each time you recall something.", kind: "know", body: "That's why practising a skill makes it feel easier." },
  { tag: "Nature", lead: "Why are some places deserts?", small: "Cool, dry air sinks around 30 degrees north and south of the equator.", kind: "know", body: "That's why the Sahara, Kalahari and Australian outback all sit near those latitudes." },
  { tag: "Animals", lead: "How do chameleons change colour?", small: "Layers of tiny crystals in their skin shift to reflect different light.", kind: "know", body: "It's more about mood and temperature than blending in." },
  { tag: "Science", lead: "What makes something a metal?", small: "Metals have loose electrons that flow — that's why they conduct electricity.", kind: "try", body: "Test items with a battery + bulb kit if you have one. Which conduct?" },
  { tag: "Space", lead: "Where does gravity come from?", small: "Any object with mass bends the space around it.", kind: "know", body: "Bigger mass means a bigger bend, and a stronger pull." },
  { tag: "History", lead: "How old is writing?", small: "The earliest known writing is around 5,500 years old, from Sumer.", kind: "know", body: "It started as marks for counting grain and animals." },
  { tag: "Body", lead: "Why do bruises change colour?", small: "As your body cleans up blood under the skin, the pigment steps through a colour sequence.", kind: "know", body: "Purple, then greenish, then yellow — always in that order." },
  { tag: "Nature", lead: "Why don't rainforests have soil like a garden?", small: "Most nutrients live in the plants, not the ground.", kind: "know", body: "Anything that dies is broken down fast and reused." },
  { tag: "Science", lead: "Can you compare two things fairly?", small: "You have to change only one thing at a time — everything else stays equal.", kind: "try", body: "Test how far three different paper planes fly. What did you keep the same?" },
  { tag: "Animals", lead: "How intelligent are octopuses?", small: "They solve puzzles, open jars and remember faces.", kind: "know", body: "Two thirds of their brainpower sits in their arms." },
  { tag: "Weather", lead: "What makes hail?", small: "Water drops get lifted and frozen inside a storm cloud, over and over.", kind: "know", body: "Slice a hailstone and you can see the layers." },
  { tag: "Space", lead: "How far away is the nearest star?", small: "About 40 trillion kilometres — light from it takes over 4 years to reach us.", kind: "know", body: "You are seeing that star as it was 4 years ago." },
  { tag: "Science", lead: "What is a hypothesis?", small: "A specific guess you can test — not just an opinion.", kind: "try", body: "Predict which of two coins will roll further before you drop them. Test five times." },
  { tag: "Body", lead: "Why is blood red?", small: "Iron in a protein called haemoglobin turns red when it grabs oxygen.", kind: "know", body: "Some animals use copper instead — their blood is blue." },
  { tag: "Nature", lead: "How do trees talk?", small: "Underground fungi link roots so trees can share sugar and warnings.", kind: "know", body: "This is sometimes called the 'wood wide web'." },
  { tag: "History", lead: "Who built the first city?", small: "The earliest known city is Uruk in what is now Iraq, around 5,000 years ago.", kind: "know", body: "It may have had over 40,000 people." },
  { tag: "Animals", lead: "Why do elephants have big ears?", small: "Blood flows through the thin ears to release heat and cool them down.", kind: "try", body: "Fan yourself with paper. That cooler feeling is the same idea." },
  { tag: "Science", lead: "What is sound made of?", small: "Vibrations in air, water or solid — the faster the wiggle, the higher the pitch.", kind: "try", body: "Pluck a stretched rubber band. Change the tension and hear it change." },
  { tag: "Space", lead: "What is a black hole?", small: "A region where gravity is so strong even light cannot escape.", kind: "know", body: "The one at the centre of our galaxy is millions of times heavier than the sun." },
  { tag: "Body", lead: "Why do we dream?", small: "The brain sorts memories and practises problem-solving while you sleep.", kind: "try", body: "Keep a notebook by the bed. Jot one thing you remember each morning." },
  { tag: "Nature", lead: "Why is coral in trouble?", small: "Coral turns white when the sea gets too warm.", kind: "know", body: "Small ocean temperature changes matter a great deal." },
  { tag: "Weather", lead: "How does a hurricane get its power?", small: "Warm sea water evaporates into the storm — the energy is huge.", kind: "know", body: "That's why they weaken over cold water or land." },
  { tag: "History", lead: "Why do we have 60 minutes in an hour?", small: "The idea came from ancient Mesopotamia, who counted in sixties.", kind: "know", body: "60 divides evenly into many parts — a useful number." },
];

const T5: Wonder[] = [
  { tag: "Science", lead: "Why is the sky blue but sunsets red?", small: "Air scatters short-wavelength light most strongly.", kind: "know", body: "At sunset, light passes through more air, so only the long red-orange wavelengths make it through." },
  { tag: "Body", lead: "How much of you is bacteria?", small: "You carry roughly as many bacterial cells as human cells.", kind: "know", body: "Most live in your gut and help you digest food." },
  { tag: "Space", lead: "What is inside an atom?", small: "A tiny nucleus of protons and neutrons, surrounded by mostly empty space and electrons.", kind: "know", body: "If an atom were a football stadium, the nucleus would be a pea in the middle." },
  { tag: "Reasoning", lead: "How do you know a claim is true?", small: "A claim is only as strong as the evidence behind it.", kind: "try", body: "Pick a claim you believe. What evidence would change your mind about it?" },
  { tag: "Nature", lead: "How do rivers shape the land?", small: "They carve valleys over thousands of years by carrying tiny bits away.", kind: "try", body: "Pour water down a tray of sand. Watch the river cut a path." },
  { tag: "Animals", lead: "How do migrating birds find their way?", small: "They combine the sun, stars, landmarks and Earth's magnetic field.", kind: "know", body: "Damaging any single sense doesn't fully stop them — the systems back each other up." },
  { tag: "Weather", lead: "Why do hurricanes spin?", small: "Earth's rotation nudges moving air sideways — that's the Coriolis effect.", kind: "know", body: "That's why they spin one way north of the equator and the other way south." },
  { tag: "Science", lead: "What is energy?", small: "The capacity to do work — it changes form but is never lost.", kind: "try", body: "Rub your palms together. That heat is your motion becoming warmth." },
  { tag: "History", lead: "How did the Romans build lasting concrete?", small: "They mixed volcanic ash with lime — modern chemists only recently understood why it survives.", kind: "know", body: "It actually gets stronger in seawater over centuries." },
  { tag: "Body", lead: "What are cells?", small: "The small living units that make up every part of you.", kind: "know", body: "You have roughly 30 trillion of them — most kinds specialise in one job." },
  { tag: "Space", lead: "How does GPS work?", small: "Satellites send timed signals; your phone compares them to find its position.", kind: "know", body: "It's precise enough that clocks on the satellites tick slightly faster because gravity is weaker up there." },
  { tag: "Nature", lead: "Why do we have seasons?", small: "Earth's axis is tilted, so different halves lean toward the sun through the year.", kind: "try", body: "Tilt a torch onto a ball. Spin the ball — see how one hemisphere gets brighter light." },
  { tag: "Reasoning", lead: "What is correlation vs causation?", small: "Two things happening together doesn't mean one caused the other.", kind: "try", body: "Think of two things that go together — say, ice-cream sales and sunburns. What actually links them?" },
  { tag: "Animals", lead: "How do bees decide where to build a hive?", small: "Scouts return with a dance whose length signals distance and direction.", kind: "know", body: "The whole hive votes with movement and volume." },
  { tag: "Science", lead: "What is a chemical reaction?", small: "Atoms rearrange to form new substances — mass is conserved.", kind: "try", body: "Mix baking soda with vinegar in a bottle. The bubbles are new gas — CO2." },
  { tag: "Body", lead: "How does your immune system remember?", small: "Specialised cells keep a template of past invaders for years.", kind: "know", body: "That's why vaccines work — they train the memory without causing the disease." },
  { tag: "Space", lead: "What is dark matter?", small: "A kind of matter we can't see but that affects how galaxies rotate.", kind: "know", body: "It seems to make up about five times more of the universe than everything we can see." },
  { tag: "Nature", lead: "Why do fossils exist?", small: "Some remains got buried fast enough to be mineralised instead of rotting.", kind: "know", body: "Most creatures that ever lived left no fossil at all." },
  { tag: "Weather", lead: "Why is the climate changing?", small: "Extra CO2 from burning fossil fuels traps more of the sun's heat.", kind: "know", body: "The physics has been understood since the 1800s." },
  { tag: "History", lead: "How did people know Earth was round?", small: "Ancient Greeks used Earth's shadow on the moon and the changing height of stars.", kind: "know", body: "Eratosthenes measured its size using shadows over 2,000 years ago." },
  { tag: "Reasoning", lead: "What is a fair test?", small: "One that changes only the thing you're testing — everything else is held equal.", kind: "try", body: "Design a test for whether a paper plane flies further with a paperclip on the nose." },
  { tag: "Animals", lead: "Which animals recognise themselves?", small: "Great apes, elephants, dolphins and magpies have all passed mirror tests.", kind: "know", body: "That suggests some sense of a 'self' distinct from others." },
  { tag: "Science", lead: "Why do heavier objects fall at the same speed as lighter ones?", small: "Gravity accelerates everything equally — the difference we see comes from air resistance.", kind: "try", body: "Drop a book and a flat sheet of paper. Now put the paper on top of the book. What changes?" },
  { tag: "Body", lead: "Why don't we all look the same?", small: "Genes shuffle each generation — even siblings get different combinations.", kind: "know", body: "That variety is what lets life adapt over time." },
  { tag: "Space", lead: "Could there be life on other planets?", small: "We haven't found any yet — but we've found chemistry that could support it.", kind: "know", body: "Even Mars has water ice at its poles." },
];

const T6: Wonder[] = [
  { tag: "Reasoning", lead: "Where could you be wrong about something you believe?", small: "Strong thinking looks for the weakness in its own case, not just defending it.", kind: "try", body: "Take one belief. Argue the strongest version of the opposing view. What survives?" },
  { tag: "Science", lead: "How do we know the universe is expanding?", small: "Light from distant galaxies is stretched toward red — the further away, the more.", kind: "know", body: "This was discovered by Edwin Hubble in the 1920s." },
  { tag: "Body", lead: "How does the brain build a 'self'?", small: "It weaves memories, senses and prediction into one continuous story.", kind: "know", body: "That story stitches over gaps you never notice." },
  { tag: "History", lead: "How did money begin?", small: "Not with coins — earliest records are debt tallies inscribed on clay tablets.", kind: "know", body: "Credit and IOUs came before physical currency." },
  { tag: "Science", lead: "What is entropy?", small: "A measure of disorder — closed systems always tend toward more of it.", kind: "know", body: "That's why cream mixes into coffee, but never unmixes on its own." },
  { tag: "Reasoning", lead: "What's the difference between opinion and evidence?", small: "Opinion is a personal stance; evidence is a public fact others can check.", kind: "try", body: "Read a news story. Which sentences are opinion and which are evidence? Mark them separately." },
  { tag: "Nature", lead: "Why is biodiversity important?", small: "Diverse ecosystems recover faster and produce more of what humans need.", kind: "know", body: "Losing one species can cascade through dozens of others." },
  { tag: "Animals", lead: "Do animals have culture?", small: "Yes — chimps, whales and even some birds pass on regional traditions.", kind: "know", body: "Different chimp troops use different tools for the same job." },
  { tag: "Space", lead: "How old is the universe?", small: "About 13.8 billion years, based on the oldest light we can see.", kind: "know", body: "That light — the cosmic microwave background — is still around us today." },
  { tag: "Body", lead: "Why do teenagers need more sleep?", small: "The teen brain rewires heavily overnight — much of it long after childhood sleep needs drop.", kind: "know", body: "Body clocks also shift later, making early school hard." },
  { tag: "History", lead: "Why did the Roman Empire fall?", small: "Historians point to many overlapping causes, not one.", kind: "know", body: "Economic strain, migration, disease and political decay all played roles." },
  { tag: "Science", lead: "What is DNA?", small: "A molecule that stores instructions for building every living thing.", kind: "know", body: "The full text of human DNA has about 3 billion letters." },
  { tag: "Reasoning", lead: "What is a logical fallacy?", small: "A pattern of reasoning that sounds convincing but is actually flawed.", kind: "try", body: "Look up 'straw man' and 'ad hominem'. Try to spot one in a debate this week." },
  { tag: "Nature", lead: "How does natural selection work?", small: "Traits that help survival get passed on more often over generations.", kind: "know", body: "Small edges compound into big differences over millions of years." },
  { tag: "Animals", lead: "Why do dolphins have such big brains?", small: "Complex social lives seem to demand it — tracking alliances, deceit and cooperation.", kind: "know", body: "This is called the social brain hypothesis." },
  { tag: "Science", lead: "What is quantum weirdness?", small: "Very small particles can be in multiple states until measured.", kind: "know", body: "It sounds strange but has been confirmed by hundreds of experiments." },
  { tag: "History", lead: "Who wrote the first novel?", small: "Many historians credit Murasaki Shikibu — 'The Tale of Genji', around 1010 CE.", kind: "know", body: "She wrote it while serving in the Japanese imperial court." },
  { tag: "Space", lead: "Is time the same everywhere?", small: "No — gravity and speed both change how time passes.", kind: "know", body: "Clocks on GPS satellites tick slightly faster than clocks on Earth." },
  { tag: "Reasoning", lead: "What is confirmation bias?", small: "The tendency to notice evidence that fits your view and skip what doesn't.", kind: "try", body: "For one day, note down evidence that goes against a strong opinion you hold." },
  { tag: "Body", lead: "Why is exercise good for your brain?", small: "It raises blood flow, triggers growth factors and clears out waste products.", kind: "try", body: "Do 10 minutes of brisk movement. Notice how you think afterwards." },
  { tag: "Nature", lead: "Why does the ocean have currents?", small: "Wind, temperature and saltiness together drive a global circulation.", kind: "know", body: "One drop can travel around the world in about a thousand years." },
  { tag: "Science", lead: "What is the speed of light?", small: "Roughly 300,000 km per second — the universe's speed limit.", kind: "know", body: "Nothing carrying information can travel faster." },
  { tag: "Animals", lead: "Do plants communicate?", small: "Yes — they release chemicals to warn neighbours of attack.", kind: "know", body: "Some also share sugar underground via fungi." },
  { tag: "History", lead: "Why is South Africa's biodiversity globally rare?", small: "The Cape Floral Kingdom has more plant species per square kilometre than most rainforests.", kind: "know", body: "It is one of only six such floral kingdoms in the world." },
  { tag: "Reasoning", lead: "What separates a good source from a bad one?", small: "Good sources say how they know, not just what they know.", kind: "try", body: "Check three articles today. Do they cite their evidence?" },
];

const T7: Wonder[] = [
  { tag: "Reasoning", lead: "How do you improve a strong argument?", small: "Steelman the opposing view before defending your own.", kind: "try", body: "Take a view you strongly hold. Write its best counter-argument first, then respond." },
  { tag: "Science", lead: "Why does mathematics describe reality so well?", small: "Eugene Wigner called this the 'unreasonable effectiveness' of mathematics.", kind: "know", body: "It's still an open philosophical question — no one really knows why." },
  { tag: "Body", lead: "Why is decision fatigue real?", small: "The prefrontal cortex depletes glucose and neurotransmitters as you make choices.", kind: "know", body: "That's why the same person makes better calls at 10am than at 4pm." },
  { tag: "History", lead: "Was the Industrial Revolution inevitable?", small: "Historians still debate what specific combination of coal, ideas and institutions made Britain first.", kind: "know", body: "China had similar technologies centuries earlier without triggering it." },
  { tag: "Science", lead: "What is emergence?", small: "Complex behaviour arising from simple parts following simple rules.", kind: "know", body: "Ant colonies, cities and consciousness are all examples." },
  { tag: "Reasoning", lead: "What is Bayesian thinking?", small: "Updating your belief in proportion to new evidence — not toggling between certainty.", kind: "try", body: "Rate a prediction 0–100%. When new evidence arrives, ask exactly how much it should move." },
  { tag: "Space", lead: "Are we alone in the universe?", small: "The Fermi paradox asks why, given so many stars, we've heard no signal.", kind: "know", body: "The answer likely tells us something profound — either about life, or about civilisations." },
  { tag: "Body", lead: "How reliable is memory?", small: "Every recall subtly rewrites the memory — including confident ones.", kind: "know", body: "Eyewitness testimony is far less trustworthy than most people assume." },
  { tag: "Nature", lead: "What is a keystone species?", small: "A species whose loss triggers disproportionate ecosystem collapse.", kind: "know", body: "Sea otters, wolves and honeybees are classic examples." },
  { tag: "Reasoning", lead: "What is a tradeoff you can't escape?", small: "Some goals are structurally in tension — you can't maximise both.", kind: "try", body: "Name one goal in your life. What must you accept less of to pursue it?" },
  { tag: "Science", lead: "What is a black swan event?", small: "A rare event with massive impact that seems obvious in hindsight.", kind: "know", body: "Nassim Taleb argued we systematically underestimate them." },
  { tag: "History", lead: "How reliable are historical sources?", small: "Every source has a viewpoint — reading multiple is the check.", kind: "know", body: "Even primary sources reflect who wrote them, and why." },
  { tag: "Body", lead: "Are you the same person you were 5 years ago?", small: "Most of your cells have turned over, but your identity persists in patterns.", kind: "try", body: "Read something you wrote 5 years ago. Where do you still agree with yourself?" },
  { tag: "Science", lead: "What is information theory?", small: "Claude Shannon showed that information can be measured in bits, regardless of meaning.", kind: "know", body: "That single insight underlies all modern computing and communication." },
  { tag: "Reasoning", lead: "What is a category error?", small: "Treating something as a kind of thing it isn't.", kind: "try", body: "Notice when a debate is really about definitions, not the underlying question." },
  { tag: "Space", lead: "Why is the universe expanding faster over time?", small: "A property called dark energy — we still don't know what it is.", kind: "know", body: "It seems to make up most of the universe's energy content." },
  { tag: "Nature", lead: "What are the boundaries of a species?", small: "Biologists use several definitions, and none catches every case.", kind: "know", body: "Ring species and hybrids show that reality is fuzzier than labels." },
  { tag: "Reasoning", lead: "How do you notice when you're motivated to be wrong?", small: "A conclusion that flatters you deserves extra scrutiny.", kind: "try", body: "Take a belief that benefits you personally. Test it as if a friend had said it." },
  { tag: "History", lead: "Why do civilisations collapse?", small: "Usually a compounding cascade — no single cause is enough on its own.", kind: "know", body: "Ecological damage, inequality and rigid institutions are common threads." },
  { tag: "Body", lead: "What actually is consciousness?", small: "A deep open question — the 'hard problem' David Chalmers named.", kind: "know", body: "We can explain what the brain does. We can't yet explain why it feels like anything." },
  { tag: "Science", lead: "Why do we sleep?", small: "It clears metabolic waste from the brain and consolidates learning.", kind: "know", body: "The brain's cleaning system runs about ten times more actively during sleep." },
  { tag: "Nature", lead: "How does complexity arise from simple rules?", small: "Conway's Game of Life shows infinite variety from four rules.", kind: "try", body: "Search for a Game of Life demo. Watch a small pattern build a working replicator." },
  { tag: "Reasoning", lead: "What is intellectual humility?", small: "Holding your beliefs proportionate to your evidence — no more, no less.", kind: "try", body: "State the confidence level of one belief. Would you bet money on it at those odds?" },
  { tag: "Space", lead: "What is time, physically speaking?", small: "In relativity, it's a fourth dimension woven together with space.", kind: "know", body: "Some physicists argue the flow of time may be an artefact of how we perceive." },
  { tag: "History", lead: "What makes an idea spread?", small: "It usually needs to be simple, useful and slightly counter-intuitive.", kind: "know", body: "That's why proverbs survive centuries and manuals don't." },
];

export const WONDERS: Record<Tier, Wonder[]> = { 1: T1, 2: T2, 3: T3, 4: T4, 5: T5, 6: T6, 7: T7 };

function daysSinceEpoch(d: Date): number {
  // Local-day index so a wonder rolls at local midnight, not UTC.
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor(local.getTime() / 86400000);
}

export function wonderOfDay(tier: Tier, date: Date = new Date()): Wonder {
  const pool = WONDERS[tier];
  const idx = (daysSinceEpoch(date) + tier * 3) % pool.length;
  // JS modulo can be negative for pre-epoch dates; guard anyway.
  return pool[(idx + pool.length) % pool.length];
}

export function useWonder(): { wonder: Wonder; tier: Tier } {
  const { activeChild, focusChild } = useProfile();
  const tier = tierOf((activeChild || focusChild)?.age);
  return { wonder: wonderOfDay(tier), tier };
}
