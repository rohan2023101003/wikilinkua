import { FF_CURATED } from './curatedPairs';
import { REL, buildRelations, primaryRelation } from './relations';

export const SPARQL_ENDPOINT_URL = "https://query.wikidata.org/sparql";

import { ALL_LANGUAGES } from './languageData';

/**
 * Every language that actually has lexemes on Wikidata (generated - see
 * scripts/gen-languages.md). Each entry carries its lexeme count so the picker
 * can tell the learner where there is enough data to work with.
 */
/**
 * Wikidata's own label is not always what a learner will type. Hindi and Urdu
 * speakers look for "Hindi"/"Urdu", but the lexemes live under "Hindustani";
 * Norwegians look for "Norwegian", but the data is under "Bokmål". These
 * overrides keep the picker findable without editing the generated file.
 */
const LANGUAGE_DISPLAY = {
  Q11051: { name: 'Hindustani (Hindi / Urdu)', aliases: ['hindi', 'urdu', 'hindustani'] },
  Q25167: { name: 'Norwegian Bokmål',          aliases: ['norwegian', 'bokmal', 'bokmål', 'norsk'] },
  Q25164: { name: 'Norwegian Nynorsk',         aliases: ['norwegian', 'nynorsk', 'norsk'] },
  Q36510: { name: 'Greek (modern)',            aliases: ['greek'] },
  Q9168:  { name: 'Persian (Farsi)',           aliases: ['persian', 'farsi'] },
  Q9288:  { name: 'Hebrew',                    aliases: ['hebrew', 'ivrit'] },
  Q9610:  { name: 'Bengali (Bangla)',          aliases: ['bengali', 'bangla'] },
};

export const LANGUAGES = ALL_LANGUAGES.map(l => {
  const override = LANGUAGE_DISPLAY[l.qid];
  return override ? { ...l, name: override.name, aliases: override.aliases } : l;
});

// Index maps: LANGUAGES is ~1.5k entries and the word pipeline looks languages
// up per row, so a linear .find() there would be O(words x languages).
export const LANG_BY_QID = new Map(LANGUAGES.map(l => [l.qid, l]));
export const LANG_BY_CODE = new Map();
LANGUAGES.forEach(l => { if (l.code && !LANG_BY_CODE.has(l.code)) LANG_BY_CODE.set(l.code, l); });

/** Enough data to be worth offering as a learning language. */
export const MIN_USEFUL_LEXEMES = 50;

/** Look up a language, transparently remapping retired/empty QIDs. */
export function getLanguage(qid) {
  if (!qid) return null;
  return LANG_BY_QID.get(qid) || LANG_BY_QID.get(resolveLangQid(qid)) || null;
}


// Wikidata stores no lexemes at all under Hindi (Q1568), Urdu (Q1617) or the
// umbrella Norwegian (Q9043) - the actual lexical data lives under Hindustani
// and Bokmål. Old saved profiles are remapped so they keep working.
export const LANGUAGE_ALIASES = {
  Q1568: 'Q11051',   // Hindi     -> Hindustani
  Q1617: 'Q11051',   // Urdu      -> Hindustani
  Q9043: 'Q25167',   // Norwegian -> Norwegian (Bokmål)
};

export const resolveLangQid = (qid) => LANGUAGE_ALIASES[qid] || qid;

const WL_MAX_BRIDGES = 15000;

