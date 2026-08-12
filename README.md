# WikiLinkua

Learn a new language through the languages you **already** know — powered entirely by
Wikimedia data. Wikimedia Hackathon 2026 ([T425045](https://phabricator.wikimedia.org/T425045)).

Live: **https://wikilinkua.toolforge.org**

WikiLinkua does two things at once:

1. **Teaches you** — it finds words in your target language that connect to words you
   already know, and drills them with spaced repetition, audio, sentences, video and
   Wikipedia reading.
2. **Lets you fix the data it runs on** — it measures what is missing in Wikidata for
   your language and hands you a prioritised, clickable to-do list.

That second half matters because the first half is only as good as the data. Every gap a
contributor closes makes the app better for everyone learning that language.

---

## The one rule that shapes everything: a link is not automatically a cognate

Wikidata connects words in several different ways, and they mean very different things.
WikiLinkua never blurs them. Every link the app shows carries its **type**, its
**evidence**, and a sentence explaining itself.

| Link type | What it claims | Evidence used |
|---|---|---|
| **Cognate** | Both words descend from the **same ancestor word** | **P5191** `derived from lexeme`, followed up the chain from *both* sides until they meet |
| **Borrowed from your language** | This word was taken from a word you know | **P5191**, direct line of descent |
| **Source of your word** | A word you know came from this one | **P5191**, direct line of descent (reverse) |
| **Translation** | Explicitly recorded as a translation | **P5972** *(defined; not fetched — see Limitations)* |
| **Same meaning** | A word for the same thing exists in your language. **Says nothing about shared history** | **P5137** `item for this sense` |
| **Related meaning** | Meanings are linked (synonym/antonym) | **P5973** / **P5974** *(defined; not fetched)* |
| **False friend** | Looks like a word you know, means something else | **P5976** + a curated list |
| **Looks or sounds similar** | Only the *shape* resembles a word you know — **may be coincidence** | Levenshtein over lemmas and **P898** IPA |

Only the first three are claims about word history. A word whose sense points at the same
concept item as an English word is a **translation equivalent** — calling that a cognate
would be false, and the app does not.

Cognates are found by **shared ancestry, not direct links**. This is why a speaker of one
language can be shown words in an unrelated-looking one: both may have words descending
from the same older root, with no direct link between them in Wikidata. Chains are
followed up to three hops, because languages sit at different distances from a shared root.

The taxonomy lives in `frontend/src/utils/relations.js`. Extend it rather than widening
what `cognate` means.

---

# Part 1 — Every way to learn

Pick the languages you know and one to learn. Everything below is then generated for that
pair. Progress is saved **per language pair**: learn 7% of one language, switch to another,
and the new one starts at 0% — switch back and the first is exactly where you left it.

### Profile / onboarding
Choose known languages and a target from **~1,560 languages** — every language that has
lexemes on Wikidata. Each shows its lexeme count, because that count is the honest
predictor of how much the app can teach you. Languages with fewer than 50 lexemes are
hidden behind a "show all" toggle, and picking a thin language warns you up front.

*Uses:* the generated list in `frontend/src/utils/languageData.js`, built from
`?lexeme dct:language ?language` over the whole Wikidata lexeme store.

### Words
Browse, search and filter the target vocabulary by link type — cognates, borrowings,
same-meaning, look-alikes, false friends — with a live count for each. Every word card
shows its badge, the word it links to, and *why* they are linked. Audio plays where a
recording exists.

*Uses:* **P5137** (bridge), **P5191** (ancestry), **P898** (IPA), **P443** (audio),
**P5976** (false friends), all via the Wikidata Query Service.

### Main lesson
A mixed 10-card session that prioritises words **due for review**, then new ones, picking
an exercise type per word (flashcard, recall, reverse recall, or friend-or-faux).

### The drills

| Mode | What it trains | Shape |
|---|---|---|
| **Flashcards** | Recognition | 10 cards, flip to reveal meaning, self-grade |
| **Recall** | Word → meaning | 10 questions, 4 options, no duplicate options |
| **Reverse Recall** | Meaning → word | 10 questions, 3 options |
| **Odd One Out** | Etymology awareness | 5 rounds of 4 words: three share a recorded history with words you know, one does not. One guess, then the answer is revealed with the reasoning |
| **Match Pairs** | Fast retrieval | 3 sets of 3 word↔meaning pairs |
| **Friend or Faux** | The traps | 10 questions: true friend or false friend? |

### Phrases
Sentences containing words you have already learned, ranked so the ones you almost fully
understand come first (the "i+1" principle). Human translation shown when one exists,
machine translation as fallback. Audio where available, otherwise browser text-to-speech.
Phrases have their own spaced-repetition schedule, separate from words.

*Uses:* **Tatoeba** (CC-BY, via our backend proxy — their API is not reliably CORS-enabled),
**P5831** `usage example` for a Wikimedia-native cold start, **Wikimedia MinT** via
cxserver for fallback translation.

### Video
Browse Wikimedia Commons videos in your target language, filter to those that actually
have subtitles, watch with subtitles, and turn the subtitle vocabulary into flashcards.
When none of your languages has a subtitle track, English is offered as a support language
— for many pairs that is the only thing that makes a video usable at all.

*Uses:* Commons **category listings**, **imageinfo** for thumbnails/URLs, and
**TimedText:** subtitle pages (`TimedText:<file>.<lang>.srt`), converted to WebVTT in the
browser.

### Article
Search Wikipedia in your target language, read article extracts, and build flashcards from
the vocabulary in them. The app also recommends articles seeded from words you know.

*Uses:* the Wikipedia **Action API** — `list=search`, `prop=extracts`, `prop=langlinks`,
and `list=querypage&qppage=WithoutInterwiki`.

### Progress
Your vocabulary split into new / learning / known / due, driven by a **Leitner** schedule:
6 boxes at 0, 1, 3, 7, 14 and 30 days. A word counts as "known" at box 3 — one correct
answer moves it up one step, it does not jump straight to known.

---

# Part 2 — Every way to contribute

The app is deliberately a two-way street. These are all the contribution paths, what each
one fixes, and where the edit actually lands.

## A. The Contribute tab — find and fix data gaps

Pick **any** language and the app measures it live against Wikidata, then shows a
prioritised task list. Each task states what it unlocks for learners, gives a live count,
lists example lexemes you can click straight through to edit, and links the full list into
the Query Service.

| Priority | Task | What it unlocks | Property |
|---|---|---|---|
| High | Lexemes with **no sense** | The word cannot be taught at all — it is invisible to the app | `ontolex:sense` |
| High | Senses **not linked to a concept** | Without this the word can never be matched across languages | **P5137** |
| High | Learner-ready words with **no derivation** | The only evidence that licenses a cognate claim. Each one is a potential "you already know this" moment | **P5191** |
| High | Words with **no pronunciation audio** | Listening practice | **P443** |
| High | **Gender on a language that barely uses it** | Data correctness — likely imported errors to remove | **P5185** |
| Medium | Words with **no IPA** | "Sounds similar" detection, pronunciation hints | **P898** |
| Medium | Senses with **no usage example** | Example sentences — the step from words to language | **P5831** |
| Medium | **Nouns missing gender** | Correct grammar hints | **P5185** |
| Low | Lexemes with **no forms** | Matching words inside real sentences, not just dictionary forms | `ontolex:lexicalForm` |

**Tasks adapt to the language.** Telling a genderless language to add grammatical gender
would be actively wrong, so the two gender tasks are gated on the measured share of nouns
that already carry P5185: mostly gendered → "add the missing ones"; barely gendered →
"these are probably mistakes, review them"; never gendered → no gender task at all.

*Lands on:* Wikidata lexeme pages (`https://www.wikidata.org/wiki/Lexeme:L…`) and the
[Wikidata Query Service](https://query.wikidata.org).

## B. Record a pronunciation

Record a word in the browser at `/contribute/record`, listen back, and publish it to **Wikimedia
Commons** under CC BY-SA 4.0 using your own Wikimedia login, so it counts as your
contribution. Reachable directly from the "no audio" task.

*Lands on:* Wikimedia Commons, via the Action API `action=upload` with your OAuth token.
**Note:** the upload is not yet linked back to the lexeme with **P443** — that step is
still manual. [Lingua Libre](https://lingualibre.org) remains the better tool for bulk
recording sessions.

## C. Create a missing Wikipedia article

In Article mode, any article that does not yet exist in your language shows a direct
**Content Translation** link, pre-filled with the source article and language pair.

*Lands on:* `Special:ContentTranslation` on your language's Wikipedia.

## D. Add or fix video subtitles

Video mode shows which Commons videos have subtitles in which languages — the ones with
none are the gap. Subtitles live as ordinary wiki pages you can create and edit.

*Lands on:* `TimedText:` pages on Wikimedia Commons.

## E. Report problems

Bugs and data oddities: [GitHub issues](https://github.com/rohan2023101003/wikilinkua/issues).

---

# Part 3 — What uses what

### Wikidata properties

| Property | Name | Used for |
|---|---|---|
| **P5137** | item for this sense | The bridge: connects a meaning to a language-neutral concept |
| **P5191** | derived from lexeme | Cognates (shared ancestor) and borrowings. **The only etymological evidence accepted** |
| **P898** | IPA transcription | "Sounds similar" detection, pronunciation display |
| **P443** | pronunciation audio | Audio playback (files hosted on Commons) |
| **P5976** | false friend | Friend-or-Faux |
| **P5831** | usage example | Native example sentences |
| **P5185** | grammatical gender | Gap detection only (both directions) |
| **P424** | Wikimedia language code | Mapping languages to Wikipedia/Commons/Tatoeba codes |
| P5972 / P5973 / P5974 | translation / synonym / antonym | Defined in the taxonomy; **not fetched** (see Limitations) |

### Services

| Service | Endpoint | Used for |
|---|---|---|
| Wikidata Query Service | `query.wikidata.org/sparql` | All lexeme data, all gap counts |
| Wikidata entity pages | `wikidata.org/wiki/Lexeme:L…` | Contribution targets |
| Wikimedia Commons API | `commons.wikimedia.org/w/api.php` | Video discovery, thumbnails, subtitle pages, audio upload |
| Wikipedia Action API | `<lang>.wikipedia.org/w/api.php` | Article search, extracts, langlinks, orphan lists |
| Wikimedia MinT (cxserver) | `cxserver.wikimedia.org/v2/translate` | Machine-translation fallback for sentences |
| Wikimedia OAuth 2.0 | `meta.wikimedia.org/w/rest.php/oauth2` | Login; Commons upload token |
| Content Translation | `Special:ContentTranslation` | Article-creation hand-off |
| **Tatoeba** *(not Wikimedia)* | `tatoeba.org/en/api_v0/search` | Sentence bank, CC-BY, proxied by our backend |
| Browser SpeechSynthesis | — | Text-to-speech when no recording exists |

### Language QIDs are not obvious

Some languages hold no lexemes under the QID you would expect, so the app remaps them:

| You pick | Actually queried | Why |
|---|---|---|
| Hindi (Q1568), Urdu (Q1617) | Hindustani (**Q11051**) | Q1568 and Q1617 have **0** lexemes; all Hindi/Urdu lexical data sits under Hindustani |
| Norwegian (Q9043) | Bokmål (**Q25167**) | Q9043 has 1 lexeme; Bokmål has ~41,000 |

Always check `SELECT (COUNT(DISTINCT ?l) AS ?n) WHERE { ?l dct:language wd:QID }` before
trusting a language QID.

---

# Part 4 — Your data

| Where | What | Notes |
|---|---|---|
| `localStorage` → `wikilinkua_state_v2` | Active profile + one deck per language pair (word SRS, phrase SRS) | Never leaves your browser |
| `localStorage` → `wikilinkua_words_cache_v6` | Cached word data per pair, 24h | Oldest evicted when storage is full |
| Flask session | Wikimedia username + user id, OAuth token | Token only used for Commons upload |

There is **no database**. No passwords are ever stored. Progress does not yet sync across
devices — see [`docs/privacy-policy.md`](docs/privacy-policy.md).

---

# Part 5 — Running it

```
frontend/                     # React + Vite app (all the learning logic)
  src/utils/relations.js      # the link taxonomy — read this first
  src/utils/sparql.js         # Wikidata queries + word pipeline
  src/utils/gaps.js           # contribution task catalogue
  src/utils/storage.js        # per-language-pair progress
  src/utils/languageData.js   # GENERATED language list — do not hand-edit
  src/__smoke.jsx             # renders every view; catches blank-screen crashes
wikilinkua/                   # thin Flask app: login, pages, two proxies
  static/dist/                # committed build output (Toolforge does not build JS)
docs/                         # user guide, developer guide, privacy policy
```

```bash
# frontend
cd frontend && npm install && npm run build

# backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python app.py                       # http://localhost:4114
```

Before pushing UI changes, run the render smoke test:

```bash
cd frontend
npx vite build --ssr src/__smoke.jsx --outDir ./.smoke && node .smoke/run.mjs
```

Deploy (Toolforge build service):

```bash
ssh <shellname>@login.toolforge.org
become wikilinkua
toolforge build start https://github.com/rohan2023101003/wikilinkua.git
toolforge webservice buildservice start
```

See [`PROJECT_SETUP.md`](PROJECT_SETUP.md) for the full runbook and
[`docs/developer-guide.md`](docs/developer-guide.md) for architecture.

---

# Part 6 — Honest limitations

- **Coverage is the binding constraint.** Most languages have few lexemes, and most
  lexemes lack derivation, audio and examples. The app states this plainly instead of
  faking richness — and the Contribute tab turns each gap into a task.
- **Text matching uses dictionary forms.** Article and Video flashcards match words in
  running text against lemmas, so in inflected languages most words will not match. Fixing
  this needs lexeme *forms*; it is the top item on the roadmap.
- **No frequency ordering.** Vocabulary is not sequenced easy→hard, so this is not yet a
  curriculum.
- **P5972/P5973/P5974 are not fetched.** Every query shape tried took 43–110s or failed on
  WDQS. `same_meaning` already carries the meaning claim.
- **Uploads do not link P443** back to the lexeme yet.
- **Login is currently required** on the live deployment, though the app is designed to
  work anonymously from `localStorage`.
- **Not yet built:** cross-device sync/database, script learning, parallel-article reading
  via Content Translation metadata, automatic subtitle generation, community features.

---

Apache-2.0. Data from [Wikidata](https://www.wikidata.org),
[Wikimedia Commons](https://commons.wikimedia.org), Wikipedia and
[Tatoeba](https://tatoeba.org) (CC-BY).
