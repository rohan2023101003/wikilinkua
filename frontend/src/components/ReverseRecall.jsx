import React, { useState, useEffect } from 'react';
import { playAudio } from '../utils/audio';

export function ReverseRecallExercise({ word, words, onAnswer }) {
  const [choices, setChoices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    setSelected(null);
    setReveal(false);

    // Distractors are target lemmas of other words
    const otherWords = words.filter(w => w.lexemeId !== word.lexemeId && w.lemma !== word.lemma);
    
    const shuffledOthers = [...otherWords].sort(() => 0.5 - Math.random());
    // Map to full word object so we can play audio and get details
    const distractors = shuffledOthers.slice(0, 2);

    const allChoices = [...distractors, word].sort(() => 0.5 - Math.random());
    setChoices(allChoices);
  }, [word, words]);

  const handleSelect = (choice) => {
    if (reveal) return;
    setSelected(choice);
    setReveal(true);

    // Autoplay pronunciation for the clicked choice
    if (choice.audioUrl) {
      playAudio(choice.audioUrl, () => {}, () => {});
    }

    const correct = choice.lexemeId === word.lexemeId;
    onAnswer(correct);
  };

  return (
    <div 
      className="cdx-card reverse-recall-exercise-card" 
      style={{ 
        maxWidth: '750px', 
        minHeight: '380px',
        margin: '20px auto', 
        padding: '32px',
        border: '1px solid #eaecf0',
        borderRadius: '16px',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        color: '#202122'
      }}
    >
      <div>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#72777d', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px', textAlign: 'center' }}>
          Select the correct target word translation for:
        </div>

        {/* Gloss Header Panel */}
        <div style={{ border: '1px solid #eaecf0', borderRadius: '12px', padding: '32px 24px', textAlign: 'center', margin: '12px 0 24px 0', background: '#f8f9fa' }}>
          <div style={{ fontSize: '36px', fontWeight: '800', letterSpacing: '-0.02em' }}>{word.conceptName || word.gloss || word.knownLemma}</div>
        </div>

        {/* Options Row/Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {choices.map((choice, idx) => {
            const isSelected = selected?.lexemeId === choice.lexemeId;
            const isCorrect = choice.lexemeId === word.lexemeId;
            
            let itemStyle = {
              padding: '20px',
              border: '1px solid #eaecf0',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: '700',
              cursor: reveal ? 'default' : 'pointer',
              textAlign: 'center',
              background: '#ffffff',
              transition: 'all 0.15s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
            };

            if (reveal) {
              if (isCorrect) {
                itemStyle.border = '2px solid #3366cc';
                itemStyle.background = '#eaf3ff';
                itemStyle.color = '#3366cc';
              } else if (isSelected) {
                itemStyle.border = '2px solid #bf3c2c';
                itemStyle.background = '#fbe9e7';
                itemStyle.color = '#bf3c2c';
              } else {
                itemStyle.opacity = 0.55;
              }
            }

            return (
              <div 
                key={idx} 
                onClick={() => handleSelect(choice)} 
                style={itemStyle}
                className="quiz-option-button"
              >
                <div>{choice.lemma}</div>
                {choice.targetIpa && (
                  <div style={{ fontSize: '13px', fontWeight: '500', color: reveal && isCorrect ? '#3366cc' : '#72777d', marginTop: '4px', fontFamily: 'monospace' }}>
                    /{choice.targetIpa}/
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: '13px', color: '#72777d', marginTop: '24px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/>
          </svg>
          Tap any option to play its audio pronunciation
        </div>
      </div>
    </div>
  );
}

export function ReverseRecall({ words, onAnswerWord, onNavigate }) {
  const [quizQueue, setQuizQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [showNext, setShowNext] = useState(false);

  useEffect(() => {
    const eligible = words.filter(w => w.concept && w.gloss);
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
      <div className="cdx-card" style={{ padding: '36px', textAlign: 'center', margin: '40px auto', maxWidth: '750px', border: '1px solid #eaecf0', borderRadius: '16px', background: '#ffffff', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <h3 style={{ color: '#bf3c2c', fontSize: '1.25rem', fontWeight: '700' }}>No words available</h3>
        <p style={{ margin: '16px 0 24px', color: '#54595d' }}>We need bridge words with definitions to run this quiz.</p>
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
          <button onClick={() => onNavigate('game-modes')} className="cdx-button cdx-button--action-progressive cdx-button--weight-primary" style={{ padding: '12px 24px', borderRadius: '6px', cursor: 'pointer' }}>Continue</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ margin: '20px auto', maxWidth: '750px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', color: '#54595d' }}>
        <button onClick={() => onNavigate('game-modes')} className="cdx-button cdx-button--weight-quiet" style={{ fontSize: '0.95rem', padding: '6px 12px', border: '1px solid #c8ccd1', borderRadius: '6px', background: '#fff', cursor: 'pointer', color: '#54595d' }}>← Exit Quiz</button>
        <span style={{ fontWeight: '600' }}>Question {currentIndex + 1} of {quizQueue.length}</span>
      </div>
      <div style={{ height: '8px', background: '#eaecf0', borderRadius: '4px', overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{ height: '100%', background: '#3366cc', width: `${((currentIndex) / quizQueue.length) * 100}%`, transition: 'width 0.3s ease' }} />
      </div>
      <ReverseRecallExercise word={quizQueue[currentIndex]} words={words} onAnswer={handleAnswer} />
      {showNext && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button onClick={handleNext} className="cdx-button cdx-button--action-progressive cdx-button--weight-primary" style={{ padding: '12px 28px', fontSize: '1rem', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>
            {currentIndex + 1 === quizQueue.length ? 'Finish Quiz' : 'Next Question →'}
          </button>
        </div>
      )}
    </div>
  );
}