// Levenshtein helper
function levenshteinDistance(a, b) {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length, n = b.length;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

// Accent stripping for lemma comparison
export function getLemmaSimilarity(a, b) {
  if (!a || !b) return null;
  const sa = a.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const sb = b.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  if (!sa || !sb) return null;
  const d = levenshteinDistance(sa, sb);
  const m = Math.max(sa.length, sb.length);
  return m === 0 ? null : 1 - d / m;
}

// IPA stripping and similarity
export function stripIpa(s) {
  if (!s) return '';
  return s.replace(/[\/\[\]ˈˌːˑ̝̞̟̠̤̃͜͡]/g, '')
          .replace(/\s+/g, '')
          .toLowerCase();
}

export function getIpaSimilarity(a, b) {
  const sa = stripIpa(a);
  const sb = stripIpa(b);
  if (!sa || !sb) return null;
  const d = levenshteinDistance(sa, sb);
  const m = Math.max(sa.length, sb.length);
  return m === 0 ? null : 1 - d / m;
}

// Fetch helper. WDQS can hang or 502 on heavy queries, so every request carries
// its own deadline instead of leaving the app spinning forever.
const SPARQL_TIMEOUT_MS = 45000;

export async function runSparqlQuery(sparql, timeoutMs = SPARQL_TIMEOUT_MS) {
  const url = SPARQL_ENDPOINT_URL + '?query=' + encodeURIComponent(sparql);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/sparql-results+json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error('SPARQL Query failed: ' + response.statusText);
    }
    return await response.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('SPARQL query timed out after ' + Math.round(timeoutMs / 1000) + 's');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

const bindings = (data) => (data && data.results && data.results.bindings) || [];
const lexId = (uri) => (uri || '').split('/').pop();

// Total mapped target lexemes count query
export async function fetchTotalTargetMapped(targetLangQid) {
  const sparql = `
    SELECT (COUNT(DISTINCT ?lex) AS ?n) WHERE {
      ?lex dct:language wd:${targetLangQid} ;
           ontolex:sense / wdt:P5137 [] .
    }
  `;
  const data = await runSparqlQuery(sparql);
  const rows = data.results.bindings;
  if (!rows.length) return 0;
  return parseInt(rows[0].n.value, 10) || 0;
}

// Bridge words SPARQL query
export async function fetchBridgeWordsRaw(knownLangs, targetLangQid) {
  const knownQids = knownLangs.map(l => l.qid);
  const knownCodes = knownLangs.map(l => l.code);
  const knownValues = knownQids.map(q => 'wd:' + q).join(' ');
  const knownLemmaLangFilter = knownCodes
    .map(c => 'LANG(?knownLemma_) = "' + c + '"')
    .join(' || ');

  const labelLangs = [...knownCodes, 'en'].join(',');

  const sparql = `
    SELECT
      ?targetLex
      (SAMPLE(?targetLemma_) AS ?targetLemma)
      (SAMPLE(?targetIpa_)   AS ?targetIpa)
      (SAMPLE(?targetAudio_) AS ?targetAudio)
      ?concept
      (SAMPLE(?conceptLabel_) AS ?conceptLabel)
      (GROUP_CONCAT(DISTINCT CONCAT(STR(?knownLex), "|", ?knownLemma_, "|", ?knownLangCode, "|", COALESCE(?knownIpa_, "")); separator="‖") AS ?knownPairs)
    WHERE {
      ?targetLex dct:language wd:${targetLangQid} ;
                 ontolex:sense ?targetSense ;
                 wikibase:lemma ?targetLemma_ .
      ?targetSense wdt:P5137 ?concept .

      OPTIONAL {
        ?targetLex ontolex:lexicalForm ?tForm .
        ?tForm ontolex:representation ?targetLemma_ .
        ?tForm wdt:P898 ?targetIpa_ .
      }
      OPTIONAL {
        ?targetLex ontolex:lexicalForm ?tFormA .
        ?tFormA ontolex:representation ?targetLemma_ .
        ?tFormA wdt:P443 ?targetAudio_ .
      }

      OPTIONAL {
        ?knownLex dct:language ?knownLang ;
                  ontolex:sense ?knownSense ;
                  wikibase:lemma ?knownLemma_ .
        ?knownSense wdt:P5137 ?concept .
        VALUES ?knownLang { ${knownValues} }
        BIND(LANG(?knownLemma_) AS ?knownLangCode)
        FILTER(${knownLemmaLangFilter})

        OPTIONAL {
          ?knownLex ontolex:lexicalForm ?kForm .
          ?kForm wdt:P898 ?knownIpa_ .
        }
      }
      SERVICE wikibase:label {
        bd:serviceParam wikibase:language "${labelLangs}" .
        ?concept rdfs:label ?conceptLabel_ .
      }
    }
    GROUP BY ?targetLex ?concept
    LIMIT ${WL_MAX_BRIDGES}
  `;

  return runSparqlQuery(sparql);
}

/**
 * Exact number of target lexemes that share a concept with a known language.
 *
 * This CANNOT be derived by counting the loaded word list: that list is capped at
 * WL_MAX_BRIDGES rows, so for languages such as English (32.5k lexeme-concept
 * pairs) or French (21.1k) it is a truncated, arbitrarily ordered sample.
 * Dividing a truncated numerator by a full denominator understates the overlap.
 */
export async function fetchBridgeCount(knownLangs, targetLangQid) {
  const knownValues = (knownLangs || []).map(l => 'wd:' + l.qid).join(' ');
  if (!knownValues) return null;
  const sparql = `
    SELECT (COUNT(DISTINCT ?t) AS ?n) WHERE {
      ?t dct:language wd:${targetLangQid} ;
         ontolex:sense/wdt:P5137 ?c .
      ?k dct:language ?kl ;
         ontolex:sense/wdt:P5137 ?c .
      VALUES ?kl { ${knownValues} }
    }
  `;
  const data = await runSparqlQuery(sparql, 40000);
  const rows = bindings(data);
  return rows.length ? parseInt(rows[0].n.value, 10) || 0 : null;
}

const FORMS_LIMIT = 40000;
const COMMONNESS_LIMIT = 1200;

/**
 * Every written form of every learner-ready lexeme in a language.
 *
 * Needed because real text contains inflected words: a Malayalam article says
 * വിരുന്നുകാരന്റെ, while the lexeme's lemma is വിരുന്നുകാരൻ. Matching article and
 * subtitle text against lemmas alone misses nearly everything in an inflected
 * language, which is why Article and Video modes used to find so few words.
 */
export async function fetchLexemeForms(targetLangQid) {
  const sparql = `
    SELECT ?lex ?rep WHERE {
      ?lex dct:language wd:${targetLangQid} ;
           ontolex:sense/wdt:P5137 [] ;
           ontolex:lexicalForm/ontolex:representation ?rep .
    }
    LIMIT ${FORMS_LIMIT}
  `;
  return runSparqlQuery(sparql, 40000);
}

/** normalised surface form -> lexemeId, from a fetchLexemeForms result. */
export function buildFormIndex(data) {
  const index = new Map();
  bindings(data).forEach(row => {
    const id = lexId(row.lex && row.lex.value);
    const rep = row.rep && row.rep.value;
    if (!id || !rep) return;
    const key = normaliseWord(rep);
    if (key && !index.has(key)) index.set(key, id);
  });
  return index;
}

/** Lowercase + strip combining marks, so text and forms compare fairly. */
export function normaliseWord(text) {
  return (text || '').toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\u0900-\u0DFF]/gu, '');
}

