import React from 'react';
import * as icons from '@wikimedia/codex-icons';
import { relationMeta } from '../utils/relations';

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

/**
 * One badge per relationship type, coloured and worded by the taxonomy in
 * utils/relations.js. Hovering shows what the claim rests on, so "cognate" and
 * "same meaning" can never look like the same statement.
 */
export function RelationBadge({ type, count = 0 }) {
  const meta = relationMeta(type);
  return (
    <span
      title={meta.description + ' (Wikidata ' + meta.property + ')'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 8px',
        borderRadius: '2px',
        background: meta.bg,
        color: meta.color,
        fontSize: '12px',
        fontWeight: '600',
        whiteSpace: 'nowrap',
        border: '1px solid ' + meta.border,
      }}
    >
      {meta.label}
      {count > 1 && (
        <span style={{ opacity: 0.7, fontWeight: '500' }}>×{count}</span>
      )}
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
