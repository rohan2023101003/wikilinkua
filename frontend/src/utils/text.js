/**
 * Direction handling for language text.
 *
 * WikiLinkua teaches Arabic (53,766 lexemes), Hebrew, Hindustani/Urdu and Persian
 * among others, so target-language text is frequently right-to-left while the
 * interface stays left-to-right. Without this, a right-to-left lemma sitting next
 * to an English gloss reorders punctuation and neighbouring text unpredictably.
 *
 * We use `dir="auto"`, which asks the browser to pick the direction from the
 * first strong character in the string, rather than a list of RTL language codes.
 * That is correct for text we did not author and cannot always attribute to a
 * language - subtitle lines, article extracts, Tatoeba sentences - and it needs
 * no maintenance as languages are added.
 *
 * `unicode-bidi: isolate` (the .wl-text class in index.css) stops a right-to-left
 * run from dragging the surrounding interface text around with it.
 */

/** Spread onto any element that renders language text rather than UI chrome. */
export const langText = { dir: 'auto', className: 'wl-text' };

/**
 * Same, plus a `lang` attribute when the language is known. `lang` drives font
 * selection, hyphenation and screen-reader pronunciation, so pass it wherever the
 * language of the string is genuinely known.
 */
export function langAttrs(code) {
  return code ? { ...langText, lang: code } : langText;
}

// Scripts written right to left - for the few places that must know the
// direction rather than delegate it to the browser.
const RTL_RANGES = /[֐-׿؀-ۿ܀-ݏݐ-ݿހ-޿߀-߿ࠀ-࠿ࢠ-ࣿיִ-﷿ﹰ-﻿]/;

/** True when the string contains right-to-left characters. */
export function isRtl(text) {
  return RTL_RANGES.test(text || '');
}
