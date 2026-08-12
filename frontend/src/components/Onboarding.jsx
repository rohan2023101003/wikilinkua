import React, { useState } from 'react';
import { LANGUAGES, MIN_USEFUL_LEXEMES } from '../utils/sparql';
import { deckWordCount } from '../utils/storage';

export default function Onboarding({ profile, onSaveProfile }) {
  const [knownLangs, setKnownLangs] = useState(profile?.knownLangs || ['Q1860']); // default English
  const [targetLang, setTargetLang] = useState(profile?.targetLang || 'Q150');   // default French

  const [knownSearch, setKnownSearch] = useState('');
  const [targetSearch, setTargetSearch] = useState('');
  // Wikidata has lexemes in ~1,500 languages, but most have only a handful.
  // Default to the ones with enough data to learn from; the rest are one click away.
  const [showAllKnown, setShowAllKnown] = useState(false);
  const [showAllTarget, setShowAllTarget] = useState(false);

  const MAX_RENDERED = 240;   // keep the DOM sane when "show all" is on

  const handleToggleKnown = (qid) => {
    if (knownLangs.includes(qid)) {
      if (knownLangs.length > 1) {
        setKnownLangs(knownLangs.filter(id => id !== qid));
      }
    } else {
      const updatedKnown = [...knownLangs, qid];
      setKnownLangs(updatedKnown);
      if (targetLang === qid) {
        const nextTarget = LANGUAGES.find(l => !updatedKnown.includes(l.qid));
        if (nextTarget) {
          setTargetLang(nextTarget.qid);
        }
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (knownLangs.includes(targetLang)) {
      alert("Your target language must be different from the languages you already know.");
      return;
    }
    onSaveProfile({ knownLangs, targetLang });
  };

  const nameOf = (qid) => (LANGUAGES.find(l => l.qid === qid) || {}).name || qid;
  const pairLabel = `${knownLangs.map(nameOf).join(' + ')} → ${nameOf(targetLang)}`;
  const savedWords = deckWordCount({ knownLangs, targetLang });

  const matches = (lang, term) => {
    const q = term.trim().toLowerCase();
    if (!q) return true;
    return lang.name.toLowerCase().includes(q)
      || (lang.code || '').toLowerCase().includes(q)
      || (lang.aliases || []).some(a => a.includes(q))
      || lang.qid.toLowerCase() === q;
  };

  // A language the learner already picked stays visible even when it is below the
  // data threshold - otherwise their own selection would disappear from the list.
  const visible = (lang, term, showAll, selectedQids) =>
    matches(lang, term)
    && (showAll || lang.lexemes >= MIN_USEFUL_LEXEMES || selectedQids.includes(lang.qid));

  const filteredKnown = LANGUAGES
    .filter(lang => visible(lang, knownSearch, showAllKnown, knownLangs))
    .slice(0, MAX_RENDERED);

  const filteredTarget = LANGUAGES
    .filter(lang => !knownLangs.includes(lang.qid)
      && visible(lang, targetSearch, showAllTarget, [targetLang]))
    .slice(0, MAX_RENDERED);

  const belowThreshold = LANGUAGES.filter(l => l.lexemes < MIN_USEFUL_LEXEMES).length;
  const targetLangObj = LANGUAGES.find(l => l.qid === targetLang);
  const thinTarget = !!targetLangObj && targetLangObj.lexemes < 500;

  return (
    <div className="fadeIn" style={{ maxWidth: '1200px', margin: '0 auto', color: '#202122' }}>
      
      {/* Title / Welcomer */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontWeight: '800', fontSize: '32px', color: '#202122', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
          Welcome to Wiki<span style={{ color: '#3366cc' }}>Linkua</span>
        </h1>
        <p style={{ fontSize: '16px', color: '#54595d', margin: 0 }}>
          Learn vocabulary using bridge words from languages you already speak.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Step 1: Known Languages - Full Width */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#ffffff', padding: '32px', borderRadius: '2px', border: '1px solid #c8ccd1' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '2px', background: '#eaf3ff', color: '#3366cc', fontSize: '14px', fontWeight: 'bold' }}>1</span>
              Languages you already speak
            </h2>
            <p style={{ fontSize: '14px', color: '#54595d', margin: '0 0 16px 38px' }}>
              Select all languages that you understand.
            </p>
          </div>

          <div style={{ position: 'relative', marginLeft: '38px', maxWidth: '400px' }}>
            <input 
              type="text" 
              placeholder="Search known languages..." 
              value={knownSearch}
              onChange={(e) => setKnownSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                border: '1px solid #a2a9b1',
                borderRadius: '2px',
                fontSize: '14px',
                boxSizing: 'border-box',
                background: '#ffffff'
              }}
            />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#72777d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
            </svg>
          </div>

          <div style={{ marginLeft: '38px', fontSize: '12px', color: '#72777d' }}>
            Showing languages with at least {MIN_USEFUL_LEXEMES} lexemes on Wikidata.{' '}
            <button type="button" onClick={() => setShowAllKnown(v => !v)} style={{ background: 'none', border: 'none', padding: 0, color: '#3366cc', cursor: 'pointer', font: 'inherit', textDecoration: 'underline' }}>
              {showAllKnown ? 'Hide sparse languages' : `Show all (${belowThreshold} more, mostly with only a few words)`}
            </button>
          </div>

          <div style={{ marginLeft: '38px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px', maxHeight: '350px', overflowY: 'auto', paddingRight: '8px' }}>
            {filteredKnown.map(lang => {
              const isSelected = knownLangs.includes(lang.qid);
              return (
                <button
                  key={lang.qid}
                  type="button"
                  onClick={() => handleToggleKnown(lang.qid)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '2px',
                    fontSize: '14px',
                    fontWeight: '600',
                    background: isSelected ? '#eaf3ff' : '#ffffff',
                    color: isSelected ? '#3366cc' : '#202122',
                    border: isSelected ? '2px solid #3366cc' : '1px solid #c8ccd1',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    textAlign: 'left'
                  }}
                >
                  <input 
                    type="checkbox" 
                    checked={isSelected}
                    readOnly
                    style={{ cursor: 'pointer', accentColor: '#3366cc' }}
                  />
                  <span>{lang.name}</span>
                  <span title={lang.lexemes.toLocaleString() + ' lexemes on Wikidata'} style={{ fontSize: '11px', color: '#72777d', fontWeight: 'normal', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                    {(lang.code || '').toUpperCase()} · {lang.lexemes.toLocaleString()}
                  </span>
                </button>
              );
            })}
            {filteredKnown.length === 0 && (
              <div style={{ color: '#72777d', fontStyle: 'italic', padding: '12px 0' }}>
                No languages found{!showAllKnown ? ' with enough data - try "show all".' : '.'}
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Target Language - Full Width */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#ffffff', padding: '32px', borderRadius: '2px', border: '1px solid #c8ccd1' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '2px', background: '#eaf3ff', color: '#3366cc', fontSize: '14px', fontWeight: 'bold' }}>2</span>
              Language you want to learn
            </h2>
            <p style={{ fontSize: '14px', color: '#54595d', margin: '0 0 16px 38px' }}>
              Select a target language to start learning link words.
            </p>
          </div>

          <div style={{ position: 'relative', marginLeft: '38px', maxWidth: '400px' }}>
            <input 
              type="text" 
              placeholder="Search target languages..." 
              value={targetSearch}
              onChange={(e) => setTargetSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                border: '1px solid #a2a9b1',
                borderRadius: '2px',
                fontSize: '14px',
                boxSizing: 'border-box',
                background: '#ffffff'
              }}
            />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#72777d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
            </svg>
          </div>

          <div style={{ marginLeft: '38px', fontSize: '12px', color: '#72777d' }}>
            Sorted by how much data Wikidata has.{' '}
            <button type="button" onClick={() => setShowAllTarget(v => !v)} style={{ background: 'none', border: 'none', padding: 0, color: '#3366cc', cursor: 'pointer', font: 'inherit', textDecoration: 'underline' }}>
              {showAllTarget ? 'Hide sparse languages' : 'Show every language with lexemes'}
            </button>
          </div>

          <div style={{ marginLeft: '38px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px', maxHeight: '350px', overflowY: 'auto', paddingRight: '8px' }}>
            {filteredTarget.map(lang => {
              const isSelected = targetLang === lang.qid;
              return (
                <button
                  key={lang.qid}
                  type="button"
                  onClick={() => setTargetLang(lang.qid)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '2px',
                    fontSize: '14px',
                    fontWeight: '600',
                    background: isSelected ? '#eaf3ff' : '#ffffff',
                    color: isSelected ? '#3366cc' : '#202122',
                    border: isSelected ? '2px solid #3366cc' : '1px solid #c8ccd1',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    textAlign: 'left'
                  }}
                >
                  <input 
                    type="radio" 
                    checked={isSelected}
                    readOnly
                    style={{ cursor: 'pointer', accentColor: '#3366cc' }}
                  />
                  <span>{lang.name}</span>
                  <span title={lang.lexemes.toLocaleString() + ' lexemes on Wikidata'} style={{ fontSize: '11px', color: '#72777d', fontWeight: 'normal', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                    {(lang.code || '').toUpperCase()} · {lang.lexemes.toLocaleString()}
                  </span>
                </button>
              );
            })}
            {filteredTarget.length === 0 && (
              <div style={{ color: '#72777d', fontStyle: 'italic', padding: '12px 0' }}>
                No target languages found{!showAllTarget ? ' with enough data - try "show all".' : ''}.
              </div>
            )}
          </div>
        </div>

        {/* Progress is kept per language pair - tell the learner what they'll get. */}
        <div style={{ textAlign: 'center', fontSize: '14px', color: '#54595d', marginTop: '-8px' }}>
          {savedWords > 0
            ? `You already have ${savedWords} word${savedWords === 1 ? '' : 's'} in progress for ${pairLabel}. Your progress for every other pair is kept safe too.`
            : `${pairLabel} is a fresh start - you'll begin at 0%. Progress for pairs you've studied before is kept and restored when you switch back.`}
        </div>

        {/* Honest expectations before they commit to a pair */}
        {(savedWords > 0 || thinTarget) && (
          <div style={{ margin: '0 auto', maxWidth: '760px', width: '100%' }}>
            {savedWords > 0 && (
              <p style={{ fontSize: '14px', color: '#0e7a63', background: '#e9f6f2', border: '1px solid #a3dcd0', borderRadius: '2px', padding: '10px 14px', margin: '0 0 10px' }}>
                You already have progress on this pair - {savedWords} word{savedWords === 1 ? '' : 's'} saved. It will pick up where you left off.
              </p>
            )}
            {thinTarget && (
              <p style={{ fontSize: '14px', color: '#886600', background: '#fef6e7', border: '1px solid #f2d9a0', borderRadius: '2px', padding: '10px 14px', margin: 0 }}>
                {targetLangObj.name} has only {targetLangObj.lexemes.toLocaleString()} lexemes on Wikidata, so expect few words and few links.
                That is a data gap, not a bug - the Contribute tab shows exactly what is missing and how to add it.
              </p>
            )}
          </div>
        )}

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0 32px' }}>
          <button
            type="submit"
            style={{
              padding: '14px 48px',
              borderRadius: '2px',
              background: '#3366cc',
              color: '#ffffff',
              border: '1px solid #3366cc',
              fontWeight: '700',
              fontSize: '16px',
              textAlign: 'center',
              cursor: 'pointer'
            }}
          >
            Start Learning
          </button>
        </div>
      </form>
    </div>
  );
}
