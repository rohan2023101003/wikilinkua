/**
 * Design tokens.
 *
 * The app is styled to match Wikimedia Codex, but most of it was written with
 * hard-coded hex values inline. This module is the single place those values are
 * defined, so the palette can move in one edit instead of 650.
 *
 * Each entry resolves to the Codex CSS custom property when it is available
 * (codex.style.css is imported in main.jsx) and falls back to the literal
 * Wikimedia value otherwise. That means anything using these tokens follows a
 * Codex theme change - including dark mode - for free, while anything still
 * using raw hexes does not.
 *
 * New UI must use these. Migrating the older screens is a post-freeze task, see
 * UI-GUIDE.md.
 */

const token = (name, fallback) => `var(${name}, ${fallback})`;

export const color = {
  // text
  base:        token('--color-base', '#202122'),
  subtle:      token('--color-subtle', '#54595d'),
  placeholder: token('--color-placeholder', '#72777d'),
  inverted:    token('--color-inverted', '#ffffff'),

  // interactive
  progressive:        token('--color-progressive', '#3366cc'),
  progressiveHover:   token('--color-progressive--hover', '#2a4b8d'),
  destructive:        token('--color-destructive', '#bf3c2c'),
  success:            token('--color-success', '#0e7a63'),
  warning:            token('--color-warning', '#886600'),

  // surfaces
  bg:          token('--background-color-base', '#ffffff'),
  bgSubtle:    token('--background-color-neutral-subtle', '#f8f9fa'),
  bgProgressiveSubtle: token('--background-color-progressive-subtle', '#eaf3ff'),
  bgSuccessSubtle:     token('--background-color-success-subtle', '#e9f6f2'),
  bgDestructiveSubtle: token('--background-color-destructive-subtle', '#fee7e6'),
  bgWarningSubtle:     token('--background-color-warning-subtle', '#fef6e7'),

  // lines
  border:        token('--border-color-base', '#a2a9b1'),
  borderSubtle:  token('--border-color-subtle', '#c8ccd1'),
  borderMuted:   token('--border-color-muted', '#eaecf0'),
};

export const space = {
  xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px', xxl: '32px',
};

export const radius = { base: '2px', pill: '9999px', circle: '50%' };

export const font = {
  xs: '12px', sm: '13px', md: '14px', base: '15px', lg: '18px',
  xl: '22px', xxl: '28px',
};

/** Shared chrome. Prefer these over re-declaring the same object per component. */
export const card = {
  background: color.bg,
  border: `1px solid ${color.borderSubtle}`,
  borderRadius: radius.base,
  padding: space.xl,
  display: 'block',      // Codex's .cdx-card is display:flex; we lay out our own
};

export const buttonPrimary = {
  padding: '10px 20px',
  borderRadius: radius.base,
  background: color.progressive,
  color: color.inverted,
  border: `1px solid ${color.progressive}`,
  fontWeight: 700,
  fontSize: font.md,
  cursor: 'pointer',
};

export const buttonQuiet = {
  padding: '10px 18px',
  borderRadius: radius.base,
  background: color.bg,
  color: color.base,
  border: `1px solid ${color.border}`,
  fontWeight: 600,
  fontSize: font.md,
  cursor: 'pointer',
};
