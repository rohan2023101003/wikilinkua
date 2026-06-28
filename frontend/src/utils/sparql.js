import { FF_CURATED } from './curatedPairs';

export const SPARQL_ENDPOINT_URL = "https://query.wikidata.org/sparql";

export const LANGUAGES = [
  { qid: 'Q1860',  code: 'en',  name: 'English' },
  { qid: 'Q1321',  code: 'es',  name: 'Spanish' },
  { qid: 'Q150',   code: 'fr',  name: 'French' },
  { qid: 'Q188',   code: 'de',  name: 'German' },
  { qid: 'Q652',   code: 'it',  name: 'Italian' },
  { qid: 'Q5146',  code: 'pt',  name: 'Portuguese' },
  { qid: 'Q9035',  code: 'da',  name: 'Danish' },
  { qid: 'Q9027',  code: 'sv',  name: 'Swedish' },
  { qid: 'Q9043',  code: 'no',  name: 'Norwegian' },
  { qid: 'Q9168',  code: 'fa',  name: 'Persian' },
  { qid: 'Q13955', code: 'ar',  name: 'Arabic' },
  { qid: 'Q1568',  code: 'hi',  name: 'Hindi' },
  { qid: 'Q1617',  code: 'ur',  name: 'Urdu' },
  { qid: 'Q58635', code: 'pa',  name: 'Punjabi' },
  { qid: 'Q36236', code: 'ml',  name: 'Malayalam' },
  { qid: 'Q5885',  code: 'ta',  name: 'Tamil' },
  { qid: 'Q9240',  code: 'id',  name: 'Indonesian' },
  { qid: 'Q9237',  code: 'ms',  name: 'Malay' },
  { qid: 'Q5287',  code: 'ja',  name: 'Japanese' },
  { qid: 'Q7737',  code: 'ru',  name: 'Russian' },
  { qid: 'Q8798',  code: 'uk',  name: 'Ukrainian' },
  { qid: 'Q809',   code: 'pl',  name: 'Polish' },
  { qid: 'Q9056',  code: 'cs',  name: 'Czech' },
  { qid: 'Q256',   code: 'tr',  name: 'Turkish' },
  { qid: 'Q143',   code: 'eo',  name: 'Esperanto' },
  { qid: 'Q397',   code: 'la',  name: 'Latin' },
  { qid: 'Q12107', code: 'br',  name: 'Breton' },
  { qid: 'Q8752',  code: 'eu',  name: 'Basque' },
  { qid: 'Q1412',  code: 'yi',  name: 'Yiddish' }
];

export const PRESETS = [
  { label: 'Punjabi → Hindi', known: ['Q58635'], target: 'Q1568' },
  { label: 'Arabic → Indonesian (loanwords)', known: ['Q13955'], target: 'Q9240' },
  { label: 'English + Spanish → French', known: ['Q1860', 'Q1321'], target: 'Q150' },
  { label: 'Persian + Punjabi → Malayalam', known: ['Q9168', 'Q58635'], target: 'Q36236' },
  { label: 'English → Esperanto', known: ['Q1860'], target: 'Q143' }
];

const WL_MAX_BRIDGES = 15000;
const FF_INNER_LIMIT = 1500;
const FF_BRIDGE_LIMIT = 400;

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

// Fetch helper
async function runSparqlQuery(sparql) {
  const url = SPARQL_ENDPOINT_URL + '?query=' + encodeURIComponent(sparql);
  const response = await fetch(url, {
    headers: { 'Accept': 'application/sparql-results+json' }
  });
  if (!response.ok) {
    throw new Error('SPARQL Query failed: ' + response.statusText);
  }
  return response.json();
}

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

