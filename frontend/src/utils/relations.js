/**
 * How a target-language word relates to a word the learner already knows.
 *
 * The whole point of this module: **a connection in Wikidata is not automatically
 * a cognate.** A lexeme's sense can point at a concept item that some English
 * lexeme also points at - that means "these two words mean the same thing", not
 * "these two words are historically related". Treating the second as the first
 * produces claims that are simply false (the "animal" case Satdeep raised).
 *
 * So every link we show the learner carries its own type and its own evidence:
 *
 *   cognate         both words descend from the SAME ancestor lexeme, found by
 *                   walking P5191 "derived from lexeme" upwards from both sides
 *                   (e.g. Malayalam തർജ്ജമ and Punjabi ਤਰਜਮਾ, both from Persian ترجمه)
 *   borrowed_from   the target word derives from the known word    (P5191 chain)
 *   source_of       the known word derives from the target word    (P5191 chain)
 *   translation     an explicitly stated translation               (P5972)
 *   same_meaning    both senses point at the same concept item     (P5137)
 *   related_meaning synonym / antonym link between senses          (P5973 / P5974)
 *   false_friend    explicitly marked as a false friend            (P5976 + curated)
 *   looks_alike     the forms simply resemble each other, with NO evidence of a
 *                   historical link. This is a warning, not a relationship.
 *
 * Only `cognate`, `borrowed_from` and `source_of` are etymological claims. The
 * others are semantic or purely superficial, and the UI must never present them
 * as shared ancestry.
 */

export const REL = {
  COGNATE: 'cognate',
  BORROWED_FROM: 'borrowed_from',
  SOURCE_OF: 'source_of',
  TRANSLATION: 'translation',
  SAME_MEANING: 'same_meaning',
  RELATED_MEANING: 'related_meaning',
  FALSE_FRIEND: 'false_friend',
  LOOKS_ALIKE: 'looks_alike',
};

/**
 * type -> presentation + provenance.
 *   etymological: does this claim shared word history?
 *   property:     the Wikidata property the claim rests on (shown to the user)
 */
export const RELATION_META = {
  [REL.COGNATE]: {
    label: 'Cognate',
    filterLabel: 'Cognates',
    short: 'Same origin',
    description: 'Both words go back to the same ancestor word.',
    property: 'P5191',
    etymological: true,
    color: '#3366cc', bg: '#eaf3ff', border: '#b8d4f9',
  },
  [REL.BORROWED_FROM]: {
    label: 'Borrowed from your language',
    filterLabel: 'Borrowings',
    short: 'Borrowed',
    description: 'This word was taken from a word you already know.',
    property: 'P5191',
    etymological: true,
    color: '#6b4ba3', bg: '#f1edf9', border: '#d9cde8',
  },
  [REL.SOURCE_OF]: {
    label: 'Source of your word',
    filterLabel: 'Borrowings',
    short: 'Source',
    description: 'A word you already know came from this one.',
    property: 'P5191',
    etymological: true,
    color: '#6b4ba3', bg: '#f1edf9', border: '#d9cde8',
  },
  [REL.TRANSLATION]: {
    label: 'Translation',
    filterLabel: 'Same meaning',
    short: 'Translation',
    description: 'Recorded in Wikidata as a translation of a word you know.',
    property: 'P5972',
    etymological: false,
    color: '#0e7a63', bg: '#e9f6f2', border: '#a3dcd0',
  },
  [REL.SAME_MEANING]: {
    label: 'Same meaning',
    filterLabel: 'Same meaning',
    short: 'Same meaning',
    description: 'Means the same thing as a word you know. Not necessarily related in origin.',
    property: 'P5137',
    etymological: false,
    color: '#0e7a63', bg: '#e9f6f2', border: '#a3dcd0',
  },
  [REL.RELATED_MEANING]: {
    label: 'Related meaning',
    filterLabel: 'Related meaning',
    short: 'Related',
    description: 'Its meaning is linked to a word you know (synonym or antonym).',
    property: 'P5973 / P5974',
    etymological: false,
    color: '#54595d', bg: '#f8f9fa', border: '#c8ccd1',
  },
  [REL.FALSE_FRIEND]: {
    label: 'False friend',
    filterLabel: 'False friends',
    short: 'False friend',
    description: 'Looks like a word you know but means something else.',
    property: 'P5976',
    etymological: false,
    color: '#bf3c2c', bg: '#fee7e6', border: '#f9c5c0',
  },
  [REL.LOOKS_ALIKE]: {
    label: 'Looks or sounds similar',
    filterLabel: 'Look-alikes',
    short: 'Looks alike',
    description: 'Only the form resembles a word you know - no known historical link, so this may be coincidence.',
    property: 'P898 (form similarity)',
    etymological: false,
    color: '#886600', bg: '#fef6e7', border: '#f2d9a0',
  },
};

