# WikiLinkua: Bringing together Wikimedia projects for Language Learning
### 15-minute conference presentation — slide content + full speaker script

**Live:** wikilinkua.toolforge.org · **Task:** T425045 · **Code:** github.com/rohan2023101003/wikilinkua

> **Audience note.** WikiConference India draws editors, educators, researchers, GLAM folk,
> students and developers. Assume **no technical background** everywhere except Slide 15.
> Say "the word database" not "Wikidata Lexemes with P5137". Property numbers appear on
> exactly two slides — the contributor and developer ones — where they are the point.

---

## Timing

| Section | Slides | Time | Running |
|---|---|---|---|
| Title + check-in | 1–2 | 1:10 | 1:10 |
| Introduction | 3–6 | 3:50 | 5:00 |
| **Demo** | 7–12 | 6:10 | 11:10 |
| **Join the team** | 13–15 | 3:00 | 14:10 |
| Next steps + close | 16–17 | 1:20 | 15:30 |

### Pace — read this before you rehearse

The full script below is **≈2,280 words**, which is **15–16 minutes of continuous speech**.
That is deliberately a little long: it is easier to drop a paragraph on stage than to invent
one. Time yourself once, then pick from these cuts.

**Cut in this order if you are running long** (each is self-contained — the talk still makes
sense without it):

| Cut | Saves | Cost |
|---|---|---|
| Slide 2, question 3 (*"who has edited…"*) | 15s | Small — but it sets up Slide 14 |
| Slide 9, the *embarazada* example | 15s | Small — it's the best laugh in the talk |
| Slide 11 entirely (spaced repetition) | 50s | Fold one line into Slide 8 |
| Slide 5, the Lingua Libre / MinT sentence | 20s | Loses two project mentions |
| Slide 16, the last three bullets | 25s | Keep database + dictionary, drop the rest |

**Never cut:** Slide 4 (the idea), Slide 6 (the cycle), Slides 13–15 (the ask). Those are the
talk. If you are badly over, cut *demo narration*, not these — the video keeps playing and
the audience still sees the feature.

---

# 1. CHECK-IN

## Slide 1 — Title

> # WikiLinkua
> ## Bringing together Wikimedia projects for language learning
>
> Learn a new language starting from the languages you already speak
>
> **wikilinkua.toolforge.org**
> Rohan Kumar · Satdeep Gill · T425045

**Say (20s):**
"Good afternoon. I'm Rohan, and this is WikiLinkua. The one-line version: it is a language
learning app where every single thing you see — the words, the meanings, the pronunciations,
the videos, the reading material — comes from a Wikimedia project. Nothing is bought,
scraped or invented. And it's live right now, so you can open it on your phone while I
talk."

---

## Slide 2 — Check-in

> ## Before we start — a show of hands
>
> **1.** Who speaks **three or more languages?**
>
> **2.** Who has tried to learn a language and **stopped within a month?**
>
> **3.** Who has ever **edited Wikidata, Commons or Wiktionary?**
>
> *Hold on to your answer to number 2.*

**Say (45s):**
"Three quick questions, hands up.

Who speaks three or more languages? … In this country that's most of the room, and that
turns out to matter enormously.

Second — who tried to learn a language and gave up within a month? … Also most of the room.
That's the problem this project is built around.

Third, who has edited Wikidata, Commons or Wiktionary? … Good — you'll see your own edits
inside a language course in about six minutes.

That's the talk, really: those three groups are the same people, and WikiLinkua is what
happens when you connect them."

---

# 2. INTRODUCTION

## Slide 3 — The problem

> ## Two problems, one cause
>
> ### For learners
> - Every app starts you at **zero** — as if you knew nothing
> - Week one is the hardest week → that's when people quit
> - **Small languages get nothing.** No Punjabi→Malayalam course exists,
>   because there is no money in it
>
> ### For our languages
> - Language data is scattered across Wikidata, Commons, Wikipedia, Wiktionary
> - Almost **nobody sees it** — it has no everyday use
> - Contributors add data and never watch anyone benefit
>
> **The same cause: what we know and what we build are kept apart.**

**Say (55s):**
"Two separate problems here, with one cause.

The learner's problem: every app starts you at zero. Lesson one, *hello, my name is*, as if
the four or five languages already in your head counted for nothing. And that first week,
where you feel slow and stupid, is exactly where people quit. Worse — if you speak Punjabi
and want Malayalam, nobody has built that course. There are thousands of language pairs;
companies build the thirty with money in them.

