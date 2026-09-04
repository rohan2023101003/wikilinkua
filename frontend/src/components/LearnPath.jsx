import React, { useMemo, useState } from 'react';
import { FlashcardExercise } from './Flashcards';
import { RecallExercise } from './Recall';
import { ReverseRecallExercise } from './ReverseRecall';
import { FriendOrFauxExercise } from './FriendOrFaux';
import { ListeningExercise, SentenceExercise } from './UnitExercises';
import { CodexIcon, cdxIconCheck } from './Badges';
import { LexemeLink } from './WikidataLink';
import { getLanguage } from '../utils/sparql';
import { relationMeta, primaryRelation, explainRelation } from '../utils/relations';
import {
  buildCourse, courseState, unitStatus, isUnlocked, nextAction, buildLessonQueue,
  wordHeadline, unitContents,
} from '../utils/course';

const CARD = {
  border: '1px solid #c8ccd1', borderRadius: '2px', background: '#fff', padding: '20px',
};
const BTN_PRIMARY = {
  padding: '12px 24px', borderRadius: '2px', background: '#3366cc', color: '#fff',
  border: '1px solid #3366cc', fontWeight: '700', cursor: 'pointer', fontSize: '15px',
};
const BTN_GHOST = {
  padding: '10px 18px', borderRadius: '2px', background: '#fff', color: '#202122',
  border: '1px solid #a2a9b1', fontWeight: '600', cursor: 'pointer', fontSize: '14px',
};

/** Small circular progress indicator for a unit. */
function Ring({ percent, done, locked, number }) {
  const size = 46, stroke = 4, r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const colour = done ? '#0e7a63' : locked ? '#c8ccd1' : '#3366cc';
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eaecf0" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colour} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ - (circ * (percent || 0)) / 100}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em"
            style={{ fontSize: '14px', fontWeight: 700, fill: colour }}>
        {done ? '✓' : number}
      </text>
    </svg>
  );
}

