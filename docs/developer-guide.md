# WikiLinkua Developer Guide

## What this project is

WikiLinkua is a thin-backend, browser-first language-learning app built around Wikidata Lexemes. The backend mostly serves pages, login, and a few proxy endpoints; the frontend does the heavy lifting by querying Wikidata, Tatoeba, Wikipedia, Commons, and MinT directly from the browser.

## Repo layout

- `app.py`: local entry point.
- `wikilinkua/__init__.py`: Flask app factory and login gate.
- `wikilinkua/views.py`: page routes for the SPA and supporting pages. Note `/contribute`
  serves the **SPA** (the data-gap dashboard); the audio recorder is a server-rendered
  sub-page at `/contribute/record`. The nav links to `/contribute` everywhere, so the
  section entry point is the same from server pages and from inside the app.
- `wikilinkua/auth.py`: Wikimedia OAuth and dev-login flow.
- `wikilinkua/contribute.py`: pronunciation recording and Commons upload.
- `wikilinkua/phrases.py`: Tatoeba proxy and MinT fallback.
- `wikilinkua/config.py`: environment-driven configuration.
- `frontend/`: Vite + React app.
- `wikilinkua/templates/` and `wikilinkua/static/`: server pages and committed frontend build output.

## How to run locally

1. Install the frontend dependencies and build the bundle.
2. Install the Python dependencies.
3. Run `python app.py` for local development.

The build output is committed into `wikilinkua/static/dist/` because Toolforge deploys the Python app without running the frontend build on the server.

## Runtime architecture

### Backend responsibilities

The backend is intentionally small. It handles:

- login and session state,
- support pages rendered with Jinja,
- pronunciation recording upload to Commons,
- sentence and machine-translation proxy endpoints.

All language data for learning content is fetched live in the browser from Wikidata Query Service or the supported third-party APIs.

### Frontend responsibilities

The React app owns the learning experience:

- onboarding and profile selection,
- bridge-word discovery,
- flashcards and drills,
- phrases and sentence repetition,
- progress dashboards,
- video and article-based learning.

The app stores profile and progress in `localStorage` under `wikilinkua_state_v2` and `wikilinkua_words_cache_v6`.

## Key code paths

### Entry and routing

- `app.py` creates the Flask app.
- `wikilinkua/views.py` serves the React app for the main routes.
- `frontend/src/App.jsx` chooses the in-app view based on the URL path and internal state.

### Authentication

- `wikilinkua/auth.py` supports dev login and real Wikimedia OAuth 2.0.
- The dev flow does not contact Wikimedia and exists only for local/demo use.
- The real flow stores the OAuth access token in the Flask session for Commons upload.

### Relationship model (read before touching word data)

`frontend/src/utils/relations.js` defines the only vocabulary the UI may use to
describe how two words relate. The rule it enforces: **a connection in Wikidata
is not automatically a cognate.**

- Etymological claims (`cognate`, `borrowed_from`, `source_of`) may only come
  from **P5191 "derived from lexeme"**. `cognate` specifically requires the two
  lexemes to reach a *common ancestor* by walking P5191 upwards from both sides;
  a direct P5191 edge between them is a borrowing, not a cognate pair.
- Semantic links (`same_meaning` from P5137, `translation` from P5972,
  `related_meaning` from P5973/P5974) never imply shared history. A Malayalam
  word whose sense points at the same concept item as an English word is a
  translation equivalent, nothing more.
- `looks_alike` (form/IPA similarity) is a *warning*, not a relationship, and is
  suppressed when a real etymological link already explains the resemblance.

`buildRelations()` assembles the typed list, `primaryRelation()` picks what a
word leads with, and `explainRelation()` produces the sentence shown to the
learner. Add new evidence by extending the taxonomy, never by widening what
`cognate` means.

Acquisition lives in `sparql.js`:
`fetchDerivationEdges()` (one query per language, three hops - a single UNION
across languages took ~19s and the fully server-side transitive join 502s),
`buildAncestorMap()`, then `classifyDerivation()` does the join in the browser.

### Learning data

- `frontend/src/utils/sparql.js` queries Wikidata Query Service for bridge words, derivation ancestry, false friends, and article/video seeds.
- `frontend/src/utils/srs.js` implements the Leitner spaced-repetition state for words.
- `frontend/src/utils/phrases.js` implements phrase fetching, phrase ranking, MinT translation fallback, and phrase-level repetition.
- `frontend/src/utils/video.js` and `frontend/src/components/VideoMode.jsx` handle Commons video discovery and subtitle-driven flashcards.

