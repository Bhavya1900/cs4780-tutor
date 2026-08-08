/**
 * lectures.js
 *
 * Loads the three supplied lecture JSON files and exposes them as
 * a structured collection indexed by lecture_id and by week title.
 *
 * Source files (not modified):
 *   data/lectures/lecture-01-linear-models.json
 *   data/lectures/lecture-02-gradient-descent.json
 *   data/lectures/lecture-03-regularization.json
 */

import lec01 from '../../data/lectures/lecture-01-linear-models.json';
import lec02 from '../../data/lectures/lecture-02-gradient-descent.json';
import lec03 from '../../data/lectures/lecture-03-regularization.json';

/**
 * All lectures as an ordered array.
 * The order reflects the course week sequence.
 */
export const allLectures = [lec01, lec02, lec03];

/**
 * Lectures indexed by their lecture_id (e.g. "lec_01").
 * Useful for fast lookup by ID.
 */
export const lecturesById = Object.fromEntries(
  allLectures.map((lec) => [lec.lecture_id, lec])
);

/**
 * Returns a single lecture by its lecture_id, or null if not found.
 * @param {string} id
 * @returns {object|null}
 */
export function getLectureById(id) {
  return lecturesById[id] ?? null;
}

/**
 * Returns a slide object from a lecture, or null if the slide does not exist.
 * @param {object} lecture
 * @param {number} slideNumber
 * @returns {object|null}
 */
export function getSlide(lecture, slideNumber) {
  if (!lecture || !Array.isArray(lecture.slides)) return null;
  return lecture.slides.find((s) => s.slide_number === slideNumber) ?? null;
}
