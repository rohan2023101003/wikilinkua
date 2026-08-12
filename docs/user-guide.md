# WikiLinkua User Guide

## What WikiLinkua does

WikiLinkua helps you learn a new language through the languages you already know. It finds words linked to the ones you know - genuine cognates, borrowings, translations and look-alikes, each labelled with which kind of link it actually is - plus sentences, videos and short reading material from Wikidata Lexemes and Wikimedia content.

## First-time setup

1. Open the app.
2. Choose the languages you already know.
3. Choose the language you want to learn.
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
| **Looks or sounds similar** | Only the shape or sound resembles a word you know, with **no** recorded historical link. This may be pure coincidence. | Form and IPA comparison (P898) |

Only the first three claim the words share a history. The others are about
meaning or appearance, and the app labels them that way on purpose - a word for
"animal" that happens to point at the same concept as an English word is a
translation, not a cognate.

## Core terms

- Bridge word: a target-language word with any of the links above to a language you know.
- Gloss: the short meaning label shown for a word.
- Leitner box: the spaced-repetition level used to schedule the next review.
- New word / unseen word: a word you have not answered yet.
- Learning word: a word you have started practicing but have not mastered yet.
- Known word: a word that has reached the mastery threshold in the Leitner system.
- Due for review: a word whose review time has arrived or passed.

## Practice mode glossary

- Bridge flashcards: quick front/back review of bridge words.
- Friend or Faux: classify lookalike pairs as true friend vs false friend.
- Recall and reverse recall: train both directions of memory (word -> meaning and meaning -> word).
- Odd one out: three words that share a recorded history with words you know, plus one that does not - you get one guess, then see the answer.
- Match pairs: a fast recall drill.
- Phrases: sentence practice that uses your known/learning vocabulary and spaced repetition.
- Video and article mode: real-world input from Wikimedia Commons and Wikipedia, converted into vocabulary drills.

## Main screens

### Home

The home screen is the control center. It shows your main lesson, the practice modes, and your overall vocabulary progress.

### Words

Use Words to browse the vocabulary list, search it, and filter it by link type: cognates, borrowings, same-meaning words, look-alikes and false friends. A counter at the top shows how many words fall into each, so you can see at a glance how much of the overlap is real shared history versus just shared meaning.

### Phrases

Use Phrases to practice sentences that contain words you already know. The app tries to show a human translation first, then falls back to Wikimedia MinT if needed.

### Progress

Use Progress to see how many words are new, learning, known, or due for review.

### Video

Use Video to browse Wikimedia Commons videos and turn subtitle-covered videos into flashcards.

### Article

Use Article to search Wikipedia articles in your target language and turn article text into flashcards.

### Contribute

Use Contribute to record pronunciations and upload them to Wikimedia Commons when your login has the needed upload permission.

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