The second problem is ours. We have an extraordinary amount of language data — words and
meanings in Wikidata, tens of thousands of recordings on Commons, articles in hundreds of
languages. Almost none of it reaches anyone's daily life. Someone records a word, and nobody
ever hears it.

Same cause both times: what we know and what people actually use are kept apart.""

---

## Slide 4 — The idea

> ## You already know more than you think
>
> A Punjabi speaker starting Malayalam **already knows these:**
>
> | Malayalam | | Punjabi | Because both come from |
> |---|---|---|---|
> | തർജ്ജമ | = | ਤਰਜਮਾ | Persian **ترجمه** *(translation)* |
> | സ്കൂൾ | = | ਸਕੂਲ | English **school** |
> | മീറ്റർ | = | ਮੀਟਰ | English **metre** |
>
> Centuries of borrowing and shared roots — **Sanskrit, Persian, Arabic, English** —
> mean any two Indian languages already share hundreds of words.
>
> **WikiLinkua finds them automatically and starts your course there.**

**Say (1:10):**
"Here's the idea.

If you speak Punjabi and start Malayalam, you already know *tarjama* — translation. Both
languages took it from Persian. Neither borrowed from the other; they inherited it from the
same source. Same with *school* and *metre*, which came through English.

This isn't a few cute examples. Sanskrit, Persian, Arabic and English have been depositing
vocabulary across the subcontinent for centuries. Any two Indian languages already share
hundreds of words. Everyone here is carrying a head start in a dozen languages and has never
been told.

WikiLinkua finds them automatically and starts your course there. So week one becomes the
week you go *wait, I know this already* — aimed squarely at the moment people quit.

And it works for *any* pair. Nobody has to author a Punjabi–Malayalam course. The
relationships are already in the data.""

---

## Slide 5 — Which projects come together

> ## One app, many Wikimedia projects
>
> | Project | What it gives the learner |
> |---|---|
> | **Wikidata** | Every word, its meanings, and how words in different languages relate |
> | **Wikimedia Commons** | Native-speaker pronunciations, videos, subtitles |
> | **Wikipedia** | Real articles to read in the language you're learning |
> | **Lingua Libre** | The recording pipeline behind much of that audio |
> | **Wikimedia MinT** | Translates example sentences when no human translation exists |
> | *Tatoeba* (CC-BY, external) | Example sentences |
>
> **1,561 languages** have word data on Wikidata. **Every one of them** is in the app.

**Say (1:10):**
"This is where the session title comes in, because no single Wikimedia project can do this
alone.

Wikidata knows the words — every word, its meanings, and crucially how a word in one
language relates to a word in another. That's the engine.

But a word you can only read is half a word, so pronunciations come from Commons, many
recorded through Lingua Libre. Then you need real language, not textbook sentences — so
reading comes from Wikipedia, and videos with subtitles from Commons. When a sentence has no
translation into your language, Wikimedia's own MinT fills the gap.

Individually, each is something a learner would never think to open. Together, they're a
language course.

And here's the number I'd like you to take away: 1,561 languages have word data on Wikidata,
and every single one is selectable in the app. Not thirty. Not the commercially viable ones.
All of them — including yours."

---

## Slide 6 — The cycle

> ## Learners and contributors feed each other
>
> ```
>          A learner uses WikiLinkua
>                     ↓
>     They hit a gap — a word with no sound,
>     a meaning nobody recorded yet
>                     ↓
>     The app turns that gap into a task,
>     linked to the exact page to fix
>                     ↓
>     A contributor fills it — on Wikidata,
>     on Commons, on Wikipedia
>                     ↓
>     The app gets better → more learners
>                     ↓
>          …and back to the top
> ```
>
> **In most apps, missing data is a dead end. Here it's the invitation.**

**Say (50s):**
"And this is the part I most want you to remember.

A learner opens WikiLinkua and, fairly quickly, runs into something missing. A word with no
pronunciation. A word whose meaning nobody has recorded. In a commercial product that's a
dead end and you hide it.

Here it's the whole point. Every gap is shown as a task, with a link straight to the page
that needs fixing. The learner becomes a contributor. The data improves. The app gets
better, which brings in more learners, who find more gaps.

