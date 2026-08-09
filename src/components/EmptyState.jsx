/**
 * EmptyState.jsx
 *
 * Phase 5: improved new-student onboarding screen.
 *
 * Changes from Phase 3:
 *   - prompts prop replaces the hardcoded EXAMPLE_PROMPTS array.
 *     App.jsx derives prompts from the real allScenarios data so they are
 *     guaranteed to hit the streaming path.
 *   - onSend callback replaces onSelectPrompt.  Clicking a prompt now calls
 *     handleSend(prompt) directly — the same path as typing and pressing Enter.
 *   - Copy updated to mention lecture grounding and slide citations.
 *   - "Try asking" label kept; citation reference added below it.
 */

import React from 'react';

export default function EmptyState({ course, studentName, prompts, onSend }) {
  const firstName = studentName ? studentName.split(' ')[0] : null;

  return (
    <div className="empty-state">
      {/* Course eyebrow */}
      <p className="empty-eyebrow">
        {course ? `${course.code} \u00b7 ${course.instructor}` : 'Course Tutor'}
      </p>

      <h1 className="empty-heading">
        {firstName
          ? `Ready when you are, ${firstName}.`
          : 'Ready when you are.'}
      </h1>

      <p className="empty-sub">
        Ask a question from the course material. Every answer is grounded in
        the actual lecture slides&mdash;concepts, derivations, and code&mdash;with
        citations to the exact week and slide.
      </p>

      {/* Example prompts */}
      <p className="example-prompts-label">Try asking</p>
      <div className="example-prompts">
        {(prompts ?? []).map((prompt) => (
          <button
            key={prompt}
            className="example-prompt-btn"
            type="button"
            onClick={() => onSend(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
