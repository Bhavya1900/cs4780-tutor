/**
 * chatStorage.js
 *
 * Persistent multi-conversation storage for the competition layer.
 *
 * The original persona storage remains the source of the supplied demo
 * fixtures. This module adds a separate chat-history store so existing
 * behaviour is preserved while students can create multiple chats.
 */

export const CHAT_HISTORY_KEY = 'cs4780-tutor-chat-history';
export const ACTIVE_CHAT_KEY = 'cs4780-tutor-active-chat';

const TRANSIENT = new Set([
  'isThinking',
  'isStreaming',
  'isAborted',
  'error',
  'scenarioId',
  'suggestions',
]);

function sanitizeMessage(message) {
  const out = {};
  for (const [key, value] of Object.entries(message ?? {})) {
    if (!TRANSIENT.has(key)) out[key] = value;
  }
  return out;
}

export function saveChats(chats) {
  try {
    const stable = chats.map((chat) => ({
      ...chat,
      messages: (chat.messages ?? [])
        .filter((message) => {
          if (message.role === 'user') return true;
          return (
            message.role === 'assistant' &&
            typeof message.content === 'string' &&
            message.content.length > 0
          );
        })
        .map(sanitizeMessage),
    }));

    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(stable));
  } catch {
    // Persistence is best-effort. The app must remain usable without it.
  }
}

export function loadChats() {
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;

    return parsed.filter(
      (chat) =>
        chat &&
        typeof chat.id === 'string' &&
        typeof chat.title === 'string' &&
        Array.isArray(chat.messages)
    );
  } catch {
    return null;
  }
}

export function saveActiveChatId(id) {
  try {
    localStorage.setItem(ACTIVE_CHAT_KEY, id);
  } catch {
    // Ignore unavailable localStorage.
  }
}

export function loadActiveChatId() {
  try {
    return localStorage.getItem(ACTIVE_CHAT_KEY);
  } catch {
    return null;
  }
}