And because the tool itself is open, developers improve the tool while that's happening. So
you get learners, contributors and developers all in one loop, each one making the others'
work more valuable. That is something only a Wikimedia project can do."

---

# 3. DEMO

> Six recorded clips. Talk *over* each one — the script below is timed to the video.
> Full recording instructions at the end of this document.

## Slide 7 — Demo 1: Getting started

**▶ Video 1 (55s)**

> ## Pick what you speak. Pick what you want.
>
> - **1,561 languages** — each showing how much data exists for it
> - Instant placement: *how much of this language already connects to you*
> - English → French: **8,693 of 19,727 words** have a counterpart you know
> - Your progress is kept **separately for each pair** — learn French, switch to
>   Malayalam, come back, French is exactly where you left it

**Say (55s):**
"Let's actually look at it.

You tell it what you already speak — and you can pick several, which matters here, because
most people's head start comes from combining languages. Then you pick what you want to
learn. Every language with data on Wikidata is in this list, and each one shows you how many
words exist for it, so you know what you're getting before you start.

And immediately it tells you where you stand. For English to French: nearly nine thousand
words already connect to something you know. That's not a motivational slogan — it's a
count, and the app shows you the arithmetic.

One small thing that matters more than it sounds: your progress is stored per language pair.
Learn some French, switch to Malayalam, and Malayalam correctly starts at zero. Go back to
French and your progress is intact."

---

## Slide 8 — Demo 2: The course

**▶ Video 2 (75s)**

> ## A guided course, built for you on the spot
>
> Units of 8 words · one button always tells you what to do next · streak and daily goal
>
> **Words are ordered by:**
> 1. What you **half-know already** — the shared vocabulary
> 2. Then **how basic** the word is
>
> *"Basic" = how many of the world's languages bother to have a word for it.*
> Water: **790 languages**. Milk: 272. Mother: 117. Beard: 241.
>
> **Inside one unit:** meet the word → **hear a native speaker** → recall it →
> recall it backwards → false-friend traps → **use it in a real sentence**

**Say (1:05):**
"Here's the course. Units of eight words, and one button that always knows what you should
do next — start a unit, continue one, or clear the reviews that are due. Plus a streak and a
daily goal, because habit is most of language learning.

The interesting question is *what order to teach in*. First the shared vocabulary, the words
you half-know. After those run out, the most basic vocabulary first.

Now — how do you decide what's basic, for 1,561 languages, with no frequency list for any of
them? We count how many of the world's languages bother to have a word for that concept.
Water scores 790. Milk, 272. Mother, 117. Obscure terms score two or three. 'How universal
is this idea' turns out to be an excellent proxy for 'how basic is this word', and it works
for every language at once — including ones nobody has ever built a frequency list for.

And a unit isn't just flashcards. Meet the word, *hear* a native speaker say it, recall it
both directions, get warned about false friends, finish on a real sentence. See it, hear it,
recall it, use it.""

---

## Slide 9 — Demo 3: Six ways to practise

**▶ Video 3 (60s)**

> ## Practice modes
>
> | | |
> |---|---|
> | **Flashcards** | Reveal words at your own pace |
> | **Recall** | Word → meaning |
> | **Reverse recall** | Meaning → word |
> | **Match pairs** | Fast pairing drill |
> | **Odd one out** | Which word is *not* related to yours? |
> | **Friend or Faux** | Spot the false friends |
>
> **False friends are real traps:** Spanish *embarazada* does **not** mean embarrassed.
> It means pregnant.

**Say (1:00):**
"Outside the course there's free practice — six different drills, because doing the same
exercise forever stops teaching you anything.

Flashcards for a gentle pass. Recall in both directions, which is much harder than
recognising a word and is where actual memory gets built. Match pairs for speed. Odd one out
asks which of four words is *not* connected to a language you speak — that one quietly
teaches you to notice word families.

And Friend or Faux, for the traps. Every language pair has words that look identical and
mean completely different things. The classic: in Spanish, *embarazada* looks exactly like
embarrassed, and means pregnant. Those cause the most memorable mistakes of anyone's
language-learning life, so we drill them deliberately.

All of it feeds one spaced-repetition schedule underneath, which I'll come back to."

---

## Slide 10 — Demo 4: Real material, not textbook material

**▶ Video 4 (85s)**

