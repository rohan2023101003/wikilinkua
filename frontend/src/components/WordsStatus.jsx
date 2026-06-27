import React, { useState } from 'react';
import { LANGUAGES } from '../utils/sparql';

export default function WordsStatus({ words, progress, onNavigate }) {
  const [activeTab, setActiveTab] = useState('Known'); // 'Known' | 'Learning' | 'New'

  const targetLangObj = LANGUAGES.find(l => l.qid === words[0]?.targetLang) || {};

  // Classify words
  const knownWords = [];
  const learningWords = [];
  const newWords = [];

  words.forEach(w => {
    const srs = progress.words?.[w.lexemeId];
    if (!srs || srs.boxLevel === undefined) {
      newWords.push(w);
    } else if (srs.boxLevel >= 3) {
      // Map percentage progress based on box level
      let pct = 70;
      if (srs.boxLevel === 4) pct = 88;
      if (srs.boxLevel === 5) pct = 100;
      knownWords.push({ ...w, pct });
    } else {
      let pct = 20;
      if (srs.boxLevel === 2) pct = 45;
      learningWords.push({ ...w, pct });
    }
  });

  const getActiveList = () => {
    if (activeTab === 'Known') return knownWords;
    if (activeTab === 'Learning') return learningWords;
    return newWords;
  };

  const activeList = getActiveList();

  return (
    <div className="fadeIn" style={{ maxWidth: '1200px', margin: '0 auto', color: '#202122' }}>
      
      {/* Header Info */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>My progress</h1>
        <p style={{ fontSize: '15px', color: '#54595d', margin: 0 }}>
          Track your memorization boxes for {targetLangObj.name || 'target language'} vocabulary.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {[
          { id: 'Known', label: 'Known words', count: knownWords.length, color: '#0e7a63', bg: '#e9f6f2', border: '#a3dcd0' },
          { id: 'Learning', label: 'Learning words', count: learningWords.length, color: '#3366cc', bg: '#eaf3ff', border: '#b8d4f9' },
          { id: 'New', label: 'New words', count: newWords.length, color: '#54595d', bg: '#f8f9fa', border: '#d5d8db' }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '20px',
                borderRadius: '2px',
                background: isActive ? tab.bg : '#ffffff',
                border: isActive ? `2px solid ${tab.color}` : '1px solid #c8ccd1',
                cursor: 'pointer',
                textAlign: 'center'
              }}
              onMouseOver={(e) => {
                if (!isActive) e.currentTarget.style.borderColor = tab.color;
              }}
              onMouseOut={(e) => {
                if (!isActive) e.currentTarget.style.borderColor = '#c8ccd1';
              }}
            >
              <div style={{ fontSize: '32px', fontWeight: '800', color: tab.color }}>{tab.count}</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: isActive ? tab.color : '#54595d', marginTop: '6px' }}>
                {tab.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Words Grid Container */}
      <div style={{ margin: '0 0 32px 0' }}>
        {activeList.length === 0 ? (
          <div style={{ padding: '64px', textAlign: 'center', color: '#72777d', fontStyle: 'italic', background: '#ffffff', border: '1px solid #c8ccd1', borderRadius: '2px' }}>
            No words in this category yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {activeList.map(w => (
              <div 
                key={w.lexemeId}
                style={{ 
                  padding: '20px', 
                  border: '1px solid #c8ccd1',
                  borderRadius: '2px',
                  background: '#ffffff',
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
                <div>
                  <div style={{ fontSize: '19px', fontWeight: '800', color: '#202122', letterSpacing: '-0.01em' }}>
                    {w.lemma}
                  </div>
                  <div style={{ fontSize: '13px', color: '#72777d', marginTop: '4px' }}>
                    Meaning: <strong style={{ color: '#202122' }}>{w.gloss || w.knownLemma}</strong>
                  </div>
                </div>
                
                <div style={{ borderTop: '1px solid #c8ccd1', paddingTop: '12px', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#54595d', fontWeight: '500' }}>Leitner Box Status</span>
                  
                  {activeTab !== 'New' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: activeTab === 'Known' ? '#0e7a63' : '#3366cc' }}>
                        {w.pct}%
                      </span>
                      <div style={{ width: '48px', height: '6px', borderRadius: '1px', background: '#eaecf0', overflow: 'hidden' }}>
                        <div style={{ width: `${w.pct}%`, height: '100%', background: activeTab === 'Known' ? '#0e7a63' : '#3366cc' }} />
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#72777d', background: '#f8f9fa', padding: '3px 8px', borderRadius: '2px', border: '1px solid #c8ccd1', fontWeight: '500' }}>
                      Not seen
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Practice Button */}
      <div style={{ display: 'flex', paddingBottom: '40px' }}>
        <button 
          onClick={() => onNavigate('game-modes')} 
          style={{ 
            padding: '14px 40px', 
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
      </div>
    </div>
  );
}
