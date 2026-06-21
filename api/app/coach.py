"""Athena — curated, measurable 'help me with a specific need' plans.

All plans are assembled locally from a curated, evidence-informed strategy
library (no model call, so generating a plan costs nothing). Athena offers
general educational guidance, flags when to seek a professional, and always
carries a disclaimer — it does not diagnose.
"""
from __future__ import annotations

from .models import (
    CoachAction, CoachPhase, CoachPlan, CoachRequest, FocusArea,
)

DISCLAIMER = (
    "Athena offers general, educational guidance to support everyday learning at "
    "home. It is not a diagnosis or a substitute for advice from a teacher, doctor, "
    "or qualified specialist. If you have concerns, please consult a professional."
)

# Each focus: label, icon, goal template, 'professional help' note, and six
# weekly phases (theme + measurable actions). Plans use the first `weeks` phases.
_FOCUS: dict[str, dict] = {
    "reading_english": {
        "label": "Reading & English", "icon": "📖",
        "goal": "Help your {age}-year-old read and understand English with more confidence and less frustration over {weeks} weeks.",
        "indicators": [
            "Reads aloud with fewer stops and self-corrects more often.",
            "Willing to start reading without resistance.",
            "Can retell what a short text was about in their own words.",
        ],
        "gaps": [
            "Still guessing words from the first letter only after several weeks.",
            "Avoids reading or becomes very upset when asked.",
            "No change in recognising common words despite daily practice.",
        ],
        "professional": "If your child still struggles to link letters and sounds after consistent daily practice, shows signs of frustration that affect confidence, or a teacher shares concerns, consider an assessment by an educational psychologist or a reading/learning specialist. Persistent, specific reading difficulty can indicate something like dyslexia, which is very manageable with the right support.",
        "phases": [
            ("Make reading safe and short", [
                ("Read together 10 minutes a day", "Same time daily; you read, they follow — count the days done (target 6/7)."),
                ("Let them choose the book", "Child picks 1 book each session; note which they re-pick."),
            ]),
            ("Sounds before whole words", [
                ("Practise 3 letter-sounds a day", "Play 'I spy' with sounds; child names 3 words per sound."),
                ("Blend two-sound words", "Sound out 5 short words (c-at); tally how many they blend unaided."),
            ]),
            ("Sight words & fluency", [
                ("Learn 5 common words", "Flashcards for 5 words (the, and, is...); test recall at week's end (target 4/5)."),
                ("Echo reading", "You read a line, they repeat; do 1 short page, note smoothness 1-5."),
            ]),
            ("Understand, not just decode", [
                ("Ask one 'why/what' question per page", "After reading, child answers 1 comprehension question correctly."),
                ("Retell in 3 sentences", "Child summarises the story; count sentences they manage unaided."),
            ]),
            ("Read a little longer", [
                ("Stretch to 15 minutes", "Extend daily reading by 5 minutes; log focus level 1-5."),
                ("Read to someone else", "Child reads a page to a sibling/grandparent; note their confidence."),
            ]),
            ("Celebrate & consolidate", [
                ("Re-read a favourite fluently", "Child re-reads an early book; compare smoothness to week 1."),
                ("Make a tiny book", "Child writes/draws a 4-page story and reads it aloud."),
            ]),
        ],
    },
    "focus_attention": {
        "label": "Focus & attention", "icon": "🎯",
        "goal": "Help your {age}-year-old build longer, calmer focus on tasks over {weeks} weeks.",
        "indicators": [
            "Completes a short task without being redirected as often.",
            "Sits with one activity for a little longer each week.",
            "Recovers and returns to a task after a break.",
        ],
        "gaps": [
            "Cannot settle even for very short, fun tasks.",
            "Frequent frustration, fidgeting or distress during any focused activity.",
            "No increase in focus time despite a calm, consistent routine.",
        ],
        "professional": "If focus difficulties are significant across home and school, persist despite consistent routines, or affect learning and friendships, speak with your child's teacher and GP; they may suggest an assessment by a paediatrician or psychologist. Attention differences are common and very supportable.",
        "phases": [
            ("Set the stage", [
                ("Create a tidy, quiet work spot", "Clear the table; remove screens; use it for 1 task a day."),
                ("One task at a time", "Give a single instruction; child finishes before the next (track wins)."),
            ]),
            ("Short timed bursts", [
                ("Try a 5-minute focus timer", "Set a visible timer; child works till it rings — note completion."),
                ("Movement break after", "2-minute jump/stretch between tasks; rate calm 1-5."),
            ]),
            ("Make it visible", [
                ("Use a 3-step picture checklist", "Child ticks each step; count steps done independently."),
                ("Name the goal first", "Child says what they'll finish; check it against the result."),
            ]),
            ("Stretch the burst", [
                ("Grow to 8-10 minutes", "Extend the timer by a few minutes; log focus 1-5."),
                ("Reduce reminders", "Count how many prompts you gave (aim for fewer than last week)."),
            ]),
            ("Build independence", [
                ("Child sets their own timer", "They choose the minutes and start it themselves."),
                ("Self-check the work", "Child reviews their task against the checklist before showing you."),
            ]),
            ("Consolidate the routine", [
                ("Same focus routine daily", "Run the full routine unprompted; tally independent days."),
                ("Reflect together", "Child names one thing that helped them focus this week."),
            ]),
        ],
    },
    "maths_confidence": {
        "label": "Maths confidence", "icon": "🧮",
        "goal": "Build your {age}-year-old's number confidence and fluency over {weeks} weeks.",
        "indicators": [
            "Attempts problems without saying 'I can't' first.",
            "Recalls more number facts quickly and accurately.",
            "Explains how they got an answer.",
        ],
        "gaps": [
            "Strong anxiety or shutdown at the sight of numbers.",
            "No improvement in basic facts after daily, low-pressure practice.",
            "Consistently reverses or muddles numbers when writing them.",
        ],
        "professional": "If number difficulties persist despite supportive practice, or there's strong maths anxiety, talk to the teacher and consider an educational psychologist. Specific maths difficulty (dyscalculia) is recognised and supportable.",
        "phases": [
            ("Numbers are friendly", [
                ("Count real things daily", "Count stairs, sweets, cars — child counts 1 set of 10+ a day."),
                ("Make it concrete", "Use objects for every sum this week (no worksheets)."),
            ]),
            ("Number bonds (Singapore method)", [
                ("Bonds to 10", "Show pairs that make 10 with objects; test 5 pairs (target 4/5)."),
                ("Quick recall game", "30-second bond game; record the score to beat next time."),
            ]),
            ("Picture it (bar models)", [
                ("Draw the problem", "Child draws a bar for 1 word problem before solving it."),
                ("Talk it out", "Child explains their drawing in one sentence."),
            ]),
            ("Times-table fluency", [
                ("Practise 2s, 5s, 10s", "Chant + quick-fire; tally facts answered in 1 minute."),
                ("Beat your score", "Repeat the 1-minute test; compare to earlier in the week."),
            ]),
            ("Apply it", [
                ("Real-life maths", "Use maths in cooking/shopping once; child does the sum."),
                ("Explain to you", "Child teaches you one method they learned."),
            ]),
            ("Confidence check", [
                ("Mixed mini-quiz", "5 mixed questions, low pressure; celebrate effort and accuracy."),
                ("Name a win", "Child names one maths thing they're now sure of."),
            ]),
        ],
    },
    "confidence_speaking": {
        "label": "Confidence & speaking", "icon": "🌟",
        "goal": "Grow your {age}-year-old's confidence to speak up and try new things over {weeks} weeks.",
        "indicators": [
            "Volunteers an idea or answer without being asked.",
            "Tries a new activity with less hesitation.",
            "Speaks a little louder/clearer to others.",
        ],
        "gaps": [
            "Strong distress or refusal to speak in familiar, safe settings.",
            "Withdrawal from activities they used to enjoy.",
            "No change despite gentle, pressure-free encouragement.",
        ],
        "professional": "If shyness tips into ongoing distress, refusal to speak in places they're comfortable (selective mutism), or withdrawal, talk to your child's teacher and GP, who may suggest a psychologist or speech-language therapist.",
        "phases": [
            ("Safe practice", [
                ("Share one thing at dinner", "Each person says a high/low; child takes a turn daily."),
                ("Praise the effort", "Notice trying out loud, not just success — note their reaction."),
            ]),
            ("Find their topic", [
                ("Talk about a passion", "Child explains a favourite thing for 1 minute to you."),
                ("Record and replay", "Record them (with consent) and watch back together; they pick a win."),
            ]),
            ("Small audiences", [
                ("Present to family", "Child shares their topic with 2 family members."),
                ("Ask a question in a shop", "With support, child asks a staff member one question."),
            ]),
            ("Role-play tricky moments", [
                ("Practise 'asking for help'", "Rehearse a school scenario; child leads the words."),
                ("Two brave things", "Child names and does 2 small brave things this week."),
            ]),
            ("Stretch the audience", [
                ("Share with a friend", "Child tells a friend about their topic or a story."),
                ("Speak up once at school", "Child sets a goal to answer once; celebrate the attempt."),
            ]),
            ("Notice the growth", [
                ("List brave moments", "Together, list everything they did this month — read it aloud."),
                ("Set the next goal", "Child picks their own next confidence goal."),
            ]),
        ],
    },
    "writing": {
        "label": "Writing", "icon": "✍️",
        "goal": "Help your {age}-year-old write more easily and with more ideas over {weeks} weeks.",
        "indicators": [
            "Starts writing with less avoidance.",
            "Writes a little more, with clearer ideas.",
            "Uses capital letters and full stops more reliably.",
        ],
        "gaps": [
            "Extreme reluctance or distress when writing by hand.",
            "Letters remain very hard to form despite practice.",
            "Ideas are strong out loud but never reach the page.",
        ],
        "professional": "If handwriting is painful or very difficult despite practice, or there's a big gap between spoken and written ability, ask the teacher and consider an occupational therapist or educational psychologist.",
        "phases": [
            ("Talk before you write", [
                ("Say it, then write it", "Child says a sentence aloud, then writes that one sentence."),
                ("Draw then label", "Child draws a picture and labels 3 things in it."),
            ]),
            ("One strong sentence", [
                ("Daily sentence", "Write 1 sentence about the day; count words (aim to grow it)."),
                ("Capitals & full stops", "Check 1 rule per sentence; tally correct ones."),
            ]),
            ("Build to three sentences", [
                ("Beginning-middle-end", "Write 3 sentences telling a tiny story."),
                ("Read it back", "Child reads their writing aloud and fixes 1 thing."),
            ]),
            ("Add description", [
                ("Use a 'wow' word", "Add 1 interesting word per sentence; collect them in a list."),
                ("Answer who/where/when", "Add details so a reader pictures it."),
            ]),
            ("Write for a reason", [
                ("Write a real note/card", "Child writes a card to someone and sends it."),
                ("A 5-sentence story", "Plan then write a short story with a clear ending."),
            ]),
            ("Polish & celebrate", [
                ("Edit one piece", "Child improves spelling/punctuation on a favourite piece."),
                ("Publish it", "Make a neat final copy to display or share."),
            ]),
        ],
    },
    "big_feelings": {
        "label": "Big feelings & calm", "icon": "🌈",
        "goal": "Help your {age}-year-old name and manage big feelings more calmly over {weeks} weeks.",
        "indicators": [
            "Names a feeling before it boils over, sometimes.",
            "Uses a calming step with a reminder.",
            "Recovers from upset a little faster.",
        ],
        "gaps": [
            "Frequent, intense meltdowns that aren't easing at all.",
            "Feelings that lead to harm to self or others.",
            "Big changes in sleep, appetite, or withdrawal from everything.",
        ],
        "professional": "If big feelings are frequent and intense, involve any risk of harm, or come with big changes in mood, sleep or appetite, please speak to your GP — they can connect you with a child psychologist or counsellor. You don't have to manage this alone.",
        "phases": [
            ("Name it to tame it", [
                ("Feelings check-in", "Use a feelings chart once a day; child points to how they feel."),
                ("Label feelings out loud", "You calmly name feelings as they happen — note their response."),
            ]),
            ("A calm-down toolkit", [
                ("Practise belly breathing", "Breathe in 4, out 4, three times when calm — practise daily."),
                ("Make a calm corner", "Set up a cosy spot with 2-3 soothing items."),
            ]),
            ("Spot the warning signs", [
                ("Notice the 'rumble'", "Together, name the early body signs of a big feeling."),
                ("Pick a go-to tool", "Child chooses 1 calming step to try first."),
            ]),
            ("Practise in calm moments", [
                ("Rehearse the plan", "Role-play a tricky moment and the calming step when relaxed."),
                ("Praise the try", "Notice any attempt to self-calm; say it out loud."),
            ]),
            ("Repair & reflect", [
                ("Talk after, not during", "Once calm, talk about what happened kindly."),
                ("Problem-solve together", "Pick 1 thing to try differently next time."),
            ]),
            ("See the progress", [
                ("Feelings journal review", "Look back at the week; spot 1 thing that's improving."),
                ("Celebrate calm wins", "Notice and name calmer moments together."),
            ]),
        ],
    },
}