/**
 * How basic a concept is, measured as **how many of the world's languages have a
 * word for it**. Water, milk, mother, eye and house come top; obscure concepts
 * come last. This is our stand-in for a frequency list: it is Wikimedia-native,
 * needs no external corpus, and works for every language at once.
 *
 * It is NOT corpus frequency, and the UI must not call it that - it measures how
 * widely a concept is lexicalised, which correlates well with "basic vocabulary".
 *
 * Only the top slice is fetched: the ungrouped aggregate times out on WDQS, and a
 * curriculum only needs the common end anyway.
 */
export async function fetchConceptCommonness(targetLangQid, limit = COMMONNESS_LIMIT) {
  const sparql = `
    SELECT ?concept (COUNT(DISTINCT ?lang) AS ?langs) WHERE {
      ?t dct:language wd:${targetLangQid} ;
         ontolex:sense/wdt:P5137 ?concept .
      ?other ontolex:sense/wdt:P5137 ?concept ;
             dct:language ?lang .
    }
    GROUP BY ?concept
    ORDER BY DESC(?langs)
    LIMIT ${limit}
  `;
  const data = await runSparqlQuery(sparql, 45000);
  const map = new Map();
  bindings(data).forEach(row => {
    const id = lexId(row.concept && row.concept.value);
    if (id) map.set(id, parseInt(row.langs.value, 10) || 0);
  });
  return map;
}

const DERIVATION_LIMIT = 20000;

