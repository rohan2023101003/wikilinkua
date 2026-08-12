/**
 * Data-gap finder: "what is missing in Wikidata for this language, and what
 * would fixing it unlock for learners?"
 *
 * Modelled on the per-language maintenance pages Wikidata's lexicographical-data
 * community keeps (e.g. .../Languages/dag/modeling), but with one difference:
 * every task here is tied to a WikiLinkua feature it currently blocks, so a
 * contributor can see what their edit switches on.
 *
 * All counts come straight from WDQS. Queries are deliberately scoped to a single
 * language - that is what keeps them in the seconds range rather than timing out.
 */

import { runSparqlQuery } from './sparql';

export const PRIORITY = { HIGH: 'high', MEDIUM: 'medium', LOW: 'low' };

export const PRIORITY_META = {
  high:   { label: 'High priority',   note: 'Blocks core learning features',      color: '#bf3c2c', bg: '#fee7e6', border: '#f9c5c0' },
  medium: { label: 'Medium priority', note: 'Makes learning noticeably better',   color: '#886600', bg: '#fef6e7', border: '#f2d9a0' },
  low:    { label: 'Low priority',    note: 'Polish and long-term completeness',  color: '#54595d', bg: '#f8f9fa', border: '#c8ccd1' },
};

const count = async (sparql) => {
  const data = await runSparqlQuery(sparql, 60000);
  const rows = (data.results && data.results.bindings) || [];
  return rows.length ? parseInt(rows[0].n.value, 10) || 0 : 0;
};

/** Link that opens a query in the Wikidata Query Service editor. */
export function wdqsLink(sparql) {
  return 'https://query.wikidata.org/#' + encodeURIComponent(sparql.trim());
}

export function lexemeUrl(lexemeId) {
  return 'https://www.wikidata.org/wiki/Lexeme:' + lexemeId;
}

/**
 * Wrap a WHERE body into a list query that returns ONE ROW PER LEXEME.
 *
 * Without the GROUP BY, any pattern touching senses or forms multiplies rows:
 * French "fond" (L10042) has six senses, so it came back six times and ate six
 * of the 25 example slots. Counting queries already use COUNT(DISTINCT ?lex);
 * the example lists must be just as strict.
 *
 * The body must bind `?lex` and `?lemma_`.
 */
function oneRowPerLexeme(where, limit) {
  return `SELECT ?lex (SAMPLE(?lemma_) AS ?lemma) WHERE {
${where}
}
GROUP BY ?lex
LIMIT ${limit}`;
}

// ---------------------------------------------------------------- the catalogue

/**
 * Each task knows how to count itself, how to list examples, and - importantly -
 * what it unlocks. `available` lets a task hide itself when it does not apply to
 * the language (grammatical gender is the obvious case).
 */
