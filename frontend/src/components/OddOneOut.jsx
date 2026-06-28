import React, { useState, useEffect } from 'react';

export function OddOneOutExercise({ cognateWords, nonCognateWords, onAnswer, roundIndex }) {
  const [correctWord, setCorrectWord] = useState(null);
  const [choices, setChoices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reveal, setReveal] = useState(false);
  const [isCognateOdd, setIsCognateOdd] = useState(false);

  useEffect(() => {
    setSelected(null);
    setReveal(false);

    if (cognateWords.length === 0 || nonCognateWords.length === 0) return;

    // 50% chance odd-one-out is the single cognate, 50% chance it is the single non-cognate
    let isCognateOddTemp = Math.random() < 0.5;
    let selectedCorrect = null;
    let selectedDistractors = [];

    if (isCognateOddTemp && cognateWords.length >= 1 && nonCognateWords.length >= 3) {
      // 1 cognate (correct answer), 3 native words
      selectedCorrect = cognateWords[Math.floor(Math.random() * cognateWords.length)];
      
      const shuffledNatives = [...nonCognateWords].sort(() => 0.5 - Math.random());
      selectedDistractors = shuffledNatives.slice(0, 3);
      setIsCognateOdd(true);
    } else if (!isCognateOddTemp && nonCognateWords.length >= 1 && cognateWords.length >= 3) {
      // 1 native word (correct answer), 3 cognates
      selectedCorrect = nonCognateWords[Math.floor(Math.random() * nonCognateWords.length)];
      
      const shuffledCognates = [...cognateWords].sort(() => 0.5 - Math.random());
      selectedDistractors = shuffledCognates.slice(0, 3);
      setIsCognateOdd(false);
    } else {
      // Fallback in case list is tiny: just pick 1 and 1
      selectedCorrect = nonCognateWords[0] || cognateWords[0];
      selectedDistractors = (cognateWords[0] ? [cognateWords[0]] : []).concat(nonCognateWords[1] ? [nonCognateWords[1]] : []);
      isCognateOddTemp = false;
    }

    setCorrectWord(selectedCorrect);
    setIsCognateOdd(isCognateOddTemp);

    const allChoices = [...selectedDistractors, selectedCorrect].sort(() => 0.5 - Math.random());
    setChoices(allChoices);
  }, [cognateWords, nonCognateWords, roundIndex]);

  const handleSelect = (choice) => {
    if (reveal || !correctWord) return;
    setSelected(choice);
    setReveal(true);
    const correct = choice.lexemeId === correctWord.lexemeId;
    onAnswer(correct);
  };

  if (!correctWord) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Generating question...</div>;
  }

  const promptText = isCognateOdd
    ? "Three are non-cognates. Tap the one cognate."
    : "Three are cognates. Tap the one non-cognate.";

  return (
    <div
      className="cdx-card odd-one-out-exercise-card"
      style={{
        maxWidth: '650px',
        margin: '20px auto',
        padding: '28px',
        border: '1px solid #c8ccd1',
        borderRadius: '2px',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        color: '#202122'
      }}
    >
      <div>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#72777d', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '8px', textAlign: 'center' }}>
          Odd one out
        </div>
        <div style={{ fontSize: '15px', color: '#54595d', marginBottom: '24px', textAlign: 'center', fontWeight: '500' }}>
          {promptText}
        </div>
        <div style={{ fontSize: '13px', color: '#72777d', marginBottom: '20px', textAlign: 'center' }}>
          Cognate = word related by origin/similarity to a word you already know.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {choices.map((choice, idx) => {
            const isSelected = selected?.lexemeId === choice.lexemeId;
            const isCorrect = choice.lexemeId === correctWord.lexemeId;
            
            let itemStyle = {
              border: '1.5px solid #a2a9b1',
              borderRadius: '2px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px 16px',
              cursor: reveal ? 'default' : 'pointer',
              background: '#ffffff',
              textAlign: 'center'
            };

            if (reveal) {
              if (isCorrect) {
                itemStyle.border = '2px solid #0e7a63';
                itemStyle.background = '#e9f6f2';
              } else if (isSelected) {
                itemStyle.border = '2px solid #bf3c2c';
                itemStyle.background = '#fbe9e7';
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
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#202122', letterSpacing: '-0.01em' }}>
                  {choice.lemma}
                </div>
                
                {reveal && (
                  <div style={{ fontSize: '13px', color: isCorrect ? '#0e7a63' : '#bf3c2c', marginTop: '6px', fontWeight: '600' }}>
                    {choice.knownLemma} {choice.gloss ? `· ${choice.gloss}` : ''}
                  </div>
                )}
                
                {!reveal && choice.targetIpa && (
                  <div style={{ fontSize: '13px', color: '#72777d', marginTop: '6px', fontFamily: 'monospace' }}>
                    /{choice.targetIpa}/
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function OddOneOut({ words, onNavigate }) {
  const [quizQueue, setQuizQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [showNext, setShowNext] = useState(false);

  // Group words into cognates and non-cognates
  const cognateWords = words.filter(w => w.cognate === true);
  const nonCognateWords = words.filter(w => w.cognate !== true);

  useEffect(() => {
    // Generate 5 questions (short quiz for Odd One Out)
    const questions = [];
    const iterations = Math.min(5, words.length);
    for (let i = 0; i < iterations; i++) {
      questions.push({ id: i });
    }
    setQuizQueue(questions);
    setCurrentIndex(0);
    setScore(0);
    setCompleted(false);
    setShowNext(false);
  }, [words]);

  const handleAnswer = (correct) => {
    if (correct) setScore(s => s + 1);
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

  if (cognateWords.length === 0 || nonCognateWords.length === 0) {
    return (
      <div className="cdx-card" style={{ padding: '32px', textAlign: 'center', margin: '40px auto', maxWidth: '650px', border: '1px solid #c8ccd1', borderRadius: '2px', background: '#ffffff' }}>
        <h3 style={{ color: '#bf3c2c', fontSize: '1.25rem', fontWeight: '700' }}>Game not available</h3>
        <p style={{ margin: '16px 0 24px', color: '#54595d', fontSize: '14px' }}>
          This mode requires a mix of cognates and native words. Try changing your profile settings to languages with more partial matches.
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
      
      <OddOneOutExercise 
        key={currentIndex}
        cognateWords={cognateWords} 
        nonCognateWords={nonCognateWords} 
        roundIndex={currentIndex}
        onAnswer={handleAnswer} 
      />

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