/** Runs one unit: introduce every word, then test it both ways. */
function UnitLesson({ unit, words, progress, profile, onAnswerWord, onExit, onFinished }) {
  const [queue] = useState(() => buildLessonQueue(unit, progress));
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showNext, setShowNext] = useState(false);
  const [done, setDone] = useState(false);

  const step = queue[index];

  const handleAnswer = (correct) => {
    if (correct) setScore(s => s + 1);
    // The sentence step grades comprehension of a phrase, not a single word, so
    // it must not move a word up the vocabulary schedule.
    if (step.type !== 'sentence') onAnswerWord(step.word.lexemeId, correct);
    setShowNext(true);
  };

  const advance = () => {
    setShowNext(false);
    if (index + 1 < queue.length) setIndex(i => i + 1);
    else setDone(true);
  };

  if (!queue.length) {
    return (
      <div style={{ ...CARD, maxWidth: '600px', margin: '40px auto', textAlign: 'center' }}>
        <p style={{ margin: '0 0 20px', color: '#54595d' }}>
          This unit has no exercises to run.
        </p>
        <button onClick={onExit} style={BTN_PRIMARY}>Back to the path</button>
      </div>
    );
  }

  if (done) {
    const pct = Math.round((score / queue.length) * 100);
    return (
      <div style={{ ...CARD, maxWidth: '560px', margin: '40px auto', textAlign: 'center' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%', background: '#e9f6f2',
          border: '2px solid #0e7a63', color: '#0e7a63', display: 'flex',
          alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
        }}>
          <CodexIcon icon={cdxIconCheck} size="32px" color="#0e7a63" />
        </div>
        <h2 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 800 }}>
          Unit {unit.number} finished
        </h2>
        <p style={{ color: '#54595d', margin: '0 0 6px', fontSize: '15px' }}>
          {score} of {queue.length} correct ({pct}%).
        </p>
        <p style={{ color: '#72777d', margin: '0 0 24px', fontSize: '13px', lineHeight: 1.5 }}>
          These words are now in your review schedule. They will come back over the next
          days - that spacing is what moves them into long-term memory.
        </p>
        <button onClick={() => { onFinished(); onExit(); }} style={BTN_PRIMARY}>
          Back to the path
        </button>
      </div>
    );
  }

  const label = {
    flashcard: 'Meet the word',
    listen: 'Listen',
    recall: 'What does it mean?',
    'reverse-recall': 'Which word is it?',
    'friend-or-faux': 'Friend or faux?',
    sentence: 'Use it in a sentence',
  }[step.type] || '';

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
        <button onClick={onExit} style={{ ...BTN_GHOST, padding: '6px 12px', fontSize: '13px' }}>
          ← Leave
        </button>
        <span style={{ fontSize: '13px', color: '#54595d', fontWeight: 600 }}>
          Unit {unit.number} · {label} · {index + 1}/{queue.length}
        </span>
      </div>

      <div style={{ height: '8px', background: '#eaecf0', borderRadius: '2px',
                    overflow: 'hidden', marginBottom: '4px' }}>
        <div style={{ height: '100%', background: '#3366cc', transition: 'width .3s ease',
                      width: `${(index / queue.length) * 100}%` }} />
      </div>

      {step.type === 'flashcard' && (
        <FlashcardExercise key={index} word={step.word} onAnswer={handleAnswer} />
      )}
      {step.type === 'recall' && (
        <RecallExercise key={index} word={step.word} words={words} onAnswer={handleAnswer} />
      )}
      {step.type === 'reverse-recall' && (
        <ReverseRecallExercise key={index} word={step.word} words={words} onAnswer={handleAnswer} />
      )}
      {step.type === 'friend-or-faux' && (
        <FriendOrFauxExercise key={index} word={step.word} onAnswer={handleAnswer} />
      )}
      {step.type === 'listen' && (
        <ListeningExercise key={index} word={step.word} words={words} onAnswer={handleAnswer} />
      )}
      {step.type === 'sentence' && (
        <SentenceExercise key={index} unitWords={step.unitWords} profile={profile}
                          onAnswer={handleAnswer} />
      )}

      {showNext && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button onClick={advance} style={BTN_PRIMARY}>
            {index + 1 === queue.length ? 'Finish unit' : 'Next'}
          </button>
        </div>
      )}
    </div>
  );
}

