# WikiLinkua - Learn a new language through the ones you already know

*A proposal for Wikimedia Hackathon 2026. Builds on Ordia + Wikidata Lexemes.*

This document does two things:

1. **Explains what we have already built** - two working games, and (importantly)
   how they get their data. This is the foundation everything else stands on.
2. **Proposes how we turn it into a real language-learning platform** - a
   Duolingo-style experience powered entirely by Wikimedia data - and a concrete
   plan to ship a meaningful version in the 2 days of the hackathon.

---

## PART 1 - What we have already built

### The one-line idea

> **You already know more of your target language than you think.** Every learner
> shares vocabulary across languages - cognates ("night / nuit / Nacht"),
> loanwords (Indonesian *kabar* ← Arabic *خبر*), and look-alikes. WikiLinkua finds
> those shared words automatically and starts your learning from them.

We have two prototypes that prove this works:

### Game 1 - WikiLinkua: Bridge Words
You pick the language(s) you already speak and the one you want to learn. The app
queries Wikidata and returns **"bridge words"** - words in the target language
that share a meaning with a word you already know. It then:
- shows *"you already know roughly **X%** of mapped Malayalam vocabulary"*,
- lists each bridge word with its English gloss,
- flags **cognates** 🌉 (etymologically related) and **phonetically similar** 🔊
  words (words that *sound* alike),
- plays **audio pronunciation**, and
- turns the list into a **10-card flashcard quiz**.

### Game 2 - Friend or Faux (True or False Friend?)
A 10-question quiz on the *traps*: two similar-looking words from two languages -
do they mean the same thing ("true friend") or not ("false friend", *faux ami*,
e.g. English *embarrassed* vs Spanish *embarazada* = "pregnant")? It mixes a
hand-curated list of famous pairs, Wikidata's explicit false-friend statements,
and computed true-friends.

Both are live as pages inside the Ordia app (`/wikilinkua/` and `/false-friends/`).

---

## PART 2 - How it actually works (the "backend")

This is the most important thing for newcomers to understand, because it shapes
everything we build next.

### Surprise: there is almost no backend

There is **no database, no server-side logic, no stored data of our own.** The
Python side is two lines per game - it just serves an HTML page:

```python
@main.route("/wikilinkua/")
def show_wikilinkua():
    return render_template("wikilinkua.html")
```

**All the intelligence runs in the browser, in JavaScript, and the "database" is
Wikidata itself.** When you click "Find my bridge words", your browser sends a
query directly to the **Wikidata Query Service** (`https://query.wikidata.org/sparql`)
and renders the result. That's the whole system.

### Where the data comes from: Wikidata Lexemes

Wikidata isn't just facts about the world (Q-items like *Q1860 = English*). It also
stores **lexicographical data** - actual words, in a structured model:

```
Lexeme  (L1234, e.g. the French word "nuit")
 ├─ lemma          → "nuit"          (the spelling)
 ├─ language       → Q150 (French)
 ├─ Sense(s)       → "the period of darkness between sunset and sunrise"
 │    └─ P5137  ─────────────►  Q575 (the CONCEPT "night")   ← the magic link
 │    └─ P5976  (false friend) ► another sense, if applicable
 └─ Form(s)        → "nuit", "nuits"
      └─ P898  → IPA transcription   /nɥi/
      └─ P443  → audio file on Wikimedia Commons (.ogg)
```

The key property is **P5137 ("item for this sense")**. It connects a *word's
meaning* to a *language-neutral concept*. French *nuit*, German *Nacht*, and
Spanish *noche* all have a sense pointing at the **same** concept item
(*Q575, "night"*). **That shared concept is the bridge.**

| Property | Meaning | What we use it for |
|----------|---------|--------------------|
| **P5137** | item for this sense | The core link - finds shared meanings across languages |
| **P5191** | derived from lexeme | Detects cognates / loanwords (the 🌉 badge) |
| **P898**  | IPA transcription | Phonetic similarity ("sounds alike", the 🔊 badge) |
| **P443**  | pronunciation audio | The audio button (files live on Commons / Lingua Libre) |
| **P5976** | false friend | The Friend-or-Faux quiz |
| **P5831** | usage example | *(not used yet)* example sentences - important for Part 4 |

### The bridge-word algorithm, in plain English

> Find every word in the **target** language whose meaning (P5137 concept) is also
> the meaning of some word in a language the learner **already knows**.

In SPARQL that is essentially:

