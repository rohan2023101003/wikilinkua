import React, { useEffect, useMemo, useState } from 'react';
import { playAudio } from '../utils/audio';
import { SoundIcon } from './Badges';
import { getLanguage } from '../utils/sparql';
import {
  fetchTatoebaPhrases, fetchP5831Phrases, highlightSegments, speakPhrase,
  ttsSupported, machineTranslate, gradePhrase,
} from '../utils/phrases';
import { langText } from '../utils/text';

const CARD = {
  maxWidth: '650px', margin: '20px auto', padding: '28px', display: 'block',
  border: '1px solid #c8ccd1', borderRadius: '2px', background: '#fff', color: '#202122',
};
const OPTION = {
  padding: '14px 16px', border: '1.5px solid #a2a9b1', borderRadius: '2px',
  background: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
  textAlign: 'left', width: '100%',
};

/**
 * Listening: hear the word, choose the meaning.
 *
 * Reading a word and recognising it by ear are different skills, and this is the
 * only exercise that trains the second. Only offered for words that actually have
 * a P443 recording - which is exactly what the Contribute tab is for.
 */
export function ListeningExercise({ word, words, onAnswer }) {
  const [picked, setPicked] = useState(null);
  const [playing, setPlaying] = useState(false);

  const choices = useMemo(() => {
    const correct = word.gloss || word.knownLemma;
    const seen = new Set([correct.trim().toLowerCase()]);
    const distractors = [];
    for (const w of [...words].sort(() => 0.5 - Math.random())) {
      const g = (w.gloss || '').trim();
      if (!g || seen.has(g.toLowerCase())) continue;
      seen.add(g.toLowerCase());
      distractors.push(g);
      if (distractors.length === 3) break;
    }
    return [...distractors, correct].sort(() => 0.5 - Math.random());
  }, [word, words]);

  const hear = () => {
    if (word.audioUrl) playAudio(word.audioUrl, () => setPlaying(true), () => setPlaying(false));
  };

  // Play once on arrival: the learner should hear it before reading anything.
  useEffect(() => { hear(); /* eslint-disable-next-line */ }, [word.lexemeId]);

  const correct = word.gloss || word.knownLemma;

  return (
    <div className="cdx-card" style={CARD}>
      <div style={{ fontSize: '13px', fontWeight: 700, color: '#72777d', textTransform: 'uppercase',
                    letterSpacing: '.08em', textAlign: 'center', marginBottom: '18px' }}>
        Listen
      </div>

      <div style={{ textAlign: 'center', marginBottom: '22px' }}>
        <button
          onClick={hear}
          disabled={playing}
          style={{ width: '72px', height: '72px', borderRadius: '50%', cursor: 'pointer',
                   border: '2px solid #3366cc', background: '#fff', display: 'inline-flex',
                   alignItems: 'center', justifyContent: 'center' }}
          aria-label="Play the word again"
        >
          <SoundIcon playing={playing} />
        </button>
        <p style={{ fontSize: '13px', color: '#72777d', margin: '10px 0 0' }}>
          What does this mean? Tap to hear it again.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {choices.map((choice, i) => {
          const isCorrect = choice === correct;
          const style = { ...OPTION };
          if (picked) {
            if (isCorrect) { style.border = '2px solid #0e7a63'; style.background = '#e9f6f2'; }
            else if (choice === picked) { style.border = '2px solid #bf3c2c'; style.background = '#fbe9e7'; }
            else style.opacity = 0.6;
            style.cursor = 'default';
          }
          return (
            <button
              key={i}
              style={style}
              onClick={() => {
                if (picked) return;
                setPicked(choice);
                onAnswer(choice === correct);
              }}
            >
              {choice}
            </button>
          );
        })}
      </div>

      {picked && (
        <p style={{ textAlign: 'center', marginTop: '18px', fontSize: '15px' }}>
          <strong {...langText}>{word.lemma}</strong>
          {word.targetIpa && (
            <span style={{ color: '#72777d', fontFamily: 'monospace', marginLeft: '8px' }}>
              /{word.targetIpa}/
            </span>
          )}
        </p>
      )}
    </div>
  );
}

/**
 * Use it in a sentence - the step from vocabulary to language.
 *
 * Fetches a real sentence containing one of the unit's words: Tatoeba first
 * (human sentences, often with translations and audio), Wikidata usage examples
 * (P5831) as the Wikimedia-native fallback. If neither has anything for this
 * language the step reports that honestly and moves on rather than stalling the
 * lesson - sentence coverage is thin for most languages, and pretending otherwise
 * would be worse than admitting it.
 */
