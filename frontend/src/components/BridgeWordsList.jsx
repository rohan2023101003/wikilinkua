import React, { useState, useEffect } from 'react';
import { LANGUAGES } from '../utils/sparql';
import { playAudio } from '../utils/audio';
import { CognateBadge, PhoneticBadge, FalseFriendBadge, BridgeBadge, SoundIcon } from './Badges';

export default function BridgeWordsList({ words, totalTargetMapped, profile, initialFilter = 'All', onNavigate }) {
  const [playingId, setPlayingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState(initialFilter); // 'All' | 'Bridge' | 'Cognate' | 'Phonetic' | 'False friend'

  useEffect(() => {
    setActiveFilter(initialFilter);
  }, [initialFilter]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const targetLangObj = LANGUAGES.find(l => l.qid === profile.targetLang) || {};
  const knownLangsNames = profile.knownLangs
    .map(qid => LANGUAGES.find(l => l.qid === qid)?.code || '')
    .join(' + ');

  // Filter words: must have concept
  const bridgeWords = words.filter(w => w.isBridge);

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

  // Reset page to 1 on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter]);

  // Filter logic based on query and active pill
  const filteredWords = words.filter(w => {
    // 1. Search Query filter
    const matchesSearch = 
      w.lemma.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (w.knownLemma && w.knownLemma.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (w.gloss && w.gloss.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;

    // 2. Pill Category filter
    if (activeFilter === 'Bridge') return w.isBridge === true;
    if (activeFilter === 'Cognate') return w.cognate === true;
    if (activeFilter === 'Phonetic') return w.phoneticMatch === true;
    if (activeFilter === 'False friend') return w.falseFriend === true;
    
    return true;
  });

  const totalPages = Math.ceil(filteredWords.length / itemsPerPage);
  const safeCurrentPage = Math.min(currentPage, totalPages || 1);
  const paginatedWords = filteredWords.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const maxVisiblePages = 5;
    let startPage = Math.max(1, safeCurrentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    const buttonStyle = (isActive) => ({
      padding: '8px 12px',
      minWidth: '38px',
      height: '38px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '2px',
      border: '1px solid ' + (isActive ? '#3366cc' : '#a2a9b1'),
      background: isActive ? '#3366cc' : '#ffffff',
      color: isActive ? '#ffffff' : '#202122',
      fontWeight: isActive ? '700' : '500',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.15s ease'
    });

    const arrowButtonStyle = (disabled) => ({
      padding: '8px 16px',
      height: '38px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '2px',
      border: '1px solid ' + (disabled ? '#eaecf0' : '#a2a9b1'),
      background: '#ffffff',
      color: disabled ? '#eaecf0' : '#202122',
      fontWeight: '600',
      fontSize: '14px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.15s ease'
    });

    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', margin: '32px 0 16px 0', flexWrap: 'wrap' }}>
        <button
          disabled={safeCurrentPage === 1}
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          style={arrowButtonStyle(safeCurrentPage === 1)}
        >
          Previous
        </button>

        {startPage > 1 && (
          <>
            <button onClick={() => setCurrentPage(1)} style={buttonStyle(safeCurrentPage === 1)}>1</button>
            {startPage > 2 && <span style={{ color: '#72777d', padding: '0 4px' }}>...</span>}
          </>
        )}

        {Array.from({ length: endPage - startPage + 1 }, (_, i) => {
          const page = startPage + i;
          return (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              style={buttonStyle(safeCurrentPage === page)}
            >
              {page}
            </button>
          );
        })}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span style={{ color: '#72777d', padding: '0 4px' }}>...</span>}
            <button onClick={() => setCurrentPage(totalPages)} style={buttonStyle(safeCurrentPage === totalPages)}>{totalPages}</button>
          </>
        )}

        <button
          disabled={safeCurrentPage === totalPages}
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          style={arrowButtonStyle(safeCurrentPage === totalPages)}
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="fadeIn" style={{ maxWidth: '1200px', margin: '0 auto', color: '#202122' }}>
      
      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>Words</h1>
          <p style={{ fontSize: '15px', color: '#54595d', margin: 0 }}>
            Explore the vocabulary of {targetLangObj.name} and the lexical links to {knownLangsNames.toUpperCase()}.
          </p>
        </div>
        
        <div style={{ fontSize: '14px', color: '#3366cc', background: '#eaf3ff', padding: '8px 16px', borderRadius: '2px', fontWeight: '700', border: '1px solid #3366cc' }}>
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
            padding: '8px 12px', 
            border: '1px solid #a2a9b1', 
            borderRadius: '2px', 
            color: '#72777d',
            background: '#ffffff',
            flex: '1 1 300px',
            maxWidth: '450px'
          }}
        >
          <span style={{ fontSize: '16px', userSelect: 'none' }}>🔍</span>
          <input 
            type="text" 
            placeholder={`Search ${filteredWords.length} words...`}
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
            { id: 'All', label: 'All Words', color: '#202122', bgSelected: '#3366cc', textSelected: '#fff', border: '#c8ccd1', borderSelected: '#3366cc' },
            { id: 'Bridge', label: 'Bridge Words', color: '#3366cc', bgSelected: '#eaf3ff', textSelected: '#3366cc', border: '#c8ccd1', borderSelected: '#3366cc' },
            { id: 'Cognate', label: 'Cognates', color: '#3366cc', bgSelected: '#eaf3ff', textSelected: '#3366cc', border: '#c8ccd1', borderSelected: '#3366cc' },
            { id: 'Phonetic', label: 'Phonetics', color: '#0e7a63', bgSelected: '#e9f6f2', textSelected: '#0e7a63', border: '#c8ccd1', borderSelected: '#0e7a63' },
            { id: 'False friend', label: 'False Friends', color: '#bf3c2c', bgSelected: '#fbe9e7', textSelected: '#bf3c2c', border: '#c8ccd1', borderSelected: '#bf3c2c' }
          ].map(pill => {
            const isSelected = activeFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setActiveFilter(pill.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '2px',
                  background: isSelected ? pill.bgSelected : '#ffffff',
                  color: isSelected ? pill.textSelected : pill.color,
                  border: isSelected ? '1px solid ' + pill.borderSelected : '1px solid ' + pill.border,
                  fontSize: '13px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer'
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
        {paginatedWords.length === 0 ? (
          <div style={{ padding: '64px', textAlign: 'center', color: '#72777d', fontStyle: 'italic', background: '#fff', border: '1px solid #c8ccd1', borderRadius: '2px' }}>
            No matching words found.
          </div>
        ) : (
          <>
            <div className="words-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {paginatedWords.map(b => (
                <div 
                  key={b.lexemeId}
                  style={{ 
                    background: '#ffffff',
                    border: '1px solid #c8ccd1',
                    borderRadius: '2px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#72777d';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = '#c8ccd1';
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
                          border: '1px solid #a2a9b1',
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

                  <div style={{ borderTop: '1px solid #c8ccd1', paddingTop: '12px', marginTop: '4px' }}>
                    <div style={{ fontSize: '13px', color: '#54595d' }}>
                      Meaning: <strong style={{ color: '#202122' }}>{b.gloss}</strong>
                    </div>
                    {b.isBridge && b.knownLemma && (
                      <div style={{ fontSize: '13px', color: '#54595d', marginTop: '4px' }}>
                        Bridges to: <strong style={{ color: '#3366cc' }}>{b.knownLemma}</strong>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '8px' }}>
                    {b.isBridge && <BridgeBadge />}
                    {b.cognate && <CognateBadge />}
                    {b.phoneticMatch && <PhoneticBadge />}
                    {b.falseFriend === true && <FalseFriendBadge />}
                  </div>
                </div>
              ))}
            </div>
            {renderPagination()}
          </>
        )}
      </div>

      {/* Bottom control row */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', paddingBottom: '40px' }}>
        <button 
          onClick={() => onNavigate('game-modes')} 
          style={{ 
            padding: '14px 28px', 
            borderRadius: '2px', 
            background: '#3366cc', 
            color: '#ffffff', 
            border: '1px solid #3366cc', 
            fontWeight: '700', 
            fontSize: '15px', 
            cursor: 'pointer',
            textAlign: 'center'
          }}
        >
          Practice Vocabulary
        </button>
        <button 
          onClick={() => onNavigate('onboarding')} 
          style={{ 
            padding: '14px 28px', 
            borderRadius: '2px', 
            background: '#ffffff', 
            color: '#202122', 
            border: '1px solid #a2a9b1', 
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