```sparql
SELECT ?targetLex ?knownLex ?concept WHERE {
  ?targetLex dct:language wd:Q36236 ;          # target = Malayalam
             ontolex:sense / wdt:P5137 ?concept .
  ?knownLex  dct:language ?known ;             # a language you know …
             ontolex:sense / wdt:P5137 ?concept .   # … sharing the SAME concept
  VALUES ?known { wd:Q58635 wd:Q9168 }         # e.g. Punjabi, Persian
}
```

Everything else - the "% you already know", cognate badges, IPA similarity
(computed with a Levenshtein distance in JS), audio, the flashcards - is layered
on top of this one query. **This little query is the engine of the whole project.**

### Why this architecture is great for us
- **No infrastructure to build or maintain.** Wikidata is our backend, hosted by
  Wikimedia, free, and always up to date as the community adds data.
- **It's "the Wikimedia way":** the more the community improves Lexemes, the better
  our app gets automatically.
- **Perfect for a hackathon:** newcomers can ship a real feature by writing one
  SPARQL query + a bit of HTML/JS - no backend onboarding.

---

## PART 3 - Why two games are not yet a *platform*

A quiz tells you what you know. **Learning a language is a journey**, and a real
platform has to carry the learner along it. Here is the honest gap:

| A language-learning journey needs… | Do we have it? |
|---|---|
| A **learner profile** (which languages you know + level, your target) | ❌ chosen fresh every visit |
| **Content depth**: words → **phrases → sentences** | ❌ single words only |
| A **curriculum / progression** (start easy & common, build up) | ❌ random word lists |
| **Memory / spaced repetition** (so you actually retain words) | ❌ a quiz forgets you instantly |
| **Motivation**: streaks, progress, daily goals | ❌ none |
| **Pronunciation & listening** practice | 🟡 audio exists, not a real exercise |

Good news: the **hardest, most original part is already done** (the bridge-word
engine). What's missing is the *learning scaffolding around it* - and most of that
is buildable in a weekend because we keep the same serverless architecture.

---

## PART 4 - The proposal: WikiLinkua as a full learning platform

### North star
> A free, open language-learning platform that **starts every learner from what
> they already know** and teaches the rest through Wikimedia's open data -
> vocabulary, then phrases, then sentences - with pronunciation by native speakers
> and a clear path from "I recognise this word" to "I can use this sentence."

### Design principle: thin backend, data stays open
All *language data* is fetched live in the browser from Wikidata - there is no data
pipeline to build. A **thin Flask backend** exists only for optional login and
progress sync. Four layers:
1. **Live Wikidata (WDQS)** - words, meanings, cognates, IPA, audio, examples.
2. **Small static datasets shipped with the app** (JSON) - frequency lists, so we
   can *order* vocabulary by how common it is.
3. **`localStorage` in the browser** - the learner's profile, progress, streaks, and
   SRS state. **The app is fully usable with this alone - no login required.**
4. **Optional sync layer** - "Log in with Wikimedia" (OAuth 2.0) saves that progress
   to a small database (Toolforge **ToolsDB**) so it follows the user across devices.

Most features are pure frontend/SPARQL and can be built in parallel; only the
optional sync layer touches the backend. (See `PROJECT_SETUP.md` for the full
build/deploy runbook.)

### UI: Wikimedia Codex (the official design system)
The interface is built with **Codex** (the Wikimedia design system) so the tool is
accessible, RTL-ready, and looks native. **We use the Codex CSS-only components +
design tokens** inside plain HTML/JS - no build step, no Vue, so newcomers stay in
HTML/CSS/JS. (A full Vue 3 + Codex SPA is a possible post-hackathon upgrade.) Codex
**replaces Bootstrap** and needs **no new accounts or permissions** - it is just CSS.

### The core learning loop (the heart of the app)

```
   ┌─────────────────────────────────────────────────────────┐
   │  ONBOARDING:  pick languages you know  +  target  +  level │
   └─────────────────────────────────────────────────────────┘
                              ↓
   ┌─────────────────────────────────────────────────────────┐
   │  PLACEMENT:  "You already know ~32% of Malayalam!"        │
   │  (the bridge-word engine - already built)                 │
   └─────────────────────────────────────────────────────────┘
                              ↓
   ┌─────────────────────────────────────────────────────────┐
   │  DAILY LESSON  (a short, mixed session):                  │
   │   • new bridge words first (easiest wins)                 │
   │   • ranked by FREQUENCY (learn common words first)        │
   │   • flashcards → listen (audio) → recall → use in a phrase │
   │   • a Friend-or-Faux round to sharpen the tricky ones      │
   └─────────────────────────────────────────────────────────┘
                              ↓
   ┌─────────────────────────────────────────────────────────┐
   │  SPACED REPETITION:  words you miss come back sooner;      │
   │  words you know come back later (Leitner / SM-2 in JS)     │
   └─────────────────────────────────────────────────────────┘
                              ↓
   ┌─────────────────────────────────────────────────────────┐
   │  PROGRESS:  streak, % of language "unlocked", daily goal   │
   └─────────────────────────────────────────────────────────┘
```

