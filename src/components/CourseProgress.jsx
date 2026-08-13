/**
 * CourseProgress.jsx
 *
 * Deterministic course coverage from real lecture citations.
 * "Explored" means a lecture slide has been referenced by a settled
 * assistant response in the student's workspace. It does not imply mastery.
 */

import React, { useMemo } from 'react';
import { allLectures } from '../data/lectures.js';
import { resolveCitation } from '../utils/citations.js';

export function getExploredSlideKeys(chats, activeChatId) {
  const keys = new Set();

  for (const chat of chats) {
    // Demo fixtures represent separate sample personas. Include only the
    // currently selected demo so its progress is meaningful, while regular
    // chats contribute to the student's persistent course coverage.
    if (chat.isDemo && chat.id !== activeChatId) continue;

    for (const message of chat.messages ?? []) {
      if (message.role !== 'assistant' || !Array.isArray(message.citations)) {
        continue;
      }

      for (const citation of message.citations) {
        const result = resolveCitation(citation);
        if (!result.resolved) continue;
        keys.add(
          `${result.lecture.lecture_id}-${result.slide.slide_number}`
        );
      }
    }
  }

  return keys;
}

export function calculateCourseProgress(chats, activeChatId) {
  const exploredKeys = getExploredSlideKeys(chats, activeChatId);
  const totalSlides = allLectures.reduce(
    (total, lecture) => total + lecture.slides.length,
    0
  );

  const weeks = allLectures.map((lecture) => {
    const explored = lecture.slides.filter((slide) =>
      exploredKeys.has(`${lecture.lecture_id}-${slide.slide_number}`)
    ).length;

    return {
      id: lecture.lecture_id,
      week: lecture.week,
      title: lecture.title,
      explored,
      total: lecture.slides.length,
      percent: lecture.slides.length
        ? Math.round((explored / lecture.slides.length) * 100)
        : 0,
    };
  });

  const explored = exploredKeys.size;
  const percent = totalSlides
    ? Math.round((explored / totalSlides) * 100)
    : 0;

  return {
    explored,
    total: totalSlides,
    percent,
    remaining: Math.max(totalSlides - explored, 0),
    weeks,
  };
}

function ProgressBar({ value, label }) {
  return (
    <div className="course-progress-bar" role="progressbar"
      aria-valuemin="0" aria-valuemax="100" aria-valuenow={value}
      aria-label={label}>
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

export default function CourseProgress({
  chats,
  activeChatId,
  compact = false,
}) {
  const progress = useMemo(
    () => calculateCourseProgress(chats, activeChatId),
    [chats, activeChatId]
  );

  if (compact) {
    return (
      <section className="course-progress-compact" aria-label="Course progress">
        <div className="course-progress-compact-top">
          <span className="course-progress-kicker">Course progress</span>
          <strong>{progress.percent}%</strong>
        </div>
        <ProgressBar
          value={progress.percent}
          label={`${progress.percent}% of course slides explored`}
        />
        <p>
          {progress.explored} of {progress.total} slides explored
        </p>
      </section>
    );
  }

  return (
    <section className="course-progress-card" aria-label="Course progress">
      <div className="course-progress-heading">
        <div>
          <p className="course-progress-kicker">Course progress</p>
          <h2>{progress.percent}% explored</h2>
        </div>
        <div className="course-progress-ring" aria-hidden="true">
          <span>{progress.percent}</span>
        </div>
      </div>

      <ProgressBar
        value={progress.percent}
        label={`${progress.percent}% of course slides explored`}
      />

      <div className="course-progress-summary">
        <div>
          <strong>{progress.explored}</strong>
          <span>explored</span>
        </div>
        <div>
          <strong>{progress.remaining}</strong>
          <span>to explore</span>
        </div>
        <div>
          <strong>{progress.weeks.filter((week) => week.explored > 0).length}</strong>
          <span>weeks visited</span>
        </div>
      </div>

      <div className="course-week-list">
        {progress.weeks.map((week) => (
          <div className="course-week-row" key={week.id}>
            <div className="course-week-copy">
              <span>Week {week.week}</span>
              <strong>{week.explored}/{week.total}</strong>
            </div>
            <ProgressBar
              value={week.percent}
              label={`Week ${week.week}: ${week.percent}% explored`}
            />
          </div>
        ))}
      </div>

      <p className="course-progress-note">
        Based on lecture slides referenced in your tutor conversations.
      </p>
    </section>
  );
}
