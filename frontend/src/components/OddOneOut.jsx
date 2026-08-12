import React, { useMemo, useState } from 'react';
import { hasEtymologicalLink, primaryRelation, explainRelation } from '../utils/relations';

const ROUNDS = 5;
// Lexeme lemmas can be whole descriptive phrases ("agent chargé de protection et
// sauvegarde du patrimoine naturel"). Those make terrible quiz tiles, so prefer
// short ones and only fall back to longer lemmas when there is nothing else.
const MAX_LEMMA_LEN = 22;

const shuffle = (arr) => [...arr].sort(() => 0.5 - Math.random());

const isTileFriendly = (w) => !!w.lemma && w.lemma.trim().length <= MAX_LEMMA_LEN;

/** Keep the short lemmas, unless that would leave too few to build a question. */
function preferShort(pool, needed) {
  const short = pool.filter(isTileFriendly);
  return short.length >= needed ? short : pool;
}

/** Shrink the type for longer words so every tile stays on one card. */
function lemmaFontSize(lemma) {
  const n = (lemma || '').length;
  if (n <= 10) return '24px';
  if (n <= 16) return '20px';
  if (n <= 24) return '17px';
  return '15px';
}

/**
 * Build every round up front.
 *
 * Doing this once (instead of generating a question inside the exercise on every
 * render) is what keeps the answer stable: the words on screen cannot change
 * underneath the learner after they have tapped one.
 */
function buildRounds(allCognates, allNonCognates) {
  const cognateWords = preferShort(allCognates, 3);
  const nonCognateWords = preferShort(allNonCognates, 3);

  const rounds = [];
  const usedOdd = new Set();

  for (let i = 0; i < ROUNDS; i++) {
    // Alternate the two question shapes where the data allows it, so the answer
    // is never "always the cognate".
    const canOddCognate = cognateWords.length >= 1 && nonCognateWords.length >= 3;
    const canOddNative = nonCognateWords.length >= 1 && cognateWords.length >= 3;
    if (!canOddCognate && !canOddNative) break;

    let oddIsCognate;
    if (canOddCognate && canOddNative) oddIsCognate = i % 2 === 0;
    else oddIsCognate = canOddCognate;

    const oddPool = oddIsCognate ? cognateWords : nonCognateWords;
    const groupPool = oddIsCognate ? nonCognateWords : cognateWords;

    // Prefer an odd word we have not used yet in this quiz.
    const freshOdd = oddPool.filter(w => !usedOdd.has(w.lexemeId));
    const odd = shuffle(freshOdd.length ? freshOdd : oddPool)[0];
    if (!odd) break;
    usedOdd.add(odd.lexemeId);

    const group = shuffle(groupPool.filter(w => w.lexemeId !== odd.lexemeId)).slice(0, 3);
    if (group.length < 3) break;

    rounds.push({
      oddIsCognate,
      odd,
      choices: shuffle([...group, odd]),
    });
  }
  return rounds;
}