### Phrase flow

- `wikilinkua/phrases.py` proxies Tatoeba search and MinT translation.
- `frontend/src/components/PhrasesMode.jsx` merges due phrases with newly fetched sentences, then ranks them.

## Data model and storage

### Browser localStorage

- `wikilinkua_state_v2`: the active profile plus one **deck per language pair**
  (word SRS + phrase SRS), so progress follows the pair, not the browser.
  Implemented in `frontend/src/utils/storage.js`; the pre-v2 keys
  `wikilinkua_progress` / `wikilinkua_phrases` are migrated on first read.
- `wikilinkua_words_cache_v6`: cached word data including typed relations, one
  slot per pair (24h TTL, oldest slot evicted when storage is full). Bump the
  version whenever the word shape changes, or stale caches will be replayed.

### Server session

- Wikimedia user id and username.
- OAuth access token when real login is enabled.

There is no project database in the current code path.

## Third-party services

- Wikidata Query Service for lexeme and concept data.
- Tatoeba for sentence examples.
- Wikimedia MinT for fallback translation.
- Wikimedia OAuth for login.
- Wikimedia Commons for pronunciation upload and video/audio assets.
- Wikipedia APIs for article mode.

These are all external dependencies and should be documented explicitly in deployment and privacy notes.

### Language list is generated, not hand-written

`frontend/src/utils/languageData.js` is a GENERATED file listing every language that has
lexemes on Wikidata (~1,560) with its lexeme count. Regenerate it with the queries in its
header comment; do not hand-edit it. Display names and search aliases that differ from the
Wikidata label (Hindustani -> "Hindi / Urdu") live in `LANGUAGE_DISPLAY` in `sparql.js`, so
regenerating never clobbers them.

Because the list is ~1.5k entries, look languages up with `getLanguage(qid)` (map-backed
and alias-aware) rather than `LANGUAGES.find(...)`, especially inside per-word loops.

### Displayed statistics: never derive them from the word list

`loadAndNormalizeWords` returns a **capped sample**. `WL_MAX_BRIDGES` limits the bridge query
to 15,000 (lexeme, concept) rows and the query has no `ORDER BY`, so for English (32.5k pairs),
French (21.1k) or Russian (15.1k) the returned rows are a truncated, engine-ordered subset.

Consequences to respect:

- **Any percentage measured against the whole language needs its own `COUNT` query.**
  `fetchBridgeCount()` supplies the numerator for the overlap figure; `fetchTotalTargetMapped()`
  supplies the denominator. Counting `words.filter(w => w.isBridge)` instead understates the
  figure and is not even reproducible between loads.
- When a count query fails it returns `null` and the UI **hides the figure**. Never fall back
  to an approximation.
- The `coverage` object (`{ bridgeCount, truncated, loadedLexemes }`) is threaded from `App`
  into the views that show numbers. `truncated` drives the "this is a sample" notice.
- Entries tagged `source: 'curated'` are hand-written false friends, not Wikidata lexemes.
  Exclude them from anything counted against the Wikidata lexeme population.
- Do not invent precision. The Progress page shows the real Leitner box (`Box 4/5`); it used to
  show fabricated "70% / 88% learned" figures mapped from box levels, which measured nothing.

### Routing

The Flask app serves the same SPA for several paths and `viewFromPath()` in `App.jsx` decides
which view opens. Keep the two in sync when adding routes.

| Path | View |
|---|---|
| `/`, `/app/` | home |
| `/wikilinkua/` | Words |
| `/false-friends/` | Friend or Faux |
| `/contribute` | Contribute (data gaps) |
| `/contribute/record` | **server-rendered** audio recorder, not a SPA view |

The startup effect must land on `viewFromPath()`; it previously forced `game-modes`, which
silently broke every deep link.

### Render smoke test

`frontend/src/__smoke.jsx` renders every view with representative props, including awkward
data (missing gloss, very long lemma, two words with the same gloss). An undefined variable in
JSX shows the user a blank white screen and does **not** fail the build, so run this before
pushing UI changes:

```bash
npx vite build --ssr src/__smoke.jsx --outDir ./.smoke && node .smoke/run.mjs
```

It only covers initial render — no effects, no interaction — so it catches blank screens, not
logic bugs.

