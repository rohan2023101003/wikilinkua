import React, { useState, useEffect, useRef } from 'react';
import { FlashcardExercise } from './Flashcards';
import { getLang, fetchVideosInLanguage, fetchVideoThumbnails, checkSubtitleTracks, fetchSubtitleRaw, srtToVttBlob, extractLemmas } from '../utils/video';

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
  const [phase, setPhase] = useState('idle');
  const [videos, setVideos] = useState([]);
  const [gridFilter, setGridFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [vttUrl, setVttUrl] = useState(null);
  const [vttLang, setVttLang] = useState(null);
  const [error, setError] = useState(null);
  const [fcWords, setFcWords] = useState([]);
  const [fcIndex, setFcIndex] = useState(0);
  const [fcScore, setFcScore] = useState(0);
  const [fcDone, setFcDone] = useState(false);
  const vttRef = useRef(null);

  const targetLang = getLang(profile.targetLang);
  const knownLangs = profile.knownLangs.map(qid => getLang(qid)).filter(Boolean);
  const primaryKnownLang = knownLangs[0];

  const handleSearch = async () => {
    if (!targetLang || !knownLangs.length) {
      setError('Could not resolve language names.');
      return;
    }
    setPhase('loading');
    setError(null);
    try {
      const [audioTargetTitles, ...knownAudioArrays] = await Promise.all([
        fetchVideosInLanguage(targetLang.name),
        ...knownLangs.map(l => fetchVideosInLanguage(l.name)),
      ]);

      const audioTargetSet = new Set(audioTargetTitles);
      const knownAudioSet = new Set(knownAudioArrays.flat());
      const knownOnlyTitles = [...knownAudioSet].filter(t => !audioTargetSet.has(t));
      const allTitles = [...audioTargetTitles, ...knownOnlyTitles].slice(0, 100);

      if (!allTitles.length) {
        setError(`No Commons videos found in ${targetLang.name}.`);
        setPhase('idle');
        return;
      }

      const langCodes = [targetLang.code, ...knownLangs.map(l => l.code)];
      const [thumbData, subTracks] = await Promise.all([
        fetchVideoThumbnails(allTitles),
        checkSubtitleTracks(allTitles, langCodes),
      ]);

      const videoList = allTitles
        .map(t => {
          const v = thumbData[t];
          if (!v?.thumbUrl) return null;
          const tracks = subTracks.get(t) || new Set();
          const knownSubLang = knownLangs.find(l => tracks.has(l.code)) || null;
          return {
            ...v,
            hasTargetSubs: tracks.has(targetLang.code),
            hasKnownSubs: !!knownSubLang,
            knownSubLang,
            audioIsTarget: audioTargetSet.has(t),
            audioIsKnown: knownAudioSet.has(t),
          };
        })
        .filter(Boolean);

      if (!videoList.length) {
        setError('Found videos but could not load thumbnails. Try again.');
        setPhase('idle');
        return;
      }
      setVideos(videoList);
      setGridFilter('all');
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
      // For known-audio videos: show target subs (you read what you're learning).
      // For target-audio videos: show known subs (translation aid).
      const showTargetSubs = video.audioIsKnown && !video.audioIsTarget;
      const displayLang = showTargetSubs ? targetLang : video.knownSubLang;
      const srt = displayLang ? await fetchSubtitleRaw(video.title, displayLang.code) : null;
      const url = srt ? srtToVttBlob(srt) : null;
      if (vttRef.current) URL.revokeObjectURL(vttRef.current);
      vttRef.current = url;
      setVttUrl(url);
      setVttLang(displayLang?.name || null);
      setPhase('watch');
    } catch (e) {
      setError('Could not load subtitles: ' + e.message);
      setPhase('grid');
    }
  };

  const handleStartFlashcards = async () => {
    setPhase('loading');
    try {
      let matched;
      if (selected.hasTargetSubs) {
        const srt = await fetchSubtitleRaw(selected.title, targetLang.code);
        const lemmas = extractLemmas(srt);
        const wordMap = new Map(words.map(w => [w.lemma.toLowerCase(), w]));
        matched = lemmas.map(l => wordMap.get(l)).filter(w => w?.gloss);
      } else {
        // Known-lang subs: find cognates/phonetic matches by knownLemma
        const srt = await fetchSubtitleRaw(selected.title, selected.knownSubLang.code);
        const lemmas = extractLemmas(srt);
        const knownMap = new Map(
          words
            .filter(w => (w.cognate || w.phoneticMatch) && w.knownLemma)
            .map(w => [w.knownLemma.toLowerCase(), w])
        );
        matched = lemmas.map(l => knownMap.get(l)).filter(w => w?.gloss);
      }
      const unique = [...new Map(matched.map(w => [w.lexemeId, w])).values()];
      if (!unique.length) {
        setError("No matching vocabulary found in this video's subtitles.");
        setPhase('watch');
        return;
      }
      setFcWords(unique.slice(0, 20));
      setFcIndex(0);
      setFcScore(0);
      setFcDone(false);
      setPhase('flashcards');
    } catch (e) {
      setError('Could not load subtitles: ' + e.message);
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
            Watch Wikimedia Commons videos in {targetLang?.name}. When subtitles are available, generate flashcards from the vocabulary.
          </p>
        </div>
        {error && (
          <div style={{ ...CARD, border: '1px solid #bf3c2c', background: '#fee7e6', marginBottom: '16px' }}>
            <p style={{ margin: 0, color: '#bf3c2c', fontSize: '14px' }}>{error}</p>
          </div>
        )}
        <div style={CARD}>
          <p style={{ margin: '0 0 20px', color: '#54595d', fontSize: '14px', lineHeight: '1.6' }}>
            Videos are sourced from <strong>Wikimedia Commons</strong>. Results include videos spoken in {targetLang?.name}, plus videos spoken in your known language(s) that have {targetLang?.name} subtitles for flashcard generation.
          </p>
          <button onClick={handleSearch} style={BTN_PRIMARY}>Search for videos</button>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (phase === 'loading') return <Spinner />;

  // ── Grid ──────────────────────────────────────────────────────────────────
  if (phase === 'grid') {
    const knownAudioFlashcardCount = videos.filter(v => v.audioIsKnown && !v.audioIsTarget && v.hasTargetSubs).length;
    const knownLangNames = knownLangs.map(l => l.name).join('/');

    const filters = [
      { id: 'all', label: `All (${videos.length})` },
      { id: 'known-subs', label: `${knownLangNames} subs (${videos.filter(v => v.audioIsTarget && v.hasKnownSubs).length})` },
      { id: 'target-subs', label: `Flashcards · ${targetLang?.name} audio (${videos.filter(v => v.audioIsTarget && v.hasTargetSubs).length})` },
      { id: 'known-audio-flashcards', label: `Flashcards · ${knownLangNames} audio (${knownAudioFlashcardCount})` },
    ];

    const filtered = videos.filter(v => {
      if (gridFilter === 'known-subs') return v.audioIsTarget && v.hasKnownSubs;
      if (gridFilter === 'target-subs') return v.audioIsTarget && v.hasTargetSubs;
      if (gridFilter === 'known-audio-flashcards') return v.audioIsKnown && !v.audioIsTarget && v.hasTargetSubs;
      return true;
    });

    return (
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button onClick={() => setPhase('idle')} style={BTN_GHOST}>← Back</button>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#202122' }}>
            {targetLang?.name} videos
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setGridFilter(f.id)}
              style={{
                padding: '5px 12px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: gridFilter === f.id ? '700' : '500',
                border: gridFilter === f.id ? '1.5px solid #3366cc' : '1px solid #c8ccd1',
                background: gridFilter === f.id ? '#eaf3ff' : '#fff',
                color: gridFilter === f.id ? '#3366cc' : '#54595d',
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <p style={{ color: '#72777d', fontSize: '14px' }}>No videos match this filter.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
            {filtered.map(v => (
              <button
                key={v.title}
                onClick={() => handleSelectVideo(v)}
                style={{ border: '1px solid #c8ccd1', borderRadius: '2px', background: '#fff', padding: 0, cursor: 'pointer', textAlign: 'left', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
              >
                <div style={{ width: '100%', aspectRatio: '16/9', background: '#eaecf0', overflow: 'hidden' }}>
                  <img src={v.thumbUrl} alt={v.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#202122', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {v.name}
                  </div>
                  {(v.hasKnownSubs || v.hasTargetSubs || v.audioIsKnown) && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                      {v.audioIsKnown && !v.audioIsTarget && (
                        <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '10px', background: '#f0f0f0', color: '#54595d', fontWeight: '600' }}>
                          {knownLangNames} audio
                        </span>
                      )}
                      {v.hasKnownSubs && v.audioIsTarget && (
                        <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '10px', background: '#eaecf0', color: '#54595d', fontWeight: '600' }}>
                          {knownLangNames} subs
                        </span>
                      )}
                      {v.hasTargetSubs && (
                        <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '10px', background: '#eaf3ff', color: '#3366cc', fontWeight: '600' }}>
                          flashcards
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
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
          <video key={selected?.videoUrl} controls style={{ width: '100%', display: 'block', maxHeight: '520px' }}>
            <source src={selected?.videoUrl} />
            {vttUrl && <track kind="subtitles" src={vttUrl} label={vttLang} default />}
            Your browser does not support this video format.
          </video>
        </div>
        <div style={{ ...CARD, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ fontSize: '13px', color: '#72777d' }}>
            {vttUrl ? `Subtitles: ${vttLang}` : 'No subtitles available'}
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
            {(selected?.hasTargetSubs || selected?.hasKnownSubs) && (
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
            <button onClick={() => { setFcIndex(0); setFcScore(0); setFcDone(false); }} style={BTN_PRIMARY}>Replay</button>
            <button onClick={() => setPhase('watch')} style={BTN_GHOST}>Back to video</button>
            <button onClick={() => onNavigate('game-modes')} style={BTN_GHOST}>Home</button>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <button onClick={() => setPhase('watch')} style={{ ...BTN_GHOST, fontSize: '0.9rem', padding: '6px 12px' }}>← Back to video</button>
          <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#54595d' }}>Card {fcIndex + 1} of {fcWords.length}</span>
        </div>
        <div style={{ height: '6px', background: '#eaecf0', borderRadius: '2px', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ height: '100%', background: '#3366cc', width: `${(fcIndex / fcWords.length) * 100}%`, transition: 'width 0.3s ease' }} />
        </div>
        <FlashcardExercise word={currentWord} onAnswer={handleFcAnswer} />
      </div>
    );
  }

  return null;
}