export function OddOneOutExercise({ round, answer, onAnswer }) {
  const { odd, oddIsCognate, choices } = round;
  const revealed = !!answer;

  const prompt = oddIsCognate
    ? 'Three of these have no known link to the languages you speak. One shares its history with a word you know. Tap it.'
    : 'Three of these share their history with words you already know. Tap the one that does not.';

  const verdict = revealed && answer.pickedId === odd.lexemeId;

  return (
    <div
      className="cdx-card odd-one-out-exercise-card"
      style={{
        display: 'block', maxWidth: '650px', margin: '20px auto', padding: '28px',
        border: '1px solid #c8ccd1', borderRadius: '2px', background: '#ffffff',
        color: '#202122',
      }}
    >
      <div style={{ fontSize: '13px', fontWeight: '700', color: '#72777d', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '8px', textAlign: 'center' }}>
        Odd one out
      </div>
      <div style={{ fontSize: '15px', color: '#54595d', marginBottom: '20px', textAlign: 'center', fontWeight: '500', lineHeight: 1.5 }}>
        {prompt}
      </div>

      {revealed && (
        <div
          style={{
            marginBottom: '20px', padding: '12px 16px', borderRadius: '2px',
            textAlign: 'center', fontSize: '14px', fontWeight: '600',
            background: verdict ? '#e9f6f2' : '#fbe9e7',
            border: '1px solid ' + (verdict ? '#a3dcd0' : '#f9c5c0'),
            color: verdict ? '#0e7a63' : '#bf3c2c',
          }}
        >
          {verdict
            ? `Correct - "${odd.lemma}" is the odd one out.`
            : `Not quite - "${odd.lemma}" was the odd one out.`}
        </div>
      )}

      <div className="odd-one-out-grid">
        {choices.map((choice) => {
          const isOdd = choice.lexemeId === odd.lexemeId;
          const isPicked = revealed && answer.pickedId === choice.lexemeId;

          // After the guess: the odd word turns red, the group that belongs
          // together turns green. The learner's own pick is outlined.
          const style = {
            border: '1.5px solid #a2a9b1', borderRadius: '2px',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '20px 14px', textAlign: 'center',
            cursor: revealed ? 'default' : 'pointer',
            background: '#ffffff',
          };
          if (revealed) {
            style.border = isOdd ? '2px solid #bf3c2c' : '2px solid #0e7a63';
            style.background = isOdd ? '#fbe9e7' : '#e9f6f2';
            if (isPicked) style.boxShadow = 'inset 0 0 0 2px #202122';
          }

          // "Common agouti · agouti" reads as a bug - show each meaning once.
          const meaning = [choice.gloss, choice.knownLemma]
            .filter(Boolean)
            .filter((v, i, list) => list.findIndex(o => o.toLowerCase() === v.toLowerCase()) === i)
            .join(' · ');

          return (
            <div
              key={choice.lexemeId}
              onClick={() => !revealed && onAnswer(choice)}
              style={style}
              className={'quiz-option-button odd-one-out-option' + (revealed ? ' is-revealed' : '')}
              title={choice.lemma}
            >
              <div style={{ fontSize: lemmaFontSize(choice.lemma), fontWeight: '800', color: '#202122', letterSpacing: '-0.01em', lineHeight: 1.25 }}>
                {choice.lemma}
              </div>

              {!revealed && choice.targetIpa && (
                <div style={{ fontSize: '13px', color: '#72777d', marginTop: '6px', fontFamily: 'monospace' }}>
                  /{choice.targetIpa}/
                </div>
              )}

              {revealed && (
                <>
                  <div style={{ fontSize: '11px', fontWeight: '700', marginTop: '10px', color: isOdd ? '#bf3c2c' : '#0e7a63', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                    {isOdd ? 'Odd one out' : (oddIsCognate ? 'No known link' : 'Shared history')}
                  </div>
                  {meaning && (
                    <div style={{ fontSize: '13px', color: '#54595d', marginTop: '4px', lineHeight: 1.35 }}>
                      {meaning}
                    </div>
                  )}
                  {(() => {
                    const why = explainRelation(primaryRelation(choice.relations), choice.lemma);
                    return why ? (
                      <div style={{ fontSize: '11px', color: '#72777d', marginTop: '6px', lineHeight: 1.35, fontStyle: 'italic' }}>
                        {why}
                      </div>
                    ) : null;
                  })()}
                  {isPicked && (
                    <div style={{ fontSize: '11px', color: '#72777d', marginTop: '6px', fontStyle: 'italic' }}>
                      your answer
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {!revealed && (
        <p style={{ fontSize: '12px', color: '#72777d', textAlign: 'center', marginTop: '18px' }}>
          One guess per question.
        </p>
      )}
    </div>
  );
}

export function OddOneOut({ words, onAnswerWord, onNavigate }) {
  // "Related" now means a real etymological link (shared ancestor or a direct
  // derivation via P5191) - not merely sharing a meaning or looking similar,
  // which is what this game used to treat as a cognate.
  const cognateWords = useMemo(() => words.filter(hasEtymologicalLink), [words]);
  const nonCognateWords = useMemo(() => words.filter(w => !hasEtymologicalLink(w)), [words]);

  const rounds = useMemo(
    () => buildRounds(cognateWords, nonCognateWords),
    [cognateWords, nonCognateWords]
  );

  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState(null);   // { pickedId, correct }
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  const handleAnswer = (choice) => {
    const round = rounds[index];
    const correct = choice.lexemeId === round.odd.lexemeId;
    setAnswer({ pickedId: choice.lexemeId, correct });
    if (correct) setScore(s => s + 1);
    // The odd word is what the question actually tested - grade that one.
    if (onAnswerWord) onAnswerWord(round.odd.lexemeId, correct);
  };

  const handleNext = () => {
    setAnswer(null);
    if (index + 1 < rounds.length) setIndex(i => i + 1);
    else setCompleted(true);
  };

  const restart = () => {
    setIndex(0);
    setAnswer(null);
    setScore(0);
    setCompleted(false);
  };

  if (!rounds.length) {
    return (
      <div className="cdx-card" style={{ padding: '32px', textAlign: 'center', margin: '40px auto', maxWidth: '650px', border: '1px solid #c8ccd1', borderRadius: '2px', background: '#ffffff' }}>
        <h3 style={{ color: '#bf3c2c', fontSize: '1.25rem', fontWeight: '700' }}>Game not available</h3>
        <p style={{ margin: '16px 0 24px', color: '#54595d', fontSize: '14px' }}>
          This mode needs words with a recorded shared history (Wikidata P5191 "derived from
          lexeme") plus three unrelated ones. This language pair does not have enough of that
          data yet - adding derivation statements on Wikidata is what unlocks it.
        </p>
        <button onClick={() => onNavigate('onboarding')} className="cdx-button" style={{ padding: '12px 24px', borderRadius: '2px', background: '#3366cc', color: '#fff', border: '1px solid #3366cc', fontWeight: '600', cursor: 'pointer' }}>
          Configure Profile
        </button>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="cdx-card" style={{ maxWidth: '550px', margin: '40px auto', padding: '32px', textAlign: 'center', border: '1px solid #c8ccd1', borderRadius: '2px', background: '#ffffff' }}>
        <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '8px' }}>Lesson complete</h3>
        <p style={{ color: '#54595d', marginBottom: '24px', fontSize: '14px' }}>
          You answered {score} out of {rounds.length} correctly.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={restart} className="cdx-button" style={{ padding: '12px 24px', borderRadius: '2px', background: '#fff', color: '#202122', border: '1px solid #a2a9b1', fontWeight: '600', cursor: 'pointer' }}>Play again</button>
          <button onClick={() => onNavigate('game-modes')} className="cdx-button" style={{ padding: '12px 24px', borderRadius: '2px', background: '#3366cc', color: '#fff', border: '1px solid #3366cc', fontWeight: '600', cursor: 'pointer' }}>Continue</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ margin: '20px auto', maxWidth: '650px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', color: '#54595d' }}>
        <button onClick={() => onNavigate('game-modes')} className="cdx-button" style={{ fontSize: '0.95rem', padding: '6px 12px', border: '1px solid #c8ccd1', borderRadius: '2px', background: '#fff', cursor: 'pointer', color: '#54595d' }}>← Exit Quiz</button>
        <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>Question {index + 1} of {rounds.length}</span>
      </div>
      <div style={{ height: '8px', background: '#eaecf0', borderRadius: '2px', overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{ height: '100%', background: '#3366cc', width: `${(index / rounds.length) * 100}%`, transition: 'width 0.3s ease' }} />
      </div>

      <OddOneOutExercise
        key={index}
        round={rounds[index]}
        answer={answer}
        onAnswer={handleAnswer}
      />

      {answer && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button onClick={handleNext} className="cdx-button" style={{ padding: '12px 28px', fontSize: '1rem', fontWeight: 'bold', borderRadius: '2px', cursor: 'pointer', background: '#3366cc', color: '#fff', border: '1px solid #3366cc' }}>
            {index + 1 === rounds.length ? 'Finish Quiz' : 'Next Question →'}
          </button>
        </div>
      )}
    </div>
  );
}
