# WikiLinkua Developer Guide

## What this project is

WikiLinkua is a thin-backend, browser-first language-learning app built around Wikidata Lexemes. The backend mostly serves pages, login, and a few proxy endpoints; the frontend does the heavy lifting by querying Wikidata, Tatoeba, Wikipedia, Commons, and MinT directly from the browser.

## Repo layout

- `app.py`: local entry point.
- `wikilinkua/__init__.py`: Flask app factory and login gate.
- `wikilinkua/views.py`: page routes for the SPA and supporting pages.
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

The app stores profile and progress in `localStorage` under `wikilinkua_progress` and `wikilinkua_words_cache_v4`.

## Key code paths

### Entry and routing

- `app.py` creates the Flask app.
- `wikilinkua/views.py` serves the React app for the main routes.
- `frontend/src/App.jsx` chooses the in-app view based on the URL path and internal state.

### Authentication

- `wikilinkua/auth.py` supports dev login and real Wikimedia OAuth 2.0.
- The dev flow does not contact Wikimedia and exists only for local/demo use.
- The real flow stores the OAuth access token in the Flask session for Commons upload.

### Learning data

- `frontend/src/utils/sparql.js` queries Wikidata Query Service for bridge words, cognates, false friends, and article/video seeds.
- `frontend/src/utils/srs.js` implements the Leitner spaced-repetition state for words.
- `frontend/src/utils/phrases.js` implements phrase fetching, phrase ranking, MinT translation fallback, and phrase-level repetition.
- `frontend/src/utils/video.js` and `frontend/src/components/VideoMode.jsx` handle Commons video discovery and subtitle-driven flashcards.

### Phrase flow

- `wikilinkua/phrases.py` proxies Tatoeba search and MinT translation.
- `frontend/src/components/PhrasesMode.jsx` merges due phrases with newly fetched sentences, then ranks them.

## Data model and storage

### Browser localStorage

- `wikilinkua_progress`: profile + word progress.
- `wikilinkua_phrases`: phrase SRS history.
- `wikilinkua_words_cache_v4`: cached bridge-word data.

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
