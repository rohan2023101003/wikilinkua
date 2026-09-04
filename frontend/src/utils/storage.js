/**
 * Learner state in localStorage.
 *
 * Everything is stored per **language pair** ("deck"), never globally. Switching
 * English→French to English→Malayalam gives you a fresh 0% Malayalam deck;
 * switching back restores the French deck exactly as you left it.
 *
 *   wikilinkua_state_v2 = {
 *     version: 2,
 *     activeProfile: { knownLangs: ['Q1860'], targetLang: 'Q150' },
 *     decks: {
 *       'Q1860>Q150': {
 *         profile:   { knownLangs, targetLang },
 *         words:     { [lexemeId]: { boxLevel, dueDate, status } },   // word SRS
 *         phrases:   { [phraseId]: { boxLevel, dueDate, phrase } },   // phrase SRS
 *         createdAt, updatedAt
 *       }
 *     }
 *   }
 *
 * Legacy `wikilinkua_progress` / `wikilinkua_phrases` are migrated into the
 * active deck on first read, then removed.
 */

const STATE_KEY = 'wikilinkua_state_v2';
const LEGACY_PROGRESS_KEY = 'wikilinkua_progress';
const LEGACY_PHRASE_KEY = 'wikilinkua_phrases';

/** Stable id for a language pair: known languages (sorted) → target. */
export function profileKey(profile) {
  if (!profile || !profile.targetLang) return null;
  const known = profile.knownLangs || [];
  if (!known.length) return null;
  return [...known].sort().join('+') + '>' + profile.targetLang;
}

function emptyState() {
  return { version: 2, activeProfile: null, decks: {} };
}

function emptyDeck(profile) {
  const now = Date.now();
  return { profile, words: {}, phrases: {}, createdAt: now, updatedAt: now };
}

function isValidProfile(p) {
  return !!(p && Array.isArray(p.knownLangs) && p.knownLangs.length && p.targetLang);
}

// ---------------------------------------------------------------- read/write

function readRaw() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.decks) return null;
    return parsed;
  } catch {
    return null;                       // corrupt state: fall back to a fresh one
  }
}

function writeRaw(state) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
    return true;
  } catch {
    // Quota exceeded: drop the least recently used inactive deck and retry.
    const activeKey = profileKey(state.activeProfile);
    const stale = Object.keys(state.decks)
      .filter(k => k !== activeKey)
      .sort((a, b) => (state.decks[a].updatedAt || 0) - (state.decks[b].updatedAt || 0));
    if (!stale.length) return false;
    delete state.decks[stale[0]];
    return writeRaw(state);
  }
}

/** Migrate the pre-v2 single-deck format, if present. */
function migrateLegacy() {
  let legacy = null;
  try {
    legacy = JSON.parse(localStorage.getItem(LEGACY_PROGRESS_KEY) || 'null');
  } catch {
    legacy = null;
  }
  if (!legacy || !isValidProfile(legacy.profile)) return null;

  const state = emptyState();
  const key = profileKey(legacy.profile);
  const deck = emptyDeck(legacy.profile);
  deck.words = legacy.words || {};
  try {
    deck.phrases = JSON.parse(localStorage.getItem(LEGACY_PHRASE_KEY) || '{}') || {};
  } catch {
    deck.phrases = {};
  }
  state.decks[key] = deck;
  state.activeProfile = legacy.profile;

  if (writeRaw(state)) {
    try {
      localStorage.removeItem(LEGACY_PROGRESS_KEY);
      localStorage.removeItem(LEGACY_PHRASE_KEY);
    } catch { /* ignore */ }
  }
  return state;
}

/** The whole state, migrating older formats on the way. */
export function loadState() {
  return readRaw() || migrateLegacy() || emptyState();
}

// ------------------------------------------------------------------- profile

export function getActiveProfile() {
  const p = loadState().activeProfile;
  return isValidProfile(p) ? p : null;
}

/**
 * Make `profile` the active one, creating its deck if this pair is new.
 * Returns that pair's deck, so the caller can load the right progress.
 */