> ## Words → sentences → video → reading
>
> **Words** — browse the whole vocabulary, search it, hear it, and see *how* each word
> connects to yours: same origin, borrowed, or just the same meaning
>
> **Phrases** — real sentences containing words you have already learned, chosen so you
> know all of them but one or two. Translation and audio where they exist
>
> **Video** — Wikimedia Commons videos in your language, with subtitles, turned into
> vocabulary practice
>
> **Article** — real Wikipedia articles in the language you're learning; the app pulls
> out the words you know and drills them

**Say (1:15):**
"This is where the other projects come in, and where it stops feeling like an app and starts
feeling like a language.

Words is your whole vocabulary — searchable, with audio — and each word tells you
*how* it connects to you. Some share an origin with a word you know. Some were borrowed
directly. Some just happen to mean the same thing. Those are different facts and the app
says which one you're looking at.

Phrases gives you real sentences containing words you've learned, picked so you know
everything except one or two words. That's the sweet spot where reading actually teaches
you. With translation, and audio where a recording exists.

Video pulls Commons videos in your language, shows which have subtitles, and turns subtitle
vocabulary into practice.

And Article searches real Wikipedia articles — not textbook paragraphs, actual encyclopedia
articles — finds the words you know inside them and builds exercises. That's harder than it
sounds: in most Indian languages words change shape depending on use, so we had to teach the
app every written form of every word.""

---

## Slide 11 — Demo 5: It remembers you

**▶ Video 5 (45s)**

> ## Spaced repetition
>
> Every answer schedules the next one:
>
> **1 day → 3 days → 7 days → 2 weeks → 1 month**
>
> - Get it right, it comes back later. Get it wrong, it comes back sooner
> - Reviews are prioritised over new words — that's what makes it stick
> - Progress shows what's **new**, **learning**, **known**, and **due today**

**Say (45s):**
"Underneath everything is the memory system, and this is the difference between a quiz and
actually learning something.

Every time you answer, the word gets scheduled. Get it right and you won't see it for a day.
Right again, three days. Then a week, two weeks, a month — each time just before you'd
naturally forget it. Get it wrong and it comes straight back.

And when reviews are due, the app puts them ahead of new material, which is the discipline
most people skip. Learning fifty new words and forgetting forty is not progress.

The Progress screen shows exactly where every word stands: new, learning, known, or due
today."

---

## Slide 12 — Demo 6: Fixing the data from inside

**▶ Video 6 (75s)**

> ## Every gap becomes a task
>
> Pick any language — the app measures it live and ranks what's missing:
>
> - Words with **no pronunciation** — French alone: **28,876**
> - Words with **no recorded meaning** — invisible to any learner
> - Words with **no recorded origin** — every shared word we can teach depends on these
> - Missing example sentences, missing pronunciation guides
>
> **Nine kinds of task**, counted live, each one linked to the exact page to fix.
>
> **Fix it without leaving:** record a word → published to Commons → attached to the
> right word on Wikidata. Spot a shared origin → record it, right there.

**Say (1:05):**
"And now the other half of the app.

Pick any language and it measures it against Wikidata live. Words with no pronunciation — in
French alone, nearly twenty-nine thousand. Words with no recorded meaning, so no learner
will ever see them. Words with no recorded origin, which is the data powering the whole
shared-vocabulary idea.

Nine kinds of task, ranked by what each costs a learner, every one linked to the page where
you'd fix it. Not a generic 'go help Wikidata' — it's *these forty-one Malayalam words have
no sound, here they are*.

And you can fix them without leaving. Record a word: it's published to Commons under your
name, then attached to the right word on Wikidata — the step that actually makes it useful.
An audio file nobody has linked helps no one.

Same for word origins. Spot two words that clearly share a source, and you can record that
right there. Each one turns a word that looked unrelated into a free word for the next
learner.""

---

# 4. JOIN THE TEAM

## Slide 13 — 1. Language learners

> ## Use it — especially for a pair nobody serves
>
> - Works **today**, in your browser, no installation
> - Best for **Indian language pairs** — huge shared Sanskrit, Persian and Arabic vocabulary
> - Try: **Punjabi → Malayalam** · **Bengali → Hindi** · **Tamil → Malayalam**
> - Tell us where it's wrong, thin, or confusing
>
> ### **wikilinkua.toolforge.org**

