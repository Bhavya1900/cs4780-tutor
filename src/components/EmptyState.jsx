/**
 * EmptyState.jsx
 *
 * Shown when the student has no message history yet.
 * Invites them to start a study session with course-relevant example prompts.
 */

import React from 'react';

const EXAMPLE_PROMPTS = [
  'Why does ReLU help with the vanishing gradient problem?',
  'Compare L1 and L2 regularization — when should I use each?',
  'Explain gradient descent in simple terms.',
  "What's the difference between training loss and validation loss?",
];

export default function EmptyState({ course, studentName, onSelectPrompt }) {
  const firstName = studentName ? studentName.split(' ')[0] : null;

  return (
    <div className="empty-state">
      {/* Course eyebrow — reinforces context */}
      <p className="empty-eyebrow">
        {course ? `${course.code} · ${course.instructor}` : 'Course Tutor'}
      </p>

      <h1 className="empty-heading">
        {firstName ? `Ready when you are, ${firstName}.` : 'Ready when you are.'}
      </h1>

      <p className="empty-sub">
        Ask any question from the course material. I'll explain concepts,
        walk through derivations, and point you to the relevant lecture and
        slide.
      </p>

      {/* Example prompts — label + buttons */}
      <p className="example-prompts-label">Try asking</p>
      <div className="example-prompts">
        {EXAMPLE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            className="example-prompt-btn"
            onClick={() => onSelectPrompt(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
