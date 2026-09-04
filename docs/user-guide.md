# WikiLinkua User Guide

## What WikiLinkua does

WikiLinkua helps you learn a new language through the languages you already know. It finds words linked to the ones you know - genuine cognates, borrowings and translations, each labelled with which kind of link it actually is - plus sentences, videos and short reading material from Wikidata Lexemes and Wikimedia content.

## First-time setup

1. Open the app.
2. Choose the languages you already know.
3. Choose the language you want to learn. Every language that has lexemes on Wikidata is
   listed (about 1,560 of them) with its lexeme count, because that count is the best
   predictor of how much the app can teach you. By default only languages with at least
   50 lexemes are shown; "show all" reveals the rest.
4. Start from Home, Words, or Phrases depending on what you want to practice.

Your profile and learning progress are stored in your browser on that device unless a future sync layer is added.

## How words are linked (read this first)

WikiLinkua never says two words are related just because Wikidata connects them
somehow. **A shared meaning is not shared history.** Every link carries its own
type and the app tells you which one it is:

| Link | What it means | Based on |
|---|---|---|
| **Cognate** | Both words descend from the *same ancestor word* - for example Malayalam തർജ്ജമ and Punjabi ਤਰਜਮਾ both come from Persian ترجمه. | Wikidata P5191 "derived from lexeme", followed up the chain from both sides |
| **Borrowed from your language** | This word was taken directly from a word you know. | P5191 |
| **Source of your word** | A word you know came from this one. | P5191 |
| **Same meaning** | There is a word for the same thing in a language you know. It says **nothing** about the words being related. | P5137 "item for this sense" |
| **Related meaning** | The meanings are linked (synonym or antonym). | P5973 / P5974 |
| **False friend** | Looks like a word you know but means something else. | P5976 + a curated list |

Only the first three claim the words share a history. The others are about
meaning, and the app labels them that way on purpose - a word for
"animal" that happens to point at the same concept as an English word is a
translation, not a cognate.

## Core terms

- **Lexeme**: Wikidata's entry for a word (id like `L1234`), holding its spellings, forms and meanings.
- **Sense**: one meaning of a lexeme. A word with several meanings has several senses.
- **Gloss**: the short meaning label shown for a word.
- **Bridge word**: a target-language word with any of the links above to a language you know.
- **Mapped word**: a target-language word whose sense is linked to a concept (P5137). Only
  mapped words can be matched across languages, so they are the population every percentage
  is measured against.
- **Linked word**: a mapped word that also has a counterpart in one of your languages.
- **Curated false friend**: a well-known trap written by hand because Wikidata does not record
  it yet. Kept out of every Wikidata-derived count and labelled where it appears.
- **Sample**: for data-rich languages a single query cannot return every word, so the browsable
  list is a sample. The app says so when that happens.
- **Leitner box**: the spaced-repetition level (0-5) that schedules the next review. Intervals
  are 0, 1, 3, 7, 14 and 30 days.
- New word / unseen word: a word you have not answered yet.
- Learning word: a word you have started practicing but have not mastered yet.
- Known word: a word that has reached box 3 or above.
- Due for review: a word whose review time has arrived or passed.

## What the numbers mean

Every figure in the app is either measured exactly or not shown at all.

| Figure | What it actually says |
|---|---|
| **"Words with a link: X%"** | Of all target-language words carrying a concept link, this share also has one in a language you know. It is **not** a claim that you know that share of the language, and most of those links are "same meaning", not shared origin. The exact counts are printed underneath. If the count cannot be fetched, the app shows nothing rather than a guess. |
| **"Box 4/5"** (Progress) | The word's spaced-repetition level. It is **not** a percentage of how well you know the word — nothing measures that. Hover for the next review date. |
| **Evidence counts** (Words) | How many cognates, borrowings and so on are among the words **currently loaded**. When the list is a sample, the page says so. |
| **Lexeme counts** (language picker) | How many words Wikidata has for that language — the honest predictor of how much the app can teach you. |

## Practice mode glossary

- Bridge flashcards: quick front/back review of bridge words.
- Friend or Faux: classify lookalike pairs as true friend vs false friend.
- Recall and reverse recall: train both directions of memory (word -> meaning and meaning -> word).
- Odd one out: three words that share a recorded history with words you know, plus one that does not - you get one guess, then see the answer.
- Match pairs: a fast recall drill.
- Phrases: sentence practice that uses your known/learning vocabulary and spaced repetition.
- Video and article mode: real-world input from Wikimedia Commons and Wikipedia, converted into vocabulary drills.

## Main screens

### Home (practice)

Logging in lands you on the practice dashboard: your daily lesson, every drill, and your
overall progress. A banner at the top opens the guided course.

### Learn (the guided course)

Learn is the structured route through the same vocabulary. Words are grouped into ordered
units of 8; one button always tells you what to do next, and units unlock as you finish
them. A streak and a daily goal sit at the top.

Units are ordered so that **words you half-know already** (real cognates and borrowings from
your languages) come first, then the **most basic vocabulary** — measured by how many of the
world's languages have a word for the same concept.

A unit is not just flashcards. You meet each word on a card, **hear it and pick the meaning**
(for words that have a recording), recall it in both directions, get warned about any false
friends, and finish with a **real sentence** that uses one of the unit's words — with a
translation and audio where they exist. Each unit card says what it contains before you
start, so a thin unit is visible up front.

