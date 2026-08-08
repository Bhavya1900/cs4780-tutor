/**
 * TutorMessage.jsx
 *
 * Renders a single assistant (tutor) message.
 *
 * Supports:
 *  - Markdown paragraphs, headings, bold, italic, lists (via react-markdown)
 *  - Fenced code blocks
 *  - Tables (via remark-gfm — required for GFM pipe-table syntax)
 *  - Inline and block mathematics (via remark-math + rehype-katex)
 *  - Citation chips resolved through the Phase 2 citation resolver
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import { resolveCitation } from '../utils/citations.js';

/**
 * A single resolved citation shown as a small chip below the response.
 */
function CitationChip({ citation }) {
  const result = resolveCitation(citation);

  if (!result.resolved) {
    // Render a minimal unresolved chip so the UI never crashes
    return (
      <span className="citation-chip">
        <span className="citation-dot" />
        {citation.lecture ?? 'Unknown source'}
      </span>
    );
  }

  const { lecture, slide } = result;

  return (
    <span
      className="citation-chip"
      title={`${slide.title}${slide.notes ? ' — ' + slide.notes : ''}`}
    >
      <span className="citation-dot" />
      {lecture.title} · Slide {slide.slide_number}
    </span>
  );
}

/**
 * The full tutor message: label + rendered markdown content + citations.
 */
export default function TutorMessage({ message }) {
  const hasCitations =
    Array.isArray(message.citations) && message.citations.length > 0;

  return (
    <div className="tutor-message">
      <div className="tutor-label">Tutor</div>

      <div className="tutor-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {message.content}
        </ReactMarkdown>
      </div>

      {hasCitations && (
        <div className="citations">
          {message.citations.map((cit, i) => (
            <CitationChip key={i} citation={cit} />
          ))}
        </div>
      )}
    </div>
  );
}
