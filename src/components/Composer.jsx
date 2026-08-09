/**
 * Composer.jsx
 *
 * The message input area at the bottom of the screen.
 *
 * Phase 4B additions:
 *   - Accepts isStreaming and onStop props.
 *   - While isStreaming is true: the Send button becomes a Stop button.
 *     The textarea is NOT disabled during streaming so the user can read
 *     what they typed, but Enter will not submit a second question.
 *   - When Stop is pressed: onStop() is called, which aborts the active stream.
 *   - The hint text changes to reflect the current mode.
 *   - Full keyboard accessibility: Stop has aria-label, is focusable,
 *     and shows a square stop icon.
 *
 * Phase 3 behaviour preserved:
 *   - Auto-grows up to a max height.
 *   - Submit on Enter (Shift+Enter for newline).
 *   - Send disabled when value is empty.
 */

import React, { useRef, useEffect } from 'react';

// ── Icons ─────────────────────────────────────────────────────────────────────

/** Arrow-up send icon */
function SendIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

/** Square stop icon */
function StopIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

// ── Composer ──────────────────────────────────────────────────────────────────

export default function Composer({ value, onChange, onSubmit, onStop, isStreaming }) {
  const textareaRef = useRef(null);

  // Auto-resize the textarea as content grows.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [value]);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Do not submit while streaming — Stop button handles that intent.
      if (!isStreaming && value.trim()) onSubmit();
    }
  }

  return (
    <div className="composer-area">
      <div className="composer-inner">
        <textarea
          ref={textareaRef}
          className="composer-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isStreaming ? 'Streaming response…' : 'Ask a question about CS 4780…'}
          rows={1}
          // Keep textarea enabled while streaming so the user can still read
          // the composed text. Submission is blocked via handleKeyDown guard.
          disabled={false}
          aria-label="Message the tutor"
        />

        {isStreaming ? (
          /* ── Stop button ───────────────────────────────────────────────── */
          <button
            className="composer-stop"
            onClick={onStop}
            aria-label="Stop generation"
            title="Stop generation"
            type="button"
          >
            <StopIcon />
          </button>
        ) : (
          /* ── Send button ───────────────────────────────────────────────── */
          <button
            className="composer-send"
            onClick={onSubmit}
            disabled={!value.trim()}
            aria-label="Send message"
            type="button"
          >
            <SendIcon />
          </button>
        )}
      </div>

      <p className="composer-hint">
        {isStreaming
          ? 'Streaming\u2003·\u2003press Stop to cancel'
          : 'Enter to send\u2003·\u2003Shift+Enter for new line'}
      </p>
    </div>
  );
}