export const GAP_TASKS = [
  {
    id: 'no-sense',
    priority: PRIORITY.HIGH,
    title: 'Lexemes with no sense at all',
    unlocks: 'A word with no sense cannot be taught, shown or matched - it is invisible to WikiLinkua.',
    fix: 'Open the lexeme and add a sense with a short definition.',
    // COUNT with FILTER NOT EXISTS takes ~55s on a big language; two plain counts
    // take ~3s and give the same number.
    async getCount(qid) {
      const [total, withSense] = await Promise.all([
        count(`SELECT (COUNT(DISTINCT ?lex) AS ?n) WHERE { ?lex dct:language wd:${qid} . }`),
        count(`SELECT (COUNT(DISTINCT ?lex) AS ?n) WHERE { ?lex dct:language wd:${qid} ; ontolex:sense [] . }`),
      ]);
      return Math.max(0, total - withSense);
    },
    listQuery: (qid, limit = 25) => oneRowPerLexeme(`  ?lex dct:language wd:${qid} ;
       wikibase:lemma ?lemma_ .
  FILTER NOT EXISTS { ?lex ontolex:sense [] }`, limit),
  },
  {
    id: 'sense-no-concept',
    priority: PRIORITY.HIGH,
    title: 'Senses not linked to a concept (P5137)',
    unlocks: 'P5137 is how WikiLinkua finds "a word for the same thing" across languages. Without it the word can never appear as a bridge word.',
    fix: 'Add "item for this sense" (P5137) pointing at the Wikidata item for that meaning.',
    getCount: (qid) => count(`SELECT (COUNT(DISTINCT ?lex) AS ?n) WHERE {
  ?lex dct:language wd:${qid} ; ontolex:sense ?s .
  FILTER NOT EXISTS { ?s wdt:P5137 [] }
}`),
    listQuery: (qid, limit = 25) => oneRowPerLexeme(`  ?lex dct:language wd:${qid} ;
       wikibase:lemma ?lemma_ ;
       ontolex:sense ?s .
  FILTER NOT EXISTS { ?s wdt:P5137 [] }`, limit),
  },
  {
    id: 'no-derivation',
    priority: PRIORITY.HIGH,
    title: 'Learner-ready words with no "derived from lexeme" (P5191)',
    unlocks: 'P5191 is the ONLY evidence WikiLinkua accepts for calling two words cognates. Every one of these words could become a "you already know this" moment for someone.',
    fix: 'Add "derived from lexeme" (P5191) pointing at the source or ancestor word - a Sanskrit, Persian, Arabic or English root, for example.',
    // Restricted to lexemes that already have P5137: those are the ones a learner
    // can actually meet in the app, so fixing them pays off immediately.
    getCount: (qid) => count(`SELECT (COUNT(DISTINCT ?lex) AS ?n) WHERE {
  ?lex dct:language wd:${qid} ; ontolex:sense/wdt:P5137 [] .
  FILTER NOT EXISTS { ?lex wdt:P5191 [] }
}`),
    listQuery: (qid, limit = 25) => oneRowPerLexeme(`  ?lex dct:language wd:${qid} ;
       wikibase:lemma ?lemma_ ;
       ontolex:sense/wdt:P5137 [] .
  FILTER NOT EXISTS { ?lex wdt:P5191 [] }`, limit),
  },
  {
    id: 'no-audio',
    priority: PRIORITY.HIGH,
    title: 'Words with no pronunciation audio (P443)',
    unlocks: 'Listening practice. Without audio a learner can read the word but never hear it.',
    fix: 'Record the word (Lingua Libre, or the recorder in this app) and link the file with P443 on the form.',
    recordable: true,
    getCount: (qid) => count(`SELECT (COUNT(DISTINCT ?lex) AS ?n) WHERE {
  ?lex dct:language wd:${qid} .
  FILTER NOT EXISTS { ?lex ontolex:lexicalForm/wdt:P443 [] }
}`),
    listQuery: (qid, limit = 25) => oneRowPerLexeme(`  ?lex dct:language wd:${qid} ;
       wikibase:lemma ?lemma_ ;
       ontolex:sense/wdt:P5137 [] .
  FILTER NOT EXISTS { ?lex ontolex:lexicalForm/wdt:P443 [] }`, limit),
  },
  {
    id: 'no-ipa',
    priority: PRIORITY.MEDIUM,
    title: 'Words with no IPA transcription (P898)',
    unlocks: 'The "sounds similar" detection, and pronunciation hints for learners who cannot yet read the script.',
    fix: 'Add "IPA transcription" (P898) on the lexeme form.',
    getCount: (qid) => count(`SELECT (COUNT(DISTINCT ?lex) AS ?n) WHERE {
  ?lex dct:language wd:${qid} .
  FILTER NOT EXISTS { ?lex ontolex:lexicalForm/wdt:P898 [] }
}`),
    listQuery: (qid, limit = 25) => oneRowPerLexeme(`  ?lex dct:language wd:${qid} ;
       wikibase:lemma ?lemma_ ;
       ontolex:sense/wdt:P5137 [] .
  FILTER NOT EXISTS { ?lex ontolex:lexicalForm/wdt:P898 [] }`, limit),
  },
  {
    id: 'no-usage-example',
    priority: PRIORITY.MEDIUM,
    title: 'Senses with no usage example (P5831)',
    unlocks: 'Example sentences - the step between single words and real language. WikiLinkua falls back to these when no other sentence source covers the language.',
    fix: 'Add "usage example" (P5831) with a natural sentence using the word.',
    getCount: (qid) => count(`SELECT (COUNT(DISTINCT ?lex) AS ?n) WHERE {
  ?lex dct:language wd:${qid} ; ontolex:sense ?s .
  FILTER NOT EXISTS { ?s wdt:P5831 [] }
}`),
    listQuery: (qid, limit = 25) => oneRowPerLexeme(`  ?lex dct:language wd:${qid} ;
       wikibase:lemma ?lemma_ ;
       ontolex:sense ?s .
  FILTER NOT EXISTS { ?s wdt:P5831 [] }`, limit),
  },
  {
    id: 'nouns-no-gender',
    priority: PRIORITY.MEDIUM,
    title: 'Nouns missing grammatical gender (P5185)',
    unlocks: 'Correct grammar hints. Only meaningful for languages that actually mark gender.',
    fix: 'Add "grammatical gender" (P5185) to the noun.',
    // Shown only where the language clearly uses gender already.
    available: (profile) => profile.genderRatio >= 0.25,
    getCount: (qid) => count(`SELECT (COUNT(DISTINCT ?lex) AS ?n) WHERE {
  ?lex dct:language wd:${qid} ; wikibase:lexicalCategory wd:Q1084 .
  FILTER NOT EXISTS { ?lex wdt:P5185 [] }
}`),
    listQuery: (qid, limit = 25) => oneRowPerLexeme(`  ?lex dct:language wd:${qid} ;
       wikibase:lemma ?lemma_ ;
       wikibase:lexicalCategory wd:Q1084 .
  FILTER NOT EXISTS { ?lex wdt:P5185 [] }`, limit),
  },
  {
    id: 'suspicious-gender',
    priority: PRIORITY.HIGH,
    title: 'Grammatical gender on a language that barely uses it',
    unlocks: 'Data correctness. If this language has no grammatical gender, these statements are mistakes and should be removed - the same clean-up Dagbani ran.',
    fix: 'Check each lexeme. If the language has no grammatical gender, remove the P5185 statement.',
    // The mirror image of the task above: a handful of gendered lexemes in a
    // language that otherwise ignores gender usually means imported errors.
    available: (profile) => profile.genderUsed > 0 && profile.genderRatio < 0.05,
    getCount: (qid) => count(`SELECT (COUNT(DISTINCT ?lex) AS ?n) WHERE {
  ?lex dct:language wd:${qid} ; wdt:P5185 [] .
}`),
    listQuery: (qid, limit = 25) => oneRowPerLexeme(`  ?lex dct:language wd:${qid} ;
       wikibase:lemma ?lemma_ ;
       wdt:P5185 [] .`, limit),
  },
  {
    id: 'no-forms',
    priority: PRIORITY.LOW,
    title: 'Lexemes with no forms',
    unlocks: 'Matching words inside real text. Article and video modes look for the forms that actually appear in a sentence, not just the dictionary form.',
    fix: 'Add the inflected forms (plural, cases, tenses) for the word.',
    getCount: (qid) => count(`SELECT (COUNT(DISTINCT ?lex) AS ?n) WHERE {
  ?lex dct:language wd:${qid} .
  FILTER NOT EXISTS { ?lex ontolex:lexicalForm [] }
}`),
    listQuery: (qid, limit = 25) => oneRowPerLexeme(`  ?lex dct:language wd:${qid} ;
       wikibase:lemma ?lemma_ .
  FILTER NOT EXISTS { ?lex ontolex:lexicalForm [] }`, limit),
  },
];

