/**
 * conversations.js
 *
 * Loads and exposes the two supplied conversation states:
 *   - activeConversation: a returning student with message history
 *   - emptyConversation: a new student with no messages
 *
 * These are the raw JSON fixtures provided by the assignment.
 * Nothing here should be modified to reflect "the real data".
 */

import activeData from '../../data/conversation.json';
import emptyData from '../../data/conversation-empty.json';

/**
 * The returning-student conversation.
 * Contains messages with citations, markdown, code, and math.
 */
export const activeConversation = activeData;

/**
 * The new-student conversation.
 * messages array is empty; started_at is null.
 */
export const emptyConversation = emptyData;

/**
 * Returns true if the conversation has no messages yet.
 * @param {object} conversation
 * @returns {boolean}
 */
export function isEmptyConversation(conversation) {
  return Array.isArray(conversation.messages) && conversation.messages.length === 0;
}