### What it actually feels like to use - "one word a day"? No.

A fair worry: *is this just one word a day?* No. Here is the real shape of the
experience.

**A session ("a lesson") = ~5–7 minutes, ~12–15 cards** - a mix of new words and
words due for review. You can do one lesson or several; like Duolingo, you set a
daily goal (e.g. 3 / 7 / 15 new words a day). A single card flows like this:

1. See a target word + **hear native audio** (Commons / P443).
2. Try to recall the meaning, flip the card.
3. Mark *"knew it / didn't"* - this feeds spaced repetition.
4. Every few cards, a quick twist: **use the word in a short phrase**, or a
   **Friend-or-Faux** "same meaning or different?" round.
5. End screen: XP earned, **streak +1**, progress bar moves, *"12 words due
   tomorrow."*

**The arc over time - the honest answer to "how long will I stay?":**

| When | What you do | How it feels |
|---|---|---|
| **First 60 sec** | Pick known languages + target → *"You already know ~300 words of Spanish!"* | **The hook** - everyone else starts you at zero |
| **Day 1 (~6 min)** | Learn 7 bridge words you half-knew, with audio | Effortless wins |
| **Week 1** | ~50 words, all from the "free" shared vocabulary | *"I'm flying"* |
| **Weeks 2–8** | Bridge words taper off → high-frequency core words; spaced reviews start; words combine into short phrases | Steady, real progress |
| **Month 2+** | Example sentences (P5831 / Tatoeba), listening, false-friend mastery | Actually *using* the language |
| **Ongoing** | Daily reviews keep vocabulary alive; record missing audio to give back | Habit + contribution |

**So how much content is there?** Bridge words are only the *on-ramp*. The real
content is the **high-frequency vocabulary of the whole target language** (the top
~1,000–3,000 words from Wiktionary frequency lists), then phrases and sentences on
top. The top ~2,000 words alone cover the bulk of everyday speech. At ~7 new words
a day that is **5–10 months of daily use just for core vocabulary** - before
sentences. After the bridge words run out, the learner keeps moving down the
frequency list, with spaced repetition holding earlier words in memory.

**Why this beats normal churn.** Most learners quit a language app in the first
week - it's hard and feels pointless. WikiLinkua front-loads the *wins*: you start
at "you already know 30%", your first lessons are words you half-recognise, and the
streak + daily reviews build a habit **before** the hard part arrives. The
head-start is a **retention strategy**, not a gimmick - it directly attacks the #1
reason people give up.

### Feature set - and the Wikimedia source behind each

This is what makes us *not just another Duolingo clone*: every feature is powered
by open Wikimedia data, and using the app can even improve that data.

| Feature | Powered by |
|---|---|
| "% of the language you already know" + bridge words | **Wikidata Lexemes / P5137** (built) |
| Order vocabulary easy→hard | **Wiktionary frequency lists** (ship as static JSON) |
| Native-speaker pronunciation & listening drills | **Commons / Lingua Libre** audio via **P443**; IPA via **P898** |
| Example **phrases & sentences** (the words → sentences journey) | **Wikidata usage examples (P5831)** on senses; **Tatoeba** (CC-BY) sentence pairs as a static dataset; later **Commons video subtitles** |
| False-friend "trap" training | **Wikidata P5976** + curated list (built) |
| Cognate / etymology "why you already know this" explanations | **Wikidata P5191** + **Wiktionary** etymologies |
| "Contribute" nudge: *this top-100 word has no audio yet - record it* | **Lingua Libre** (turns learners into contributors) |
| Onboarding from a Wikimedian's known languages | **Babel** boxes on user pages |
| **Login & cross-device sync** *(optional - the app works without it)* | **Wikimedia OAuth 2.0** + Toolforge **ToolsDB** |

### Going beyond words: the content ladder (and where sentences come from)

Words alone are not a language - a real course needs **forms (grammar) → phrases →
sentences → idioms**, and that content must come from somewhere. This is the
hardest part of the project and where data is thinnest, so we are explicit about
each layer, its source, and how honest the coverage is.