def focus_areas() -> list[FocusArea]:
    return [FocusArea(id=k, label=v["label"], icon=v["icon"]) for k, v in _FOCUS.items()]


def build_plan(req: CoachRequest) -> CoachPlan:
    f = _FOCUS.get(req.focus) or next(iter(_FOCUS.values()))
    weeks = req.weeks if req.weeks in (2, 4, 6) else 4
    phases_src = f["phases"][:weeks]
    midpoint_week = max(1, (weeks + 1) // 2)

    phases = []
    for i, (theme, actions) in enumerate(phases_src, start=1):
        phases.append(CoachPhase(
            week=i, week_label=f"Week {i}", theme=theme,
            actions=[CoachAction(text=t, measure=m) for (t, m) in actions],
        ))

    goal = f["goal"].format(age=req.age, weeks=weeks)
    midpoint = (
        f"Around Week {midpoint_week}, pause and reflect: What's working? What still feels hard? "
        "Re-read the progress signs below. If two or more are appearing, keep going. If none are, "
        "adjust the daily time or step size — and consider the professional-help note."
    )
    return CoachPlan(
        focus=req.focus, focus_label=f["label"], icon=f["icon"], age=req.age, weeks=weeks,
        concern=(req.concern or "").strip(),
        goal=goal, phases=phases, midpoint_week=midpoint_week, midpoint=midpoint,
        nudges=[
            "Keep sessions short and positive — stop while it's still going well.",
            "Praise effort and strategy ('you kept trying'), not just being 'clever'.",
            "Consistency beats intensity: a little most days works best.",
        ],
        indicators=f["indicators"], gaps=f["gaps"],
        professional=f["professional"], disclaimer=DISCLAIMER,
    )
