import React, { useState, useEffect, useMemo } from 'react';
import { LANGUAGES } from '../utils/sparql';
import { playAudio } from '../utils/audio';
import {
  fetchTatoebaPhrases, fetchP5831Phrases, rankPhrases, highlightSegments,
  speakPhrase, ttsSupported, gradePhrase, getDuePhrases, machineTranslate,
} from '../utils/phrases';
import { CodexIcon, cdxIconVolumeUp, cdxIconVolumeOff } from './Badges';

export default function PhrasesMode({ words, progress, profile, onNavigate }) {
  const [phrases, setPhrases] = useState([]);
  const [index, setIndex] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [source, setSource] = useState('learned');
  const [playing, setPlaying] = useState(false);
  const [mtText, setMtText] = useState(null);
  const [mtLoading, setMtLoading] = useState(false);

  const targetLang = LANGUAGES.find(l => l.qid === profile?.targetLang) || {};
  const knownCodes = (profile?.knownLangs || [])
    .map(qid => (LANGUAGES.find(l => l.qid === qid) || {}).code)
    .filter(Boolean);

  // Words the learner has already started/finished learning -> their target lemmas.
  const knownLemmas = useMemo(() => {
    const pw = progress?.words || {};
    return Object.entries(pw)
      .filter(([, w]) => w.status === 'known' || w.status === 'learning')
      .map(([id]) => (words.find(w => w.lexemeId === id) || {}).lemma)
      .filter(Boolean);
  }, [progress, words]);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const due = getDuePhrases();                 // repetition from past sessions
        let fetched = [];
        let src = 'learned';

        if (knownLemmas.length > 0) {
          fetched = await fetchTatoebaPhrases(targetLang.code, knownCodes, knownLemmas);
        }
        if (fetched.length === 0 && due.length === 0) {
          src = 'new';                                // cold start: native examples
          fetched = await fetchP5831Phrases(profile.targetLang, targetLang.code);
        }

        const map = new Map();
        [...due, ...fetched].forEach(p => { if (!map.has(p.id)) map.set(p.id, p); });
        const ranked = rankPhrases(Array.from(map.values()), knownLemmas);

        if (alive) {
          setPhrases(ranked);
          setSource(src);
          setIndex(0);
          setReveal(false);
        }
      } catch {
        if (alive) setError('Could not load phrases. The data service may be busy — please retry.');
      } finally {
        if (alive) setLoading(false);
      }
    }
    if (profile && targetLang.code) load();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, words]);

  const current = phrases[index];

  const hear = () => {
    if (!current) return;
    if (current.audio) {
      playAudio(current.audio, () => setPlaying(true), () => setPlaying(false));
    } else {
      speakPhrase(current.text, targetLang.code);
    }
  };

  const showTranslation = async () => {
    setReveal(true);
    // human translation present? nothing more to do.
    if (current.translation || mtText || mtLoading) return;
    // otherwise fall back to Wikimedia MinT machine translation
    setMtLoading(true);
    const t = await machineTranslate(targetLang.code, knownCodes[0], current.text);
    setMtText(t);
    setMtLoading(false);
  };

  const grade = (correct) => {
    if (current) gradePhrase(current, correct);
    setReveal(false);
    setMtText(null);
    setMtLoading(false);
    if (index + 1 < phrases.length) {
      setIndex(index + 1);
    } else {
      setIndex(phrases.length); // -> done screen
    }
  };

  const card = (children) => (
    <div className="cdx-card phrases-card" style={{
      maxWidth: '650px', margin: '20px auto', padding: '28px',
      border: '1px solid #c8ccd1', borderRadius: '2px', background: '#fff',
      color: '#202122',
    }}>{children}</div>
  );

  if (loading) {
    return card(
      <div style={{ textAlign: 'center', padding: '32px 20px' }}>
        <div style={{ margin: '0 auto 20px', width: '36px', height: '36px', border: '3px solid #eaecf0', borderTop: '3px solid #3366cc', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#54595d', fontSize: '14px' }}>Finding phrases with words you know…</p>
        <style>{`@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (error) {
    return card(
      <div style={{ textAlign: 'center', padding: '16px' }}>
        <p style={{ color: '#bf3c2c', marginBottom: '20px', fontSize: '14px', fontWeight: '600' }}>{error}</p>
        <button 
          className="cdx-button" 
          onClick={() => onNavigate('game-modes')}
          style={{ background: '#ffffff', border: '1px solid #a2a9b1', borderRadius: '2px', padding: '8px 16px', fontWeight: '600', cursor: 'pointer' }}
        >
          Back to Home
        </button>
      </div>
    );
  }

  if (!current) {
    return card(
      <div style={{ textAlign: 'center', padding: '16px' }}>
        <h3 style={{ marginBottom: '12px', fontSize: '20px', fontWeight: '700' }}>No phrases to show yet</h3>
        <p style={{ color: '#54595d', marginBottom: '24px', fontSize: '14px', lineHeight: '1.5' }}>
          {knownLemmas.length === 0
            ? 'Learn a few words first (Flashcards), then come back — we’ll build phrases from the words you know.'
            : 'We couldn’t find sentences for your words in this language pair yet. Try learning more words, or a better-covered target language.'}
        </p>
        <button className="cdx-button"
                style={{ background: '#3366cc', color: '#fff', border: '1px solid #3366cc', padding: '10px 18px', borderRadius: '2px', fontWeight: '600', cursor: 'pointer' }}
                onClick={() => onNavigate('flashcards')}>
          Go learn words
        </button>
      </div>
    );
  }

  // done screen
  if (index >= phrases.length) {
    return card(
      <div style={{ textAlign: 'center', padding: '16px' }}>
        <h3 style={{ marginBottom: '12px', fontSize: '22px', fontWeight: '700' }}>Nice — that’s all for now! 🎉</h3>
        <p style={{ color: '#54595d', marginBottom: '24px', fontSize: '14px', lineHeight: '1.5' }}>
          You went through {phrases.length} phrase{phrases.length === 1 ? '' : 's'}.
          We’ll bring some back for review as your memory needs them.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button 
            className="cdx-button" 
            style={{ background: '#ffffff', border: '1px solid #a2a9b1', borderRadius: '2px', padding: '10px 18px', fontWeight: '600', cursor: 'pointer', color: '#202122' }} 
            onClick={() => { setIndex(0); setReveal(false); }}
          >
            Again
          </button>
          <button 
            className="cdx-button"
            style={{ background: '#3366cc', color: '#fff', border: '1px solid #3366cc', padding: '10px 18px', borderRadius: '2px', fontWeight: '600', cursor: 'pointer' }}
            onClick={() => onNavigate('game-modes')}
          >
            Home
          </button>
        </div>
      </div>
    );
  }

  const segs = highlightSegments(current.text, current.matchedWord);

  return (
    <div>
      <div className="phrases-topbar" style={{ maxWidth: '650px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '13px', color: '#54595d', fontWeight: '500' }}>Phrase {index + 1} of {phrases.length}</span>
        <span style={{ 
          fontSize: '12px', 
          fontWeight: 600, 
          padding: '4px 8px', 
          borderRadius: '2px',
          background: source === 'new' ? '#fee7e6' : '#e9f6f2', 
          color: source === 'new' ? '#bf3c2c' : '#0e7a63',
          border: source === 'new' ? '1px solid #f9c5c0' : '1px solid #a3dcd0'
        }}>
          {source === 'new' ? 'new words' : 'words you know'}
        </span>
      </div>

      {card(
        <>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#72777d', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '16px', textAlign: 'center' }}>
            {targetLang.name}
          </div>

          <p style={{ fontSize: '1.8rem', fontWeight: '500', lineHeight: 1.5, textAlign: 'center', margin: '0 0 24px', color: '#202122' }}>
            {segs.map((s, i) => s.hit
              ? <mark key={i} style={{ background: '#fef6b8', color: '#202122', borderRadius: '2px', padding: '2px 4px' }}>{s.text}</mark>
              : <span key={i}>{s.text}</span>)}
          </p>

          <div className="phrases-audio-row" style={{ textAlign: 'center', marginBottom: '24px' }}>
            <button 
              className="cdx-button" 
              onClick={hear} 
              disabled={playing}
              style={{ 
                background: '#ffffff', 
                border: '1px solid #a2a9b1', 
                borderRadius: '2px', 
                padding: '8px 16px', 
                fontWeight: '600', 
                color: '#202122', 
                cursor: 'pointer', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px' 
              }}
            >
              <CodexIcon icon={current.audio || ttsSupported() ? cdxIconVolumeUp : cdxIconVolumeOff} size="18px" color="#3366cc" />
              <span>{current.audio ? 'Hear it' : (ttsSupported() ? 'Hear it (read aloud)' : 'Audio unavailable')}</span>
            </button>
          </div>

          <div className="phrases-translation-row" style={{ borderTop: '1px solid #c8ccd1', paddingTop: '20px', textAlign: 'center' }}>
            {reveal ? (
              <div style={{ minHeight: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                {current.translation ? (
                  <p style={{ fontSize: '1.2rem', fontWeight: '500', color: '#202122', margin: 0 }}>{current.translation.text}</p>
                ) : mtLoading ? (
                  <p style={{ color: '#72777d', margin: 0, fontSize: '14px' }}>Translating…</p>
                ) : mtText ? (
                  <div>
                    <p style={{ fontSize: '1.2rem', fontWeight: '500', color: '#202122', margin: '0 0 4px' }}>{mtText}</p>
                    <span style={{ fontSize: '11px', color: '#72777d', fontStyle: 'italic' }}>
                      machine translation · Wikimedia MinT
                    </span>
                  </div>
                ) : (
                  <p style={{ color: '#72777d', fontStyle: 'italic', margin: 0, fontSize: '14px' }}>No translation available for this sentence.</p>
                )}
              </div>
            ) : (
              <button 
                className="cdx-button"
                style={{ background: '#3366cc', color: '#fff', border: '1px solid #3366cc', padding: '8px 16px', borderRadius: '2px', fontWeight: '600', cursor: 'pointer' }}
                onClick={showTranslation}
              >
                Show translation
              </button>
            )}
          </div>

          {reveal && (
            <div className="phrases-grade-row" style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
              <button 
                className="cdx-button"
                style={{ padding: '10px 20px', cursor: 'pointer', border: '1px solid #bf3c2c', color: '#bf3c2c', background: '#fff', borderRadius: '2px', fontWeight: '600' }}
                onClick={() => grade(false)}
              >
                Review again
              </button>
              <button 
                className="cdx-button"
                style={{ padding: '10px 20px', cursor: 'pointer', background: '#0e7a63', color: '#fff', border: '1px solid #0e7a63', borderRadius: '2px', fontWeight: '600' }}
                onClick={() => grade(true)}
              >
                Got it
              </button>
            </div>
          )}
        </>
      )}

      <p style={{ textAlign: 'center', fontSize: '12px', color: '#a2a9b1', marginTop: '12px' }}>
        Sentences from <a href="https://tatoeba.org" target="_blank" rel="noopener" style={{ color: '#3366cc', textDecoration: 'none' }}>Tatoeba</a> (CC-BY) and Wikidata usage examples.
      </p>
    </div>
  );
}
