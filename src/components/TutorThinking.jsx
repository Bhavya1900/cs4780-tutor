/**
 * TutorThinking.jsx
 *
 * A subtle loading indicator shown while waiting for the first streaming
 * token from the tutor. Disappears automatically when the first chunk
 * arrives (the parent sets isThinking: false on the message).
 *
 * Deliberately minimal — the conversation remains fully visible behind it.
 * Three small pulsing dots are a conventional, internationally understood
 * "thinking" indicator.
 */

import React from 'react';

export default function TutorThinking() {
  return (
    <div className="tutor-thinking" aria-label="Tutor is thinking" role="status">
      <span className="thinking-dot" />
      <span className="thinking-dot" />
      <span className="thinking-dot" />
    </div>
  );
}
