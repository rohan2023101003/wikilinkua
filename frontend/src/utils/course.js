/**
 * The course: turns a flat pile of words into an ordered path of small units.
 *
 * The app used to present eight independent modes and leave the learner to
 * decide what to do. That is a toolbox, not a course. This module answers the
 * only question a learner actually has - *what should I do next?* - and keeps
 * answering it until they finish.
 *
 * Ordering combines two signals, in this priority:
 *
 *   1. **Head start.** Words that genuinely connect to a language you already
 *      know (cognates, borrowings) come first, because "you already know this"
 *      is the one thing WikiLinkua can offer that other apps cannot.
 *   2. **How basic the word is.** Measured by how many of the world's languages
 *      have a word for the same concept (see fetchConceptCommonness). Water,
 *      mother and house sort above obscure technical terms.
 *
 * Words with audio are nudged earlier, because a unit you can listen to teaches
 * more than one you can only read.
 */

import { REL, relationMeta } from './relations';
import { isWordDue } from './srs';
import { normaliseWord } from './sparql';

export const WORDS_PER_UNIT = 8;
export const MAX_UNITS = 40;

/** A word is teachable only if we can show a meaning for it. */
function isTeachable(word) {
  return !!(word && word.lemma && (word.gloss || word.knownLemma));
}

/**
 * Sort key. Lower sorts earlier.
 *
 * The two signals are deliberately kept in separate bands rather than blended
 * into one opaque score: every etymologically linked word comes before the rest,
 * and within each band the more basic vocabulary comes first.
 */
function orderScore(word) {
  const etymological = (word.relations || [])
    .some(r => relationMeta(r.type).etymological);
  const band = etymological ? 0 : 1;

  // commonness is "languages that have a word for this concept": higher = more
  // basic. Invert it so that common words sort first.
  const commonness = word.commonness || 0;
  const audioBonus = word.audioUrl ? 5 : 0;

  return band * 100000 - (commonness + audioBonus);
}

/** Why this word is in the course, in a few words - shown on the unit card. */
export function wordHeadline(word) {
  const etym = (word.relations || []).find(r => relationMeta(r.type).etymological);
  if (etym) return relationMeta(etym.type).short;
  if (word.falseFriend) return relationMeta(REL.FALSE_FRIEND).short;
  if (word.commonness >= 40) return 'Very common';
  if (word.commonness > 0) return 'Common';
  return '';
}

/**
 * Build the ordered units.
 *
 * Deterministic: no shuffling, so the path does not rearrange itself under the
 * learner between visits.
 */
export function buildCourse(words) {
  const teachable = (words || []).filter(isTeachable);
  const ordered = [...teachable].sort((a, b) => {
    const d = orderScore(a) - orderScore(b);
    if (d !== 0) return d;
    return a.lexemeId.localeCompare(b.lexemeId);   // stable tie-break
  });

  const units = [];
  for (let i = 0; i < ordered.length && units.length < MAX_UNITS; i += WORDS_PER_UNIT) {
    const slice = ordered.slice(i, i + WORDS_PER_UNIT);
    if (slice.length < Math.min(WORDS_PER_UNIT, 4)) break;   // don't end on a stub
    units.push({
      index: units.length,
      number: units.length + 1,
      words: slice,
      // A unit leads with whatever is most notable about its words.
      theme: slice.some(w => w.cognate || w.borrowed)
        ? 'Words you half-know already'
        : 'Core vocabulary',
    });
  }
  return units;
}

// ------------------------------------------------------------------ progress

/** Per-unit state derived from the learner's SRS progress. */
export function unitStatus(unit, progress) {
  const words = progress?.words || {};
  let started = 0;
  let learned = 0;
  unit.words.forEach(w => {
    const p = words[w.lexemeId];
    if (!p) return;
    started += 1;
    if ((p.boxLevel || 0) >= 2) learned += 1;
  });
  const total = unit.words.length;
  return {
    started,
    learned,
    total,
    // "Complete" means every word has been answered right at least twice, not
    // merely seen once.
    complete: learned >= total,
    inProgress: started > 0 && learned < total,
    percent: total ? Math.round((learned / total) * 100) : 0,
  };
}

/**
 * Units unlock in order: the next one opens when the previous is complete. This
 * is what makes it feel like a path rather than a menu - but nothing is ever
 * hidden, a locked unit can still be previewed.
 */
export function courseState(units, progress) {
  const statuses = units.map(u => unitStatus(u, progress));
  let firstIncomplete = statuses.findIndex(s => !s.complete);
  if (firstIncomplete === -1) firstIncomplete = units.length;

  return {
    statuses,
    currentIndex: Math.min(firstIncomplete, Math.max(0, units.length - 1)),
    completedUnits: statuses.filter(s => s.complete).length,
    totalUnits: units.length,
    wordsLearned: statuses.reduce((n, s) => n + s.learned, 0),
    wordsTotal: statuses.reduce((n, s) => n + s.total, 0),
    finished: units.length > 0 && firstIncomplete >= units.length,
  };
}

/** Is a unit open to the learner? */
export function isUnlocked(index, state) {
  return index <= state.currentIndex;
}

/**
 * What the learner should do right now. The home screen has exactly one primary
 * button and this decides what it says and does.
 */