/** A quick review round over words that are due, outside the unit structure. */
function ReviewSession({ dueWords, words, onAnswerWord, onExit }) {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showNext, setShowNext] = useState(false);
  const [done, setDone] = useState(false);
  const word = dueWords[index];

  const handleAnswer = (correct) => {
    if (correct) setScore(s => s + 1);
    onAnswerWord(word.lexemeId, correct);
    setShowNext(true);
  };

  if (done || !word) {
    return (
      <div style={{ ...CARD, maxWidth: '560px', margin: '40px auto', textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 800 }}>Review done</h2>
        <p style={{ color: '#54595d', margin: '0 0 24px' }}>
          {score} of {dueWords.length} recalled correctly.
        </p>
        <button onClick={onExit} style={BTN_PRIMARY}>Back to the path</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: '12px' }}>
        <button onClick={onExit} style={{ ...BTN_GHOST, padding: '6px 12px', fontSize: '13px' }}>
          ← Leave
        </button>
        <span style={{ fontSize: '13px', color: '#54595d', fontWeight: 600 }}>
          Review · {index + 1}/{dueWords.length}
        </span>
      </div>
      <RecallExercise key={index} word={word} words={words} onAnswer={handleAnswer} />
      {showNext && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button
            onClick={() => {
              setShowNext(false);
              if (index + 1 < dueWords.length) setIndex(i => i + 1); else setDone(true);
            }}
            style={BTN_PRIMARY}
          >
            {index + 1 === dueWords.length ? 'Finish' : 'Next'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function LearnPath({
  words, progress, profile, activity, onAnswerWord, onNavigate,
}) {
  const [openUnit, setOpenUnit] = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const units = useMemo(() => buildCourse(words), [words]);
  const state = useMemo(() => courseState(units, progress), [units, progress]);
  const action = useMemo(() => nextAction(units, progress), [units, progress]);
  const targetLang = getLanguage(profile?.targetLang) || {};

  if (reviewing) {
    return (
      <ReviewSession
        dueWords={reviewing} words={words} onAnswerWord={onAnswerWord}
        onExit={() => setReviewing(null)}
      />
    );
  }

  if (openUnit !== null && units[openUnit]) {
    return (
      <UnitLesson
        unit={units[openUnit]} words={words} progress={progress} profile={profile}
        onAnswerWord={onAnswerWord}
        onExit={() => setOpenUnit(null)}
        onFinished={() => {}}
      />
    );
  }

  if (!units.length) {
    return (
      <div style={{ ...CARD, maxWidth: '620px', margin: '40px auto', textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 10px', fontSize: '20px', fontWeight: 800 }}>
          No course yet for {targetLang.name || 'this language'}
        </h2>
        <p style={{ color: '#54595d', fontSize: '14px', lineHeight: 1.6, margin: '0 0 22px' }}>
          Building a course needs words that carry a meaning link in Wikidata. This pair does
          not have enough of them yet - that is a data gap, and it is fixable.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => onNavigate('contribute')} style={BTN_PRIMARY}>
            See what is missing
          </button>
          <button onClick={() => onNavigate('onboarding')} style={BTN_GHOST}>
            Change languages
          </button>
        </div>
      </div>
    );
  }

  const goalPct = Math.min(100, Math.round(((activity?.answeredToday || 0) / (activity?.goal || 10)) * 100));

  return (
    <div className="fadeIn" style={{ maxWidth: '760px', margin: '0 auto', color: '#202122' }}>

      {/* Where you are, in one line */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          Learn {targetLang.name}
        </h1>
        <p style={{ margin: 0, color: '#54595d', fontSize: '14px' }}>
          {state.wordsLearned} of {state.wordsTotal} words learned ·
          unit {Math.min(state.currentIndex + 1, state.totalUnits)} of {state.totalUnits}
        </p>
      </div>

      {/* Today: streak + goal */}
      <div style={{ ...CARD, display: 'flex', alignItems: 'center', gap: '20px',
                    marginBottom: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#3366cc' }}>
            {activity?.streak || 0}
          </div>
          <div style={{ fontSize: '12px', color: '#72777d' }}>
            day{(activity?.streak || 0) === 1 ? '' : 's'} in a row
          </div>
        </div>
        <div style={{ flex: '1 1 200px', minWidth: '160px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px',
                        color: '#54595d', marginBottom: '4px' }}>
            <span>Today's goal</span>
            <span>{activity?.answeredToday || 0} / {activity?.goal || 10} words</span>
          </div>
          <div style={{ height: '8px', background: '#eaecf0', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: goalPct + '%',
                          background: goalPct >= 100 ? '#0e7a63' : '#3366cc',
                          transition: 'width .3s ease' }} />
          </div>
        </div>
      </div>

      {/* The single next action */}
      <div style={{ ...CARD, marginBottom: '24px', background: '#f8f9fa' }}>
        <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 700, color: '#72777d',
                    textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Next
        </p>
        <p style={{ margin: '0 0 14px', fontSize: '15px', color: '#202122' }}>{action.why}</p>
        <button
          style={BTN_PRIMARY}
          onClick={() => {
            if (action.kind === 'review') setReviewing(action.words);
            else if (action.kind === 'empty') onNavigate('onboarding');
            else if (action.kind === 'done') onNavigate('game-modes');
            else setOpenUnit(action.unitIndex);
          }}
        >
          {action.label}
        </button>
        {action.kind !== 'review' && action.dueCount > 0 && (
          <button
            style={{ ...BTN_GHOST, marginLeft: '10px' }}
            onClick={() => {
              const due = [];
              units.forEach(u => u.words.forEach(w => {
                const p = progress?.words?.[w.lexemeId];
                if (p && Date.now() >= p.dueDate) due.push(w);
              }));
              setReviewing(due.slice(0, 10));
            }}
          >
            Review {action.dueCount} due
          </button>
        )}
      </div>

      {/* The path */}
      <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 12px' }}>Your path</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {units.map((unit, i) => {
          const st = state.statuses[i];
          const unlocked = isUnlocked(i, state);
          const isOpen = expanded === i;
          return (
            <div key={unit.index} style={{ ...CARD, padding: '14px 16px',
                                           opacity: unlocked ? 1 : 0.55 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <Ring percent={st.percent} done={st.complete} locked={!unlocked} number={unit.number} />
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>
                    Unit {unit.number} · {unit.theme}
                  </div>
                  <div style={{ fontSize: '12px', color: '#72777d', marginTop: '2px' }}>
                    {(() => {
                      const c = unitContents(unit);
                      const bits = [c.words + ' words'];
                      if (c.withAudio) bits.push(c.withAudio + ' to listen to');
                      if (c.traps) bits.push(c.traps + ' false friend' + (c.traps > 1 ? 's' : ''));
                      bits.push('a sentence');
                      return bits.join(' · ');
                    })()}
                  </div>
                  <div style={{ fontSize: '12px', color: '#72777d', marginTop: '2px' }}>
                    {st.learned}/{st.total} learned
                    {!unlocked && ' · finish the unit above to unlock'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setExpanded(isOpen ? null : i)}
                          style={{ ...BTN_GHOST, padding: '6px 12px', fontSize: '13px' }}>
                    {isOpen ? 'Hide' : 'Words'}
                  </button>
                  <button
                    onClick={() => setOpenUnit(i)}
                    disabled={!unlocked}
                    style={{ ...BTN_PRIMARY, padding: '8px 16px', fontSize: '13px',
                             opacity: unlocked ? 1 : 0.5,
                             cursor: unlocked ? 'pointer' : 'not-allowed' }}
                  >
                    {st.complete ? 'Practise' : st.started ? 'Continue' : 'Start'}
                  </button>
                </div>
              </div>

              {isOpen && (
                <div style={{ marginTop: '12px', borderTop: '1px solid #eaecf0', paddingTop: '12px',
                              display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {unit.words.map(w => {
                    const rel = primaryRelation(w.relations);
                    return (
                      <div key={w.lexemeId} style={{ display: 'flex', gap: '10px',
                                                     alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <LexemeLink id={w.lexemeId} style={{ fontSize: '14px', fontWeight: 700 }}>
                          {w.lemma}
                        </LexemeLink>
                        <span style={{ fontSize: '13px', color: '#54595d' }}>{w.gloss}</span>
                        {wordHeadline(w) && (
                          <span style={{ fontSize: '11px', color: rel ? relationMeta(rel.type).color : '#72777d',
                                         background: rel ? relationMeta(rel.type).bg : '#f8f9fa',
                                         border: '1px solid ' + (rel ? relationMeta(rel.type).border : '#c8ccd1'),
                                         borderRadius: '2px', padding: '1px 6px', fontWeight: 600 }}>
                            {wordHeadline(w)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: '12px', color: '#72777d', marginTop: '20px', lineHeight: 1.6 }}>
        Units are ordered so that words connected to languages you already know come first,
        then the most basic vocabulary - measured by how many of the world's languages have a
        word for the same concept. Want free practice instead?{' '}
        <button onClick={() => onNavigate('game-modes')}
                style={{ background: 'none', border: 'none', padding: 0, color: '#3366cc',
                         cursor: 'pointer', font: 'inherit', textDecoration: 'underline' }}>
          All practice modes
        </button>
      </p>
    </div>
  );
}