// ------------------------------------------------------------------- profiling

/**
 * A few cheap numbers that describe the language, used both as a headline
 * ("10,126 of 67,372 words are learner-ready") and to decide which
 * language-dependent tasks make sense to show.
 */
export async function fetchLanguageProfile(qid) {
  const [total, learnerReady, nouns, genderUsed] = await Promise.all([
    count(`SELECT (COUNT(DISTINCT ?l) AS ?n) WHERE { ?l dct:language wd:${qid} . }`),
    count(`SELECT (COUNT(DISTINCT ?l) AS ?n) WHERE { ?l dct:language wd:${qid} ; ontolex:sense/wdt:P5137 [] . }`),
    count(`SELECT (COUNT(DISTINCT ?l) AS ?n) WHERE { ?l dct:language wd:${qid} ; wikibase:lexicalCategory wd:Q1084 . }`),
    count(`SELECT (COUNT(DISTINCT ?l) AS ?n) WHERE { ?l dct:language wd:${qid} ; wdt:P5185 [] . }`),
  ]);
  return {
    qid,
    total,
    learnerReady,
    nouns,
    genderUsed,
    genderRatio: nouns > 0 ? genderUsed / nouns : 0,
  };
}

/** Tasks that apply to this language, in priority order. */
export function tasksFor(profile) {
  const order = { high: 0, medium: 1, low: 2 };
  return GAP_TASKS
    .filter(t => (t.available ? t.available(profile) : true))
    .sort((a, b) => order[a.priority] - order[b.priority]);
}

/** Example lexemes for a task, so a contributor can start editing immediately. */
export async function fetchTaskExamples(task, qid, limit = 25) {
  const data = await runSparqlQuery(task.listQuery(qid, limit), 45000);
  return ((data.results && data.results.bindings) || []).map(row => ({
    lexemeId: row.lex.value.split('/').pop(),
    lemma: row.lemma ? row.lemma.value : '',
  }));
}
