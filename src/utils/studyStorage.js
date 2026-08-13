/**
 * studyStorage.js
 *
 * Persistent learning preferences for the competition layer.
 * Saved concepts are keyed by real lecture + slide identifiers so they remain
 * valid even when the same citation appears in multiple conversations.
 */

export const SAVED_CONCEPTS_KEY = 'cs4780-tutor-saved-concepts';

export function makeSlideKey(lectureId, slideNumber) {
  return `${lectureId}-${slideNumber}`;
}

export function loadSavedConcepts() {
  try {
    const raw = localStorage.getItem(SAVED_CONCEPTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((key) => typeof key === 'string');
  } catch {
    return [];
  }
}

export function saveSavedConcepts(keys) {
  try {
    localStorage.setItem(SAVED_CONCEPTS_KEY, JSON.stringify([...keys]));
  } catch {
    // Best effort; learning features remain usable without persistence.
  }
}
