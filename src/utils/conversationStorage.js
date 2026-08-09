/**
 * conversationStorage.js
 *
 * localStorage-based persistence for the two demo conversation personas.
 *
 * Storage keys:
 *   cs4780-tutor-returning   -- returning student (seeds from conversation.json)
 *   cs4780-tutor-new         -- new student (seeds from conversation-empty.json)
 *
 * Only stable, completed message fields are persisted. Transient streaming
 * state (isThinking, isStreaming, isAborted, error, scenarioId, suggestions)
 * is stripped before saving so restored messages look like ordinary settled turns.
 *
 * All storage calls fail silently -- a quota error or disabled localStorage
 * must never crash the application.
 */

export const PERSONA_KEYS = {
  returning: 'cs4780-tutor-returning',
  new: 'cs4780-tutor-new',
};

/** Fields that represent in-flight or ephemeral UI state -- never stored. */
const TRANSIENT = [
  'isThinking',
  'isStreaming',
  'isAborted',
  'error',
  'scenarioId',
  'suggestions',
];

/**
 * Strip transient fields from a message object.
 * @param {object} message
 * @returns {object}
 */
function sanitize(message) {
  const out = {};
  for (const [k, v] of Object.entries(message)) {
    if (!TRANSIENT.includes(k)) out[k] = v;
  }
  return out;
}

/**
 * Save the current message list for a persona.
 * @param {'returning'|'new'} persona
 * @param {object[]} messages
 */
export function saveConversation(persona, messages) {
  const key = PERSONA_KEYS[persona];
  if (!key) return;
  try {
    const stable = messages
      .filter((m) => {
        if (m.role === 'user') return true;
        return (
          m.role === 'assistant' &&
          typeof m.content === 'string' &&
          m.content.length > 0
        );
      })
      .map(sanitize);
    localStorage.setItem(key, JSON.stringify(stable));
  } catch {
    // localStorage quota exceeded or unavailable.
  }
}

/**
 * Load a conversation for a persona from localStorage.
 * Falls back to the fixture messages on first visit or parse error.
 * @param {'returning'|'new'} persona
 * @param {object[]} fallback
 * @returns {object[]}
 */
export function loadConversation(persona, fallback) {
  const key = PERSONA_KEYS[persona];
  if (!key) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}
