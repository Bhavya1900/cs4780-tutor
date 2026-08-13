/**
 * LearningCompanion.jsx
 *
 * Competition-layer learning guidance built entirely from the supplied
 * lecture data and the student's real citation activity.
 *
 * No AI or invented recommendations are used: Continue Learning selects the
 * next unexplored slide after the most recently explored slide, with a safe
 * fallback to the first unexplored slide in course order.
 */

import React, { useMemo } from 'react';
import { allLectures } from '../data/lectures.js';
import { resolveCitation } from '../utils/citations.js';
import { makeSlideKey } from '../utils/studyStorage.js';

function collectExplored(chats, activeChatId) {
  const keys = new Set();
  let latest = null;

  for (const chat of chats) {
    if (chat.isDemo && chat.id !== activeChatId) continue;

    (chat.messages ?? []).forEach((message, messageIndex) => {
      if (message.role !== 'assistant' || !Array.isArray(message.citations)) return;

      for (const citation of message.citations) {
        const result = resolveCitation(citation);
        if (!result.resolved) continue;
        const key = makeSlideKey(result.lecture.lecture_id, result.slide.slide_number);
        keys.add(key);

        const stamp = Number(chat.updatedAt) || 0;
        if (!latest || stamp > latest.stamp || (stamp === latest.stamp && messageIndex >= latest.messageIndex)) {
          latest = { key, lecture: result.lecture, slide: result.slide, stamp, messageIndex };
        }
      }
    });
  }

  return { keys, latest };
}

export function getNextLearningItem(chats, activeChatId) {
  const { keys, latest: last } = collectExplored(chats, activeChatId);

  if (last) {
    const nextSlide = last.lecture.slides.find(
      (slide) => slide.slide_number === last.slide.slide_number + 1
    );
    if (nextSlide) {
      return { lecture: last.lecture, slide: nextSlide, reason: 'next' };
    }
  }

  for (const lecture of allLectures) {
    const slide = lecture.slides.find(
      (candidate) => !keys.has(makeSlideKey(lecture.lecture_id, candidate.slide_number))
    );
    if (slide) return { lecture, slide, reason: 'gap' };
  }

  return null;
}

export function getSavedItems(savedKeys) {
  const items = [];
  const wanted = new Set(savedKeys);

  for (const lecture of allLectures) {
    for (const slide of lecture.slides) {
      if (wanted.has(makeSlideKey(lecture.lecture_id, slide.slide_number))) {
        items.push({ lecture, slide });
      }
    }
  }

  return items;
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
      <path d="M4 10h11M10 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BookmarkIcon({ filled = false }) {
  return (
    <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
      <path
        d="M5.25 3.5A1.5 1.5 0 0 1 6.75 2h6.5a1.5 1.5 0 0 1 1.5 1.5v13l-4.75-2.8-4.75 2.8v-13Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LearningCompanion({
  chats,
  activeChatId,
  savedKeys,
  onSaveToggle,
  onAsk,
  compact = false,
}) {
  const next = useMemo(
    () => getNextLearningItem(chats, activeChatId),
    [chats, activeChatId]
  );
  const saved = useMemo(() => getSavedItems(savedKeys), [savedKeys]);

  if (compact) {
    return (
      <section className="learning-companion-compact" aria-label="Continue learning">
        <div className="learning-companion-compact-copy">
          <span className="learning-companion-kicker">Continue learning</span>
          {next ? (
            <strong>{next.slide.title}</strong>
          ) : (
            <strong>Course explored</strong>
          )}
        </div>
        {next && (
          <button
            type="button"
            className="learning-companion-go"
            onClick={() => onAsk(next)}
            aria-label={`Ask the tutor about ${next.slide.title}`}
          >
            <ArrowIcon />
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="learning-companion" aria-label="Learning companion">
      <div className="learning-companion-heading">
        <div>
          <p className="learning-companion-kicker">Learning companion</p>
          <h2>Keep moving forward</h2>
        </div>
        <span className="learning-companion-spark" aria-hidden="true">✦</span>
      </div>

      {next ? (
        <div className="continue-card">
          <p className="continue-eyebrow">Continue learning</p>
          <h3>{next.slide.title}</h3>
          <p className="continue-source">
            Week {next.lecture.week} · Slide {next.slide.slide_number}
          </p>
          <div className="continue-actions">
            <button
              type="button"
              className="continue-primary"
              onClick={() => onAsk(next)}
            >
              Ask tutor
              <ArrowIcon />
            </button>
            <button
              type="button"
              className={`save-mini${savedKeys.includes(makeSlideKey(next.lecture.lecture_id, next.slide.slide_number)) ? ' is-saved' : ''}`}
              onClick={() => onSaveToggle(next.lecture, next.slide)}
              aria-label={savedKeys.includes(makeSlideKey(next.lecture.lecture_id, next.slide.slide_number)) ? 'Remove from saved concepts' : 'Save concept for revision'}
            >
              <BookmarkIcon filled={savedKeys.includes(makeSlideKey(next.lecture.lecture_id, next.slide.slide_number))} />
            </button>
          </div>
        </div>
      ) : (
        <div className="continue-complete">
          <span aria-hidden="true">✓</span>
          <div>
            <strong>Course explored</strong>
            <p>You've visited every supplied lecture slide.</p>
          </div>
        </div>
      )}

      <div className="saved-section">
        <div className="saved-section-heading">
          <span>Saved for revision</span>
          <span className="saved-count">{saved.length}</span>
        </div>

        {saved.length === 0 ? (
          <p className="saved-empty">
            Save a citation when a concept is worth revisiting.
          </p>
        ) : (
          <div className="saved-list">
            {saved.slice(0, 4).map(({ lecture, slide }) => {
              const key = makeSlideKey(lecture.lecture_id, slide.slide_number);
              return (
                <div className="saved-item" key={key}>
                  <button
                    type="button"
                    className="saved-item-main"
                    onClick={() => onAsk({ lecture, slide })}
                  >
                    <span className="saved-item-icon"><BookmarkIcon filled /></span>
                    <span>
                      <strong>{slide.title}</strong>
                      <small>Week {lecture.week} · Slide {slide.slide_number}</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="saved-remove"
                    onClick={() => onSaveToggle(lecture, slide)}
                    aria-label={`Remove ${slide.title} from saved concepts`}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export { BookmarkIcon };