// Fetch cognate pairs for target language restricted to known languages
export async function fetchCognatesRaw(targetLangQid, knownLangs) {
  const knownValues = (knownLangs || []).map(l => 'wd:' + l.qid).join(' ');
  const langFilter = knownValues
    ? `?knownLex dct:language ?kLang . VALUES ?kLang { ${knownValues} }`
    : '';
  const sparql = `
    SELECT DISTINCT ?targetLex ?knownLex WHERE {
      {
        ?targetLex wdt:P5191 ?knownLex .
        ?targetLex dct:language wd:${targetLangQid} .
        ${langFilter}
      }
      UNION
      {
        ?knownLex wdt:P5191 ?targetLex .
        ?targetLex dct:language wd:${targetLangQid} .
        ${langFilter}
      }
    }
    LIMIT 20000
  `;
  return runSparqlQuery(sparql);
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

const WORDS_CACHE_KEY = 'wikilinkua_words_cache_v4';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Main normalization orchestration
export async function loadAndNormalizeWords(knownLangQids, targetLangQid) {
  const knownLangs = LANGUAGES.filter(l => knownLangQids.includes(l.qid));
  const targetLang = LANGUAGES.find(l => l.qid === targetLangQid);

  if (!knownLangs.length || !targetLang) {
    throw new Error("Invalid languages selected");
  }

  const cacheKey = [...knownLangQids].sort().join(',') + '->' + targetLangQid;
  try {
    const raw = localStorage.getItem(WORDS_CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached.key === cacheKey && Date.now() - cached.ts < CACHE_TTL_MS) {
        return cached.data;
      }
    }
  } catch (e) {
    // ignore corrupt cache
  }

  // 1. Fetch total count, bridge words, and cognates in parallel
  const [totalTargetMapped, rawBridges, rawCognates] = await Promise.all([
    fetchTotalTargetMapped(targetLangQid),
    fetchBridgeWordsRaw(knownLangs, targetLangQid),
    fetchCognatesRaw(targetLangQid, knownLangs).catch(e => {
      console.error("Failed to fetch cognates:", e);
      return { results: { bindings: [] } };
    })
  ]);

  // Build cognate mapping set
  const cognateSet = new Set();
  if (rawCognates && rawCognates.results && rawCognates.results.bindings) {
    rawCognates.results.bindings.forEach(row => {
      if (row.targetLex && row.knownLex) {
        const tId = row.targetLex.value.split('/').pop();
        const kId = row.knownLex.value.split('/').pop();
        cognateSet.add(`${tId}-${kId}`);
        cognateSet.add(`${kId}-${tId}`);
      }
    });
  }

  const bridgesList = rawBridges.results.bindings.map(row => {
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
    let isCognate = false;
    knownPairs.forEach(p => {
      if (p.lexUri) {
        const kId = p.lexUri.split('/').pop();
        if (cognateSet.has(`${lexemeId}-${kId}`)) {
          isCognate = true;
        }
      }
    });

    const firstKnownPair = knownPairs[0] || {};
    const firstKnownLang = LANGUAGES.find(l => l.code === firstKnownPair.code) || {};

    const targetLemma = row.targetLemma ? row.targetLemma.value : '';
    const lemmaSim = firstKnownPair.lemma ? getLemmaSimilarity(targetLemma, firstKnownPair.lemma) : null;

    // Do not heuristically mark as true/false friend here.
    // P5976 data (fetched separately) is the authoritative source for false friends.
    // Lemma similarity is stored for UI display only.
    const falseFriend = null;

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
      cognate: isCognate,
      phoneticMatch: ipaSimilarity !== null && ipaSimilarity >= 0.6,
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
      const knownLangObj = LANGUAGES.find(l => l.code === knownCode) || {};
      const synId = `curated-${knownCode}-${targetCode}-${targetLemma.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      curatedList.push({
        lexemeId: synId,
        lemma: targetLemma,
        targetLang: targetLangQid,
        knownLang: knownLangObj.qid || null,
        concept: null,
        gloss: meaningB,
        cognate: false,
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

  const result = { words: allWords, totalTargetMapped };
  try {
    localStorage.setItem(WORDS_CACHE_KEY, JSON.stringify({ key: cacheKey, ts: Date.now(), data: result }));
  } catch (e) {
    // ignore storage full
  }
  return result;
}
