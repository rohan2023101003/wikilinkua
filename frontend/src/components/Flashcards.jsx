import React, { useState, useEffect, useCallback } from 'react';
import { playAudio } from '../utils/audio';
import { CognateBadge, PhoneticBadge, SoundIcon } from './Badges';

export function FlashcardExercise({ word, onAnswer }) {
  const [reveal, setReveal] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setReveal(false);
  }, [word]);

  const handlePlayAudio = useCallback(() => {
    if (!word.audioUrl) return;
    playAudio(word.audioUrl, () => setPlaying(true), () => setPlaying(false));
  }, [word.audioUrl]);

  useEffect(() => {
    if (word.audioUrl) {
      handlePlayAudio();
    }
  }, [word.audioUrl, handlePlayAudio]);

  return (
    <div
      className="cdx-card flashcard-exercise-card"
      style={{
        maxWidth: '750px',
        margin: '20px auto',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        border: '1px solid #eaecf0',
        borderRadius: '16px',
        background: '#ffffff',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        color: '#202122'
      }}
    >
      {/* Chrome header text */}
      <div style={{ textAlign: 'center', fontSize: '13px', color: '#72777d', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {!reveal ? 'New word · tap to flip' : 'Review card'}
      </div>

      <div>
        {!reveal ? (
          /* Card Front - Centered */
          <div style={{ width: '100%', border: '1px solid #eaecf0', borderRadius: '12px', padding: '36px 24px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.015)', background: '#f8f9fa' }}>
            <div style={{ fontSize: '40px', fontWeight: '800', letterSpacing: '-.02em', color: '#202122' }}>
              {word.lemma}
            </div>
            {word.targetIpa && (
              <div style={{ fontSize: '15px', color: '#54595d', marginTop: '6px', fontFamily: 'monospace' }}>
                /{word.targetIpa}/
              </div>
            )}
            
            {word.audioUrl && (
              <button 
                onClick={handlePlayAudio}
                style={{ 
                  marginTop: '20px', 
                  display: 'inline-flex', 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '50%', 
                  border: '1.5px solid #3366cc', 
                  color: '#3366cc', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.03)'
                }}
                disabled={playing}
              >
                <SoundIcon playing={playing} />
              </button>
            )}
          </div>
        ) : (
          /* Card Back - Centered */
          <div style={{ width: '100%', border: '1px solid #eaecf0', borderRadius: '12px', padding: '36px 24px', boxShadow: '0 2px 8px rgba(0,0,0,.015)', background: '#f8f9fa', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '18px', color: '#54595d', fontWeight: '600' }}>{word.lemma}</span>
              {word.targetIpa && <span style={{ fontSize: '14px', color: '#72777d', fontFamily: 'monospace' }}>/{word.targetIpa}/</span>}
            </div>
            
            <div style={{ fontSize: '38px', fontWeight: '800', margin: '6px 0 12px 0', letterSpacing: '-0.02em', color: '#202122' }}>
              {word.gloss || word.knownLemma}
            </div>

            <div style={{ fontSize: '15px', color: '#54595d', lineHeight: '1.5', marginBottom: '20px' }}>
              Bridges directly to your known word: <strong>{word.knownLemma}</strong>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
              {word.cognate && <CognateBadge />}
              {word.phoneticMatch && <PhoneticBadge />}
            </div>
          </div>
        )}
      </div>

      {/* Card buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        {!reveal ? (
          <>
            <button 
              onClick={() => setReveal(true)}
              style={{ flex: 1, padding: '14px', borderRadius: '8px', background: '#ffffff', color: '#3366cc', border: '1.5px solid #3366cc', fontWeight: '700', fontSize: '15px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.1s ease' }}
            >
              Show meaning
            </button>
            <button 
              onClick={() => onAnswer(true)}
              style={{ flex: 1, padding: '14px', borderRadius: '8px', background: '#3366cc', color: '#ffffff', border: 'none', fontWeight: '700', fontSize: '15px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.1s ease', boxShadow: '0 2px 8px rgba(51, 102, 204, 0.2)' }}
            >
              I knew it
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={() => onAnswer(false)}
              style={{ flex: 1, padding: '14px', borderRadius: '8px', background: '#ffffff', color: '#3366cc', border: '1.5px solid #3366cc', fontWeight: '700', fontSize: '15px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.1s ease' }}
            >
              Still learning
            </button>
            <button 
              onClick={() => onAnswer(true)}
              style={{ flex: 1, padding: '14px', borderRadius: '8px', background: '#3366cc', color: '#ffffff', border: 'none', fontWeight: '700', fontSize: '15px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.1s ease', boxShadow: '0 2px 8px rgba(51, 102, 204, 0.2)' }}
            >
              I knew it
            </button>
          </>
        )}
      </div>
    </div>
  );
}

FlashcardExercise.isEligible = (word) => {
  return word.concept !== null && word.gloss !== '';
};

export default function Flashcards({ words, onAnswerWord, onNavigate }) {
  const [quizQueue, setQuizQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const eligible = words.filter(FlashcardExercise.isEligible);
    const shuffled = [...eligible].sort(() => 0.5 - Math.random());
    setQuizQueue(shuffled.slice(0, 10));
    setCurrentIndex(0);
    setScore(0);
    setCompleted(false);
  }, [words]);

  const handleAnswer = (correct) => {
    const word = quizQueue[currentIndex];
    if (correct) setScore(s => s + 1);
    onAnswerWord(word.lexemeId, correct);

    if (currentIndex + 1 < quizQueue.length) {
      setCurrentIndex(i => i + 1);
    } else {
      setCompleted(true);
    }
  };

  const handleRestart = () => {
    const eligible = words.filter(FlashcardExercise.isEligible);
    const shuffled = [...eligible].sort(() => 0.5 - Math.random());
    setQuizQueue(shuffled.slice(0, 10));
    setCurrentIndex(0);
    setScore(0);
    setCompleted(false);
  };

  if (!quizQueue.length) {
    return (
      <div className="cdx-card" style={{ padding: '36px', textAlign: 'center', margin: '40px auto', maxWidth: '750px', border: '1px solid #eaecf0', borderRadius: '16px', background: '#ffffff', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <h3 style={{ color: '#bf3c2c', fontSize: '1.25rem', fontWeight: '700' }}>No eligible flashcards!</h3>
        <p style={{ margin: '16px 0 24px', color: '#54595d' }}>We couldn't find any bridge words with meanings to quiz you on.</p>
        <button onClick={() => onNavigate('onboarding')} className="cdx-button cdx-button--action-progressive cdx-button--weight-primary" style={{ padding: '12px 24px', borderRadius: '6px', cursor: 'pointer' }}>
          Configure Profile
        </button>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="cdx-card" style={{ maxWidth: '600px', margin: '40px auto', padding: '40px', textAlign: 'center', border: '1px solid #eaecf0', borderRadius: '16px', background: '#ffffff', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '8px' }}>Lesson complete</h3>
        <p style={{ color: '#54595d', marginBottom: '24px' }}>You answered {score} out of {quizQueue.length} correctly.</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={handleRestart} className="cdx-button cdx-button--action-progressive cdx-button--weight-primary" style={{ padding: '12px 24px', borderRadius: '6px', cursor: 'pointer' }}>Play Again</button>
          <button onClick={() => onNavigate('game-modes')} className="cdx-button cdx-button--weight-quiet" style={{ padding: '12px 24px', borderRadius: '6px', cursor: 'pointer', border: '1px solid #c8ccd1', background: '#fff' }}>Back to Games</button>
        </div>
      </div>
    );
  }

  const currentWord = quizQueue[currentIndex];

  return (
    <div style={{ margin: '20px auto', maxWidth: '750px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', color: '#54595d' }}>
        <button onClick={() => onNavigate('game-modes')} className="cdx-button cdx-button--weight-quiet" style={{ fontSize: '0.95rem', padding: '6px 12px', border: '1px solid #c8ccd1', borderRadius: '6px', background: '#fff', cursor: 'pointer', color: '#54595d' }}>← Exit Quiz</button>
        <span style={{ fontWeight: '600' }}>Card {currentIndex + 1} of {quizQueue.length}</span>
      </div>
      <div style={{ height: '8px', background: '#eaecf0', borderRadius: '4px', overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{ height: '100%', background: '#3366cc', width: `${((currentIndex) / quizQueue.length) * 100}%`, transition: 'width 0.3s ease' }} />
      </div>
      <FlashcardExercise word={currentWord} onAnswer={handleAnswer} />
    </div>
  );
}
