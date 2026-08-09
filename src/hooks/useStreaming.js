/**
 * useStreaming.js
 *
 * Custom hook that owns all streaming state and the streaming loop.
 *
 * Phase 4B changes (on top of 4A):
 *   - The caller (App.jsx) creates the AbortController and passes it in.
 *     Previously the hook created a SECOND controller internally, which
 *     was never wired to the actual stream generator — so abort did nothing.
 *     Now there is exactly ONE controller per stream.
 *   - Exposes stopStream() so the UI can abort the active stream.
 *   - Exposes retryMessage() so the UI can re-stream a failed assistant turn.
 *   - Stores scenarioId on assistant messages so retry has what it needs.
 *   - useEffect cleanup aborts any stream that outlives the component.
 *
 * Responsibilities:
 *   - Maintain the messages array.
 *   - On submit: add user message, add thinking placeholder, drive the loop.
 *   - Append each chunk to the in-progress assistant message.
 *   - After clean completion: attach citations.
 *   - On abort (Stop): mark isAborted, clear streaming state, no citations.
 *   - On error (mid-stream failure): store error on the message; do not crash.
 *   - Expose isStreaming so the composer can switch to Stop mode.
 *
 * What this hook does NOT do:
 *   - Does not import or call mock-stream directly (testable by design).
 *   - Does not render anything.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * @typedef {object} Message
 * @property {string}   id
 * @property {'user'|'assistant'} role
 * @property {string}   content
 * @property {string}   [scenarioId]    set on assistant messages; used by retry
 * @property {Array}    [citations]
 * @property {boolean}  [isStreaming]   true while chunks are still arriving
 * @property {boolean}  [isThinking]    true before the first chunk arrives
 * @property {string}   [error]         set when the stream threw
 * @property {boolean}  [isAborted]     set when the user pressed Stop
 */

/**
 * @param {Message[]} initialMessages   Messages to pre-seed (from fixtures).
 */
