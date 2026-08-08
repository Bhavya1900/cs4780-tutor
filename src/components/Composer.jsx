/**
 * Composer.jsx
 *
 * The message input area at the bottom of the screen.
 *
 * - Auto-grows up to a max height
 * - Submit on Enter (Shift+Enter for newline)
 * - Disabled when value is empty
 */

import React, { useRef, useEffect } from 'react';

// Send icon (simple arrow up SVG, no icon library needed)
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

export default function Composer({ value, onChange, onSubmit, disabled }) {
  const textareaRef = useRef(null);

  // Auto-resize the textarea as content grows
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [value]);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) onSubmit();
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
          placeholder="Ask a question about CS 4780…"
          rows={1}
          disabled={disabled}
          aria-label="Message the tutor"
        />
        <button
          className="composer-send"
          onClick={onSubmit}
          disabled={!value.trim() || disabled}
          aria-label="Send message"
        >
          <SendIcon />
        </button>
      </div>
      <p className="composer-hint">Enter to send · Shift+Enter for new line</p>
    </div>
  );
}