**Say (50s):**
"So — three ways to be part of this, and the first is simply to use it.

It works today, in a browser, nothing to install. It's at its best for exactly the pairs
nobody else serves: Punjabi to Malayalam, Bengali to Hindi, Tamil to Malayalam. Those pairs
have centuries of shared vocabulary and precisely zero commercial courses.

You will hit thin patches. When you do, that's missing data, not your fault — and the app
will show you exactly what's missing. Tell us what felt wrong or confusing. Right now the
most valuable thing anyone in this room can do is open it, pick two languages you actually
speak, and use it for ten minutes with a critical eye."

---

## Slide 14 — 2. Contributors filling data gaps

> ## Your edits become someone's lesson
>
> **What helps most, in order:**
>
> | Add this | And this becomes possible |
> |---|---|
> | Where a word **came from** *(P5191)* | Shared words across languages — the head start |
> | A word's **meaning** *(P5137)* | The word becomes teachable at all |
> | A **pronunciation** *(P443)* | Listening practice |
> | **Example sentences** *(P5831)*, **IPA** *(P898)* | Real sentences, pronunciation help |
>
> ### Two findings for this room
> - **Hindi and Urdu have no words of their own on Wikidata** — it's all filed under
>   *Hindustani*. Most people looking for it never find it.
> - **Malayalam has 67,000 words, but only 10,000 have a recorded meaning.**
>   The other 57,000 are invisible to every learner.

**Say (55s):**
"Second group — if you edit Wikidata, Commons or Wiktionary, this is where your work becomes
visible.

The single most valuable thing you can add is where a word came from. That's the statement
that creates the shared vocabulary — every one you add hands a free word to the next
learner. After that: a word's meaning, without which it can't be taught at all, then
pronunciations, then example sentences.

Two findings worth knowing in this room.

Hindi and Urdu, as Wikidata items, have no words of their own — the whole lexicon is filed
under Hindustani. If you've searched for Hindi words and found nothing, that's why.

And Malayalam has about sixty-seven thousand words on Wikidata, but only ten thousand have a
recorded meaning. The other fifty-seven thousand are invisible to every learner. That is the
biggest single thing standing between this tool and being genuinely useful for Indian
languages — and it's fixable by people in this room.""

---

## Slide 15 — 3. Developers

> ## Open, small, and quick to contribute to
>
> - **React + Vite** front end, **Flask** on Toolforge, deployed from GitHub
> - Data comes from **live SPARQL queries** against the Wikidata Query Service
> - Written docs: README · developer guide · UI guide · a render test for every screen
>
> ### Good first tasks
> - Add a new **data-gap query** — one SPARQL query, one entry in a list
> - Add a new **exercise type**
> - **Wikimedia Codex** migration and dark mode
> - **Accessibility** — keyboard navigation, screen readers
> - **Right-to-left layout** for Arabic, Urdu, Hebrew, Persian
>
> **github.com/rohan2023101003/wikilinkua**

**Say (50s):**
"Third group, and this is the one slide where I'll be properly technical.

It's a React front end with a small Flask backend on Toolforge, deployed straight from
GitHub. The learning data isn't stored — it comes from live queries against the Wikidata
Query Service, which means the app improves the moment someone edits Wikidata.

That makes it easy to contribute to: a new data-gap task is one SPARQL query and one list
entry. A new exercise is one component.

If design systems are your thing, we need a Codex migration, which also gets us dark mode.
If accessibility is your thing, we need keyboard navigation and screen reader support. And
we need right-to-left *layout* for Arabic, Urdu, Hebrew and Persian — the text is right
today, the layout doesn't mirror. There's a developer guide, a UI guide, and a test that
renders every screen.""

---

# 5. NEXT STEPS

## Slide 16 — What's next

> ## Where this goes
>
> **A proper database** — so your progress follows you across devices, so we can cache
> the heavy queries and make it fast, and so learners can see each other
>
> **A multilingual dictionary** — one concept, every language's word for it, side by side.
> That dictionary already exists inside Wikidata; nobody has ever surfaced it
>
> **Read Wikipedia side by side** — the same article in your language and your target
> language, paragraph against paragraph
>
> **Learn the script** — Malayalam, Gurmukhi, Bengali letters, before the vocabulary
>
> **Subtitles for Commons videos** — the biggest gap in the video experience
>
> **Language communities** — people learning the same language, fixing its data together