export function useStreaming(initialMessages = []) {
  const [messages, setMessages] = useState(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);

  /**
   * The AbortController for the currently-active stream.
   *
   * IMPORTANT: This ref holds the SAME controller that was passed to
   * streamResponse() by the caller. There is exactly one controller per
   * stream. Storing it here lets stopStream() and resetMessages() call
   * .abort() on the right object.
   *
   * Set to null when no stream is active (after completion, abort, or error).
   */
  const abortControllerRef = useRef(null);

  // ── Unmount cleanup ────────────────────────────────────────────────────────
  // If the component tree unmounts while a stream is running, abort it.
  // This prevents the async loop from attempting setState on an unmounted tree.
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // ── resetMessages ──────────────────────────────────────────────────────────

  /**
   * Replace the entire message list (used by the demo switcher).
   * Aborts any in-flight stream so no stale setState calls follow.
   */
  const resetMessages = useCallback((msgs) => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
    setMessages(msgs);
  }, []);

  // ── stopStream ─────────────────────────────────────────────────────────────

  /**
   * Abort the active stream. The streaming loop will exit on the next
   * iteration when it checks signal.aborted.
   *
   * The partial text is preserved; the message is marked isAborted so the
   * UI knows not to show citations.
   */
  const stopStream = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  // ── Internal: run the streaming loop ──────────────────────────────────────

  /**
   * Drives the async generator loop for a single stream.
   *
   * Used by both submitMessage (new question) and retryMessage (re-stream).
   *
   * @param {string}         assistantId   ID of the assistant message to update
   * @param {AsyncGenerator} streamGen     The async generator from streamResponse()
   * @param {AbortController} controller  The controller wired to streamGen's signal
   * @param {object|null}    scenarioMeta  { citations } or null
   */
  async function runStreamLoop(assistantId, streamGen, controller, scenarioMeta) {
    // Store the controller so stopStream() / resetMessages() can reach it.
    abortControllerRef.current = controller;
    setIsStreaming(true);

    /** Update only the in-progress assistant message */
    const updateAssistant = (updater) =>
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, ...updater(m) } : m))
      );

    try {
      for await (const chunk of streamGen) {
        // Check before applying — abort() may have fired between yields.
        if (controller.signal.aborted) break;

        updateAssistant((m) => ({
          content: m.content + chunk,
          isThinking: false, // first chunk arrived — hide thinking dots
          isStreaming: true,
        }));
      }

      if (controller.signal.aborted) {
        // User pressed Stop — preserve partial text, mark aborted.
        // Do NOT add citations (they represent verified complete answers).
        updateAssistant(() => ({
          isStreaming: false,
          isThinking: false,
          isAborted: true,
        }));
      } else {
        // Stream finished cleanly — attach citations.
        updateAssistant(() => ({
          isStreaming: false,
          isThinking: false,
          citations: scenarioMeta?.citations ?? [],
        }));
      }
    } catch (err) {
      // Stream threw (e.g. error-midstream scenario or network drop).
      // Store the error so the UI can show a Retry button.
      // Do NOT rethrow — React must not see an unhandled rejection here.
      updateAssistant(() => ({
        isStreaming: false,
        isThinking: false,
        error: err.message ?? 'The response was interrupted.',
      }));
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }

  // ── submitMessage ──────────────────────────────────────────────────────────

  /**
   * Submit a user message and start streaming a response.
   *
   * @param {string}          text          The raw submitted text.
   * @param {AsyncGenerator|null} streamGen The already-created async generator.
   * @param {object|null}     scenarioMeta  { citations } or null for no-match.
   * @param {string|null}     errorText     Pre-set error for unmatched prompts.
   * @param {AbortController|null} controller  The controller wired to streamGen.
   */
  const submitMessage = useCallback(
    async (text, streamGen, scenarioMeta, errorText, controller, suggestions) => {
      // If a previous stream is somehow still running, abort it.
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;

      const userMsg = {
        id: `user_${Date.now()}`,
        role: 'user',
        content: text,
      };

      const assistantId = `assistant_${Date.now() + 1}`;

      // ── Unmatched question ─────────────────────────────────────────────────
      // No stream needed — show friendly "not in demo" message immediately.
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
            suggestions: Array.isArray(suggestions) ? suggestions : [],
          },
        ]);
        return;
      }

      // ── Matched scenario: begin streaming ──────────────────────────────────

      // Add the user message + an empty assistant placeholder immediately.
      // isThinking: true → loading dots show before the first chunk arrives.
      setMessages((prev) => [
        ...prev,
        userMsg,
        {
          id: assistantId,
          role: 'assistant',
          content: '',
          scenarioId: scenarioMeta?._scenarioId ?? null,
          citations: [],
          isStreaming: true,
          isThinking: true,
          isAborted: false,
          error: null,
        },
      ]);

      await runStreamLoop(assistantId, streamGen, controller, scenarioMeta);
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── retryMessage ───────────────────────────────────────────────────────────

  /**
   * Re-stream a failed assistant message in-place.
   *
   * Does NOT add a new user message — the original user turn already exists.
   * Replaces the failed assistant message content and re-runs the stream loop.
   *
   * @param {string}         assistantMsgId  ID of the message to replace.
   * @param {AsyncGenerator} streamGen       Fresh generator from streamResponse().
   * @param {object|null}    scenarioMeta    { citations } for this scenario.
   * @param {AbortController} controller    Fresh controller wired to streamGen.
   */
  const retryMessage = useCallback(
    async (assistantMsgId, streamGen, scenarioMeta, controller) => {
      // Abort any lingering stream (shouldn't exist after a failure, but be safe).
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;

      // Reset the failed message to a clean thinking state.
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: '',
                citations: [],
                isStreaming: true,
                isThinking: true,
                isAborted: false,
                error: null,
              }
            : m
        )
      );

      await runStreamLoop(assistantMsgId, streamGen, controller, scenarioMeta);
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return {
    messages,
    isStreaming,
    submitMessage,
    retryMessage,
    stopStream,
    resetMessages,
  };
}