/** Strongest claim first. Used to pick the badge a word leads with. */
export const RELATION_ORDER = [
  REL.FALSE_FRIEND,
  REL.COGNATE,
  REL.BORROWED_FROM,
  REL.SOURCE_OF,
  REL.TRANSLATION,
  REL.SAME_MEANING,
  REL.RELATED_MEANING,
  REL.LOOKS_ALIKE,
];

export function relationMeta(type) {
  return RELATION_META[type] || RELATION_META[REL.SAME_MEANING];
}

/** The relation a word should lead with, or null when there is no link at all. */
export function primaryRelation(relations) {
  if (!relations || !relations.length) return null;
  for (const type of RELATION_ORDER) {
    const hit = relations.find(r => r.type === type);
    if (hit) return hit;
  }
  return relations[0];
}

/** Does this word have any claim of shared word history? */
export function hasEtymologicalLink(word) {
  return (word.relations || []).some(r => relationMeta(r.type).etymological);
}

/** Distinct relation types on a word, strongest first. */
export function relationTypes(word) {
  const seen = new Set((word.relations || []).map(r => r.type));
  return RELATION_ORDER.filter(t => seen.has(t));
}

/**
 * One sentence explaining *why* a word is linked - shown under the word so the
 * learner can judge the claim instead of trusting a badge.
 */
export function explainRelation(relation, targetLemma) {
  if (!relation) return '';
  const known = relation.knownLemma ? `"${relation.knownLemma}"` : 'a word you know';
  const target = targetLemma ? `"${targetLemma}"` : 'this word';

  switch (relation.type) {
    case REL.COGNATE: {
      const root = relation.rootLemma
        ? `${relation.rootLemma}${relation.rootLang ? ' (' + relation.rootLang + ')' : ''}`
        : 'the same older word';
      return `${target} and ${known} both come from ${root}.`;
    }
    case REL.BORROWED_FROM:
      return `${target} comes from ${known}.`;
    case REL.SOURCE_OF:
      return `${known} comes from ${target}.`;
    case REL.TRANSLATION:
      return `Recorded as a translation of ${known}.`;
    case REL.SAME_MEANING:
      return `Means the same as ${known} - but they are not known to share an origin.`;
    case REL.RELATED_MEANING:
      return `Its meaning is linked to ${known}.`;
    case REL.FALSE_FRIEND:
      return `Looks like ${known}, but does not mean the same thing.`;
    case REL.LOOKS_ALIKE:
      return `Resembles ${known}, but Wikidata records no shared origin - this may be a coincidence.`;
    default:
      return '';
  }
}

/**
 * Build the typed relation list for one target word.
 *
 * `evidence` keeps each kind of proof separate, so a semantic link can never be
 * silently promoted into an etymological one.
 */
export function buildRelations(evidence) {
  const {
    cognates = [],        // [{ knownLexemeId, knownLemma, knownLangCode, rootLexemeId, rootLemma, rootLang }]
    borrowedFrom = [],    // [{ knownLexemeId, knownLemma, knownLangCode }]
    sourceOf = [],
    translations = [],
    sameMeaning = [],
    relatedMeaning = [],
    falseFriend = null,   // { knownLemma, knownLangCode } | null
    formSimilar = [],     // [{ knownLexemeId, knownLemma, knownLangCode, similarity }]
  } = evidence;

  const relations = [];
  const add = (type, list) => list.forEach(item => relations.push({ type, ...item }));

  add(REL.COGNATE, cognates);
  add(REL.BORROWED_FROM, borrowedFrom);
  add(REL.SOURCE_OF, sourceOf);
  add(REL.TRANSLATION, translations);
  add(REL.SAME_MEANING, sameMeaning);
  add(REL.RELATED_MEANING, relatedMeaning);
  if (falseFriend) relations.push({ type: REL.FALSE_FRIEND, ...falseFriend });

  // Form similarity is only worth mentioning when nothing better explains the
  // resemblance. If the words are already known cognates, "looks alike" adds
  // nothing; if they are not, it is precisely the case the learner must not
  // mistake for a real relationship.
  const etymological = relations.some(r => relationMeta(r.type).etymological);
  if (!etymological) add(REL.LOOKS_ALIKE, formSimilar);

  return relations;
}
