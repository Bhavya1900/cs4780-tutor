/**
 * scenarios.js
 *
 * Loads the response scenarios from the supplied responses.json.
 * Each scenario describes a canned tutor response with streaming
 * behaviour metadata (delays), response text, and citations.
 *
 * The actual streaming integration lives in Phase 4.
 * This module only makes the structured data available.
 */

import responsesData from '../../data/responses.json';

/**
 * All response scenarios as an array.
 */
export const allScenarios = responsesData.scenarios;

/**
 * Returns a scenario by its id (e.g. "plain", "code", "math").
 * Returns null if no scenario matches.
 * @param {string} id
 * @returns {object|null}
 */
export function getScenarioById(id) {
  return allScenarios.find((s) => s.id === id) ?? null;
}