/**
 * Derivation ancestry for one language: every lexeme that has P5191 "derived
 * from lexeme", plus up to three levels of ancestors.
 *
 * Deliberately ONE language per query. Asking for the target and the known
 * languages together (a UNION) took ~19s on WDQS and the fully server-side
 * transitive join (`wdt:P5191+` on both sides) 502s outright; per-language
 * queries run in ~4-6s and can go out in parallel.
 *
 * Three hops matter: chains like Punjabi -> Prakrit -> Sanskrit are common, so a
 * one-hop comparison would miss cognates whenever the two languages sit at
 * different distances from the shared root.
 */
export async function fetchDerivationEdges(langQid) {
  const sparql = `
    SELECT ?lex ?anc1 ?anc2 ?anc3 WHERE {
      ?lex dct:language wd:${langQid} ;
           wdt:P5191 ?anc1 .
      OPTIONAL {
        ?anc1 wdt:P5191 ?anc2 .
        OPTIONAL { ?anc2 wdt:P5191 ?anc3 . }
      }
    }
    LIMIT ${DERIVATION_LIMIT}
  `;
  return runSparqlQuery(sparql);
}

/** lexemeId -> Set(ancestor lexeme ids), from a fetchDerivationEdges result. */
export function buildAncestorMap(data) {
  const map = new Map();
  bindings(data).forEach(row => {
    const id = lexId(row.lex && row.lex.value);
    if (!id) return;
    if (!map.has(id)) map.set(id, new Set());
    const set = map.get(id);
    ['anc1', 'anc2', 'anc3'].forEach(key => {
      if (row[key] && row[key].value) set.add(lexId(row[key].value));
    });
  });
  return map;
}

/**
 * Lemma + language for a bounded set of lexemes - used to name the shared root
 * in "both come from Persian ترجمه", and to name known-language words that are
 * not already in the bridge-word result.
 */
export async function fetchLexemeMeta(lexemeIds) {
  const ids = [...new Set(lexemeIds)].filter(Boolean);
  const out = new Map();
  const CHUNK = 200;

  for (let i = 0; i < ids.length; i += CHUNK) {
    const values = ids.slice(i, i + CHUNK).map(id => 'wd:' + id).join(' ');
    const sparql = `
      SELECT ?lex ?lemma ?langLabel WHERE {
        VALUES ?lex { ${values} }
        ?lex wikibase:lemma ?lemma ;
             dct:language ?lang .
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
      }
    `;
    try {
      const data = await runSparqlQuery(sparql, 25000);
      bindings(data).forEach(row => {
        const id = lexId(row.lex.value);
        if (!out.has(id)) {
          out.set(id, {
            lemma: row.lemma ? row.lemma.value : '',
            lang: row.langLabel ? row.langLabel.value : '',
          });
        }
      });
    } catch (e) {
      console.warn('Lexeme metadata lookup failed for one chunk:', e.message);
    }
  }
  return out;
}

/**
 * Compare ancestries and classify each target/known lexeme pair.
 *
 * cognate      - both sides reach the same ancestor lexeme (neither IS the other's ancestor)
 * borrowedFrom - the target word descends from the known word
 * sourceOf     - the known word descends from the target word
 *
 * Returns Map<targetLexemeId, { cognates:[], borrowedFrom:[], sourceOf:[] }>.
 */
