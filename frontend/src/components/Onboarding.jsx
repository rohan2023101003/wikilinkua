import React, { useState } from 'react';
import { LANGUAGES } from '../utils/sparql';

export default function Onboarding({ profile, onSaveProfile }) {
  const [knownLangs, setKnownLangs] = useState(profile?.knownLangs || ['Q1860']); // default English
  const [targetLang, setTargetLang] = useState(profile?.targetLang || 'Q150');   // default French

  const [knownSearch, setKnownSearch] = useState('');
  const [targetSearch, setTargetSearch] = useState('');

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

  const filteredKnown = LANGUAGES.filter(lang => 
    lang.name.toLowerCase().includes(knownSearch.toLowerCase()) ||
    lang.code.toLowerCase().includes(knownSearch.toLowerCase())
  );

  const filteredTarget = LANGUAGES.filter(lang => 
    !knownLangs.includes(lang.qid) && (
      lang.name.toLowerCase().includes(targetSearch.toLowerCase()) ||
      lang.code.toLowerCase().includes(targetSearch.toLowerCase())
    )
  );

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#ffffff', padding: '32px', borderRadius: '16px', border: '1px solid #eaecf0', boxShadow: '0 2px 12px rgba(0,0,0,0.015)' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: '#eaf3ff', color: '#3366cc', fontSize: '14px', fontWeight: 'bold' }}>1</span>
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
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
                background: '#ffffff'
              }}
            />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#72777d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
            </svg>
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
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    background: isSelected ? '#eaf3ff' : '#ffffff',
                    color: isSelected ? '#3366cc' : '#202122',
                    border: isSelected ? '2px solid #3366cc' : '1px solid #c8ccd1',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'all 0.1s ease',
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
                  <span style={{ fontSize: '11px', color: '#72777d', fontWeight: 'normal', marginLeft: 'auto' }}>
                    {lang.code.toUpperCase()}
                  </span>
                </button>
              );
            })}
            {filteredKnown.length === 0 && (
              <div style={{ color: '#72777d', fontStyle: 'italic', padding: '12px 0' }}>No languages found.</div>
            )}
          </div>
        </div>

        {/* Step 2: Target Language - Full Width */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#ffffff', padding: '32px', borderRadius: '16px', border: '1px solid #eaecf0', boxShadow: '0 2px 12px rgba(0,0,0,0.015)' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: '#eaf3ff', color: '#3366cc', fontSize: '14px', fontWeight: 'bold' }}>2</span>
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
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
                background: '#ffffff'
              }}
            />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#72777d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
            </svg>
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
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    background: isSelected ? '#eaf3ff' : '#ffffff',
                    color: isSelected ? '#3366cc' : '#202122',
                    border: isSelected ? '2px solid #3366cc' : '1px solid #c8ccd1',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'all 0.1s ease',
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
                  <span style={{ fontSize: '11px', color: '#72777d', fontWeight: 'normal', marginLeft: 'auto' }}>
                    {lang.code.toUpperCase()}
                  </span>
                </button>
              );
            })}
            {filteredTarget.length === 0 && (
              <div style={{ color: '#72777d', fontStyle: 'italic', padding: '12px 0' }}>
                No target languages found (excluding known languages).
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0 32px' }}>
          <button
            type="submit"
            style={{
              padding: '16px 56px',
              borderRadius: '8px',
              background: '#3366cc',
              color: '#ffffff',
              border: 'none',
              fontWeight: '700',
              fontSize: '16px',
              textAlign: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(51, 102, 204, 0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            Start Learning
          </button>
        </div>
      </form>
    </div>
  );
}
