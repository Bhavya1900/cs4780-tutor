/**
 * TutorMessage.jsx
 *
 * Renders a single assistant (tutor) message.
 *
 * Phase 5 additions (on top of 4B):
 *   - CitationChip is now interactive: clicking opens a compact popover
 *     (rendered via createPortal into document.body so it is never clipped
 *     by overflow:hidden ancestors) showing the resolved slide data from the
 *     real lecture JSON.
 *   - Suggestion chips: when message.suggestions is a non-empty array
 *     (set by unmatched-prompt path in useStreaming), render clickable chips
 *     below the content so the student can quickly pick a supported question.
 *   - onSuggestion prop threaded through from App.jsx.
 *
 * Phase 4B preserved:
 *   - onRetry prop / Retry button after mid-stream error
 *   - isAborted "Generation stopped." label
 *   - hasCitations guard (suppressed on streaming / aborted / error)
 *
 * Rich content (Phase 3) preserved unchanged:
 *   ReactMarkdown + remark-gfm + remark-math + rehype-katex
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import { resolveCitation } from '../utils/citations.js';
import TutorThinking from './TutorThinking.jsx';

// --- Citation popover --------------------------------------------------------

/**
 * Position a fixed-position popover below (or above, if near the bottom of
 * the viewport) its anchor element, clamped to stay within the viewport.
 */
function getPopoverStyle(anchorRect) {
  const POPOVER_W = 288;
  const POPOVER_H = 240; // estimated max height
  const MARGIN = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top = anchorRect.bottom + 8;
  let left = anchorRect.left;

  // Flip above the anchor if it would overflow the bottom.
  if (top + POPOVER_H > vh - MARGIN) {
    top = Math.max(MARGIN, anchorRect.top - POPOVER_H - 8);
  }

  // Clamp horizontally.
  if (left + POPOVER_W > vw - MARGIN) {
    left = Math.max(MARGIN, vw - POPOVER_W - MARGIN);
  }

  return { position: 'fixed', top, left, width: POPOVER_W };
}

function CitationPopover({ result, style, popRef }) {
  const { lecture, slide } = result;

  return createPortal(
    <div
      ref={popRef}
      className="citation-popover"
      style={style}
      role="dialog"
      aria-label={`Source: ${lecture.title}, Slide ${slide.slide_number}`}
    >
      {/* Header */}
      <div className="citation-popover-header">
        <p className="citation-popover-week">Week {lecture.week}</p>
        <p className="citation-popover-lecture">{lecture.title}</p>
      </div>

      {/* Slide identity */}
      <div className="citation-popover-slide">
        <span className="citation-popover-slide-num">Slide {slide.slide_number}</span>
        <span className="citation-popover-slide-title">{slide.title}</span>
      </div>

      {/* Bullets (up to 4) */}
      {Array.isArray(slide.bullets) && slide.bullets.length > 0 && (
        <ul className="citation-popover-bullets">
          {slide.bullets.slice(0, 4).map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}

      {/* First formula as inline code — deliberately not KaTeX-rendered here */}
      {Array.isArray(slide.formulas) && slide.formulas.length > 0 && (
        <code className="citation-popover-formula">{slide.formulas[0]}</code>
      )}
    </div>,
    document.body
  );
}

// --- Citation chip -----------------------------------------------------------

function CitationChip({ citation }) {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState({});
  const btnRef = useRef(null);
  const popRef = useRef(null);

  const result = resolveCitation(citation);

  function openPopover() {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPopoverStyle(getPopoverStyle(rect));
    setIsOpen(true);
  }

  function handleClick() {
    if (isOpen) {
      setIsOpen(false);
    } else {
      openPopover();
    }
  }

  // Close on Escape or click outside both the button and the popover.
  useEffect(() => {
    if (!isOpen) return;

    function onKey(e) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    function onPointerDown(e) {
      if (
        !btnRef.current?.contains(e.target) &&
        !popRef.current?.contains(e.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [isOpen]);

  // Label shown on the chip itself.
  const chipLabel = result.resolved
    ? `${result.lecture.title} \u00b7 Slide ${result.slide.slide_number}`
    : (citation.lecture ?? 'Unknown source');

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`citation-chip${isOpen ? ' citation-chip--open' : ''}`}
        onClick={handleClick}
        aria-expanded={result.resolved ? isOpen : undefined}
        aria-label={`Source: ${chipLabel}. ${result.resolved ? 'Click for details.' : ''}`}
      >
        <span className="citation-dot" aria-hidden="true" />
        {chipLabel}
      </button>

      {isOpen && result.resolved && (
        <CitationPopover
          result={result}
          style={popoverStyle}
          popRef={popRef}
        />
      )}
    </>
  );
}

// --- TutorMessage ------------------------------------------------------------

export default function TutorMessage({ message, onRetry, onSuggestion }) {
  const {
    content,
    citations,
    isThinking,
    isStreaming,
    isAborted,
    error,
    suggestions,
  } = message;

  // Citations appear only after a clean, complete stream.
  // Suppressed while streaming, after abort, and after error.
  const hasCitations =
    !isStreaming &&
    !isAborted &&
    !error &&
    Array.isArray(citations) &&
    citations.length > 0;

  const hasSuggestions =
    !isStreaming &&
    Array.isArray(suggestions) &&
    suggestions.length > 0;

  return (
    <div className="tutor-message">
      <div className="tutor-label">Tutor</div>

      {/* Loading: waiting for first token */}
      {isThinking && <TutorThinking />}

      {/* Content: grows progressively while streaming */}
      {content && (
        <div
          className={`tutor-content${isStreaming ? ' tutor-content--streaming' : ''}`}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}

      {/* Aborted: subtle indicator, no error, no citation */}
      {isAborted && !isStreaming && (
        <p className="stream-stopped" aria-label="Generation was stopped">
          Generation stopped.
        </p>
      )}

      {/* Stream error: shown after partial content */}
      {error && (
        <div className="stream-error-row" role="alert">
          <p className="stream-error">
            Connection interrupted — the tutor response was cut short.
          </p>
          {onRetry && (
            <button
              className="retry-btn"
              onClick={onRetry}
              aria-label="Retry this response"
              type="button"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Suggestion chips: only on unmatched-prompt messages */}
      {hasSuggestions && (
        <div
          className="suggestion-chips"
          role="group"
          aria-label="Suggested questions"
        >
          {suggestions.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="suggestion-chip"
              onClick={() => onSuggestion?.(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Citations: only after a clean, complete response */}
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