export function classifyDerivation(targetAncestors, knownAncestorsByLex, targetLexemeIds) {
  const result = new Map();
  const isTargetLexeme = (id) => (targetLexemeIds ? targetLexemeIds.has(id) : false);

  const push = (targetId, bucket, entry) => {
    if (!result.has(targetId)) {
      result.set(targetId, { cognates: [], borrowedFrom: [], sourceOf: [] });
    }
    result.get(targetId)[bucket].push(entry);
  };

  targetAncestors.forEach((tAnc, targetId) => {
    knownAncestorsByLex.forEach((kAnc, knownId) => {
      if (targetId === knownId) return;

      // Direct line of descent: a borrowing / inheritance, NOT a cognate pair.
      if (tAnc.has(knownId)) {
        push(targetId, 'borrowedFrom', { knownLexemeId: knownId });
        return;
      }
      if (kAnc.has(targetId)) {
        push(targetId, 'sourceOf', { knownLexemeId: knownId });
        return;
      }

      // Shared ancestor = true cognates (e.g. both from a Sanskrit root).
      for (const root of tAnc) {
        if (kAnc.has(root)) {
          push(targetId, 'cognates', { knownLexemeId: knownId, rootLexemeId: root });
          break;
        }
      }
    });
  });

  // A known word can descend from a target word that carries no P5191 statement
  // of its own - such a target lexeme never appears in `targetAncestors`, so the
  // loop above cannot see it. Pick those up from the known side.
  knownAncestorsByLex.forEach((kAnc, knownId) => {
    kAnc.forEach(ancestorId => {
      if (targetAncestors.has(ancestorId)) return;   // already handled above
      if (!isTargetLexeme(ancestorId)) return;       // ancestor is in some third language
      push(ancestorId, 'sourceOf', { knownLexemeId: knownId });
    });
  });

  return result;
}

// Wikidata P5976 (false friends) query
export async function fetchP5976FalseFriends(knownLangs, targetLangQid) {
  const knownQids = knownLangs.map(l => l.qid);
  const knownCodes = knownLangs.map(l => l.code);
  const knownValues = knownQids.map(q => 'wd:' + q).join(' ');
  const glossLangs = [...knownCodes, 'en'].map(c => `LANG(?gloss1_) = "${c}"`).join(' || ');
  const glossLangs2 = [...knownCodes, 'en'].map(c => `LANG(?gloss2_) = "${c}"`).join(' || ');

  const sparql = `
    SELECT
      ?lex1 (SAMPLE(?lemma1_) AS ?lemma1) ?lang1
      ?lex2 (SAMPLE(?lemma2_) AS ?lemma2)
      (SAMPLE(?gloss1_) AS ?gloss1)
      (SAMPLE(?gloss2_) AS ?gloss2)
    WHERE {
      { ?s1 wdt:P5976 ?s2 } UNION { ?s2 wdt:P5976 ?s1 }
      ?lex1 ontolex:sense ?s1 ;
            wikibase:lemma ?lemma1_ ;
            dct:language ?lang1 .
      ?lex2 ontolex:sense ?s2 ;
            wikibase:lemma ?lemma2_ ;
            dct:language wd:${targetLangQid} .
      VALUES ?lang1 { ${knownValues} }
      OPTIONAL { ?s1 skos:definition ?gloss1_ . FILTER(${glossLangs}) }
      OPTIONAL { ?s2 skos:definition ?gloss2_ . FILTER(${glossLangs2}) }
    }
    GROUP BY ?lex1 ?lex2 ?lang1
    LIMIT 100
  `;

  return runSparqlQuery(sparql);
}

// One cache slot per language pair, so switching languages never serves the
// previous pair's words. Entries are large, so we keep only a few and evict the
// oldest when the browser refuses the write.
const WORDS_CACHE_KEY = 'wikilinkua_words_cache_v7';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_MAX_ENTRIES = 3;

