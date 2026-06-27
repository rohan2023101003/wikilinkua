import React from 'react';
import * as icons from '@wikimedia/codex-icons';

// Expose icons so other components can import them from Badges.jsx
export const {
  cdxIconCheck,
  cdxIconClose,
  cdxIconVolumeUp,
  cdxIconVolumeOff,
  cdxIconSearch,
  cdxIconHome,
  cdxIconArticle,
  cdxIconBookmarkList,
  cdxIconClock,
  cdxIconUserAvatarOutline,
  cdxIconStar,
  cdxIconEdit,
  cdxIconNext
} = icons;

// A helper component to render Codex icons using the standard SVG structure
export function CodexIcon({ icon, size = '20px', color = 'currentColor', style = {} }) {
  if (!icon) return null;
  const pathHtml = typeof icon === 'string' ? icon : (icon.ltr || '');
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      style={{ fill: color, display: 'inline-block', verticalAlign: 'middle', ...style }}
      dangerouslySetInnerHTML={{ __html: pathHtml }}
    />
  );
}

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
        whiteSpace: 'nowrap',
        border: '1px solid #b8d4f9'
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
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
        whiteSpace: 'nowrap',
        border: '1px solid #a3dcd0'
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
        background: '#fee7e6', 
        color: '#bf3c2c', 
        fontSize: '12px', 
        fontWeight: '600',
        whiteSpace: 'nowrap',
        border: '1px solid #f9c5c0'
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 4 2 20h20z"/>
        <path d="M12 10v4"/>
        <path d="M12 17.5v.2"/>
      </svg>
      False friend
    </span>
  );
}

export function BridgeBadge() {
  return (
    <span 
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '4px', 
        padding: '3px 8px', 
        borderRadius: '2px', 
        background: '#f1edf9', 
        color: '#6b4ba3', 
        fontSize: '12px', 
        fontWeight: '600',
        whiteSpace: 'nowrap',
        border: '1px solid #d9cde8'
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
      Bridge
    </span>
  );
}

export function SoundIcon({ playing = false }) {
  if (playing) {
    return (
      <div 
        style={{ 
          width: '18px', 
          height: '18px', 
          display: 'flex', 
          alignItems: 'flex-end', 
          justifyContent: 'center', 
          gap: '2px',
          paddingBottom: '2px'
        }}
      >
        <span style={{ width: '2px', height: '10px', background: '#3366cc', borderRadius: '1px', animation: 'wave .8s ease-in-out infinite' }}></span>
        <span style={{ width: '2px', height: '15px', background: '#3366cc', borderRadius: '1px', animation: 'wave .8s ease-in-out .15s infinite' }}></span>
        <span style={{ width: '2px', height: '8px', background: '#3366cc', borderRadius: '1px', animation: 'wave .8s ease-in-out .3s infinite' }}></span>
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
    <CodexIcon icon={cdxIconVolumeUp} size="18px" color="#3366cc" />
  );
}