export function nextAction(units, progress) {
  const words = progress?.words || {};

  // Reviews first: spaced repetition only works if due words come back.
  const due = [];
  units.forEach(u => u.words.forEach(w => {
    const p = words[w.lexemeId];
    if (p && isWordDue(p)) due.push(w);
  }));
  if (due.length >= 5) {
    return { kind: 'review', dueCount: due.length, words: due.slice(0, 10),
             label: 'Review ' + Math.min(due.length, 10) + ' words',
             why: due.length + ' words are due - reviewing them is what makes them stick.' };
  }

  const state = courseState(units, progress);
  if (state.finished) {
    return { kind: 'done', label: 'Practice freely',
             why: 'You have finished every unit we can build from the available data.' };
  }

  const unit = units[state.currentIndex];
  if (!unit) {
    return { kind: 'empty', label: 'Choose languages',
             why: 'There is not enough data for this language pair yet.' };
  }

  const status = state.statuses[state.currentIndex];
  return {
    kind: status.started ? 'continue' : 'start',
    unit,
    unitIndex: state.currentIndex,
    label: (status.started ? 'Continue unit ' : 'Start unit ') + unit.number,
    why: status.started
      ? status.learned + ' of ' + status.total + ' words learned in this unit.'
      : unit.theme + ' - ' + unit.words.length + ' new words.',
    dueCount: due.length,
  };
}

// --------------------------------------------------------------- lesson steps

/**
 * The stages inside a unit. A word is met four different ways rather than
 * drilled once, which is what turns recognition into recall.
 */
export const LESSON_STAGES = [
  { id: 'flashcard',      title: 'Meet the words',   hint: 'See each word and its meaning.' },
  { id: 'listen',         title: 'Hear them',        hint: 'Recognise the word by ear.' },
  { id: 'recall',         title: 'Word to meaning',  hint: 'Can you remember what it means?' },
  { id: 'reverse-recall', title: 'Meaning to word',  hint: 'Now the other direction.' },
  { id: 'friend-or-faux', title: 'Spot the traps',   hint: 'True friend or false friend?' },
  { id: 'sentence',       title: 'Use it',           hint: 'See the words in a real sentence.' },
];

/**
 * What a unit actually contains, for the unit card. Being explicit matters: a
 * unit with audio and a sentence is a different proposition from eight bare
 * flashcards, and the learner should be able to see which they are getting.
 */
export function unitContents(unit) {
  const withAudio = unit.words.filter(w => w.audioUrl).length;
  const traps = unit.words.filter(w => w.falseFriend && w.knownLemma).length;
  return {
    words: unit.words.length,
    withAudio,
    traps,
    // A sentence step is always attempted; whether one exists is only known once
    // Tatoeba/P5831 answer, so this is a promise of an attempt, not of content.
    hasSentence: true,
  };
}

/**
 * Build the ordered exercise queue for one unit: every word is introduced first,
 * then tested, so nothing is asked before it has been shown.
 */
export function buildLessonQueue(unit, progress) {
  const words = unit.words;
  const seen = (w) => !!(progress?.words || {})[w.lexemeId];

  const queue = [];
  // 1. Introduce anything not met before - never test a word before showing it.
  words.filter(w => !seen(w)).forEach(w => queue.push({ type: 'flashcard', word: w }));

  // 2. Hear it. Reading a word and recognising it by ear are different skills,
  //    and this is the only step that trains the second. Only for words that
  //    actually have a recording.
  words.filter(w => w.audioUrl).forEach(w => queue.push({ type: 'listen', word: w }));

  // 3/4. Test both directions for every word.
  words.forEach(w => queue.push({ type: 'recall', word: w }));
  words.forEach(w => queue.push({ type: 'reverse-recall', word: w }));

  // 5. Only words carrying a false-friend warning are worth trapping.
  words.filter(w => w.falseFriend && w.knownLemma)
       .forEach(w => queue.push({ type: 'friend-or-faux', word: w }));

  // 6. Finish on real language: a sentence that uses one of these words. This is
  //    the step that makes a unit a lesson rather than a flashcard deck.
  queue.push({ type: 'sentence', word: words[0], unitWords: words });

  return queue;
}

/**
 * Find the vocabulary of a piece of real text.
 *
 * Matching text against LEMMAS alone barely works outside isolating languages: an
 * article writes വിരുന്നുകാരന്റെ where the lemma is വിരുന്നുകാരൻ. `formIndex` maps
 * every recorded surface form of every lexeme back to its id, so inflected words
 * are found too. Falls back to lemma matching when the index is unavailable.
 */
export function matchWordsInText(text, words, formIndex, limit = 20) {
  const tokens = (text || '').match(/[\p{L}\p{M}]+/gu) || [];
  const byId = new Map(words.map(w => [w.lexemeId, w]));

  const lemmaIndex = new Map();
  words.forEach(w => {
    const key = normaliseWord(w.lemma);
    if (key && !lemmaIndex.has(key)) lemmaIndex.set(key, w.lexemeId);
  });

  const found = new Map();
  for (const token of tokens) {
    const key = normaliseWord(token);
    if (!key || key.length < 2) continue;
    const id = (formIndex && formIndex.get(key)) || lemmaIndex.get(key);
    if (!id || found.has(id)) continue;
    const word = byId.get(id);
    if (word && word.gloss) found.set(id, { ...word, seenAs: token });
    if (found.size >= limit) break;
  }
  return Array.from(found.values());
}
