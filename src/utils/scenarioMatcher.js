/**
 * scenarioMatcher.js
 *
 * Matches a user-submitted prompt against the supplied scenario list.
 *
 * Matching strategy:
 *   1. Collapse all whitespace and convert to lowercase.
 *   2. Compare against each scenario's prompt, normalized the same way.
 *   3. Return the scenario id on an exact normalized match, or null.
 *
 * This is intentionally strict — no fuzzy matching or AI guessing.
 * If the question is not one of the eight supplied prompts, we say so.
 */

import { allScenarios } from '../data/scenarios.js';

/**
 * Normalizes a string for comparison:
 *   - trims leading/trailing whitespace
 *   - collapses internal whitespace runs to a single space
 *   - lowercases everything
 *   - strips trailing punctuation (period, question mark, exclamation)
 *
 * @param {string} str
 * @returns {string}
 */
function normalize(str) {
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/[.?!]+$/, '');
}

/**
 * Pre-normalized scenario prompts for fast repeated matching.
 * Built once at module load time.
 */
const normalizedScenarios = allScenarios.map((s) => ({
  id: s.id,
  normalized: normalize(s.prompt),
}));

/**
 * Finds the scenario id whose prompt matches the submitted text.
 *
 * @param {string} submittedText  The raw text the student typed.
 * @returns {string|null}         The matching scenario id, or null if none match.
 */
export function matchScenario(submittedText) {
  if (typeof submittedText !== 'string' || !submittedText.trim()) return null;

  const needle = normalize(submittedText);

  const match = normalizedScenarios.find((s) => s.normalized === needle);
  return match ? match.id : null;
}
