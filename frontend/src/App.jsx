import React, { useState, useEffect } from 'react';
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

// Import new game modes
import { Recall } from './components/Recall';
import { ReverseRecall } from './components/ReverseRecall';
import { OddOneOut } from './components/OddOneOut';
import { MatchPairs } from './components/MatchPairs';

import { loadAndNormalizeWords } from './utils/sparql';
import { updateLeitnerProgress } from './utils/srs';
import {
  getActiveProfile, setActiveProfile, getDeck, saveWordProgress, profileKey,
} from './utils/storage';

/**
 * Which view a URL asks for. The server renders the same SPA for several paths,
 * so this is the only thing that distinguishes them.
 *
 * /contribute/record is deliberately NOT here: that is a server-rendered page
 * (the audio recorder), reached from inside the Contribute section.
 */
function viewFromPath() {
  const path = (typeof window !== 'undefined' && window.location.pathname) || '/';
  if (path.includes('/false-friends')) return 'friend-or-faux';
  if (path.includes('/wikilinkua')) return 'bridge-words';
  if (path.includes('/contribute')) return 'contribute';
  return 'game-modes';
}

export default function App() {
  const [profile, setProfile] = useState(null);
  const [progress, setProgress] = useState({ words: {} });
  const [account, setAccount] = useState(null);
  const [words, setWords] = useState([]);
  const [totalTargetMapped, setTotalTargetMapped] = useState(0);
  const [coverage, setCoverage] = useState(null);   // exact counts, not derived from the capped list
  const [initialWordsFilter, setInitialWordsFilter] = useState('All');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState(viewFromPath);

  // 1. Initial load of the active profile + that pair's deck from localStorage.
  //    Land on the view the URL asked for - this used to force 'game-modes',
  //    which silently broke every deep link (/contribute, /false-friends, ...).
  useEffect(() => {
    const stored = getActiveProfile();
    if (stored) {
      setProfile(stored);
      setProgress({ words: getDeck(stored).words || {} });
      setView(viewFromPath());
    } else {
      setView('onboarding');
    }
  }, []);

  // 1b. Who is logged in (drives the Login / Log out control in the nav)
  useEffect(() => {
    let alive = true;
    fetch('/api/me', { headers: { Accept: 'application/json' } })
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (alive && data) setAccount(data); })
      .catch(() => { /* nav just falls back to the Login link */ });
    return () => { alive = false; };
  }, []);

  // 2. Load word data from Wikidata whenever profile changes
  useEffect(() => {
    if (!profile) return;

    let isCurrent = true;
    const fetchWordsData = async () => {
      setLoading(true);
      setError(null);
      // Never let the previous pair's words linger while the new pair loads.
      setWords([]);
      setTotalTargetMapped(0);
      setCoverage(null);
      try {
        const result = await loadAndNormalizeWords(profile.knownLangs, profile.targetLang);
        if (isCurrent) {
          setWords(result.words);
          setTotalTargetMapped(result.totalTargetMapped);
          setCoverage({
            bridgeCount: result.bridgeCount,
            truncated: result.truncated,
            loadedLexemes: result.loadedLexemes,
          });
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

  // Handle profile save. Progress lives per language pair, so switching pairs
  // swaps in that pair's own deck (a brand-new pair correctly starts at 0%)
  // and switching back later restores the progress untouched.
  const handleSaveProfile = (newProfile) => {
    const samePair = profileKey(newProfile) === profileKey(profile);
    const deck = setActiveProfile(newProfile);
    setProgress({ words: deck.words || {} });
    setProfile(samePair ? profile : newProfile);
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
      saveWordProgress(profile, updated.words);
      return updated;
    });
  };

  // /logout is POST-only (it changes state), so submit a real form.
  const handleLogout = () => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/logout';
    document.body.appendChild(form);
    form.submit();
  };

  const handleNavigate = (newView, opt = {}) => {
    setView(newView);
    if (opt && opt.filter) {
      setInitialWordsFilter(opt.filter);
    } else {
      setInitialWordsFilter('All');
    }
  };

  // Render navigation links (no emojis)
  const renderNav = () => {
    if (!profile) return null;
    const navItems = [
      { id: 'game-modes', label: 'Home' },
      { id: 'bridge-words', label: 'Words' },
      { id: 'phrases', label: 'Phrases' },
      { id: 'words-status', label: 'Progress' },
      { id: 'video', label: 'Video' },
      { id: 'article', label: 'Article' },
      { id: 'contribute', label: 'Contribute' },
      { id: 'onboarding', label: 'Profile' }
    ];

    const externalLinks = [
      { href: '/guide', label: 'Guide' }
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
          borderBottom: '1px solid #c8ccd1',
          marginBottom: '28px',
          background: '#ffffff',
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
                  className="cdx-button"
                  style={{
                    fontWeight: isActive ? '700' : '500',
                    color: isActive ? '#3366cc' : '#54595d',
                    borderBottom: isActive ? '3px solid #3366cc' : '3px solid transparent',
                    borderRadius: '0',
                    padding: '8px 12px',
                    fontSize: '0.95rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {item.label}
                </button>
              );
            })}
            <span style={{ width: '1px', height: '20px', background: '#c8ccd1', margin: '0 4px' }} />
            {externalLinks.map(link => (
              <a key={link.href} href={link.href} style={linkStyle}>
                {link.label}
              </a>
            ))}
            {account && account.loggedIn ? (
              <>
                <span
                  title={account.devLogin ? 'Development test user' : 'Logged in with Wikimedia'}
                  style={{ fontSize: '0.9rem', color: '#54595d', padding: '0 4px 0 8px' }}
                >
                  {account.username}
                </span>
                <button onClick={handleLogout} style={linkStyle}>
                  Log out
                </button>
              </>
            ) : (
              <a href="/login" style={linkStyle}>Login</a>
            )}
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
          <div className="cdx-spinner" style={{ margin: '0 auto 20px auto', width: '48px', height: '48px', border: '4px solid #c8ccd1', borderTop: '4px solid #3366cc', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <h3 style={{ fontSize: '1.25rem', color: '#202122', marginBottom: '8px' }}>Querying Wikidata...</h3>
          <p style={{ color: '#54595d', fontSize: '0.95rem' }}>Fetching lexemes, then tracing derivation chains to tell real cognates from words that merely share a meaning.</p>
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
        <div className="cdx-card" style={{ padding: '30px', textAlign: 'center', margin: '40px auto', maxWidth: '600px', border: '1px solid #bf3c2c', borderRadius: '2px', background: '#fee7e6' }}>
          <h3 style={{ color: '#bf3c2c', marginBottom: '12px', fontWeight: '700' }}>Connection Error</h3>
          <p style={{ color: '#202122', marginBottom: '24px', fontSize: '0.95rem' }}>{error}</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button 
              onClick={() => setProfile({ ...profile })} // Triggers reload
              className="cdx-button"
              style={{ padding: '10px 20px', borderRadius: '2px', background: '#3366cc', color: '#fff', border: '1px solid #3366cc', fontWeight: '600', cursor: 'pointer' }}
            >
              Retry Connection
            </button>
            <button 
              onClick={() => setView('onboarding')}
              className="cdx-button"
              style={{ padding: '10px 20px', borderRadius: '2px', background: '#fff', color: '#202122', border: '1px solid #a2a9b1', fontWeight: '600', cursor: 'pointer' }}
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
            coverage={coverage}
            profile={profile} 
            progress={progress}
            initialFilter={initialWordsFilter}
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
      case 'video':
        return (
          <VideoMode
            profile={profile}
            words={words}
            onAnswerWord={handleAnswerWord}
            onNavigate={handleNavigate}
          />
        );
      case 'contribute':
        return (
          <ContributeMode
            profile={profile}
            onNavigate={handleNavigate}
          />
        );
      case 'article':
        return (
          <ArticleMode
            profile={profile}
            words={words}
            progress={progress}
            onAnswerWord={handleAnswerWord}
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
            totalTargetMapped={totalTargetMapped}
            coverage={coverage}
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
