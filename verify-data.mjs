/**
 * verify-data.mjs
 *
 * Lightweight verification for the Phase 2 data layer.
 *
 * Runs with: node verify-data.mjs
 *
 * Checks:
 *   1. conversation.json loads and has expected shape
 *   2. conversation-empty.json loads and has empty messages
 *   3. All three lecture files load and have the expected slide counts
 *   4. responses.json loads all scenarios
 *   5. Valid citations resolve to correct slide data
 *   6. Invalid citations fail safely without throwing
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Load raw data ────────────────────────────────────────────────────────────

const activeConversation = require('./data/conversation.json');
const emptyConversation  = require('./data/conversation-empty.json');
const lec01              = require('./data/lectures/lecture-01-linear-models.json');
const lec02              = require('./data/lectures/lecture-02-gradient-descent.json');
const lec03              = require('./data/lectures/lecture-03-regularization.json');
const responsesData      = require('./data/responses.json');

// ─── Inline citation resolver (mirrors src/utils/citations.js logic) ──────────

const allLectures = [lec01, lec02, lec03];

function parseLectureString(lectureString) {
  if (typeof lectureString !== 'string') return null;
  const match = lectureString.match(/^Week\s+(\d+)\s+[—\-]\s+(.+)$/);
  if (!match) return null;
  return { week: parseInt(match[1], 10), title: match[2].trim() };
}

function resolveCitation(citation) {
  if (!citation || typeof citation !== 'object') {
    return { resolved: false, reason: 'citation is not an object' };
  }
  const { lecture: lectureString, slide: slideNumber } = citation;
  if (!lectureString) {
    return { resolved: false, reason: 'missing lecture field' };
  }
  if (typeof slideNumber !== 'number' || !Number.isInteger(slideNumber) || slideNumber < 1) {
    return { resolved: false, reason: 'invalid slide number' };
  }
  const parsed = parseLectureString(lectureString);
  if (!parsed) {
    return { resolved: false, reason: `lecture string "${lectureString}" does not match expected format` };
  }
  const lecture = allLectures.find(
    (lec) => lec.week === parsed.week && lec.title.toLowerCase() === parsed.title.toLowerCase()
  ) ?? null;
  if (!lecture) {
    return { resolved: false, reason: `no lecture found for "${lectureString}"` };
  }
  const slide = lecture.slides.find((s) => s.slide_number === slideNumber) ?? null;
  if (!slide) {
    return { resolved: false, reason: `lecture "${lecture.title}" has no slide ${slideNumber}` };
  }
  return { resolved: true, lecture, slide };
}

// ─── Assertion helpers ─────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

// ─── 1. conversation.json ──────────────────────────────────────────────────────

console.log('\n1. conversation.json');
assert('has id',            typeof activeConversation.id === 'string');
assert('has course.code',   activeConversation.course?.code === 'CS 4780');
assert('has course.title',  typeof activeConversation.course?.title === 'string');
assert('has student',       typeof activeConversation.student?.name === 'string');
assert('has messages array',Array.isArray(activeConversation.messages));
assert('messages non-empty',activeConversation.messages.length > 0);
assert('first message is user', activeConversation.messages[0].role === 'user');

// ─── 2. conversation-empty.json ───────────────────────────────────────────────

console.log('\n2. conversation-empty.json');
assert('has id',             typeof emptyConversation.id === 'string');
assert('has course.code',    emptyConversation.course?.code === 'CS 4780');
assert('messages is array',  Array.isArray(emptyConversation.messages));
assert('messages is empty',  emptyConversation.messages.length === 0);
assert('started_at is null', emptyConversation.started_at === null);

// ─── 3. Lecture files ──────────────────────────────────────────────────────────

console.log('\n3. Lecture files');
assert('lec01 lecture_id is lec_01',   lec01.lecture_id === 'lec_01');
assert('lec01 week is 1',              lec01.week === 1);
assert('lec01 has 15 slides',          lec01.slides.length === 15);

assert('lec02 lecture_id is lec_02',   lec02.lecture_id === 'lec_02');
assert('lec02 week is 2',              lec02.week === 2);
assert('lec02 has 15 slides',          lec02.slides.length === 15);

assert('lec03 lecture_id is lec_03',   lec03.lecture_id === 'lec_03');
assert('lec03 week is 3',              lec03.week === 3);
assert('lec03 has 15 slides',          lec03.slides.length === 15);

// ─── 4. responses.json ────────────────────────────────────────────────────────

console.log('\n4. responses.json');
assert('has scenarios array',          Array.isArray(responsesData.scenarios));
assert('has 8 scenarios',              responsesData.scenarios.length === 8);

const scenarioIds = responsesData.scenarios.map((s) => s.id);
for (const expectedId of ['plain', 'code', 'math', 'table', 'long', 'refusal', 'error-midstream', 'slow']) {
  assert(`scenario "${expectedId}" exists`, scenarioIds.includes(expectedId));
}

// ─── 5. Valid citation resolution ─────────────────────────────────────────────

console.log('\n5. Valid citation resolution');

// The canonical example from the assignment spec
const result1 = resolveCitation({
  lecture: 'Week 2 — Gradient Descent and Backpropagation',
  slide: 9,
});
assert('Week 2 slide 9 resolves',         result1.resolved === true);
assert('resolved slide title is correct', result1.slide?.title === 'The vanishing gradient problem');

// A Week 1 citation from responses.json
const result2 = resolveCitation({
  lecture: 'Week 1 — Linear Models and Loss Functions',
  slide: 2,
});
assert('Week 1 slide 2 resolves',         result2.resolved === true);
assert('Week 1 slide 2 title correct',    result2.slide?.title === 'What a supervised learning problem is');

// A Week 3 citation from conversation.json
const result3 = resolveCitation({
  lecture: 'Week 3 — Regularization and Generalization',
  slide: 6,
});
assert('Week 3 slide 6 resolves',         result3.resolved === true);
assert('Week 3 slide 6 title correct',    result3.slide?.title === 'L2 regularization (ridge)');

// Resolve all citations from conversation.json messages
console.log('\n   All conversation.json citations:');
let allConvResolved = true;
for (const msg of activeConversation.messages) {
  if (!Array.isArray(msg.citations) || msg.citations.length === 0) continue;
  for (const cit of msg.citations) {
    const r = resolveCitation(cit);
    if (!r.resolved) {
      console.error(`    ✗ ${cit.lecture} slide ${cit.slide}: ${r.reason}`);
      allConvResolved = false;
    }
  }
}
assert('all conversation.json citations resolve', allConvResolved);

// Resolve all citations from responses.json scenarios
let allSceResolved = true;
for (const scenario of responsesData.scenarios) {
  if (!Array.isArray(scenario.citations) || scenario.citations.length === 0) continue;
  for (const cit of scenario.citations) {
    const r = resolveCitation(cit);
    if (!r.resolved) {
      console.error(`    ✗ [${scenario.id}] ${cit.lecture} slide ${cit.slide}: ${r.reason}`);
      allSceResolved = false;
    }
  }
}
assert('all responses.json citations resolve', allSceResolved);

// ─── 6. Invalid citation handling ─────────────────────────────────────────────

console.log('\n6. Invalid citation handling');

const badCitations = [
  { input: null,                                             label: 'null citation' },
  { input: {},                                               label: 'empty object' },
  { input: { lecture: 'Week 2 — Gradient Descent and Backpropagation', slide: 999 }, label: 'nonexistent slide number' },
  { input: { lecture: 'Week 99 — Something That Does Not Exist', slide: 1 },         label: 'nonexistent lecture week' },
  { input: { lecture: 'not the right format', slide: 1 },   label: 'malformed lecture string' },
  { input: { lecture: 'Week 1 — Linear Models and Loss Functions', slide: -1 },      label: 'negative slide number' },
  { input: { slide: 5 },                                     label: 'missing lecture field' },
];

for (const { input, label } of badCitations) {
  let threw = false;
  let result;
  try {
    result = resolveCitation(input);
  } catch (e) {
    threw = true;
  }
  assert(`"${label}" does not throw`, !threw);
  assert(`"${label}" returns resolved: false`, result?.resolved === false);
}

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('\nSome checks failed. See above for details.');
  process.exit(1);
} else {
  console.log('\nAll checks passed. Phase 2 data layer is correct.');
}