### Contribution gap finder

`frontend/src/utils/gaps.js` holds the maintenance-task catalogue behind the Contribute
tab. Each task carries its own count query, list query, what it unlocks, and how to fix it.
Rules when adding tasks:

- Scope every query to one language (`dct:language wd:QID`). That is what keeps them at
  seconds rather than timing out.
- Prefer two plain counts over one `COUNT` with `FILTER NOT EXISTS` when the negation is
  slow - "lexemes with no sense" went from ~55s to ~3s that way.
- Use `available(profile)` for language-dependent tasks. Suggesting grammatical gender for
  a language that has none would be actively wrong, so the gender tasks switch on the
  measured share of nouns that already carry P5185.

### Wikipedia API traps

- `lllang` (prop=langlinks) accepts **one** language code. Passing `en|pa` returns no
  langlinks at all rather than an error, which previously made the app announce "no
  English article yet" for articles that plainly exist. Fetch all langlinks and filter
  client-side.
- Wikipedia language codes are not always our language code: Hindustani maps to the `hi`
  and `ur` Wikipedias, Bokmål to `nb` and legacy `no`. See `WIKI_CODE_VARIANTS` in
  `ArticleMode.jsx`.

### Language QIDs are not obvious

Some languages hold no lexemes at all under the QID you would expect, so the app
maps them (`LANGUAGE_ALIASES` in `sparql.js`):

| Picked | Actually queried | Why |
|---|---|---|
| Hindi (Q1568), Urdu (Q1617) | Hindustani (Q11051) | Q1568 and Q1617 have **0** lexemes; all Hindi/Urdu lexical data sits under Hindustani |
| Norwegian (Q9043) | Norwegian Bokmål (Q25167) | Q9043 has 1 lexeme; Bokmål has ~41k |

Check `SELECT (COUNT(DISTINCT ?l) AS ?n) WHERE { ?l dct:language wd:QID }` before
adding a language, otherwise it will silently return nothing.

## Privacy and access notes

- No password storage exists in this codebase.
- Local learning progress stays in browser storage until a sync layer is added.
- Real login only requests the Wikimedia identity profile plus the token needed for Commons upload.
- Commons upload requires an OAuth consumer with the correct upload grants.
- Public deployment should state clearly which services receive user language choices, word queries, or uploads.

## UI and design conventions

The frontend follows Wikimedia Codex styling and tokens, then layers a small amount of local CSS for page-specific layout.

Use this pattern when adding UI:

- prefer Codex cards, buttons, and icons where possible,
- keep colors close to Wikimedia blue and neutral grays,
- keep layouts simple and responsive,
- avoid external CDNs for runtime assets,
- keep the build output local and committed.

## Performance and network considerations

The slow parts are almost always network-bound:

- Wikidata SPARQL queries can be slow on large language pairs.
- Tatoeba and MinT requests are on-demand and can add latency.
- Commons subtitle and media lookups can be heavy when browsing videos.
- Article mode can make many Wikipedia API requests while collecting recommendations.

The local code already uses caching, limits, and lazy loading to keep the app usable.

## Build and deployment notes

- Vite builds to `wikilinkua/static/dist/`.
- The committed `app.html` must match the generated asset hashes.
- Toolforge should serve the Python app and the checked-in frontend bundle.
- The frontend build script must stay portable across Windows and Unix shells.

## Future scope

Likely next steps that are already implied by the code and docs:

- database-backed sync of progress across devices,
- public Wikimedia OAuth consumer approval,
- better first-run guidance and glossary help in the UI,
- richer phrase review and review explanations,
- stronger privacy documentation for production deployment,
- more learning modes and deeper coverage of the article/video pipelines.

## Files to read first

- `PROPOSAL.md`
- `PROJECT_SETUP.md`
- `wikilinkua/__init__.py`
- `wikilinkua/auth.py`
- `wikilinkua/contribute.py`
- `wikilinkua/phrases.py`
- `wikilinkua/views.py`
- `frontend/src/App.jsx`
- `frontend/src/utils/sparql.js`
- `frontend/src/utils/srs.js`
- `frontend/src/utils/phrases.js`
- `frontend/src/components/GameModes.jsx`
- `frontend/src/components/PhrasesMode.jsx`
- `frontend/src/components/VideoMode.jsx`
- `frontend/src/components/ArticleMode.jsx`
