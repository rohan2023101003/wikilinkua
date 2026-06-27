import React, { useState, useEffect, useRef } from 'react';
import { FlashcardExercise } from './Flashcards';
import { getLang, fetchVideosInLanguage, fetchVideoThumbnails, fetchSubtitleRaw, srtToVttBlob, extractLemmas } from '../utils/video';

const CARD = { border: '1px solid #c8ccd1', borderRadius: '2px', background: '#fff', padding: '24px' };
const BTN_PRIMARY = { padding: '10px 20px', borderRadius: '2px', background: '#3366cc', color: '#fff', border: '1px solid #3366cc', fontWeight: '600', cursor: 'pointer', fontSize: '14px' };
const BTN_GHOST = { padding: '10px 20px', borderRadius: '2px', background: '#fff', color: '#202122', border: '1px solid #c8ccd1', fontWeight: '600', cursor: 'pointer', fontSize: '14px' };

function Spinner() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ width: '36px', height: '36px', border: '3px solid #c8ccd1', borderTop: '3px solid #3366cc', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function VideoMode({ profile, words, onAnswerWord, onNavigate }) {
  const [phase, setPhase] = useState('idle'); // idle | loading | grid | watch | flashcards
  const [videos, setVideos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [vttUrl, setVttUrl] = useState(null);
  const [hasTargetSubs, setHasTargetSubs] = useState(false);
  const [error, setError] = useState(null);
  const [fcWords, setFcWords] = useState([]);
  const [fcIndex, setFcIndex] = useState(0);
  const [fcScore, setFcScore] = useState(0);
  const [fcDone, setFcDone] = useState(false);
  const vttRef = useRef(null);

  const targetLang = getLang(profile.targetLang);
  const knownLang = getLang(profile.knownLangs[0]);

  const handleSearch = async () => {
    if (!targetLang || !knownLang) {
      setError('Could not resolve language names.');
      return;
    }
    setPhase('loading');
    setError(null);
    try {
      const titles = await fetchVideosInLanguage(targetLang.name);
      if (!titles.length) {
        setError(`No Commons videos found in ${targetLang.name}.`);
        setPhase('idle');
        return;
      }
      const thumbData = await fetchVideoThumbnails(titles.slice(0, 100));
      const videoList = titles
        .map(t => thumbData[t])
        .filter(Boolean)
        .filter(v => v.thumbUrl); // only show ones that have a thumbnail
      if (!videoList.length) {
        setError('Found matching videos but could not load thumbnails. Try again.');
        setPhase('idle');
        return;
      }
      setVideos(videoList);
      setPhase('grid');
    } catch (e) {
      setError('Search failed: ' + e.message);
      setPhase('idle');
    }
  };

  const handleSelectVideo = async (video) => {
    setSelected(video);
    setPhase('loading');
    setError(null);
    try {
      const [knownSrt, targetSrt] = await Promise.all([
        fetchSubtitleRaw(video.title, knownLang.code),
        fetchSubtitleRaw(video.title, targetLang.code),
      ]);
      const url = knownSrt ? srtToVttBlob(knownSrt) : null;
      if (vttRef.current) URL.revokeObjectURL(vttRef.current);
      vttRef.current = url;
      setVttUrl(url);
      setHasTargetSubs(!!targetSrt);
      setPhase('watch');
    } catch (e) {
      setError('Could not load subtitles: ' + e.message);
      setPhase('grid');
    }
  };

  const handleStartFlashcards = async () => {
    setPhase('loading');
    try {
      const targetSrt = await fetchSubtitleRaw(selected.title, targetLang.code);
      const lemmas = extractLemmas(targetSrt);
      const wordMap = new Map(words.map(w => [w.lemma.toLowerCase(), w]));
      const matched = lemmas
        .map(l => wordMap.get(l))
        .filter(Boolean)
        .filter(w => w.gloss);
      const unique = [...new Map(matched.map(w => [w.lexemeId, w])).values()];
      if (!unique.length) {
        setError('No recognizable vocabulary found in this video\'s subtitles for flashcards.');
        setPhase('watch');
        return;
      }
      setFcWords(unique.slice(0, 20));
      setFcIndex(0);
      setFcScore(0);
      setFcDone(false);
      setPhase('flashcards');
    } catch (e) {
      setError('Could not load target subtitles: ' + e.message);
      setPhase('watch');
    }
  };

  const handleFcAnswer = (correct) => {
    const word = fcWords[fcIndex];
    if (correct) setFcScore(s => s + 1);
    onAnswerWord(word.lexemeId, correct);
    if (fcIndex + 1 < fcWords.length) {
      setFcIndex(i => i + 1);
    } else {
      setFcDone(true);
    }
  };

  useEffect(() => () => { if (vttRef.current) URL.revokeObjectURL(vttRef.current); }, []);

  // ── Idle ──────────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0 0 6px', color: '#202122' }}>Video Mode</h2>
          <p style={{ color: '#54595d', margin: 0, fontSize: '14px' }}>
            Watch Wikimedia Commons videos in {targetLang?.name}. When {targetLang?.name} subtitles are available, you can generate flashcards from the vocabulary.
          </p>
        </div>
        {error && (
          <div style={{ ...CARD, border: '1px solid #bf3c2c', background: '#fee7e6', marginBottom: '16px' }}>
            <p style={{ margin: 0, color: '#bf3c2c', fontSize: '14px' }}>{error}</p>
          </div>
        )}
        <div style={CARD}>
          <p style={{ margin: '0 0 20px', color: '#54595d', fontSize: '14px', lineHeight: '1.6' }}>
            Videos are sourced from <strong>Wikimedia Commons</strong> — spoken in {targetLang?.name}. {knownLang?.name} subtitles will be shown if available.
          </p>
          <button onClick={handleSearch} style={BTN_PRIMARY}>
            Search for videos
          </button>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (phase === 'loading') return <Spinner />;

  // ── Grid ──────────────────────────────────────────────────────────────────
  if (phase === 'grid') {
    return (
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <button onClick={() => setPhase('idle')} style={BTN_GHOST}>← Back</button>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#202122' }}>
            {videos.length} video{videos.length !== 1 ? 's' : ''} in {targetLang?.name}
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
          {videos.map(v => (
            <button
              key={v.title}
              onClick={() => handleSelectVideo(v)}
              style={{ border: '1px solid #c8ccd1', borderRadius: '2px', background: '#fff', padding: 0, cursor: 'pointer', textAlign: 'left', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ width: '100%', aspectRatio: '16/9', background: '#eaecf0', overflow: 'hidden' }}>
                <img
                  src={v.thumbUrl}
                  alt={v.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              </div>
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#202122', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {v.name}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Watch ─────────────────────────────────────────────────────────────────
  if (phase === 'watch') {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button onClick={() => { setPhase('grid'); setSelected(null); }} style={BTN_GHOST}>← Back to grid</button>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#202122', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selected?.name}
          </h2>
        </div>
        {error && (
          <div style={{ ...CARD, border: '1px solid #bf3c2c', background: '#fee7e6', marginBottom: '12px' }}>
            <p style={{ margin: 0, color: '#bf3c2c', fontSize: '13px' }}>{error}</p>
          </div>
        )}
        <div style={{ background: '#000', borderRadius: '2px', overflow: 'hidden', marginBottom: '16px' }}>
          <video
            key={selected?.videoUrl}
            controls
            style={{ width: '100%', display: 'block', maxHeight: '520px' }}
          >
            <source src={selected?.videoUrl} />
            {vttUrl && (
              <track
                kind="subtitles"
                src={vttUrl}
                label={knownLang?.name}
                default
              />
            )}
            Your browser does not support this video format.
          </video>
        </div>
        <div style={{ ...CARD, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#202122', marginBottom: '2px' }}>
              Subtitles: {knownLang?.name}
            </div>
            {!vttUrl && (
              <div style={{ fontSize: '13px', color: '#72777d' }}>
                No {knownLang?.name} subtitle track found for this video.
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <a
              href={`https://commons.wikimedia.org/wiki/${encodeURIComponent(selected?.title || '')}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...BTN_GHOST, textDecoration: 'none', display: 'inline-block' }}
            >
              View on Commons
            </a>
            {hasTargetSubs && (
              <button onClick={handleStartFlashcards} style={BTN_PRIMARY}>
                Flashcards from this video
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Flashcards ────────────────────────────────────────────────────────────
  if (phase === 'flashcards') {
    if (fcDone) {
      return (
        <div style={{ maxWidth: '550px', margin: '40px auto', ...CARD, textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '8px' }}>Lesson complete</h3>
          <p style={{ color: '#54595d', fontSize: '14px', marginBottom: '24px' }}>
            {fcScore} / {fcWords.length} correct — from <em>{selected?.name}</em>
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={() => { setFcIndex(0); setFcScore(0); setFcDone(false); }} style={BTN_PRIMARY}>
              Replay
            </button>
            <button onClick={() => setPhase('watch')} style={BTN_GHOST}>
              Back to video
            </button>
            <button onClick={() => onNavigate('game-modes')} style={BTN_GHOST}>
              Home
            </button>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ maxWidth: '550px', margin: '40px auto', ...CARD, textAlign: 'center' }}>
          <p style={{ color: '#bf3c2c', marginBottom: '16px', fontSize: '14px' }}>{error}</p>
          <button onClick={() => { setError(null); setPhase('watch'); }} style={BTN_GHOST}>Back to video</button>
        </div>
      );
    }

    const currentWord = fcWords[fcIndex];
    return (
      <div style={{ maxWidth: '650px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', color: '#54595d' }}>
          <button onClick={() => setPhase('watch')} style={{ ...BTN_GHOST, fontSize: '0.9rem', padding: '6px 12px' }}>← Back to video</button>
          <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Card {fcIndex + 1} of {fcWords.length}</span>
        </div>
        <div style={{ height: '6px', background: '#eaecf0', borderRadius: '2px', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ height: '100%', background: '#3366cc', width: `${(fcIndex / fcWords.length) * 100}%`, transition: 'width 0.3s ease' }} />
        </div>
        <div style={{ fontSize: '12px', color: '#72777d', textAlign: 'center', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          From: {selected?.name}
        </div>
        <FlashcardExercise word={currentWord} onAnswer={handleFcAnswer} />
      </div>
    );
  }

  return null;
}
