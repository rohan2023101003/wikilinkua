import React, { useState, useEffect, useMemo } from 'react';
import { LANGUAGES } from '../utils/sparql';
import { playAudio } from '../utils/audio';
import {
  fetchTatoebaPhrases, fetchP5831Phrases, rankPhrases, highlightSegments,
  speakPhrase, ttsSupported, gradePhrase, getDuePhrases, machineTranslate,
} from '../utils/phrases';

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
    <div className="cdx-card" style={{
      maxWidth: '750px', margin: '20px auto', padding: '32px',
      border: '1px solid #eaecf0', borderRadius: '16px', background: '#fff',
      boxShadow: '0 4px 20px rgba(0,0,0,0.03)', color: '#202122',
    }}>{children}</div>
  );

  if (loading) {
    return card(
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div style={{ margin: '0 auto 16px', width: '40px', height: '40px', border: '4px solid #eaecf0', borderTop: '4px solid #3366cc', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#54595d' }}>Finding phrases with words you know…</p>
        <style>{`@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (error) {
    return card(
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#bf3c2c', marginBottom: '16px' }}>{error}</p>
        <button className="cdx-button" onClick={() => onNavigate('game-modes')}>Back to Home</button>
      </div>
    );
  }

  if (!current) {
    return card(
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ marginBottom: '8px' }}>No phrases to show yet</h3>
        <p style={{ color: '#54595d', marginBottom: '20px' }}>
          {knownLemmas.length === 0
            ? 'Learn a few words first (Flashcards), then come back — we’ll build phrases from the words you know.'
            : 'We couldn’t find sentences for your words in this language pair yet. Try learning more words, or a better-covered target language.'}
        </p>
        <button className="cdx-button cdx-button--weight-primary cdx-button--action-progressive"
                style={{ background: '#3366cc', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '2px', cursor: 'pointer' }}
                onClick={() => onNavigate('flashcards')}>
          Go learn words
        </button>
      </div>
    );
  }

  // done screen
  if (index >= phrases.length) {
    return card(
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ marginBottom: '8px' }}>Nice — that’s all for now! 🎉</h3>
        <p style={{ color: '#54595d', marginBottom: '20px' }}>
          You went through {phrases.length} phrase{phrases.length === 1 ? '' : 's'}.
          We’ll bring some back for review as your memory needs them.
        </p>
        <button className="cdx-button" style={{ marginRight: '8px' }} onClick={() => { setIndex(0); setReveal(false); }}>Again</button>
        <button className="cdx-button cdx-button--weight-primary cdx-button--action-progressive"
                style={{ background: '#3366cc', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '2px', cursor: 'pointer' }}
                onClick={() => onNavigate('game-modes')}>
          Home
        </button>
      </div>
    );
  }

  const segs = highlightSegments(current.text, current.matchedWord);

  return (
    <div>
      <div style={{ maxWidth: '750px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px' }}>
        <span style={{ fontSize: '13px', color: '#72777d' }}>Phrase {index + 1} of {phrases.length}</span>
        <span style={{ fontSize: '12px', fontWeight: 700, padding: '2px 10px', borderRadius: '12px',
          background: source === 'new' ? '#e8f0fe' : '#e6f4ea', color: source === 'new' ? '#1a56db' : '#1b7f37' }}>
          {source === 'new' ? 'new words' : 'words you know'}
        </span>
      </div>

      {card(
        <>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#72777d', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '14px', textAlign: 'center' }}>
            {targetLang.name} {current.lang ? '' : ''}
          </div>

          <p style={{ fontSize: '1.6rem', lineHeight: 1.5, textAlign: 'center', margin: '0 0 18px' }}>
            {segs.map((s, i) => s.hit
              ? <mark key={i} style={{ background: '#fef6b8', borderRadius: '3px', padding: '0 2px' }}>{s.text}</mark>
              : <span key={i}>{s.text}</span>)}
          </p>

          <div style={{ textAlign: 'center', marginBottom: '18px' }}>
            <button className="cdx-button" onClick={hear} disabled={playing}
                    style={{ padding: '8px 16px', cursor: 'pointer' }}>
              🔊 {current.audio ? 'Hear it' : (ttsSupported() ? 'Hear it (read aloud)' : 'Audio unavailable')}
            </button>
          </div>

          <div style={{ borderTop: '1px dashed #eaecf0', paddingTop: '16px', textAlign: 'center' }}>
            {reveal ? (
              <div>
                {current.translation ? (
                  <p style={{ fontSize: '1.15rem', color: '#202122', margin: 0 }}>{current.translation.text}</p>
                ) : mtLoading ? (
                  <p style={{ color: '#72777d', margin: 0 }}>Translating…</p>
                ) : mtText ? (
                  <div>
                    <p style={{ fontSize: '1.15rem', color: '#202122', margin: '0 0 4px' }}>{mtText}</p>
                    <span style={{ fontSize: '11px', color: '#72777d', fontStyle: 'italic' }}>
                      machine translation · Wikimedia MinT
                    </span>
                  </div>
                ) : (
                  <p style={{ color: '#72777d', fontStyle: 'italic', margin: 0 }}>No translation available for this sentence.</p>
                )}
              </div>
            ) : (
              <button className="cdx-button cdx-button--weight-primary"
                      style={{ padding: '8px 16px', cursor: 'pointer' }}
                      onClick={showTranslation}>
                Show translation
              </button>
            )}
          </div>

          {reveal && (
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '22px' }}>
              <button className="cdx-button"
                      style={{ padding: '10px 18px', cursor: 'pointer', border: '1px solid #d33', color: '#d33', background: '#fff', borderRadius: '4px' }}
                      onClick={() => grade(false)}>
                Review again
              </button>
              <button className="cdx-button cdx-button--action-progressive cdx-button--weight-primary"
                      style={{ padding: '10px 18px', cursor: 'pointer', background: '#14866d', color: '#fff', border: 'none', borderRadius: '4px' }}
                      onClick={() => grade(true)}>
                Got it
              </button>
            </div>
          )}
        </>
      )}

      <p style={{ textAlign: 'center', fontSize: '12px', color: '#a2a9b1', marginTop: '8px' }}>
        Sentences from <a href="https://tatoeba.org" target="_blank" rel="noopener">Tatoeba</a> (CC-BY) and Wikidata usage examples.
      </p>
    </div>
  );
}