| Layer | Teaches | Source | Coverage (honest) |
|---|---|---|---|
| Words | core vocabulary | Wikidata Lexemes + Wiktionary frequency lists | good for many languages |
| **Grammar / forms** | conjugations, plurals, cases ("X is the past tense of Y") | **Wikidata Lexeme *Forms* + grammatical features** (structured!) | good where lexemes are complete |
| **Phrases** | useful set expressions | **Wikivoyage phrasebooks** + **Wiktionary phrasebook** categories (with translations) | decent for common languages |
| **Sentences** | comprehension + production | **Tatoeba** (CC-BY sentence *pairs*) backbone; **Wikidata usage examples P5831** + **Wiktionary examples** (via wiktextract / kaikki.org) | rich for major langs, sparse for small |
| Idioms / etymology | "why you already know this" | Wiktionary | variable |

**The idea that makes sentences actually work - comprehensible input ("i+1").**
A flat bank of sentences isn't a course; a beginner can't read random sentences.
But because we already **track every word the learner knows** (from bridge words +
lessons), we can scan a sentence bank and surface exactly the sentences where they
know **all the words but one or two**. Those are the sentences a learner can
actually understand and learn from - the proven "input one step beyond your level"
principle (the same idea behind Morphman / subs2srs in the session notes). As the
learner's vocabulary grows, **more sentences automatically unlock.** This turns an
ungraded, free sentence bank into a personalised, graded curriculum **without
hand-grading any content** - and it reuses the exact vocabulary engine we already
built. This is the bridge from "words" to "language."

**Where sentences come from, concretely:**
- **Tatoeba** - the realistic backbone: a crowd-sourced, **CC-BY** database of
  sentences *with translations linked across languages* (millions for major
  languages, downloadable as flat files, many with audio). Not a Wikimedia project,
  but Creative Commons, so it satisfies our "CC-only" rule.
- **Wikidata P5831 (usage example)** + **Wiktionary examples** (via **wiktextract**)
  - the **Wikimedia-native** supplement: fewer sentences, tied to the exact word.
- **Wikivoyage / Wiktionary phrasebooks** - curated practical **phrases** with
  translations, the rung between words and sentences.

**Honest weak links (and how we handle them):**
1. **Coverage is uneven** - rich for EN/ES/FR/DE/IT/PT/RU/JA, thin for small
   languages (same sparsity as bridge words). *Handling:* lead with well-covered
   pairs; for small languages fall back to phrases + words and flag gaps as a
   contribution opportunity.
2. **Sentences aren't pre-graded.** *Handling:* the i+1 algorithm grades them *per
   learner* from the known-word set + frequency - a feature, not a blocker.
3. **Tatoeba is external** (though CC-BY). *Handling:* keep Wikidata/Wiktionary/
   Commons as the primary Wikimedia spine; treat Tatoeba as a clearly attributed
   sentence bank. For 100% Wikimedia, restrict to P5831 + Wiktionary examples and
   accept smaller volume.
4. **No auto-generated grammar explanations or writing correction** - needs an LLM
   (out of scope; a documented future track).
5. **Production (speaking) is hard** - focus first on recognition, listening, and
   comprehension, which our data supports today.

For the hackathon: **depth on one pair, not breadth.** Pick one well-covered pair
(e.g. English → Spanish), wire Tatoeba + a few P5831 examples, and demo the i+1
sentence progression on top of the word lessons. That vertical slice proves the
whole "words → sentences" journey is real.

### The thing only *we* can do
Duolingo cannot start you from *your specific* combination of known languages, and
it can't tell you *"you already know this word because it came from Persian."*
WikiLinkua can, because Wikidata encodes the relationships between words across
**all** languages at once - including small and under-served languages that
commercial apps ignore. And the **"record the missing pronunciation"** loop means
**learning the language helps build the open dataset** - a virtuous circle that is
only possible inside Wikimedia.

---

## PART 5 - The 2-day hackathon plan

### Scope discipline
We will **not** try to build all of Part 4. We pick the slice that turns the demo
from "two games" into "a coherent learning platform with a journey", and leave the
rest as a documented roadmap.

**MVP goal (must demo):** A learner sets a profile once → gets a placement % → does
a **daily lesson** of frequency-ordered bridge words with audio → words go into a
**spaced-repetition deck** saved across visits → a **streak / progress** bar shows
they're advancing. Plus **one phrase/sentence exercise** to show the journey beyond
single words.

### Parallel tracks (so everyone - frontend, backend, linguists, UI/UX - has a lane)