Every individual mode — flashcards, recall, odd one out, match pairs, friend or faux — stays
available on the home screen for free practice outside the course.

### Words

Use Words to browse the vocabulary list, search it, and filter it by link type: cognates, borrowings, same-meaning words and false friends. A counter at the top shows how many words fall into each, so you can see at a glance how much of the overlap is real shared history versus just shared meaning.

### Phrases

Use Phrases to practice sentences that contain words you already know. The app tries to show a human translation first, then falls back to Wikimedia MinT if needed.

### Progress

Use Progress to see how many words are new, learning, known, or due for review.

### Video

Use Video to browse Wikimedia Commons videos and turn subtitle-covered videos into flashcards.
When none of your own languages has a subtitle track for a video, English is offered as a
**support language**, because most Commons subtitles are English and for many language pairs
that is the only thing that makes a video usable at all.

### Article

Use Article to search Wikipedia articles in your target language and turn article text into flashcards.

### Editing Wikidata from inside the app

Every word is a link to its Wikidata lexeme, marked with the Wikidata logo — click it to
open the page where you can edit it.

Words that show "Same meaning" but have no recorded origin also offer **Add a word origin**.
If you know the older word it came from, type that word's lexeme id (like `L1002578`) and
WikiLinkua records it on Wikidata for you, under your own account. The app shows you which
word that id refers to before saving.

Point at the **ancestor**, not at the other word: two cognates usually come from a shared
older word rather than from each other, so recording them as derived from each other would
be wrong.

### Contribute

Contribute shows **what data is missing** for a language and what each gap costs learners.
Pick any language and the app measures it live against Wikidata:

- how many lexemes exist, and how many are actually usable for learning (they have a
  sense linked to a concept),
- a prioritised task list - high priority means it blocks a core feature - with a live
  count for each, examples you can click straight through to Wikidata, and a link that
  opens the full list in the Query Service.

Tasks adapt to the language. Grammatical gender is only suggested where the language
already uses it; where a language barely uses gender, the app instead flags the existing
gender statements as likely errors to review.

Recording pronunciations lives at `/contribute/record`, reached from the "no audio" task,
which passes the word's lexeme along. After a successful upload the recording is linked to
the lexeme's matching form with P443, so the word actually gains audio, starts playing in
the app, and drops off the gap list. You are asked whether you are a native speaker, because
that is recorded on the file page and learners rely on it.

If a recording already exists on Commons (from Lingua Libre, say), you can paste its file
name to link it without uploading anything.

### Profile and Login

Profile changes which languages you know and which language you are learning. Login uses Wikimedia accounts when real login is enabled; the development mode can sign in as a local test user.

Progress is saved **per language pair**. If you learn 7% of French and then switch to Malayalam, Malayalam starts at 0% - and when you switch back to French, your 7% is still there. Nothing is overwritten when you change languages.

## How to use the learning modes well

### Words and flashcards

- Start with bridge words that connect cleanly to languages you already know.
- Use flashcards when you want a fast reveal of meaning.
- Use recall modes when you want a harder memory test.

### Phrases

- Listen first, then reveal the translation.
- Mark a phrase as remembered only when you really understood it.
- Phrase review is separate from word review, so sentence practice does not replace word practice.

### Video and article practice

- Use subtitles or article extracts as extra input.
- If a video or article has no useful vocabulary matches, try a different item.
- These modes are best when you already know a modest amount of the target language.

## Why known words may stay at zero after one correct answer

The app uses a Leitner-style system. A correct answer moves a word up one step, not straight to “known.” A word usually needs several successful reviews before it becomes known.

That means:

- one correct answer often changes a word from new to learning,
- several correct answers over time move it into known,
- due words come back when their review date arrives.

## Phrase review order

Phrases can come from two places:

1. due phrase reviews from your saved phrase history,
2. newly fetched phrases based on words you already know or are learning.

The app combines them, removes duplicates, and then ranks them so more useful sentences appear first. A sentence may reappear later if it is due again or if it still fits your vocabulary.

## Privacy and access

- The app does not store your password.
- Basic learning progress stays in your browser on the device you are using.
- Real Wikimedia login only reads your Wikimedia identity and, for uploads, the permission needed to publish audio to Commons.
- Pronunciation uploads are published to Wikimedia Commons under the stated license.

## Third-party services used by the app

- Wikidata Query Service for language and lexeme data.
- Tatoeba for sentence examples.
- Wikimedia MinT for fallback translations.
- Wikimedia Commons for audio and video media.
- Wikipedia APIs for article mode.
- Wikimedia OAuth for login.

## What the UI is following

The interface follows Wikimedia Codex style conventions:

- Wikimedia blue as the primary action color,
- neutral grays for text and borders,
- simple cards and clear spacing,
- responsive layouts for desktop and mobile,
- minimal decoration and easy-to-scan controls.

## Performance expectations

WikiLinkua is network-heavy rather than compute-heavy. Most waiting time comes from external queries and media lookups, not from local processing. The app uses caching, limits, and lazy loading to stay usable.

## Future scope

The project already points toward:

- cross-device sync,
- stronger progress dashboards,
- richer pronunciation practice,
- more structured phrase review,
- more help text and in-app explanations,
- broader language coverage.

## Project links

- Repository: https://github.com/rohan2023101003/wikilinkua
- Issues / feedback: https://github.com/rohan2023101003/wikilinkua/issues
