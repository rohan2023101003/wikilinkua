import React, { useState, useEffect } from 'react';
import { CodexIcon, cdxIconCheck, cdxIconClose } from './Badges';

export function FriendOrFauxExercise({ word, onAnswer }) {
  const [selectedAnswer, setSelectedAnswer] = useState(null); // 'same' or 'different'
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    setSelectedAnswer(null);
    setReveal(false);
  }, [word]);

  // Correct answer is 'same' if falseFriend is false, or 'different' if falseFriend is true
  const correctChoice = word.falseFriend === true ? 'different' : 'same';

  const handleSelect = (choice) => {
    if (reveal) return;
    setSelectedAnswer(choice);
    setReveal(true);
    const correct = choice === correctChoice;
    onAnswer(correct);
  };

  return (
    <div
      className="cdx-card friend-or-faux-exercise-card"
      style={{
        maxWidth: '650px',
        margin: '20px auto',
        padding: '28px',
        border: '1px solid #c8ccd1',
        borderRadius: '2px',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        color: '#202122'
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#bf3c2c', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '16px' }}>
          Friend or Faux
        </div>

        <div style={{ fontSize: '36px', fontWeight: '800', marginBottom: '16px', letterSpacing: '-0.02em', color: '#202122' }}>
          {word.lemma} <span style={{ color: '#3366cc' }}>=</span> {word.knownLemma}
        </div>

        <div style={{ fontSize: '15px', color: '#54595d', lineHeight: '1.5' }}>
          Does the target word really mean the same as the known one?
        </div>

        {reveal && (
          <div style={{ marginTop: '20px', padding: '16px 20px', borderRadius: '2px', background: '#f8f9fa', border: '1px solid #c8ccd1', fontSize: '14px', color: '#202122', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {word.falseFriend === true ? (
              <>
                <CodexIcon icon={cdxIconClose} size="16px" color="#bf3c2c" />
                <span><strong>False Friend:</strong> <code>{word.lemma}</code> means <strong>{word.gloss}</strong>, not {word.knownLemma}.</span>
              </>
            ) : (
              <>
                <CodexIcon icon={cdxIconCheck} size="16px" color="#0e7a63" />
                <span><strong>Cognate/True Friend:</strong> <code>{word.lemma}</code> and <code>{word.knownLemma}</code> both mean <strong>{word.gloss}</strong>.</span>
              </>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={() => handleSelect('same')}
          style={{
            flex: 1,
            padding: '20px',
            borderRadius: '2px',
            background: reveal && correctChoice === 'same' ? '#e9f6f2' : (reveal && selectedAnswer === 'same' ? '#fbe9e7' : '#ffffff'),
            border: reveal && correctChoice === 'same' ? '2px solid #0e7a63' : (reveal && selectedAnswer === 'same' ? '2px solid #bf3c2c' : '1.5px solid #a2a9b1'),
            color: reveal && correctChoice === 'same' ? '#0e7a63' : (reveal && selectedAnswer === 'same' ? '#bf3c2c' : '#202122'),
            fontWeight: '700',
            fontSize: '18px',
            cursor: reveal ? 'default' : 'pointer',
            opacity: reveal && selectedAnswer !== 'same' && correctChoice !== 'same' ? 0.35 : 1
          }}
          disabled={reveal}
        >
          Friend
        </button>

        <button
          onClick={() => handleSelect('different')}
          style={{
            flex: 1,
            padding: '20px',
            borderRadius: '2px',
            background: reveal && correctChoice === 'different' ? '#e9f6f2' : (reveal && selectedAnswer === 'different' ? '#fbe9e7' : '#ffffff'),
            border: reveal && correctChoice === 'different' ? '2px solid #0e7a63' : (reveal && selectedAnswer === 'different' ? '2px solid #bf3c2c' : '1.5px solid #a2a9b1'),
            color: reveal && correctChoice === 'different' ? '#0e7a63' : (reveal && selectedAnswer === 'different' ? '#bf3c2c' : '#202122'),
            fontWeight: '700',
            fontSize: '18px',
            cursor: reveal ? 'default' : 'pointer',
            opacity: reveal && selectedAnswer !== 'different' && correctChoice !== 'different' ? 0.35 : 1
          }}
          disabled={reveal}
        >
          Faux
        </button>
      </div>
    </div>
  );
}

export default function FriendOrFaux({ words, onAnswerWord, onNavigate }) {
  const [quizQueue, setQuizQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [showNext, setShowNext] = useState(false);

  useEffect(() => {
    // Both false friends and cognates are eligible
    const eligible = words.filter(w => w.concept && w.gloss && w.knownLemma && w.knownLemma.trim() !== '');
    const shuffled = [...eligible].sort(() => 0.5 - Math.random());
    setQuizQueue(shuffled.slice(0, 10));
    setCurrentIndex(0);
    setScore(0);
    setCompleted(false);
    setShowNext(false);
  }, [words]);

  const handleAnswer = (correct) => {
    const word = quizQueue[currentIndex];
    if (correct) setScore(s => s + 1);
    onAnswerWord(word.lexemeId, correct);
    setShowNext(true);
  };

  const handleNext = () => {
    setShowNext(false);
    if (currentIndex + 1 < quizQueue.length) {
      setCurrentIndex(i => i + 1);
    } else {
      setCompleted(true);
    }
  };

  if (!quizQueue.length) {
    return (
      <div className="cdx-card" style={{ padding: '32px', textAlign: 'center', margin: '40px auto', maxWidth: '650px', border: '1px solid #c8ccd1', borderRadius: '2px', background: '#ffffff' }}>
        <h3 style={{ color: '#bf3c2c', fontSize: '1.25rem', fontWeight: '700' }}>No words available</h3>
        <p style={{ margin: '16px 0 24px', color: '#54595d', fontSize: '14px' }}>We need bridge words with definitions to run this quiz.</p>
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
        <p style={{ color: '#54595d', marginBottom: '24px', fontSize: '14px' }}>You answered {score} out of {quizQueue.length} correctly.</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={() => onNavigate('game-modes')} className="cdx-button" style={{ padding: '12px 24px', borderRadius: '2px', background: '#3366cc', color: '#fff', border: '1px solid #3366cc', fontWeight: '600', cursor: 'pointer' }}>Continue</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ margin: '20px auto', maxWidth: '650px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', color: '#54595d' }}>
        <button onClick={() => onNavigate('game-modes')} className="cdx-button" style={{ fontSize: '0.95rem', padding: '6px 12px', border: '1px solid #c8ccd1', borderRadius: '2px', background: '#fff', cursor: 'pointer', color: '#54595d' }}>← Exit Quiz</button>
        <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>Question {currentIndex + 1} of {quizQueue.length}</span>
      </div>
      <div style={{ height: '8px', background: '#eaecf0', borderRadius: '2px', overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{ height: '100%', background: '#3366cc', width: `${((currentIndex) / quizQueue.length) * 100}%`, transition: 'width 0.3s ease' }} />
      </div>
      <FriendOrFauxExercise word={quizQueue[currentIndex]} onAnswer={handleAnswer} />
      {showNext && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button onClick={handleNext} className="cdx-button" style={{ padding: '12px 28px', fontSize: '1rem', fontWeight: 'bold', borderRadius: '2px', cursor: 'pointer', background: '#3366cc', color: '#fff', border: '1px solid #3366cc' }}>
            {currentIndex + 1 === quizQueue.length ? 'Finish Quiz' : 'Next Question →'}
          </button>
        </div>
      )}
    </div>
  );
}
