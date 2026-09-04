# WikiLinkua UI Guide

How the interface is put together, why it is arranged this way, and the rules to follow
when adding to it. Companion to [`README.md`](README.md) (what the app does) and
[`docs/developer-guide.md`](docs/developer-guide.md) (how the data works).

---

## 1. The two audiences are one person

WikiLinkua is a learning platform *and* a contribution platform. The temptation is to build
two apps behind one login. Don't.

A learner mid-lesson notices *"this is obviously a cognate, but Wikidata doesn't say so"* —
that is the moment the edit should be one click away. So contribution is **contextual**
first and a **destination** second:

| Where | What it is |
|---|---|
| **On the word itself** | Every lemma links to its lexeme; words with no recorded origin offer **Add a word origin** inline |
| **In the lesson** | A unit with no audio says so, and points at the recorder |
| **Contribute tab** | The other mode: *"I have an hour — what does my language need?"* |

**Rule:** if a screen can show a data gap, it should also offer the fix. Never make someone
navigate away to contribute something they are looking at right now.

---

## 2. Navigation

Ten destinations, grouped by what the user is trying to do. The dividers are the message —
they say *Contribute is a different kind of activity from Video*.

```
Home  Learn │ Words  Phrases  Video  Article │ Contribute │ Progress  Profile │ Guide  account
└ practise ┘ └────── source material ───────┘ └ give back ┘ └───── you ──────┘
```

- **Home** is the practice dashboard and the **landing page after login**. Deliberate: it is
  the low-commitment entry point.
- **Learn** is the structured course. Linked prominently from Home, because a course nobody
  can find is not a course.
- The server-rendered pages (`/guide`, `/contribute/record`) render the **same nav**, so the
  chrome does not change under the user.

### Every view has a URL

| Path | View | | Path | View |
|---|---|---|---|---|
| `/` `/practice` | Home | | `/video` | Video |
| `/learn` | Course | | `/article` | Article |
| `/words` `/wikilinkua/` | Words | | `/contribute` | Contribute |
| `/phrases` | Phrases | | `/profile` | Profile |
| `/progress` | Progress | | `/false-friends/` | Friend or Faux |

In-app navigation calls `history.pushState`, and `popstate` drives the view, so links are
shareable and Back works. `/contribute/record` is server-rendered and deliberately absent
from that map.

**Matching is exact, not substring.** `/progress` contains "practice"-like fragments and
`/contribute/record` would be swallowed by a naive `includes()` test. Add new views to
`VIEW_BY_PATH` in `App.jsx` and to `views.py`.

---

## 3. Right-to-left text

The app teaches **Arabic (53,766 lexemes)**, Hebrew, Hindustani/Urdu and Persian. Target
text is frequently RTL while the interface stays LTR.

```jsx
import { langText } from '../utils/text';

<span {...langText}>{word.lemma}</span>     // dir="auto" + .wl-text
```

- **`dir="auto"`** lets the browser decide from the first strong character. Chosen over an
  RTL language allow-list because much of this text is not attributable to a language at
  all — subtitle lines, article extracts, Tatoeba sentences — and a list needs maintenance
  as languages are added.
- **`.wl-text` sets `unicode-bidi: isolate`**, which stops an RTL run from dragging the
  surrounding interface text and punctuation around with it.
- Use `langAttrs(code)` instead when the language really is known: `lang` drives font
  selection, hyphenation and screen-reader pronunciation.

**Rule:** any element rendering a lemma, gloss, sentence or subtitle gets `{...langText}`.
UI chrome (buttons, headings, labels) does not — that is always interface language.

---

## 4. Design tokens

`src/theme.js` is the single definition of the palette. Each token resolves to the Codex CSS
custom property with the Wikimedia value as fallback:

```js
progressive: 'var(--color-progressive, #3366cc)'
```

Anything using these follows a Codex theme change — **including dark mode** — for free.
Anything still using a raw hex does not.

```jsx
import { color, space, card, buttonPrimary } from '../theme';

<div style={{ ...card, marginBottom: space.lg }}>
  <button style={buttonPrimary}>Continue</button>
</div>
```

**Honest status:** only the navigation and app shell use `theme.js` so far. The rest of the
screens still carry ~650 inline styles and ~35 hard-coded hexes. They use the correct
Wikimedia values, so the app *looks* native, but it is hand-styled rather than Codex-driven,
which is why dark mode does not work yet. Migration is a post-freeze task — see §7.

**Rule:** new UI uses `theme.js`. Do not add new hard-coded hexes.

---

## 5. Codex gotchas that already bit us

**`.cdx-card` is `display: flex`.** A card containing a heading, a paragraph and a button
lays them out *in a row*. Roughly fourteen cards were silently broken this way. `index.css`
now defaults `.cdx-card` to `display: block`; cards that want flex set it inline, and an
inline style always wins over the class rule.

**Codex CSS loads before ours.** `main.jsx` imports `codex.style.css` then `index.css`, so
our overrides win on equal specificity. Do not reorder those imports.

---

## 6. Rules for showing numbers

The interface must never invent precision. Enforced conventions:

- **Never derive a statistic from the loaded word list.** It is capped at 15,000 rows, so on
  large languages it is a truncated sample. Percentages come from their own exact `COUNT`
  query. If that query fails, show nothing — *"Overlap figure unavailable right now"* — not
  a guess.
- **Say what a number counts.** "Words with a link: 44%" prints `8,693 of 19,727 mapped
  words` underneath.
- **No invented progress.** Progress shows `Box 4/5`, a real fact about the schedule. It
  used to show "88% learned", which measured nothing.
- **Label non-Wikidata content.** Curated false friends are counted separately and never
  mixed into Wikidata-derived figures.
- **A claim carries its evidence.** Every relationship badge names the property behind it on
  hover, and a shared meaning is never presented as shared ancestry.

---

## 7. Post-freeze UI backlog

1. **Finish the Codex migration.** Replace remaining hexes with `theme.js` tokens; move
   repeated card/button/badge patterns to real Codex components. Unlocks dark mode.
2. **RTL layout, not just text.** Direction-aware spacing (`marginInline` over
   `marginLeft`) — 103 physical properties remain. Text direction is handled; *layout*
   mirroring is not.
3. **Component sizes.** `GameModes.jsx` (608 lines) and `BridgeWordsList.jsx` (489) should
   be split.
4. **Accessibility audit.** Keyboard traversal of quiz options, focus rings, contrast in the
   subtle-background states, `aria-live` on answer feedback.
5. **Loading states.** Several screens show a spinner where a skeleton would be calmer.

---

## 8. Before you ship a UI change

```bash
cd frontend
npm run build
npx vite build --ssr src/__smoke.jsx --outDir ./.smoke && node .smoke/run.mjs
```

The smoke test renders all 26 views with realistic props — including awkward ones (missing
gloss, 60-character lemma, two words with identical glosses). It catches the blank-screen
class of bug, where an undefined variable in JSX throws at render while the build passes.

It renders **initial state only**: no effects, no clicks. It will not catch interaction bugs.
Those still need a real browser.

Then rebuild the committed bundle, because Toolforge does not build the frontend:

```bash
npm run build           # also rewrites wikilinkua/templates/app.html
git add -A wikilinkua/static/dist wikilinkua/templates/app.html
```
