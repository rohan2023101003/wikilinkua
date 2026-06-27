import React, { useState, useEffect } from 'react';

export function MatchPairsExercise({ words, onComplete }) {
  const [leftItems, setLeftItems] = useState([]);
  const [rightItems, setRightItems] = useState([]);
  const [selectedLeft, setSelectedLeft] = useState(null); // lexemeId
  const [selectedRight, setSelectedRight] = useState(null); // gloss string
  
  const [matchedLeft, setMatchedLeft] = useState(new Set());
  const [matchedRight, setMatchedRight] = useState(new Set());
  const [wrongLeft, setWrongLeft] = useState(null);
  const [wrongRight, setWrongRight] = useState(null);

  useEffect(() => {
    // Generate lists
    const shuffledLeft = [...words].sort(() => 0.5 - Math.random());
    const shuffledRight = [...words].map(w => ({ lexemeId: w.lexemeId, gloss: w.gloss || w.knownLemma })).sort(() => 0.5 - Math.random());
    
    setLeftItems(shuffledLeft);
    setRightItems(shuffledRight);
    
    setSelectedLeft(null);
    setSelectedRight(null);
    setMatchedLeft(new Set());
    setMatchedRight(new Set());
    setWrongLeft(null);
    setWrongRight(null);
  }, [words]);

  const handleLeftClick = (lexemeId) => {
    if (matchedLeft.has(lexemeId) || wrongLeft) return;
    setSelectedLeft(lexemeId);
    
    // Check if we have a match
    if (selectedRight) {
      checkMatch(lexemeId, selectedRight);
    }
  };

  const handleRightClick = (item) => {
    if (matchedRight.has(item.gloss) || wrongRight) return;
    setSelectedRight(item);
    
    // Check if we have a match
    if (selectedLeft) {
      checkMatch(selectedLeft, item);
    }
  };

  const checkMatch = (leftId, rightItem) => {
    if (leftId === rightItem.lexemeId) {
      // Correct Match!
      const newMatchedLeft = new Set(matchedLeft).add(leftId);
      const newMatchedRight = new Set(matchedRight).add(rightItem.gloss);
      
      setMatchedLeft(newMatchedLeft);
      setMatchedRight(newMatchedRight);
      setSelectedLeft(null);
      setSelectedRight(null);

      // Check if all matched
      if (newMatchedLeft.size === words.length) {
        setTimeout(() => {
          onComplete(true);
        }, 800);
      }
    } else {
      // Wrong Match
      setWrongLeft(leftId);
      setWrongRight(rightItem.gloss);
      setSelectedLeft(null);
      setSelectedRight(null);
      
      setTimeout(() => {
        setWrongLeft(null);
        setWrongRight(null);
      }, 1000);
    }
  };

  return (
    <div
      className="cdx-card match-pairs-exercise-card"
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
      <div>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#72777d', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '18px', textAlign: 'center' }}>
          Match each pair
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px' }}>
          {/* Left Column (Target Words) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            {leftItems.map(item => {
              const isSelected = selectedLeft === item.lexemeId;
              const isMatched = matchedLeft.has(item.lexemeId);
              const isWrong = wrongLeft === item.lexemeId;

              let btnStyle = {
                padding: '16px 20px',
                border: '1.5px solid #a2a9b1',
                borderRadius: '2px',
                fontSize: '17px',
                fontWeight: '700',
                textAlign: 'center',
                cursor: isMatched ? 'default' : 'pointer',
                background: '#ffffff'
              };

              if (isMatched) {
                btnStyle.border = '2px solid #0e7a63';
                btnStyle.background = '#e9f6f2';
                btnStyle.color = '#0e7a63';
              } else if (isSelected) {
                btnStyle.border = '2px solid #3366cc';
                btnStyle.background = '#eaf3ff';
                btnStyle.color = '#3366cc';
              } else if (isWrong) {
                btnStyle.border = '2px solid #bf3c2c';
                btnStyle.background = '#fbe9e7';
                btnStyle.color = '#bf3c2c';
              }

              return (
                <div 
                  key={item.lexemeId} 
                  onClick={() => handleLeftClick(item.lexemeId)} 
                  style={btnStyle}
                  className="quiz-option-button"
                >
                  {item.lemma}
                </div>
              );
            })}
          </div>

          {/* Right Column (Gloss Meanings) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            {rightItems.map((item, idx) => {
              const isSelected = selectedRight?.gloss === item.gloss;
              const isMatched = matchedRight.has(item.gloss);
              const isWrong = wrongRight === item.gloss;

              let btnStyle = {
                padding: '16px 20px',
                border: '1.5px solid #a2a9b1',
                borderRadius: '2px',
                fontSize: '15px',
                fontWeight: '600',
                textAlign: 'center',
                cursor: isMatched ? 'default' : 'pointer',
                background: '#ffffff',
                minHeight: '56px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              };

              if (isMatched) {
                btnStyle.border = '2px solid #0e7a63';
                btnStyle.background = '#e9f6f2';
                btnStyle.color = '#0e7a63';
              } else if (isSelected) {
                btnStyle.border = '2px solid #3366cc';
                btnStyle.background = '#eaf3ff';
                btnStyle.color = '#3366cc';
              } else if (isWrong) {
                btnStyle.border = '2px solid #bf3c2c';
                btnStyle.background = '#fbe9e7';
                btnStyle.color = '#bf3c2c';
              }

              return (
                <div 
                  key={idx} 
                  onClick={() => handleRightClick(item)} 
                  style={btnStyle}
                  className="quiz-option-button"
                >
                  {item.gloss}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      <div style={{ textAlign: 'center', fontSize: '13px', color: '#72777d', fontWeight: '500' }}>
        Tap a word on the left, then its translation match on the right
      </div>
    </div>
  );
}

export function MatchPairs({ words, onNavigate }) {
  const [sets, setSets] = useState([]);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    // Partition words into sets of 3
    const eligible = words.filter(w => w.concept && w.gloss);
    const shuffled = [...eligible].sort(() => 0.5 - Math.random());
    
    const generatedSets = [];
    for (let i = 0; i < shuffled.length; i += 3) {
      if (i + 3 <= shuffled.length) {
        generatedSets.push(shuffled.slice(i, i + 3));
      }
    }

    // Limit to 3 sets (total 9 matches)
    setSets(generatedSets.slice(0, 3));
    setCurrentSetIndex(0);
    setCompleted(false);
  }, [words]);

  const handleSetComplete = () => {
    if (currentSetIndex + 1 < sets.length) {
      setCurrentSetIndex(i => i + 1);
    } else {
      setCompleted(true);
    }
  };

  if (!sets.length) {
    return (
      <div className="cdx-card" style={{ padding: '32px', textAlign: 'center', margin: '40px auto', maxWidth: '650px', border: '1px solid #c8ccd1', borderRadius: '2px', background: '#ffffff' }}>
        <h3 style={{ color: '#bf3c2c', fontSize: '1.25rem', fontWeight: '700' }}>Game not available</h3>
        <p style={{ margin: '16px 0 24px', color: '#54595d', fontSize: '14px' }}>We need at least 3 bridge words with meanings to run this game.</p>
        <button onClick={() => onNavigate('onboarding')} className="cdx-button" style={{ padding: '12px 24px', borderRadius: '2px', background: '#3366cc', color: '#fff', border: '1px solid #3366cc', fontWeight: '600', cursor: 'pointer' }}>
          Configure Profile
        </button>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="cdx-card" style={{ maxWidth: '550px', margin: '40px auto', padding: '32px', textAlign: 'center', border: '1px solid #c8ccd1', borderRadius: '2px', background: '#ffffff' }}>
        <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '8px' }}>Matching complete!</h3>
        <p style={{ color: '#54595d', marginBottom: '24px', fontSize: '14px' }}>Great job matching all vocabulary pairs.</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={() => onNavigate('game-modes')} className="cdx-button" style={{ padding: '12px 24px', borderRadius: '2px', background: '#3366cc', color: '#fff', border: '1px solid #3366cc', fontWeight: '600', cursor: 'pointer' }}>Continue</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ margin: '20px auto', maxWidth: '650px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', color: '#54595d' }}>
        <button onClick={() => onNavigate('game-modes')} className="cdx-button" style={{ fontSize: '0.95rem', padding: '6px 12px', border: '1px solid #c8ccd1', borderRadius: '2px', background: '#fff', cursor: 'pointer', color: '#54595d' }}>← Exit Match</button>
        <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>Set {currentSetIndex + 1} of {sets.length}</span>
      </div>
      <div style={{ height: '8px', background: '#eaecf0', borderRadius: '2px', overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{ height: '100%', background: '#3366cc', width: `${((currentSetIndex) / sets.length) * 100}%`, transition: 'width 0.3s ease' }} />
      </div>
      
      <MatchPairsExercise 
        words={sets[currentSetIndex]} 
        onComplete={handleSetComplete} 
      />
    </div>
  );
}