function readWordsCache() {
  try {
    const raw = localStorage.getItem(WORDS_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeWordsCache(cache) {
  const keys = Object.keys(cache).sort((a, b) => (cache[b].ts || 0) - (cache[a].ts || 0));
  keys.slice(CACHE_MAX_ENTRIES).forEach(k => delete cache[k]);
  try {
    localStorage.setItem(WORDS_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Quota exceeded: drop the oldest entry and retry, giving up when alone.
    const oldest = Object.keys(cache).sort((a, b) => (cache[a].ts || 0) - (cache[b].ts || 0))[0];
    if (oldest && Object.keys(cache).length > 1) {
      delete cache[oldest];
      writeWordsCache(cache);
    } else {
      try { localStorage.removeItem(WORDS_CACHE_KEY); } catch { /* ignore */ }
    }
  }
}

/** Drop cached words for one pair (or all pairs when called with no key). */
export function clearWordsCache(cacheKey) {
  if (!cacheKey) {
    try { localStorage.removeItem(WORDS_CACHE_KEY); } catch { /* ignore */ }
    return;
  }
  const cache = readWordsCache();
  delete cache[cacheKey];
  writeWordsCache(cache);
}

// Main normalization orchestration
export async function loadAndNormalizeWords(knownLangQids, targetLangQidRaw) {
  const knownQids = [...new Set((knownLangQids || []).map(resolveLangQid))];
  const targetLangQid = resolveLangQid(targetLangQidRaw);
  const knownLangs = knownQids.map(q => LANG_BY_QID.get(q)).filter(Boolean);
  const targetLang = LANG_BY_QID.get(targetLangQid);

  if (!knownLangs.length || !targetLang) {
    throw new Error("Invalid languages selected");
  }

  const cacheKey = [...knownQids].sort().join(',') + '->' + targetLangQid;
  const cache = readWordsCache();
  const hit = cache[cacheKey];
  if (hit && hit.data && Date.now() - hit.ts < CACHE_TTL_MS) {
    return hit.data;
  }

  // 1. Bridge words (shared concepts) and the derivation ancestry of every
  //    language involved, all in parallel. Ancestry failures are non-fatal: the
  //    app then simply has no etymological claims to make, which is the honest
  //    outcome rather than falling back to guesswork.
  const softFail = (what) => (e) => {
    console.warn('WikiLinkua: ' + what + ' unavailable -', e.message);
    return { results: { bindings: [] } };
  };

  const [totalTargetMapped, bridgeCount, rawBridges, rawForms, commonness,
         rawTargetDeriv, ...rawKnownDeriv] = await Promise.all([
    fetchTotalTargetMapped(targetLangQid),
    fetchBridgeCount(knownLangs, targetLangQid).catch(e => {
      console.warn('WikiLinkua: exact bridge count unavailable -', e.message);
      return null;    // the UI hides the percentage rather than showing a wrong one
    }),
    fetchBridgeWordsRaw(knownLangs, targetLangQid),
    fetchLexemeForms(targetLangQid).catch(softFail('lexeme forms')),
    fetchConceptCommonness(targetLangQid).catch(e => {
      console.warn('WikiLinkua: concept commonness unavailable -', e.message);
      return new Map();   // curriculum falls back to relationship ordering
    }),
    fetchDerivationEdges(targetLangQid).catch(softFail('target derivation data')),
    ...knownLangs.map(l =>
      fetchDerivationEdges(l.qid).catch(softFail(l.name + ' derivation data'))
    ),
  ]);

  // Ancestry per side. Each known language is merged into one map - the lexeme
  // ids are globally unique, so there is nothing to disambiguate.
  const targetAncestors = buildAncestorMap(rawTargetDeriv);
  const knownAncestors = new Map();
  rawKnownDeriv.forEach(raw => {
    buildAncestorMap(raw).forEach((set, id) => {
      const existing = knownAncestors.get(id);
      if (existing) set.forEach(a => existing.add(a));
      else knownAncestors.set(id, set);
    });
  });

  const bridgeRows = bindings(rawBridges);
  const targetLexemeIds = new Set(bridgeRows.map(r => lexId(r.targetLex.value)));

  // 2. Turn raw ancestry into typed etymological claims.
  const derivation = classifyDerivation(targetAncestors, knownAncestors, targetLexemeIds);

  // Name the shared roots and the related known-language words, so the UI can
  // say *why* ("both come from Persian ترجمه") instead of just asserting a badge.
  const needMeta = new Set();
  derivation.forEach(entry => {
    entry.cognates.forEach(c => {
      needMeta.add(c.knownLexemeId);
      if (c.rootLexemeId) needMeta.add(c.rootLexemeId);
    });
    entry.borrowedFrom.forEach(c => needMeta.add(c.knownLexemeId));
    entry.sourceOf.forEach(c => needMeta.add(c.knownLexemeId));
  });
  const lexemeMeta = needMeta.size ? await fetchLexemeMeta([...needMeta]) : new Map();
  const metaOf = (id) => lexemeMeta.get(id) || {};

  const decorateDerived = (list) => list.map(item => {
    const known = metaOf(item.knownLexemeId);
    const root = item.rootLexemeId ? metaOf(item.rootLexemeId) : null;
    return {
      knownLexemeId: item.knownLexemeId,
      knownLemma: known.lemma || '',
      knownLangName: known.lang || '',
      rootLexemeId: item.rootLexemeId || null,
      rootLemma: root ? root.lemma : '',
      rootLang: root ? root.lang : '',
    };
  });

  const bridgesList = bridgeRows.map(row => {
    const knownPairs = (row.knownPairs && row.knownPairs.value)
      ? row.knownPairs.value.split('‖').map(s => {
          const parts = s.split('|');
          if (!parts[0]) return null;
          return {
            lexUri: parts[0],
            lemma: parts[1],
            code: parts[2] || '',
            ipa: parts[3] || '',
          };
        }).filter(Boolean)
      : [];

    const targetIpa = row.targetIpa ? row.targetIpa.value : '';
    const targetAudio = row.targetAudio ? row.targetAudio.value : null;

    // Get best IPA similarity
    let ipaSimilarity = null;
    knownPairs.forEach(p => {
      const s = getIpaSimilarity(targetIpa, p.ipa);
      if (s !== null && (ipaSimilarity === null || s > ipaSimilarity)) {
        ipaSimilarity = s;
      }
    });

    const lexemeId = row.targetLex.value.split('/').pop();

    const firstKnownPair = knownPairs[0] || {};
    const firstKnownLang = LANG_BY_CODE.get(firstKnownPair.code) || {};

    const targetLemma = row.targetLemma ? row.targetLemma.value : '';

    // Do not heuristically mark as true/false friend here.
    // P5976 data (fetched separately) is the authoritative source for false friends.
    // Lemma similarity is stored for UI display only.
    const falseFriend = null;

    // --- typed relations -----------------------------------------------------
    // Sharing a P5137 concept means "same meaning", nothing more. It is kept
    // strictly apart from the P5191 evidence below, which is the only thing that
    // licenses a claim about shared word history.
    const derived = derivation.get(lexemeId) || { cognates: [], borrowedFrom: [], sourceOf: [] };

    const sameMeaning = knownPairs.map(p => ({
      knownLexemeId: p.lexUri ? p.lexUri.split('/').pop() : null,
      knownLemma: p.lemma || '',
      knownLangCode: p.code || '',
    }));


    const relations = buildRelations({
      cognates: decorateDerived(derived.cognates),
      borrowedFrom: decorateDerived(derived.borrowedFrom),
      sourceOf: decorateDerived(derived.sourceOf),
      sameMeaning,
    });
    const primary = primaryRelation(relations);

    const knownLemma = firstKnownPair.lemma || '';
    let gloss = row.conceptLabel ? row.conceptLabel.value : '';
    if (!gloss || /^[Q]\d+$/.test(gloss)) {
      gloss = knownLemma || gloss;
    }

    let knownGloss = row.conceptLabel ? row.conceptLabel.value : '';
    if (!knownGloss || /^[Q]\d+$/.test(knownGloss)) {
      knownGloss = knownLemma || knownGloss;
    }

    return {
      lexemeId,
      lemma: targetLemma,
      targetLang: targetLangQid,
      knownLang: firstKnownLang.qid || null,
      concept: row.concept.value.split('/').pop(),
      gloss: gloss,
      // STRICT: true only when both words descend from the same ancestor lexeme.
      // A shared meaning or a similar shape no longer sets this.
      cognate: derived.cognates.length > 0,
      borrowed: derived.borrowedFrom.length > 0 || derived.sourceOf.length > 0,
      relations,
      primaryRelationType: primary ? primary.type : null,
      phoneticMatch: ipaSimilarity !== null && ipaSimilarity >= 0.6,
      // How many languages have a word for this concept: our proxy for how
      // basic the word is. 0 = outside the common slice we fetched.
      commonness: commonness.get(row.concept.value.split('/').pop()) || 0,
      falseFriend,
      audioUrl: targetAudio,
      knownLemma: knownLemma,
      knownGloss: knownGloss,
      targetIpa, // Added targetIpa field
      ipaSimilarity, // Extra helper field
      isBridge: knownPairs.length > 0
    };
  });

  // 3. Fetch explicit Wikidata false friends (P5976)
  let p5976List = [];
  try {
    const rawFf = await fetchP5976FalseFriends(knownLangs, targetLangQid);
    p5976List = rawFf.results.bindings.map(row => {
      const lang1Qid = row.lang1.value.split('/').pop();
      const targetLemma = row.lemma2.value;
      const targetLexId = row.lex2.value.split('/').pop();
      return {
        lexemeId: targetLexId,
        lemma: targetLemma,
        targetLang: targetLangQid,
        knownLang: lang1Qid,
        concept: null,
        gloss: row.gloss2 ? row.gloss2.value : targetLemma,
        cognate: false,
        borrowed: false,
        relations: [{
          type: REL.FALSE_FRIEND,
          knownLemma: row.lemma1.value,
          knownLexemeId: row.lex1.value.split('/').pop(),
        }],
        primaryRelationType: REL.FALSE_FRIEND,
        phoneticMatch: false,
        falseFriend: true,
        audioUrl: null,
        knownLemma: row.lemma1.value,
        knownGloss: row.gloss1 ? row.gloss1.value : row.lemma1.value,
        isBridge: true
      };
    });
  } catch (e) {
    console.error("Failed to fetch P5976 false friends:", e);
  }

  // 4. Mix in curated false friends
  const targetCode = targetLang.code;
  const knownCodes = knownLangs.map(l => l.code);
  const curatedList = [];
  
  FF_CURATED.forEach(c => {
    const [la, lb] = c.langs;
    let knownCode = null;
    let targetLemma = null;
    let knownLemma = null;
    let meaningA = c.meaningA;
    let meaningB = c.meaningB;

    if (knownCodes.includes(la) && lb === targetCode) {
      knownCode = la;
      knownLemma = c.a;
      targetLemma = c.b;
    } else if (knownCodes.includes(lb) && la === targetCode) {
      knownCode = lb;
      knownLemma = c.b;
      targetLemma = c.a;
      meaningA = c.meaningB;
      meaningB = c.meaningA;
    }

    if (knownCode) {
      const knownLangObj = LANG_BY_CODE.get(knownCode) || {};
      const synId = `curated-${knownCode}-${targetCode}-${targetLemma.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      curatedList.push({
        // Hand-curated, not a Wikidata lexeme: excluded from every count that is
        // measured against the Wikidata lexeme population.
        source: 'curated',
        lexemeId: synId,
        lemma: targetLemma,
        targetLang: targetLangQid,
        knownLang: knownLangObj.qid || null,
        concept: null,
        gloss: meaningB,
        cognate: false,
        borrowed: false,
        relations: [{ type: REL.FALSE_FRIEND, knownLemma: knownLemma }],
        primaryRelationType: REL.FALSE_FRIEND,
        phoneticMatch: false,
        falseFriend: true,
        audioUrl: null,
        knownLemma: knownLemma,
        knownGloss: meaningA,
        note: c.note || '', // helper detail
        isBridge: true
      });
    }
  });

  // Combine lists, de-duplicating by target lexemeId
  const finalMap = new Map();

  // Add normal bridges
  bridgesList.forEach(w => finalMap.set(w.lexemeId, w));

  // Add P5976 (overwrites if collision, which is fine since falseFriend = true overrides)
  p5976List.forEach(w => finalMap.set(w.lexemeId, w));

  // Add Curated (overwrites if collision, ensuring curated has highest signal)
  curatedList.forEach(w => finalMap.set(w.lexemeId, w));

  const allWords = Array.from(finalMap.values());

  const formIndex = buildFormIndex(rawForms);

  const result = {
    words: allWords,
    // Serialised as pairs: a Map does not survive JSON caching.
    formIndex: Array.from(formIndex.entries()),
    totalTargetMapped,
    bridgeCount,
    // The bridge query is capped; when it comes back full the list is a sample.
    truncated: bridgeRows.length >= WL_MAX_BRIDGES,
    loadedLexemes: bridgesList.length,
  };
  const fresh = readWordsCache();
  fresh[cacheKey] = { ts: Date.now(), data: result };
  writeWordsCache(fresh);
  return result;
}
