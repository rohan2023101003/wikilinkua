import React from 'react';

export function CognateBadge() {
  return (
    <span 
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '4px', 
        padding: '3px 8px', 
        borderRadius: '2px', 
        background: '#eaf3ff', 
        color: '#3366cc', 
        fontSize: '12px', 
        fontWeight: '600',
        whiteSpace: 'nowrap'
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <path d="M9 12h6"/>
        <path d="M8 8a4 4 0 0 0 0 8"/>
        <path d="M16 8a4 4 0 0 1 0 8"/>
      </svg>
      Cognate
    </span>
  );
}

export function PhoneticBadge() {
  return (
    <span 
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '4px', 
        padding: '3px 8px', 
        borderRadius: '2px', 
        background: '#e9f6f2', 
        color: '#0e7a63', 
        fontSize: '12px', 
        fontWeight: '600',
        whiteSpace: 'nowrap'
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 5 6 9H2v6h4l5 4z"/>
        <path d="M15.5 8.5a5 5 0 0 1 0 7"/>
      </svg>
      Phonetic
    </span>
  );
}

export function FalseFriendBadge() {
  return (
    <span 
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '4px', 
        padding: '3px 8px', 
        borderRadius: '2px', 
        background: '#fbe9e7', 
        color: '#bf3c2c', 
        fontSize: '12px', 
        fontWeight: '600',
        whiteSpace: 'nowrap'
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 4 2 20h20z"/>
        <path d="M12 10v4"/>
        <path d="M12 17.5v.2"/>
      </svg>
      False friend
    </span>
  );
}

export function SoundIcon({ playing = false }) {
  if (playing) {
    return (
      <div 
        style={{ 
          width: '28px', 
          height: '28px', 
          borderRadius: '50%', 
          background: '#3366cc', 
          color: '#fff', 
          display: 'flex', 
          alignItems: 'flex-end', 
          justifyContent: 'center', 
          gap: '2px', 
          paddingBottom: '8px' 
        }}
      >
        <span style={{ width: '2px', height: '8px', background: '#fff', borderRadius: '1px', animation: 'wave .8s ease-in-out infinite' }}></span>
        <span style={{ width: '2px', height: '11px', background: '#fff', borderRadius: '1px', animation: 'wave .8s ease-in-out .15s infinite' }}></span>
        <span style={{ width: '2px', height: '6px', background: '#fff', borderRadius: '1px', animation: 'wave .8s ease-in-out .3s infinite' }}></span>
        <style>{`
          @keyframes wave {
            0%, 100% { transform: scaleY(.4); }
            50% { transform: scaleY(1); }
          }
        `}</style>
      </div>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3366cc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 5 6 9H2v6h4l5 4z"/>
      <path d="M15.5 8.5a5 5 0 0 1 0 7"/>
    </svg>
  );
}
