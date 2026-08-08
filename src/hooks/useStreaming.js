/**
 * useStreaming.js
 *
 * Custom hook that owns all streaming state and the streaming loop.
 *
 * Responsibilities:
 *   - Maintain the messages array (pre-seeded from a conversation fixture
 *     or starting empty).
 *   - On submit: add the user message, resolve the scenario, open a stream.
 *   - Append each chunk to the in-progress assistant message in state.
 *   - After the stream ends successfully: attach citations to the message.
 *   - On stream error: store the error on the message; do not crash.
 *   - On abort: mark the message as aborted (used in later phases).
 *   - Expose isStreaming so the composer can be locked while a response
 *     is in flight.
 *
 * What this hook does NOT do:
 *   - It does not import or call the mock-stream module directly.
 *     The caller passes a `streamFn` so this hook stays testable and
 *     framework-agnostic.
 *   - It does not render anything.
 */

import { useState, useRef, useCallback } from 'react';

/**
 * @typedef {object} Message
 * @property {string}   id
 * @property {'user'|'assistant'} role
 * @property {string}   content
 * @property {Array}    [citations]
 * @property {boolean}  [isStreaming]   true while chunks are still arriving
 * @property {boolean}  [isThinking]    true before the first chunk arrives
 * @property {string}   [error]         set when the stream threw
 * @property {boolean}  [isAborted]     set when the stream was cancelled
 */

/**
 * @param {Message[]} initialMessages   Messages to pre-seed (from Phase 3 fixtures).
 * @returns {{
 *   messages: Message[],
 *   isStreaming: boolean,
 *   submitMessage: (text: string, streamFn: AsyncGenerator) => void,
 *   resetMessages: (msgs: Message[]) => void,
 * }}
 */
export function useStreaming(initialMessages = []) {
  const [messages, setMessages] = useState(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);

  // Keep the current AbortController so it can be cancelled externally.
  // Stored in a ref so the streaming loop always sees the latest value
  // without stale closure issues.
  const abortControllerRef = useRef(null);

  /**
   * Replace the entire message list — used when the demo state switcher
   * changes from "returning" to "new" (or back).
   */
  const resetMessages = useCallback((msgs) => {
    // Cancel any in-flight stream when resetting
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setMessages(msgs);
  }, []);

  /**
   * Submit a user message and start streaming a response.
   *
   * @param {string}         text        The raw submitted text.
   * @param {AsyncGenerator} streamGen   The already-created async generator
   *                                     (caller is responsible for scenario
   *                                     resolution and AbortController setup).
   * @param {object}         scenarioMeta  { citations } or null for no-match.
   * @param {string|null}    errorText    Pre-set error for unmatched prompts.
   */
  const submitMessage = useCallback(async (text, streamGen, scenarioMeta, errorText) => {
    // If a previous stream is still running, abort it cleanly.
    abortControllerRef.current?.abort();

    const userMsg = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
    };

    const assistantId = `assistant_${Date.now() + 1}`;

    // If there is no scenario match, immediately set the final "no match"
    // message without going through the streaming path.
    if (errorText !== undefined && errorText !== null) {
      setMessages((prev) => [
        ...prev,
        userMsg,
        {
          id: assistantId,
          role: 'assistant',
          content: errorText,
          citations: [],
          isStreaming: false,
          isThinking: false,
        },
      ]);
      return;
    }

    // ── Matched scenario: begin streaming ──────────────────────────────────

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Add the user message + an empty assistant placeholder immediately.
    // isThinking: true means the loading indicator shows before first chunk.
    setMessages((prev) => [
      ...prev,
      userMsg,
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        citations: [],
        isStreaming: true,
        isThinking: true,
      },
    ]);

    setIsStreaming(true);

    // Helper: update only the in-progress assistant message
    const updateAssistant = (updater) =>
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, ...updater(m) } : m))
      );

    let firstChunk = true;

    try {
      for await (const chunk of streamGen) {
        if (controller.signal.aborted) break;

        updateAssistant((m) => ({
          content: m.content + chunk,
          isThinking: false, // first chunk arrived — hide the thinking indicator
          isStreaming: true,
        }));

        firstChunk = false;
      }

      if (controller.signal.aborted) {
        // Stream was deliberately cancelled (Phase 4B stop button)
        updateAssistant(() => ({ isStreaming: false, isAborted: true }));
      } else {
        // Stream finished cleanly — attach citations
        updateAssistant(() => ({
          isStreaming: false,
          isThinking: false,
          citations: scenarioMeta?.citations ?? [],
        }));
      }
    } catch (err) {
      // The stream threw (e.g. "error-midstream" scenario or network drop).
      // Store the error on the message so the UI can display it.
      // Do NOT rethrow — we must not leave React in a broken state.
      updateAssistant(() => ({
        isStreaming: false,
        isThinking: false,
        error: err.message ?? 'The response was interrupted.',
      }));
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, []);

  return { messages, isStreaming, submitMessage, resetMessages };
}
