import React, { useState, useEffect } from 'react';
import Onboarding from './components/Onboarding';
import BridgeWordsList from './components/BridgeWordsList';
import Flashcards from './components/Flashcards';
import FriendOrFaux from './components/FriendOrFaux';
import WordsStatus from './components/WordsStatus';
import GameModes from './components/GameModes';
import PhrasesMode from './components/PhrasesMode';

// Import new game modes
import { Recall } from './components/Recall';
import { ReverseRecall } from './components/ReverseRecall';
import { OddOneOut } from './components/OddOneOut';
import { MatchPairs } from './components/MatchPairs';

import { loadAndNormalizeWords } from './utils/sparql';
import { updateLeitnerProgress } from './utils/srs';

const STORAGE_KEY = 'wikilinkua_progress';

export default function App() {
  const [profile, setProfile] = useState(null);
  const [progress, setProgress] = useState({ words: {} });
  const [words, setWords] = useState([]);
  const [totalTargetMapped, setTotalTargetMapped] = useState(0);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState(() => {
    const path = window.location.pathname;
    if (path.includes('/false-friends')) return 'friend-or-faux';
    if (path.includes('/wikilinkua')) return 'bridge-words';
    return 'game-modes';
  });

  // 1. Initial load of profile & progress from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.profile && parsed.profile.knownLangs && parsed.profile.targetLang) {
          setProfile(parsed.profile);
          setProgress({ words: parsed.words || {} });
          setView('game-modes');
        } else {
          setView('onboarding');
        }
      } else {
        setView('onboarding');
      }
    } catch (e) {
      console.error("Failed to load progress from localStorage:", e);
      setView('onboarding');
    }
  }, []);

  // 2. Load word data from Wikidata whenever profile changes
  useEffect(() => {
    if (!profile) return;

    let isCurrent = true;
    const fetchWordsData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await loadAndNormalizeWords(profile.knownLangs, profile.targetLang);
        if (isCurrent) {
          setWords(result.words);
          setTotalTargetMapped(result.totalTargetMapped);
        }
      } catch (err) {
        console.error("Error loading words from WDQS:", err);
        if (isCurrent) {
          setError("Failed to fetch language data from Wikidata. The Wikidata Query Service might be overloaded. Please retry.");
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    };

    fetchWordsData();

    return () => {
      isCurrent = false;
    };
  }, [profile]);

  // Handle profile save
  const handleSaveProfile = (newProfile) => {
    setProfile(newProfile);
    const newProgress = {
      profile: newProfile,
      words: progress.words || {}
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
    setView('game-modes');
  };

  // Handle Leitner answer grades
  const handleAnswerWord = (lexemeId, correct) => {
    if (lexemeId === 'dummy-trigger') {
      setProgress(p => ({ ...p }));
      return;
    }

    setProgress(currentProgress => {
      const updated = updateLeitnerProgress(currentProgress, lexemeId, correct);
      
      const fullProgress = {
        profile,
        words: updated.words
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fullProgress));
      
      return updated;
    });
  };

  const handleNavigate = (newView) => {
    setView(newView);
  };

  // Render navigation links (no emojis)
  const renderNav = () => {
    if (!profile) return null;
    const navItems = [
      { id: 'game-modes', label: 'Home' },
      { id: 'bridge-words', label: 'Words' },
      { id: 'phrases', label: 'Phrases' },
      { id: 'words-status', label: 'Progress' },
      { id: 'onboarding', label: 'Profile' }
    ];

    const externalLinks = [
      { href: '/contribute', label: 'Contribute' },
      { href: '/login', label: 'Login' }
    ];

    const activeGameViews = ['flashcards', 'friend-or-faux', 'recall', 'reverse-recall', 'odd-one-out', 'match-pairs'];

    const linkStyle = {
      fontWeight: '500',
      color: '#54595d',
      borderBottom: '3px solid transparent',
      borderRadius: '0',
      padding: '8px 12px',
      fontSize: '0.95rem',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      textDecoration: 'none',
      transition: 'all 0.15s ease'
    };

    return (
      <nav
        style={{
          borderBottom: '1px solid #eaecf0',
          marginBottom: '28px',
          background: '#ffffff',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            gap: '24px',
            padding: '12px 24px',
            alignItems: 'center'
          }}
        >
          <div style={{ fontWeight: '800', fontSize: '1.35rem', color: '#202122', marginRight: 'auto', display: 'flex', alignItems: 'center', letterSpacing: '-0.02em' }}>
            Wiki<span style={{ color: '#3366cc' }}>Linkua</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {navItems.map(item => {
              const isHomeActive = item.id === 'game-modes' && activeGameViews.includes(view);
              const isActive = view === item.id || isHomeActive;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className="cdx-button cdx-button--weight-quiet"
                  style={{
                    fontWeight: isActive ? '700' : '500',
                    color: isActive ? '#3366cc' : '#54595d',
                    borderBottom: isActive ? '3px solid #3366cc' : '3px solid transparent',
                    borderRadius: '0',
                    padding: '8px 12px',
                    fontSize: '0.95rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {item.label}
                </button>
              );
            })}
            <span style={{ width: '1px', height: '20px', background: '#eaecf0', margin: '0 4px' }} />
            {externalLinks.map(link => (
              <a key={link.href} href={link.href} style={linkStyle}>
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </nav>
    );
  };

  // Main rendering logic
  const renderContent = () => {
    if (view === 'onboarding') {
      return <Onboarding profile={profile} onSaveProfile={handleSaveProfile} />;
    }

    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="cdx-spinner" style={{ margin: '0 auto 20px auto', width: '48px', height: '48px', border: '4px solid #eaecf0', borderTop: '4px solid #3366cc', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <h3 style={{ fontSize: '1.25rem', color: '#202122', marginBottom: '8px' }}>Querying Wikidata...</h3>
          <p style={{ color: '#54595d', fontSize: '0.95rem' }}>Fetching lexeme definitions and computing phonetic/cognate matches.</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      );
    }

    if (error) {
      return (
        <div className="cdx-card" style={{ padding: '30px', textAlign: 'center', margin: '40px auto', maxWidth: '600px', border: '1px solid #bf3c2c', borderRadius: '8px' }}>
          <h3 style={{ color: '#bf3c2c', marginBottom: '12px' }}>Connection Error</h3>
          <p style={{ color: '#54595d', marginBottom: '24px', fontSize: '0.95rem' }}>{error}</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button 
              onClick={() => setProfile({ ...profile })} // Triggers reload
              className="cdx-button cdx-button--action-progressive cdx-button--weight-primary"
              style={{ padding: '10px 16px', borderRadius: '2px', background: '#3366cc', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              Retry Connection
            </button>
            <button 
              onClick={() => setView('onboarding')}
              style={{ padding: '10px 16px', borderRadius: '2px', background: '#fff', color: '#3366cc', border: '1px solid #3366cc', cursor: 'pointer' }}
            >
              Change Languages
            </button>
          </div>
        </div>
      );
    }

    switch (view) {
      case 'bridge-words':
        return (
          <BridgeWordsList 
            words={words} 
            totalTargetMapped={totalTargetMapped} 
            profile={profile} 
            progress={progress}
            onNavigate={handleNavigate}
          />
        );
      case 'flashcards':
        return (
          <Flashcards 
            words={words} 
            onAnswerWord={handleAnswerWord} 
            onNavigate={handleNavigate}
          />
        );
      case 'friend-or-faux':
        return (
          <FriendOrFaux 
            words={words} 
            onAnswerWord={handleAnswerWord} 
            onNavigate={handleNavigate}
          />
        );
      case 'recall':
        return (
          <Recall 
            words={words} 
            onAnswerWord={handleAnswerWord} 
            onNavigate={handleNavigate}
          />
        );
      case 'reverse-recall':
        return (
          <ReverseRecall 
            words={words} 
            onAnswerWord={handleAnswerWord} 
            onNavigate={handleNavigate}
          />
        );
      case 'odd-one-out':
        return (
          <OddOneOut 
            words={words} 
            onAnswerWord={handleAnswerWord} 
            onNavigate={handleNavigate}
          />
        );
      case 'match-pairs':
        return (
          <MatchPairs 
            words={words} 
            onNavigate={handleNavigate}
          />
        );
      case 'phrases':
        return (
          <PhrasesMode
            words={words}
            progress={progress}
            profile={profile}
            onNavigate={handleNavigate}
          />
        );
      case 'words-status':
        return (
          <WordsStatus
            words={words}
            progress={progress}
            onNavigate={handleNavigate}
          />
        );
      case 'game-modes':
      default:
        return (
          <GameModes 
            words={words} 
            progress={progress} 
            onAnswerWord={handleAnswerWord} 
            onNavigate={handleNavigate}
          />
        );
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
      {renderNav()}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 48px 24px' }}>
        {renderContent()}
      </main>
    </div>
  );
}