| Track | Owner profile | Deliverable |
|---|---|---|
| **A. App shell & profile** | frontend | One unified app (not 2 separate pages); onboarding screen; profile saved to `localStorage`; home screen with "continue learning" |
| **B. Lesson loop & SRS** | frontend/JS | Daily-lesson screen reusing the existing flashcard UI; a simple Leitner/SM-2 scheduler in JS persisted to `localStorage` |
| **C. Frequency data** | data/linguist | Collect Wiktionary frequency lists for ~3 pilot languages into static JSON; wire it so lessons teach common words first |
| **D. Phrases/sentences** | SPARQL/backend | Pull **P5831 usage examples** for senses; prototype a Tatoeba sentence lookup for one language pair; one "fill the sentence" exercise |
| **E. Pronunciation & contribute** | frontend | Make audio (P443) a real listening exercise; add a "top-100 words missing audio" panel linking to Lingua Libre |
| **F. Progress & polish** | UI/UX | Streak, daily goal, "% unlocked" dashboard; visual design; demo script |

Tracks A and B are the critical path; C–F plug into them.

### Suggested timeline
**Day 1 - make it a *journey*.**
- Morning: agree pilot languages (pick pairs with **good Wikidata coverage** for a
  reliable demo, e.g. EN↔ES/FR/DE, ES↔IT/PT - see Risks); merge the two games into
  one app shell (Track A); design the profile + home screen.
- Afternoon: build the daily-lesson loop and the SRS scheduler (Track B); land the
  frequency JSON for at least one language (Track C).
- End of Day 1 target: *I can onboard, get a %, and do a lesson that remembers me.*

**Day 2 - make it *deep* and *demo-ready*.**
- Morning: phrases/sentences exercise (Track D); pronunciation drill + "missing
  audio" contribute panel (Track E).
- Afternoon: streaks/progress dashboard + visual polish (Track F); write the demo
  script; record a short video; tidy the roadmap for what comes after the hackathon.

### Good first tasks for newcomers (low-risk, high-learning)
- Run the bridge-word SPARQL in the [Wikidata Query Service](https://query.wikidata.org)
  for *your own* languages - get a feel for the data. **(everyone, hour 1)**
- Add 3–5 languages to the picker and test which pairs return good data.
- Build the static frequency JSON for one language from a Wiktionary frequency list.
- Add a single "usage example (P5831)" lookup and show it under a word.
- Style one screen (onboarding, lesson, or results) using **Codex** components and
  design tokens - read the Codex docs (doc.wikimedia.org/codex) first.

---

## PART 6 - Honest feasibility notes & risks

1. **Data sparsity is the central risk.** The very pairs the vision loves
   (Punjabi→Malayalam) have *thin* P5137 coverage on Wikidata today - you'll get few
   bridge words. **Mitigation:** (a) demo with well-covered pairs so the experience
   shines; (b) treat sparsity as a *feature* - "this language needs community
   contributions" is exactly the Wikimedia story, and our "contribute" loop turns
   the gap into a call to action. Be upfront about this with judges.
2. **WDQS timeouts.** Big/popular languages can make queries slow or time out. The
   existing games already cap result size (`LIMIT`) and set timeouts - keep doing
   that; pre-fetch and cache lesson data in `localStorage`.
3. **Sentences are harder than words.** Wikidata P5831 examples are sparse; Tatoeba
   is richer but is an *external* (though CC-BY) dataset. Keep the sentence feature
   small for the MVP (one pair, a handful of examples) and flag it as a roadmap item.
4. **LLMs / small language models** (the Tucano2 idea from the discussion) are
   tempting but a rabbit hole. **Keep them out of the 2-day MVP.** Note them as a
   future "phrase generation / feedback" exploration.
5. **Login is optional, not required.** The app works fully on `localStorage`
   (per-browser). Cross-device progress uses the optional sync layer (Wikimedia
   OAuth + ToolsDB), which also brings a privacy-policy obligation - keep it as the
   final milestone so the core demo never depends on OAuth approval timing.
6. **Codex build overhead (only if going full Vue).** The Vue 3 + Vite path adds a
   build step and a learning curve that can eat into 2 days. *Mitigation:* use the
   **Codex CSS-only** path for the MVP (no build step), or scaffold the Vue project
   *before* the event. Codex itself needs no new Wikimedia permissions.

---

## PART 7 - For newcomers: what to take away
- **The engine already exists and it's elegant** - one SPARQL query against
  Wikidata Lexemes. You don't need to understand a big backend; you need to
  understand *Lexeme → Sense → P5137 concept*.
- **You can ship a real feature this weekend** with HTML/CSS/JS + one query.
- **What we're building is genuinely new:** a learning path personalised to *your*
  languages, that also helps grow the open data it runs on. That's the Wikimedia
  difference, and it's worth doing well.

*Placeholder name: WikiLinkua. Phabricator: T425045.*
