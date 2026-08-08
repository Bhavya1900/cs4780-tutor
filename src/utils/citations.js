/**
 * citations.js
 *
 * Generic citation resolver.
 *
 * Citations in the supplied conversation and response data look like:
 *   { "lecture": "Week 2 — Gradient Descent and Backpropagation", "slide": 9 }
 *
 * The "lecture" field is the full lecture title prefixed with "Week N — ".
 * This resolver matches it against the loaded lecture data by comparing
 * the lecture's week number and title.
 *
 * No results are hardcoded. The same resolver works for every valid
 * citation in conversation.json and responses.json.
 */

import { allLectures, getSlide } from '../data/lectures.js';

/**
 * Parses the citation lecture string into its component parts.
 * Expected format: "Week N — <Lecture Title>"
 *
 * Returns { week: number, title: string } or null if the string
 * does not match the expected format.
 *
 * @param {string} lectureString
 * @returns {{ week: number, title: string } | null}
 */
function parseLectureString(lectureString) {
  if (typeof lectureString !== 'string') return null;

  // Match "Week N — Title" (the em-dash may vary; accept — and -)
  const match = lectureString.match(/^Week\s+(\d+)\s+[—\-]\s+(.+)$/);
  if (!match) return null;

  return {
    week: parseInt(match[1], 10),
    title: match[2].trim(),
  };
}

/**
 * Finds the lecture that matches a parsed citation's week number and title.
 *
 * @param {{ week: number, title: string }} parsed
 * @returns {object|null} The matching lecture object or null.
 */
function findLecture(parsed) {
  return (
    allLectures.find(
      (lec) =>
        lec.week === parsed.week &&
        lec.title.toLowerCase() === parsed.title.toLowerCase()
    ) ?? null
  );
}

/**
 * Resolves a citation to the actual lecture and slide data.
 *
 * Given a citation object like:
 *   { lecture: "Week 2 — Gradient Descent and Backpropagation", slide: 9 }
 *
 * Returns an object with the resolved lecture and slide, or a failure
 * descriptor if the citation cannot be resolved.
 *
 * The function handles expected invalid cases (bad format, missing lecture,
 * missing slide) deliberately and returns a typed result object rather than
 * throwing or returning a bare null.
 *
 * @param {{ lecture: string, slide: number }} citation
 * @returns {
 *   { resolved: true, lecture: object, slide: object } |
 *   { resolved: false, reason: string }
 * }
 */
export function resolveCitation(citation) {
  // Guard: citation must be a non-null object
  if (!citation || typeof citation !== 'object') {
    return { resolved: false, reason: 'citation is not an object' };
  }

  const { lecture: lectureString, slide: slideNumber } = citation;

  // Guard: lecture string must be present
  if (!lectureString) {
    return { resolved: false, reason: 'missing lecture field' };
  }

  // Guard: slide number must be a positive integer
  if (typeof slideNumber !== 'number' || !Number.isInteger(slideNumber) || slideNumber < 1) {
    return { resolved: false, reason: 'invalid slide number' };
  }

  // Parse the "Week N — Title" string
  const parsed = parseLectureString(lectureString);
  if (!parsed) {
    return {
      resolved: false,
      reason: `lecture string "${lectureString}" does not match expected format "Week N — Title"`,
    };
  }

  // Find the matching lecture
  const lecture = findLecture(parsed);
  if (!lecture) {
    return {
      resolved: false,
      reason: `no lecture found for "${lectureString}"`,
    };
  }

  // Find the matching slide within that lecture
  const slide = getSlide(lecture, slideNumber);
  if (!slide) {
    return {
      resolved: false,
      reason: `lecture "${lecture.title}" has no slide ${slideNumber}`,
    };
  }

  return { resolved: true, lecture, slide };
}
