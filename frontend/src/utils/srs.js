/**
 * Spaced Repetition System (SRS) Leitner scheduler for WikiLinkua
 */

export const BOX_INTERVALS = {
  0: 0,       // 0 days (review immediately / in the same session)
  1: 1,       // 1 day
  2: 3,       // 3 days
  3: 7,       // 7 days
  4: 14,      // 14 days
  5: 30       // 30 days
};

export const MASTERY_THRESHOLD = 3; // Box level 3 and above is considered 'known'

/**
 * Update the Leitner progress for a given word.
 * 
 * @param {Object} progress - The full progress object from localStorage
 * @param {string} lexemeId - The ID of the target word being updated
 * @param {boolean} correct - Whether the user answered correctly
 * @returns {Object} The updated progress object
 */
export function updateLeitnerProgress(progress, lexemeId, correct) {
  const words = { ...(progress.words || {}) };
  const current = words[lexemeId] || { boxLevel: 0, dueDate: Date.now(), status: 'not_learnt' };

  let newBox = current.boxLevel;
  if (correct) {
    newBox = Math.min(5, newBox + 1);
  } else {
    newBox = Math.max(0, newBox - 1);
  }

  const days = BOX_INTERVALS[newBox];
  const dueDate = Date.now() + days * 24 * 60 * 60 * 1000;
  
  // Status mapping: not_learnt (never seen) -> learning (seen, below threshold) -> known (threshold+)
  // A word is 'learning' if it has been seen but has boxLevel < threshold
  const status = newBox >= MASTERY_THRESHOLD ? 'known' : 'learning';

  words[lexemeId] = {
    boxLevel: newBox,
    dueDate,
    status
  };

  return {
    ...progress,
    words
  };
}

/**
 * Check if a word is due for review.
 * 
 * @param {Object} wordProgress - The word's progress entry
 * @returns {boolean} True if the word is due
 */
export function isWordDue(wordProgress) {
  if (!wordProgress) return true; // never seen before = due immediately
  return Date.now() >= wordProgress.dueDate;
}
