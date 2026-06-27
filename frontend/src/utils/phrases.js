/**
 * Phrases / sentences feature.
 *
 * Sources:
 *   - Tatoeba (via our /api/phrases backend proxy): target-language sentences that
 *     contain a learned word, with a human translation in a known language + audio.
 *   - Wikidata P5831 "usage example" (via WDQS, direct): native example sentences,
 *     used for the cold-start fallback (no learned words yet).
 *
 * Plus: i+1 ranking (prefer sentences the learner almost fully knows),
 *       browser TTS for pronunciation, and a small phrase-level SRS for repetition.
 */

import { SPARQL_ENDPOINT_URL } from './sparql';

// ---- normalization / tokenization (accent-insensitive) ----
function norm(s) {
  return (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
}
function tokenize(text) {
  return norm(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

// ---- pronunciation: browser text-to-speech fallback ----
export function ttsSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}
export function speakPhrase(text, langCode) {
  if (!ttsSupported()) return false;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = langCode;
  const voices = window.speechSynthesis.getVoices();
  const v = voices.find(voice => voice.lang && voice.lang.toLowerCase().startsWith(langCode.toLowerCase()));
  if (v) u.voice = v;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
  return true;
}

// ---- Tatoeba: sentences containing learned words ----
export async function fetchTatoebaPhrases(targetCode, knownCodes, lemmas, maxWords = 6) {
  const picked = lemmas.slice(0, maxWords);
  const all = [];
  const seen = new Set();
  for (const lemma of picked) {
    try {
      const url = `/api/phrases?target=${encodeURIComponent(targetCode)}`
        + `&known=${encodeURIComponent(knownCodes.join(','))}`
        + `&word=${encodeURIComponent(lemma)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.ok) {
        for (const p of data.phrases) {
          if (seen.has(p.id)) continue;
          seen.add(p.id);
          all.push({ ...p, matchedWord: lemma });
        }
      }
    } catch {
      // ignore per-word failures; other words may still return results
    }
  }
  return all;
}

// ---- Wikimedia MinT machine translation (fallback when no human translation) ----
export async function machineTranslate(fromCode, toCode, text) {
  try {
    const url = `/api/translate?from=${encodeURIComponent(fromCode)}`
      + `&to=${encodeURIComponent(toCode)}&text=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.ok ? data.text : null;
  } catch {
    return null;
  }
}

// ---- Wikidata P5831: native example sentences (cold-start fallback) ----
export async function fetchP5831Phrases(targetQid, targetCode, limit = 25) {
  const sparql = `
    SELECT ?lemma ?ex WHERE {
      ?lex dct:language wd:${targetQid} ;
           wikibase:lemma ?lemma ;
           wdt:P5831 ?ex .
      FILTER(LANG(?ex) = "${targetCode}")
    } LIMIT ${limit}
  `;
  const url = SPARQL_ENDPOINT_URL + '?query=' + encodeURIComponent(sparql);
  const res = await fetch(url, { headers: { Accept: 'application/sparql-results+json' } });
  const data = await res.json();
  return (data.results?.bindings || []).map((b, i) => ({
    id: 'p5831-' + i + '-' + (b.lemma?.value || ''),
    text: b.ex.value,
    lang: targetCode,
    audio: null,
    translation: null,
    matchedWord: b.lemma?.value || '',
  }));
}

// ---- i+1 ranking ----
export function rankPhrases(phrases, knownLemmas) {
  const known = new Set([...knownLemmas].map(norm));
  return phrases
    .map(p => {
      const toks = tokenize(p.text);
      const total = toks.length || 1;
      const unknown = toks.filter(w => !known.has(w)).length;
      return { ...p, _total: total, _unknown: unknown, _knownRatio: (total - unknown) / total };
    })
    .sort((a, b) => {
      // translated first, then fewest unknown words (i+1), then shorter
      if (!!b.translation !== !!a.translation) return b.translation ? 1 : -1;
      if (a._unknown !== b._unknown) return a._unknown - b._unknown;
      return a._total - b._total;
    });
}

// Highlight occurrences of `word` in `text` -> array of {text, hit} segments.
export function highlightSegments(text, word) {
  if (!word) return [{ text, hit: false }];
  const nWord = norm(word);
  const segs = [];
  const re = /[\p{L}\p{N}]+|[^\p{L}\p{N}]+/gu;
  let m;
  while ((m = re.exec(text)) !== null) {
    const chunk = m[0];
    segs.push({ text: chunk, hit: norm(chunk) === nWord });
  }
  return segs;
}

// ---- phrase-level SRS (repetition for memory) ----
const PHRASE_KEY = 'wikilinkua_phrases';
const BOX_DAYS = [0, 1, 3, 7, 14, 30];

function loadStore() {
  try { return JSON.parse(localStorage.getItem(PHRASE_KEY)) || {}; }
  catch { return {}; }
}
function saveStore(s) { localStorage.setItem(PHRASE_KEY, JSON.stringify(s)); }

export function gradePhrase(phrase, correct) {
  const store = loadStore();
  const cur = store[phrase.id] || { boxLevel: 0 };
  const box = correct ? Math.min(5, cur.boxLevel + 1) : Math.max(0, cur.boxLevel - 1);
  store[phrase.id] = {
    boxLevel: box,
    dueDate: Date.now() + BOX_DAYS[box] * 86400000,
    phrase: {
      id: phrase.id, text: phrase.text, lang: phrase.lang,
      audio: phrase.audio, translation: phrase.translation, matchedWord: phrase.matchedWord,
    },
  };
  saveStore(store);
}

export function getDuePhrases() {
  const store = loadStore();
  const now = Date.now();
  return Object.values(store)
    .filter(e => e.phrase && e.dueDate <= now)
    .map(e => e.phrase);
}
