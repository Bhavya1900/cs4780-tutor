/**
 * TutorMessage.jsx
 *
 * Renders a single assistant (tutor) message.
 *
 * Handles all message states:
 *   isThinking: true   → show the loading dots (first-token wait)
 *   isStreaming: true   → show growing content + blinking cursor
 *   error present       → show partial content + inline error note
 *   complete            → show full content + citation chips
 *
 * Rich content support (via ReactMarkdown):
 *   - Markdown: paragraphs, headings, bold, italic, lists
 *   - GFM tables  (remark-gfm)
 *   - Code blocks (fenced and inline)
 *   - Block and inline math  (remark-math + rehype-katex)
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import { resolveCitation } from '../utils/citations.js';
import TutorThinking from './TutorThinking.jsx';

// ─── Citation chip ────────────────────────────────────────────────────────────

function CitationChip({ citation }) {
  const result = resolveCitation(citation);

  if (!result.resolved) {
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

// ─── TutorMessage ─────────────────────────────────────────────────────────────

export default function TutorMessage({ message }) {
  const {
    content,
    citations,
    isThinking,
    isStreaming,
    error,
  } = message;

  const hasCitations =
    !isStreaming &&
    !error &&
    Array.isArray(citations) &&
    citations.length > 0;

  return (
    <div className="tutor-message">
      <div className="tutor-label">Tutor</div>

      {/* ── Loading: waiting for first token ──────────────────────────── */}
      {isThinking && <TutorThinking />}

      {/* ── Content: grows progressively while streaming ──────────────── */}
      {content && (
        <div className={`tutor-content${isStreaming ? ' tutor-content--streaming' : ''}`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}

      {/* ── Stream error: shown after partial content ─────────────────── */}
      {error && (
        <p className="stream-error">
          {error}
        </p>
      )}

      {/* ── Citations: only after a clean, complete response ──────────── */}
      {hasCitations && (
        <div className="citations">
          {citations.map((cit, i) => (
            <CitationChip key={i} citation={cit} />
          ))}
        </div>
      )}
    </div>
  );
}