**Say (55s):**
"Where does this go next.

First, a real database. Everything currently lives in your browser — fine for getting
started, but your progress doesn't follow you to your phone, we can't cache the heavy
queries to make it fast, and learners can't see each other. That's the next piece of
engineering.

Second, my favourite: a multilingual dictionary. Every meaning in Wikidata can point at a
shared concept — so for any concept we can already pull up every language's word for it,
side by side. That dictionary exists in Wikidata today and nobody has surfaced it. It falls
straight out of the engine we've built.

Then: the same Wikipedia article side by side in two languages. Teaching the script itself.
Subtitles for Commons videos. And communities fixing their language's data together.""

---

## Slide 17 — Close

> # Three ways in
>
> ### **Learn** — wikilinkua.toolforge.org
> ### **Contribute** — the Contribute tab, or T425045
> ### **Build** — github.com/rohan2023101003/wikilinkua
>
> *(large QR code to the live tool)*
>
> **Thank you — questions?**

**Say (25s):**
"So: learn a language, fill a gap, or help build it — and honestly the three are the same
activity seen from different angles.

The one thing I'd ask: open it now, pick two languages you actually speak, and tell me what's
broken. That's worth more to this project than anything else that happens today.

Thank you — happy to take questions."

---

# Demo recording guide

Six clips, ≈ 6 minutes total. **Record everything in advance** — the Wikidata Query Service
returns errors under load and will pick your slot to do it.

**Setup:** logged in · 1280×720 · browser zoom 125% · bookmarks bar hidden · notifications
off · **open each language pair once before recording** so data is cached and there are no
loading spinners. Move the cursor slowly. Pause one second on each key screen so a still
frame works if a video fails.

| # | Clip | Pair | Length | Shots |
|---|---|---|---|---|
| 1 | Getting started | EN → FR | 55s | Language picker, type to search (show the counts) → pick pair → Words screen, linger on "8,693 of 19,727" |
| 2 | The course | EN → FR | 75s | Learn tab: streak, goal, next-action button → unit list with rings → start unit → flashcard **with audio playing** → Listen step, answer it → recall → reverse recall → sentence step → unit complete |
| 3 | Practice modes | EN → FR | 60s | Home dashboard showing all six tiles → one round of Match Pairs → one round of Odd One Out with the reveal → one Friend or Faux question |
| 4 | Real material | PA → ML | 85s | Words: search, filter, play audio, show a shared-origin word → Phrases: a sentence, press audio, reveal translation → Video: Commons grid, subtitle filter, play a few seconds → Article: search Wikipedia, open an article, build flashcards |
| 5 | Memory | EN → FR | 45s | Progress screen: new / learning / known / due counts → open a word showing its box level → back to Learn showing "review N due" |
| 6 | Contributing | FR, then ML | 75s | Contribute tab → pick French → scroll the ranked tasks → expand "no pronunciation (28,876)" → click a word → recorder pre-filled → record 2s, play back → back to Words → "Add a word origin" on a word → type an id, show the preview |

**On clip 6:** if the Commons upload permission hasn't come through, stop after playing the
recording back — don't show the error on screen. The Wikidata side works regardless.

---

# Contingencies

| If | Then |
|---|---|
| A video won't play | Backup slides with stills of every step (export these too) |
| "Is this actually live?" | "Yes — wikilinkua.toolforge.org, open it now" |
| "How accurate is the data?" | "As accurate as Wikidata. Where it's thin the app says so and shows you how to fix it — that's the Contribute tab." |
| "How is this different from Duolingo?" | "Three ways: it starts from what you already speak, it covers 1,561 languages instead of thirty, and using it improves open data instead of a company's database." |
| Running long | Cut Clip 5 and fold spaced repetition into Slide 8 |
| Running short | Take an Odd One Out round live, or ask the room for a language pair and open it |

---

# If you only get 30 seconds

> WikiLinkua is a language-learning app built entirely from Wikimedia projects — words and
> word histories from Wikidata, pronunciations and video from Commons, reading material from
> Wikipedia. It starts you from the words you already know, so a Punjabi speaker learning
> Malayalam begins with the hundreds of words those languages already share. It covers 1,561
> languages, including every pair no commercial app will ever build. And every gap you hit
> becomes a task with a link to fix it — so learning the language improves the data for
> everyone who comes after you.
