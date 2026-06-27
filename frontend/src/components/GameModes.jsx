import React, { useState, useEffect } from 'react';
import { FlashcardExercise } from './Flashcards';
import { FriendOrFauxExercise } from './FriendOrFaux';
import { RecallExercise } from './Recall';
import { ReverseRecallExercise } from './ReverseRecall';
import { isWordDue } from '../utils/srs';
import { LANGUAGES } from '../utils/sparql';
import { CodexIcon, cdxIconCheck } from './Badges';

// Main Mode Session Manager Component
function MainModeSession({ words, progress, onAnswerWord, onNavigate }) {
  const [sessionQueue, setSessionQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [showNext, setShowNext] = useState(false);

  // Initialize the queue ONCE when the component mounts
  useEffect(() => {
    // 1. Filter due words
    const dueWords = words.filter(w => {
      const srs = progress.words?.[w.lexemeId];
      return srs && isWordDue(srs) && w.concept && w.gloss;
    });

    // 2. Filter new words
    const newWords = words.filter(w => !progress.words?.[w.lexemeId] && w.concept && w.gloss);

    // Shuffle
    const shuffledDue = [...dueWords].sort(() => 0.5 - Math.random());
    const shuffledNew = [...newWords].sort(() => 0.5 - Math.random());

    // Prioritize due first, limit to 10 total
    const selectedWords = [...shuffledDue, ...shuffledNew].slice(0, 10);

    // Map to exercise type
    const queue = selectedWords.map(w => {
      const exercises = [];
      if (w.concept !== null && w.gloss !== '') {
        exercises.push('flashcard');
        exercises.push('recall');
        exercises.push('reverse-recall');
      }
      if (w.falseFriend !== null && w.falseFriend !== undefined && w.knownLemma && w.knownLemma.trim() !== '') {
        exercises.push('friend-or-faux');
      }

      // Fallback
      const type = exercises.length > 0 
        ? exercises[Math.floor(Math.random() * exercises.length)] 
        : 'flashcard';

      return { word: w, type };
    });

    setSessionQueue(queue);
    setCurrentIndex(0);
    setScore(0);
    setCompleted(false);
    setShowNext(false);
  }, [words]); // Depend ONLY on words, NOT on progress! This prevents re-shuffling on answer.

  const handleAnswer = (correct) => {
    const item = sessionQueue[currentIndex];
    
    if (correct) {
      setScore(s => s + 1);
    }

    // Update Leitner progress (parent callback)
    onAnswerWord(item.word.lexemeId, correct);
    setShowNext(true);
  };

  const handleNext = () => {
    setShowNext(false);
    if (currentIndex + 1 < sessionQueue.length) {
      setCurrentIndex(i => i + 1);
    } else {
      setCompleted(true);
    }
  };

  if (!sessionQueue.length) {
    return (
      <div className="cdx-card" style={{ padding: '32px', textAlign: 'center', margin: '40px auto', maxWidth: '600px', border: '1px solid #c8ccd1', borderRadius: '2px', background: '#ffffff' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '8px' }}>Queue clear</h3>
        <p style={{ margin: '16px 0 24px', color: '#54595d', fontSize: '0.95rem' }}>
          You have no due or new words left to review. Great job!
        </p>
        <button 
          onClick={() => onNavigate('bridge-words')} 
          style={{ padding: '12px 28px', borderRadius: '2px', background: '#3366cc', color: '#fff', border: '1px solid #3366cc', fontWeight: '600', cursor: 'pointer' }}
        >
          Explore Bridge Words
        </button>
      </div>
    );
  }

  if (completed) {
    return (
      <div 
        className="cdx-card session-completed-card" 
        style={{ 
          maxWidth: '500px', 
          margin: '40px auto', 
          padding: '32px',
          textAlign: 'center',
          border: '1px solid #c8ccd1',
          borderRadius: '2px',
          background: '#ffffff',
          color: '#202122'
        }}
      >
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#e9f6f2', border: '2px solid #0e7a63', color: '#0e7a63', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
          <CodexIcon icon={cdxIconCheck} size="32px" color="#0e7a63" />
        </div>
        <div style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.02em' }}>Lesson complete!</div>
        <div style={{ fontSize: '15px', color: '#54595d', marginTop: '8px', marginBottom: '24px' }}>
          Nicely done — you've completed today's practice session.
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1px', background: '#c8ccd1', border: '1px solid #c8ccd1', borderRadius: '2px', overflow: 'hidden', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', background: '#fff', fontSize: '15px' }}>
            <span style={{ color: '#54595d' }}>Words reviewed</span>
            <b style={{ color: '#202122' }}>{sessionQueue.length}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', background: '#fff', fontSize: '15px' }}>
            <span style={{ color: '#54595d' }}>Correct responses</span>
            <b style={{ color: '#0e7a63' }}>{score} / {sessionQueue.length}</b>
          </div>
        </div>

        <button
          onClick={() => onNavigate('game-modes')}
          style={{ 
            width: '100%', 
            padding: '14px', 
            borderRadius: '2px', 
            background: '#3366cc', 
            color: '#fff', 
            border: '1px solid #3366cc', 
            fontWeight: '700', 
            fontSize: '16px', 
            cursor: 'pointer'
          }}
        >
          Continue to Dashboard
        </button>
      </div>
    );
  }

  const currentItem = sessionQueue[currentIndex];

  return (
    <div className="main-mode-session-container fadeIn" style={{ margin: '20px auto', maxWidth: '750px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', color: '#54595d' }}>
        <button 
          onClick={() => onNavigate('game-modes')}
          className="cdx-button cdx-button--weight-quiet"
          style={{ fontSize: '0.95rem', padding: '6px 12px', border: '1px solid #c8ccd1', borderRadius: '2px', background: '#fff', cursor: 'pointer', color: '#54595d' }}
        >
          ← Exit Session
        </button>
        <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>
          Exercise {currentIndex + 1} of {sessionQueue.length}
        </span>
      </div>

      <div style={{ height: '8px', background: '#eaecf0', borderRadius: '2px', overflow: 'hidden', marginBottom: '24px' }}>
        <div 
          style={{ 
            height: '100%', 
            background: '#3366cc', 
            width: `${((currentIndex) / sessionQueue.length) * 100}%`,
            transition: 'width 0.3s ease'
          }}
        />
      </div>

      <div style={{ background: '#eaf3ff', padding: '10px 20px', borderRadius: '2px', border: '1px solid #b8d4f9', marginBottom: '20px', fontSize: '13px', color: '#3366cc', textAlign: 'center', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.06em' }}>
        Mode: {
          currentItem.type === 'flashcard' ? 'Flashcard' : 
          currentItem.type === 'friend-or-faux' ? 'Friend or Faux' :
          currentItem.type === 'recall' ? 'Recall Meaning' : 'Target Word Recall'
        }
      </div>

      {currentItem.type === 'flashcard' && (
        <FlashcardExercise 
          word={currentItem.word} 
          onAnswer={handleAnswer} 
        />
      )}
      
      {currentItem.type === 'friend-or-faux' && (
        <FriendOrFauxExercise 
          word={currentItem.word} 
          onAnswer={handleAnswer} 
        />
      )}

      {currentItem.type === 'recall' && (
        <RecallExercise 
          word={currentItem.word} 
          words={words} 
          onAnswer={handleAnswer} 
        />
      )}

      {currentItem.type === 'reverse-recall' && (
        <ReverseRecallExercise 
          word={currentItem.word} 
          words={words} 
          onAnswer={handleAnswer} 
        />
      )}

      {showNext && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button
            onClick={handleNext}
            style={{ 
              padding: '14px 32px', 
              fontSize: '1rem', 
              fontWeight: 'bold', 
              borderRadius: '6px', 
              background: '#3366cc', 
              color: '#fff', 
              border: 'none', 
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(51,102,204,0.2)'
            }}
          >
            {currentIndex + 1 === sessionQueue.length ? 'Finish Session' : 'Next Exercise →'}
          </button>
        </div>
      )}
    </div>
  );
}

// Game Modes Selection Dashboard
export default function GameModes({ words, progress, onAnswerWord, onNavigate, totalTargetMapped }) {
  const [activeSession, setActiveSession] = useState(false);

  const bridgeWords = words.filter(w => w.isBridge);
  const overlapPct = totalTargetMapped > 0
    ? Math.min(100, Math.round((bridgeWords.length / totalTargetMapped) * 100))
    : 0;

  const targetLangObj = LANGUAGES.find(l => l.qid === words[0]?.targetLang) || {};

  // Count due words
  const dueCount = words.filter(w => {
    const srs = progress.words?.[w.lexemeId];
    return srs && isWordDue(srs);
  }).length;

  const newCount = words.filter(w => !progress.words?.[w.lexemeId]).length;
  const learningCount = words.filter(w => {
    const srs = progress.words?.[w.lexemeId];
    return srs && srs.boxLevel > 0 && srs.boxLevel < 5;
  }).length;
  const masteredCount = words.filter(w => {
    const srs = progress.words?.[w.lexemeId];
    return srs && srs.boxLevel >= 5;
  }).length;

  if (activeSession) {
    return (
      <MainModeSession 
        words={words} 
        progress={progress} 
        onAnswerWord={onAnswerWord} 
        onNavigate={(view) => {
          setActiveSession(false);
          onNavigate(view);
        }}
      />
    );
  }

  // Drill modes config
  const drillModes = [
    { 
      id: 'flashcards', 
      title: 'Bridge flashcards', 
      subtitle: 'Reveal new bridge words', 
      bg: '#eaf3ff', 
      color: '#3366cc',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M9 12h6"/><path d="M8 8a4 4 0 0 0 0 8"/><path d="M16 8a4 4 0 0 1 0 8"/>
        </svg>
      )
    },
    { 
      id: 'friend-or-faux', 
      title: 'Friend or Faux', 
      subtitle: 'Spot the false friends', 
      bg: '#fbe9e7', 
      color: '#bf3c2c',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4 2 20h20z"/><path d="M12 10v4"/>
        </svg>
      )
    },
    { 
      id: 'match-pairs', 
      title: 'Match Pairs', 
      subtitle: 'Pair words to meanings', 
      bg: '#e9f6f2', 
      color: '#0e7a63',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 8 3 12l4 4"/><path d="M17 8l4 4-4 4"/><path d="M14 4 10 20"/>
        </svg>
      )
    },
    { 
      id: 'odd-one-out', 
      title: 'Odd one out', 
      subtitle: 'Break the cognate set', 
      bg: '#f8f9fa', 
      color: '#54595d',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 17.5h7"/>
        </svg>
      )
    },
    { 
      id: 'recall', 
      title: 'Recall', 
      subtitle: 'Select word meanings', 
      bg: '#f1edf9', 
      color: '#6b4ba3',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
        </svg>
      )
    },
    { 
      id: 'reverse-recall', 
      title: 'Reverse recall', 
      subtitle: 'Meaning to target word', 
      bg: '#eaf3ff', 
      color: '#3366cc',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 1 3 6.7L3 21"/><path d="M3 16v5h5"/>
        </svg>
      )
    },
    {
      id: 'phrases',
      title: 'Phrases',
      subtitle: 'Sentences using words you know',
      bg: '#fff4e5',
      color: '#b3541e',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      )
    }
  ];

  return (
    <div className="fadeIn" style={{ maxWidth: '1100px', margin: '0 auto', color: '#202122' }}>
      
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            WikiLinkua Dashboard
          </h1>
          <div style={{ fontSize: '15px', color: '#54595d' }}>
            Target Language: <strong style={{ color: '#3366cc' }}>{targetLangObj.name || 'Select a language'}</strong>
          </div>
        </div>

        <button 
          onClick={() => onNavigate('bridge-words', { filter: 'Bridge' })}
          style={{
            padding: '10px 18px',
            borderRadius: '2px',
            border: '1px solid #3366cc',
            background: '#eaf3ff',
            color: '#3366cc',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = '#d2e4ff'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = '#eaf3ff'; }}
        >
          {overlapPct}% vocabulary overlap
        </button>
      </div>

      {/* Main Grid Layout */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '4fr 6fr', gap: '32px' }}>
        
        {/* Left Column: Daily Recommended Lesson Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div 
            className="cdx-card" 
            style={{ 
              border: '1px solid #c8ccd1', 
              borderRadius: '2px', 
              padding: '28px', 
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '340px'
            }}
          >
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#3366cc', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '12px' }}>
                Daily Recommended Lesson
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 10px 0', letterSpacing: '-0.01em' }}>
                Mixed Lesson
              </h2>
              <p style={{ fontSize: '15px', color: '#54595d', margin: '0 0 24px 0', lineHeight: '1.5' }}>
                A custom session of 10 words mixed with reviews and new vocabulary calculated by the Leitner system.
              </p>

              {/* Stats overview boxes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <div style={{ background: '#f8f9fa', padding: '12px 16px', borderRadius: '2px', border: '1px solid #c8ccd1' }}>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#bf3c2c' }}>{dueCount}</div>
                  <div style={{ fontSize: '12px', color: '#54595d', marginTop: '2px' }}>Due for review</div>
                </div>
                <div style={{ background: '#f8f9fa', padding: '12px 16px', borderRadius: '2px', border: '1px solid #c8ccd1' }}>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#3366cc' }}>{newCount}</div>
                  <div style={{ fontSize: '12px', color: '#54595d', marginTop: '2px' }}>Unseen words</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveSession(true)}
              style={{ 
                width: '100%',
                padding: '14px', 
                borderRadius: '2px', 
                background: '#3366cc', 
                color: '#fff', 
                border: '1px solid #3366cc',
                fontWeight: '700', 
                fontSize: '16px', 
                textAlign: 'center',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#2a52be'}
              onMouseOut={(e) => e.currentTarget.style.background = '#3366cc'}
            >
              Start Practice Session
            </button>
          </div>

          {/* Quick learning progress report */}
          <div style={{ border: '1px solid #c8ccd1', borderRadius: '2px', padding: '24px', background: '#ffffff' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 16px 0' }}>Vocabulary Progress</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span style={{ color: '#54595d' }}>Mastered ({masteredCount})</span>
                  <strong>{words.length ? Math.round((masteredCount / words.length) * 100) : 0}%</strong>
                </div>
                <div style={{ height: '6px', background: '#eaecf0', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#0e7a63', width: `${words.length ? (masteredCount / words.length) * 100 : 0}%` }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span style={{ color: '#54595d' }}>Learning ({learningCount})</span>
                  <strong>{words.length ? Math.round((learningCount / words.length) * 100) : 0}%</strong>
                </div>
                <div style={{ height: '6px', background: '#eaecf0', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#3366cc', width: `${words.length ? (learningCount / words.length) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Practice Single Game Mode Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ border: '1px solid #c8ccd1', borderRadius: '2px', padding: '28px', background: '#ffffff' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 6px 0', letterSpacing: '-0.01em' }}>
              Practice single skills
            </h2>
            <p style={{ fontSize: '14px', color: '#54595d', margin: '0 0 24px 0' }}>
              Focus on a specific practice mode to target different cognitive aspects of vocabulary.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              {drillModes.map(mode => (
                <div 
                  key={mode.id}
                  onClick={() => onNavigate(mode.id)}
                  style={{ 
                    display: 'flex', 
                    gap: '16px', 
                    alignItems: 'center', 
                    padding: '18px', 
                    border: '1px solid #c8ccd1', 
                    borderRadius: '2px',
                    cursor: 'pointer',
                    background: '#ffffff'
                  }}
                  className="drill-mode-row"
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#3366cc';
                    e.currentTarget.style.background = '#f8f9fa';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = '#c8ccd1';
                    e.currentTarget.style.background = '#ffffff';
                  }}
                >
                  <div 
                    style={{ 
                      width: '44px', 
                      height: '44px', 
                      borderRadius: '2px', 
                      background: mode.bg, 
                      color: mode.color, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      flexShrink: 0 
                    }}
                  >
                    {mode.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '15px', color: '#202122' }}>{mode.title}</div>
                    <div style={{ fontSize: '12px', color: '#54595d', marginTop: '2px' }}>{mode.subtitle}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Responsive Stacking CSS */}
      <style>{`
        @media (max-width: 900px) {
          .dashboard-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
        }
      `}</style>
    </div>
  );
}