export function setActiveProfile(profile) {
  if (!isValidProfile(profile)) return emptyDeck(profile);
  const state = loadState();
  const key = profileKey(profile);
  if (!state.decks[key]) state.decks[key] = emptyDeck(profile);
  state.decks[key].profile = profile;          // keep the stored copy canonical
  state.activeProfile = profile;
  writeRaw(state);
  return state.decks[key];
}

// ---------------------------------------------------------------------- deck

/** The deck for a pair. Always returns an object, never null. */
export function getDeck(profile) {
  const key = profileKey(profile);
  if (!key) return emptyDeck(profile);
  const deck = loadState().decks[key];
  return deck ? { words: {}, phrases: {}, ...deck } : emptyDeck(profile);
}

function updateDeck(profile, mutate) {
  const key = profileKey(profile);
  if (!key) return null;
  const state = loadState();
  if (!state.decks[key]) state.decks[key] = emptyDeck(profile);
  mutate(state.decks[key]);
  state.decks[key].updatedAt = Date.now();
  writeRaw(state);
  return state.decks[key];
}

/** Persist the word-SRS map for a pair. */
export function saveWordProgress(profile, words) {
  updateDeck(profile, deck => { deck.words = words || {}; });
}

/** Persist the phrase-SRS map for a pair. */
export function savePhraseProgress(profile, phrases) {
  updateDeck(profile, deck => { deck.phrases = phrases || {}; });
}

/** Wipe one pair's progress (keeps the deck so it stays listed). */
export function resetDeck(profile) {
  updateDeck(profile, deck => { deck.words = {}; deck.phrases = {}; });
}

/** All decks, most recently used first - for "your language pairs" UI. */
export function listDecks() {
  const state = loadState();
  return Object.entries(state.decks)
    .map(([key, deck]) => ({
      key,
      profile: deck.profile,
      wordCount: Object.keys(deck.words || {}).length,
      updatedAt: deck.updatedAt || 0,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

// ------------------------------------------------------------------- streaks

const dayKey = (ts = Date.now()) => new Date(ts).toISOString().slice(0, 10);

/**
 * Daily activity for a language pair: how many words were answered today, and
 * how many days in a row the learner has shown up.
 *
 * Deliberately per-pair, like everything else - practising French should not
 * silently keep a Malayalam streak alive.
 */
export function getActivity(profile) {
  const deck = getDeck(profile);
  const a = deck.activity || {};
  const today = dayKey();
  const answeredToday = a.day === today ? (a.count || 0) : 0;

  // The streak survives today and yesterday; any longer gap resets it.
  let streak = a.streak || 0;
  if (a.day && a.day !== today) {
    const yesterday = dayKey(Date.now() - 86400000);
    if (a.day !== yesterday) streak = 0;
  }
  return { answeredToday, streak, goal: a.goal || 10, lastDay: a.day || null };
}

/** Record one answered word; rolls the streak over at the day boundary. */
export function recordActivity(profile) {
  const key = profileKey(profile);
  if (!key) return getActivity(profile);

  const state = loadState();
  if (!state.decks[key]) state.decks[key] = emptyDeck(profile);
  const deck = state.decks[key];
  const a = deck.activity || {};
  const today = dayKey();

  if (a.day === today) {
    a.count = (a.count || 0) + 1;
  } else {
    const yesterday = dayKey(Date.now() - 86400000);
    a.streak = a.day === yesterday ? (a.streak || 0) + 1 : 1;
    a.day = today;
    a.count = 1;
  }
  deck.activity = a;
  deck.updatedAt = Date.now();
  writeRaw(state);
  return getActivity(profile);
}

/** Change the daily goal (words per day). */
export function setDailyGoal(profile, goal) {
  updateDeck(profile, deck => {
    deck.activity = { ...(deck.activity || {}), goal: Math.max(1, goal | 0) };
  });
}

/** How many words are already tracked for a pair (used by the profile screen). */
export function deckWordCount(profile) {
  return Object.keys(getDeck(profile).words || {}).length;
}
