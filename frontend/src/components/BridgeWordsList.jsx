import React, { useState } from 'react';
import { LANGUAGES } from '../utils/sparql';
import { playAudio } from '../utils/audio';
import { CognateBadge, PhoneticBadge, FalseFriendBadge, SoundIcon } from './Badges';

export default function BridgeWordsList({ words, totalTargetMapped, profile, onNavigate }) {
  const [playingId, setPlayingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All'); // 'All' | 'Cognate' | 'Phonetic' | 'False friend'

  const targetLangObj = LANGUAGES.find(l => l.qid === profile.targetLang) || {};
  const knownLangsNames = profile.knownLangs
    .map(qid => LANGUAGES.find(l => l.qid === qid)?.code || '')
    .join(' + ');

  // Filter words: must have concept
  const bridgeWords = words.filter(w => w.concept !== null);

  const overlapPct = totalTargetMapped > 0
    ? Math.min(100, Math.round((bridgeWords.length / totalTargetMapped) * 100))
    : 0;

  const handlePlay = (e, lexemeId, audioUrl) => {
    e.stopPropagation();
    if (!audioUrl) return;
    playAudio(
      audioUrl,
      () => setPlayingId(lexemeId),
      () => setPlayingId(null)
    );
  };

  // Filter logic based on query and active pill
  const filteredWords = bridgeWords.filter(w => {
    // 1. Search Query filter
    const matchesSearch = 
      w.lemma.toLowerCase().includes(searchQuery.toLowerCase()) || 
      w.knownLemma.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.gloss && w.gloss.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;

    // 2. Pill Category filter
    if (activeFilter === 'Cognate') return w.cognate === true;
    if (activeFilter === 'Phonetic') return w.phoneticMatch === true;
    if (activeFilter === 'False friend') return w.falseFriend === true;
    
    return true;
  });

  return (
    <div className="fadeIn" style={{ maxWidth: '1200px', margin: '0 auto', color: '#202122' }}>
      
      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>Bridge words</h1>
          <p style={{ fontSize: '15px', color: '#54595d', margin: 0 }}>
            Explore the lexical links between {knownLangsNames.toUpperCase()} and {targetLangObj.name}.
          </p>
        </div>
        
        <div style={{ fontSize: '14px', color: '#3366cc', background: '#eaf3ff', padding: '12px 20px', borderRadius: '12px', fontWeight: '700', border: '1px solid #c8ccd1' }}>
          Vocabulary overlap: ~<strong>{overlapPct}%</strong>
        </div>
      </div>

      {/* Filter Controls Row */}
      <div className="filter-controls-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {/* Search Input */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            padding: '12px 16px', 
            border: '1px solid #a2a9b1', 
            borderRadius: '8px', 
            color: '#72777d',
            background: '#ffffff',
            flex: '1 1 300px',
            maxWidth: '450px'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input 
            type="text" 
            placeholder={`Search ${bridgeWords.length} bridge words...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              border: 'none', 
              outline: 'none', 
              fontSize: '14px', 
              width: '100%', 
              color: '#202122',
              background: 'transparent'
            }}
          />
        </div>

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'All', label: 'All links', color: '#3366cc', bgSelected: '#3366cc', textSelected: '#fff', border: '#c8ccd1' },
            { id: 'Cognate', label: 'Cognates', color: '#3366cc', bgSelected: '#eaf3ff', textSelected: '#3366cc', border: '#c8ccd1' },
            { id: 'Phonetic', label: 'Phonetics', color: '#0e7a63', bgSelected: '#e9f6f2', textSelected: '#0e7a63', border: '#c8ccd1' },
            { id: 'False friend', label: 'False Friends', color: '#bf3c2c', bgSelected: '#fbe9e7', textSelected: '#bf3c2c', border: '#c8ccd1' }
          ].map(pill => {
            const isSelected = activeFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setActiveFilter(pill.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  background: isSelected ? pill.bgSelected : '#ffffff',
                  color: isSelected ? pill.textSelected : pill.color,
                  border: isSelected && pill.id === 'All' ? '1px solid #3366cc' : '1px solid ' + pill.border,
                  fontSize: '13px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Words Grid List - Natural Page Scroll */}
      <div style={{ margin: '0 0 32px 0' }}>
        {filteredWords.length === 0 ? (
          <div style={{ padding: '64px', textAlign: 'center', color: '#72777d', fontStyle: 'italic', background: '#fff', border: '1px solid #eaecf0', borderRadius: '12px' }}>
            No matching words found.
          </div>
        ) : (
          <div className="words-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {filteredWords.map(b => (
              <div 
                key={b.lexemeId}
                style={{ 
                  background: '#ffffff',
                  border: '1px solid #eaecf0',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.015)',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#c8ccd1';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#eaecf0';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.015)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '19px', fontWeight: '800', color: '#202122', letterSpacing: '-0.01em' }}>
                      {b.lemma}
                    </div>
                    {b.targetIpa && (
                      <div style={{ fontSize: '13px', color: '#72777d', marginTop: '2px', fontFamily: 'monospace' }}>
                        /{b.targetIpa}/
                      </div>
                    )}
                  </div>

                  {b.audioUrl && (
                    <button
                      onClick={(e) => handlePlay(e, b.lexemeId, b.audioUrl)}
                      style={{
                        background: '#f8f9fa',
                        border: '1px solid #eaecf0',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '6px',
                        width: '32px',
                        height: '32px',
                        flexShrink: 0
                      }}
                      disabled={playingId !== null && playingId !== b.lexemeId}
                    >
                      <SoundIcon playing={playingId === b.lexemeId} />
                    </button>
                  )}
                </div>

                <div style={{ borderTop: '1px solid #eaecf0', paddingTop: '12px', marginTop: '4px' }}>
                  <div style={{ fontSize: '13px', color: '#54595d' }}>
                    Meaning: <strong style={{ color: '#202122' }}>{b.gloss}</strong>
                  </div>
                  <div style={{ fontSize: '13px', color: '#54595d', marginTop: '4px' }}>
                    Bridges to: <strong style={{ color: '#3366cc' }}>{b.knownLemma}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '8px' }}>
                  {b.cognate && <CognateBadge />}
                  {b.phoneticMatch && <PhoneticBadge />}
                  {b.falseFriend === true && <FalseFriendBadge />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom control row */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', paddingBottom: '40px' }}>
        <button 
          onClick={() => onNavigate('game-modes')} 
          style={{ 
            padding: '14px 28px', 
            borderRadius: '8px', 
            background: '#3366cc', 
            color: '#ffffff', 
            border: 'none', 
            fontWeight: '700', 
            fontSize: '15px', 
            cursor: 'pointer',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(51, 102, 204, 0.2)'
          }}
        >
          Practice Vocabulary
        </button>
        <button 
          onClick={() => onNavigate('onboarding')} 
          style={{ 
            padding: '14px 28px', 
            borderRadius: '8px', 
            background: '#ffffff', 
            color: '#3366cc', 
            border: '1px solid #3366cc', 
            fontWeight: '700', 
            fontSize: '15px', 
            cursor: 'pointer',
            textAlign: 'center' 
          }}
        >
          Adjust Selected Languages
        </button>
      </div>

      {/* Responsive layout controls */}
      <style>{`
        @media (max-width: 600px) {
          .filter-controls-row {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .filter-controls-row > div {
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