export function SentenceExercise({ unitWords, profile, onAnswer }) {
  const [state, setState] = useState({ status: 'loading', phrase: null });
  const [reveal, setReveal] = useState(false);
  const [mt, setMt] = useState({ loading: false, text: null });

  const targetLang = getLanguage(profile?.targetLang) || {};
  const knownCodes = (profile?.knownLangs || [])
    .map(qid => (getLanguage(qid) || {}).code)
    .filter(Boolean);

  useEffect(() => {
    let alive = true;
    (async () => {
      const lemmas = unitWords.map(w => w.lemma).filter(Boolean);
      try {
        let found = [];
        if (targetLang.code && lemmas.length) {
          found = await fetchTatoebaPhrases(targetLang.code, knownCodes, lemmas, 4);
        }
        if (!found.length && profile?.targetLang && targetLang.code) {
          found = await fetchP5831Phrases(profile.targetLang, targetLang.code, 10);
        }
        if (!alive) return;
        setState(found.length
          ? { status: 'ready', phrase: found[0] }
          : { status: 'none', phrase: null });
      } catch {
        if (alive) setState({ status: 'none', phrase: null });
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitWords]);

  if (state.status === 'loading') {
    return (
      <div className="cdx-card" style={{ ...CARD, textAlign: 'center' }}>
        <div style={{ margin: '0 auto 16px', width: '32px', height: '32px', border: '3px solid #eaecf0',
                      borderTop: '3px solid #3366cc', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: '#54595d', fontSize: '14px', margin: 0 }}>
          Looking for a sentence that uses these words…
        </p>
      </div>
    );
  }

  if (state.status === 'none') {
    return (
      <div className="cdx-card" style={{ ...CARD, textAlign: 'center' }}>
        <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 8px' }}>
          No sentence available yet
        </h3>
        <p style={{ color: '#54595d', fontSize: '14px', lineHeight: 1.6, margin: '0 0 20px' }}>
          Nothing in Tatoeba or Wikidata's usage examples uses these {targetLang.name} words
          yet. That is a data gap, not a mistake on your part - adding usage examples (P5831)
          is one of the tasks in Contribute.
        </p>
        <button
          onClick={() => onAnswer(true)}
          style={{ padding: '10px 20px', borderRadius: '2px', background: '#3366cc', color: '#fff',
                   border: '1px solid #3366cc', fontWeight: 700, cursor: 'pointer' }}
        >
          Continue
        </button>
      </div>
    );
  }

  const phrase = state.phrase;
  const segments = highlightSegments(phrase.text, phrase.matchedWord);

  const showTranslation = async () => {
    setReveal(true);
    if (phrase.translation || mt.text || mt.loading) return;
    setMt({ loading: true, text: null });
    const t = await machineTranslate(targetLang.code, knownCodes[0], phrase.text);
    setMt({ loading: false, text: t });
  };

  const grade = (correct) => {
    gradePhrase(profile, phrase, correct);
    onAnswer(correct);
  };

  return (
    <div className="cdx-card" style={CARD}>
      <div style={{ fontSize: '13px', fontWeight: 700, color: '#72777d', textTransform: 'uppercase',
                    letterSpacing: '.08em', textAlign: 'center', marginBottom: '6px' }}>
        Use it in a sentence
      </div>
      <p style={{ textAlign: 'center', fontSize: '13px', color: '#72777d', margin: '0 0 20px' }}>
        A real sentence using a word from this unit.
      </p>

      <p style={{ fontSize: '1.5rem', fontWeight: 500, lineHeight: 1.55, textAlign: 'center',
                  margin: '0 0 20px' }} {...langText}>
        {segments.map((seg, i) => seg.hit
          ? <mark key={i} style={{ background: '#fef6b8', borderRadius: '2px', padding: '2px 4px' }}>{seg.text}</mark>
          : <span key={i}>{seg.text}</span>)}
      </p>

      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <button
          onClick={() => {
            if (phrase.audio) playAudio(phrase.audio);
            else speakPhrase(phrase.text, targetLang.code);
          }}
          style={{ padding: '8px 16px', border: '1px solid #a2a9b1', borderRadius: '2px',
                   background: '#fff', fontWeight: 600, cursor: 'pointer' }}
        >
          {phrase.audio ? 'Hear it' : (ttsSupported() ? 'Hear it (read aloud)' : 'No audio')}
        </button>
      </div>

      <div style={{ borderTop: '1px solid #c8ccd1', paddingTop: '18px', textAlign: 'center' }}>
        {!reveal ? (
          <button
            onClick={showTranslation}
            style={{ padding: '10px 20px', borderRadius: '2px', background: '#3366cc', color: '#fff',
                     border: '1px solid #3366cc', fontWeight: 700, cursor: 'pointer' }}
          >
            Show meaning
          </button>
        ) : (
          <>
            {phrase.translation ? (
              <p style={{ fontSize: '1.1rem', margin: 0 }}>{phrase.translation.text}</p>
            ) : mt.loading ? (
              <p style={{ color: '#72777d', margin: 0, fontSize: '14px' }}>Translating…</p>
            ) : mt.text ? (
              <div>
                <p style={{ fontSize: '1.1rem', margin: '0 0 4px' }}>{mt.text}</p>
                <span style={{ fontSize: '11px', color: '#72777d', fontStyle: 'italic' }}>
                  machine translation · Wikimedia MinT
                </span>
              </div>
            ) : (
              <p style={{ color: '#72777d', fontStyle: 'italic', margin: 0, fontSize: '14px' }}>
                No translation available for this sentence.
              </p>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
              <button
                onClick={() => grade(false)}
                style={{ padding: '10px 20px', border: '1px solid #bf3c2c', color: '#bf3c2c',
                         background: '#fff', borderRadius: '2px', fontWeight: 600, cursor: 'pointer' }}
              >
                Did not follow it
              </button>
              <button
                onClick={() => grade(true)}
                style={{ padding: '10px 20px', background: '#0e7a63', color: '#fff',
                         border: '1px solid #0e7a63', borderRadius: '2px', fontWeight: 600, cursor: 'pointer' }}
              >
                Understood it
              </button>
            </div>
          </>
        )}
      </div>

      <p style={{ textAlign: 'center', fontSize: '11px', color: '#a2a9b1', marginTop: '16px' }}>
        Sentence from Tatoeba (CC-BY) or Wikidata usage examples.
      </p>
    </div>
  );
}
