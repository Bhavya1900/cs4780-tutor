/**
 * StudyTrail.jsx
 *
 * A lightweight "Study Trail" -- a secondary learning aid that lists the
 * distinct concepts the student has encountered in the current conversation.
 *
 * The data is entirely deterministic: each item comes from a resolved
 * citation attached to a real assistant message. The concept label is the
 * slide title from the lecture JSON. No AI, no invented content.
 *
 * Exports two named components so each can be placed in the correct layout
 * position for its viewport size:
 *
 *   StudyTrailDesktop -- <aside> alongside the conversation (hidden on mobile)
 *   StudyTrailMobile  -- collapsible strip inside <main> above the composer
 *                        (hidden on desktop)
 */

import React, { useState, useMemo } from 'react';
import { resolveCitation } from '../utils/citations.js';

// -- Data extraction ----------------------------------------------------------

/**
 * Derive an ordered, deduplicated trail of concepts from the message list.
 * Each entry = one unique lecture slide referenced by any assistant message,
 * in order of first appearance.
 *
 * @param {object[]} messages
 * @returns {{ key: string, slideTitle: string, week: number, slideNumber: number }[]}
 */
function extractTrail(messages) {
  const seen = new Set();
  const trail = [];

  for (const msg of messages) {
    if (msg.role !== 'assistant') continue;
    if (!Array.isArray(msg.citations) || msg.citations.length === 0) continue;

    for (const citation of msg.citations) {
      const result = resolveCitation(citation);
      if (!result.resolved) continue;

      const { lecture, slide } = result;
      const key = `${lecture.lecture_id}-${slide.slide_number}`;
      if (seen.has(key)) continue;
      seen.add(key);

      trail.push({
        key,
        slideTitle: slide.title,
        week: lecture.week,
        slideNumber: slide.slide_number,
      });
    }
  }

  return trail;
}

// -- Shared list --------------------------------------------------------------

function TrailList({ items }) {
  return (
    <ol className="trail-list" aria-label="Concepts covered so far">
      {items.map((item, i) => (
        <li key={item.key} className="trail-item">
          {i < items.length - 1 && (
            <div className="trail-connector" aria-hidden="true" />
          )}
          <div className="trail-card">
            <p className="trail-concept">{item.slideTitle}</p>
            <p className="trail-source">
              Wk {item.week} &middot; Slide {item.slideNumber}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

// -- Desktop panel ------------------------------------------------------------

/**
 * Rendered as a narrow right-hand panel alongside the conversation.
 * Hidden on mobile via CSS (.study-trail { display: none } at <=768px).
 */
export function StudyTrailDesktop({ messages }) {
  const trail = useMemo(() => extractTrail(messages), [messages]);
  if (trail.length === 0) return null;

  return (
    <aside className="study-trail" aria-label="Study trail">
      <div className="trail-header">
        <span className="trail-label">Study Trail</span>
        <span
          className="trail-count"
          aria-label={`${trail.length} concept${trail.length === 1 ? '' : 's'}`}
        >
          {trail.length}
        </span>
      </div>
      <TrailList items={trail} />
    </aside>
  );
}

// -- Mobile collapsible -------------------------------------------------------

/**
 * Rendered as a collapsible strip inside <main>, between the conversation
 * scroll area and the composer. Hidden on desktop via CSS.
 */
export function StudyTrailMobile({ messages }) {
  const trail = useMemo(() => extractTrail(messages), [messages]);
  const [open, setOpen] = useState(false);

  if (trail.length === 0) return null;

  return (
    <div className="study-trail-mobile">
      <button
        className="trail-mobile-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="trail-mobile-body"
        type="button"
      >
        <span className="trail-label">Study Trail</span>
        <span className="trail-count">{trail.length}</span>
        <span className="trail-chevron" aria-hidden="true">
          {open ? '\u25b2' : '\u25bc'}
        </span>
      </button>
      {open && (
        <div id="trail-mobile-body" className="trail-mobile-body">
          <TrailList items={trail} />
        </div>
      )}
    </div>
  );
}
