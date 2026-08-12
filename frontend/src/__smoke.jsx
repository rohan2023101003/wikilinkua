/**
 * Render smoke test - not shipped. Renders every view with representative props
 * so a ReferenceError (an undefined variable in JSX) fails here instead of
 * showing the user a blank white screen.
 *
 *   npx vite build --ssr src/__smoke.jsx --outDir /tmp/wl-smoke
 *   node /tmp/wl-smoke/__smoke.js
 */
import { renderToString } from 'react-dom/server';
import React from 'react';

import Onboarding from './components/Onboarding';
import BridgeWordsList from './components/BridgeWordsList';
import Flashcards from './components/Flashcards';
import FriendOrFaux from './components/FriendOrFaux';
import WordsStatus from './components/WordsStatus';
import GameModes from './components/GameModes';
import PhrasesMode from './components/PhrasesMode';
import VideoMode from './components/VideoMode';
import ArticleMode from './components/ArticleMode';
import ContributeMode from './components/ContributeMode';
import { Recall } from './components/Recall';
import { ReverseRecall } from './components/ReverseRecall';
import { OddOneOut } from './components/OddOneOut';
import { MatchPairs } from './components/MatchPairs';
import App from './App.jsx';
import { REL } from './utils/relations';

const profile = { knownLangs: ['Q1860', 'Q58635'], targetLang: 'Q36236' };

const mkWord = (i, extra = {}) => ({
  lexemeId: 'L' + (1000 + i),
  lemma: 'വാക്ക്' + i,
  targetLang: 'Q36236',
  knownLang: 'Q1860',
  concept: 'Q' + (100 + i),
  gloss: 'meaning ' + i,
  knownLemma: 'word' + i,
  knownGloss: 'meaning ' + i,
  cognate: false,
  borrowed: false,
  relations: [{ type: REL.SAME_MEANING, knownLemma: 'word' + i }],
  primaryRelationType: REL.SAME_MEANING,
  phoneticMatch: false,
  falseFriend: null,
  audioUrl: null,
  targetIpa: 'wa:k',
  ipaSimilarity: null,
  isBridge: true,
  ...extra,
});

// A spread of shapes: plain, true cognate, borrowing, false friend, look-alike,
// plus the awkward ones (missing gloss, very long lemma, duplicate glosses).
const words = [
  ...Array.from({ length: 12 }, (_, i) => mkWord(i)),
  mkWord(20, {
    cognate: true,
    relations: [{ type: REL.COGNATE, knownLemma: 'ਤਰਜਮਾ', rootLemma: 'ترجمه', rootLang: 'New Persian' }],
    primaryRelationType: REL.COGNATE,
  }),
  mkWord(21, {
    borrowed: true,
    relations: [{ type: REL.BORROWED_FROM, knownLemma: 'school' }],
    primaryRelationType: REL.BORROWED_FROM,
  }),
  mkWord(22, { falseFriend: true, relations: [{ type: REL.FALSE_FRIEND, knownLemma: 'embarazada' }], primaryRelationType: REL.FALSE_FRIEND }),
  mkWord(23, { relations: [{ type: REL.LOOKS_ALIKE, knownLemma: 'bus', similarity: 0.9 }], primaryRelationType: REL.LOOKS_ALIKE, phoneticMatch: true }),
  mkWord(24, { gloss: '', relations: [] }),
  mkWord(25, { lemma: 'agent chargé de protection et sauvegarde du patrimoine naturel' }),
  mkWord(26, { gloss: 'yes' }),
  mkWord(27, { gloss: 'yes' }),          // duplicate gloss - the "हाँ" case
];

const progress = {
  words: {
    L1000: { boxLevel: 4, dueDate: Date.now() - 1000, status: 'known' },
    L1001: { boxLevel: 1, dueDate: Date.now() - 1000, status: 'learning' },
  },
};

const noop = () => {};
const cases = [
  ['App (root)', <App />],
  ['Onboarding (new user)', <Onboarding profile={null} onSaveProfile={noop} />],
  ['Onboarding (existing profile)', <Onboarding profile={profile} onSaveProfile={noop} />],
  ['BridgeWordsList', <BridgeWordsList words={words} totalTargetMapped={5000} profile={profile} initialFilter="All" onNavigate={noop} />],
  ['BridgeWordsList (cognate filter)', <BridgeWordsList words={words} totalTargetMapped={5000} profile={profile} initialFilter={REL.COGNATE} onNavigate={noop} />],
  ['BridgeWordsList (no words)', <BridgeWordsList words={[]} totalTargetMapped={0} profile={profile} initialFilter="All" onNavigate={noop} />],
  ['Flashcards', <Flashcards words={words} onAnswerWord={noop} onNavigate={noop} />],
  ['FriendOrFaux', <FriendOrFaux words={words} onAnswerWord={noop} onNavigate={noop} />],
  ['Recall', <Recall words={words} onAnswerWord={noop} onNavigate={noop} />],
  ['ReverseRecall', <ReverseRecall words={words} onAnswerWord={noop} onNavigate={noop} />],
  ['OddOneOut', <OddOneOut words={words} onAnswerWord={noop} onNavigate={noop} />],
  ['OddOneOut (no cognates)', <OddOneOut words={words.filter(w => !w.cognate && !w.borrowed)} onAnswerWord={noop} onNavigate={noop} />],
  ['MatchPairs', <MatchPairs words={words} onNavigate={noop} />],
  ['WordsStatus', <WordsStatus words={words} progress={progress} onNavigate={noop} />],
  ['WordsStatus (empty)', <WordsStatus words={[]} progress={{ words: {} }} onNavigate={noop} />],
  ['GameModes', <GameModes words={words} progress={progress} onAnswerWord={noop} onNavigate={noop} totalTargetMapped={5000} />],
  ['PhrasesMode', <PhrasesMode words={words} progress={progress} profile={profile} onNavigate={noop} />],
  ['VideoMode', <VideoMode profile={profile} words={words} onAnswerWord={noop} onNavigate={noop} />],
  ['ArticleMode', <ArticleMode profile={profile} words={words} progress={progress} onAnswerWord={noop} onNavigate={noop} />],
  ['ContributeMode', <ContributeMode profile={profile} onNavigate={noop} />],
  ['ContributeMode (no profile)', <ContributeMode profile={null} onNavigate={noop} />],
];

let failed = 0;
for (const [name, element] of cases) {
  try {
    const html = renderToString(element);
    console.log(`  PASS  ${name}  (${html.length} chars)`);
  } catch (err) {
    failed++;
    console.log(`  FAIL  ${name}\n        ${err.message.split('\n')[0]}`);
  }
}
console.log(failed === 0 ? '\nAll views render.' : `\n${failed} view(s) crash.`);
if (failed > 0) process.exitCode = 1;
