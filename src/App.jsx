/**
 * App.jsx
 *
 * Root of the CS 4780 Course Tutor — Phase 4A.
 *
 * New in this phase:
 *   - Imports mock-stream.mjs for realistic chunk-by-chunk streaming.
 *   - Uses the useStreaming hook to manage all streaming state.
 *   - Matches submitted prompts to the 8 supplied scenarios via
 *     scenarioMatcher.  Unmatched prompts receive a friendly "not in demo"
 *     message, never a fabricated answer.
 *   - Disables the composer while a response is in flight.
 *   - The demo switcher continues to work; switching state resets all
 *     messages and cancels any active stream.
 *
 * Everything from Phase 3 (design, citation chips, empty state, mobile
 * layout, Markdown/math/code/table rendering) is preserved unchanged.
 */

import React, { useState, useEffect, useRef } from 'react';

// ── Phase 2 data layer ───────────────────────────────────────────────────────
import { activeConversation, emptyConversation, isEmptyConversation } from './data/conversations.js';
import { getScenarioById } from './data/scenarios.js';

// ── Phase 4A additions ───────────────────────────────────────────────────────
import { streamResponse } from '../data/mock-stream.mjs';
import { matchScenario } from './utils/scenarioMatcher.js';
import { useStreaming } from './hooks/useStreaming.js';

// ── Components ────────────────────────────────────────────────────────────────
import TutorMessage from './components/TutorMessage.jsx';
import EmptyState from './components/EmptyState.jsx';
import Composer from './components/Composer.jsx';

// ─── Demo state options ───────────────────────────────────────────────────────

const DEMO_STATES = {
  returning: activeConversation,
  new: emptyConversation,
};

/**
 * Message shown when the student's question does not match any scenario.
 * Friendly, not an error, explains this is a demo limitation.
 */
const NO_MATCH_MESSAGE =
  "I don't have an answer for that in this demo. The questions I can answer are the eight supplied scenarios — try one of the example prompts to see the tutor in action.";

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [stateKey, setStateKey] = useState('returning');
  const [draft, setDraft] = useState('');
  const scrollAnchorRef = useRef(null);

  // Initialise the streaming hook with the returning-student conversation.
  const { messages, isStreaming, submitMessage, resetMessages } = useStreaming(
    activeConversation.messages
  );

  // When the demo switcher changes, reset to the appropriate message list
  // and cancel any active stream.
  useEffect(() => {
    resetMessages(DEMO_STATES[stateKey].messages);
    setDraft('');
  }, [stateKey, resetMessages]);

  // Keep the view scrolled to the most recent message.
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const conversation = DEMO_STATES[stateKey];
  // Show the empty state only when we are in "new" mode and have no messages.
  const isEmpty = isEmptyConversation(conversation) && messages.length === 0;

  /**
   * Called when the student submits a question.
   *
   * 1. Match the prompt against the 8 scenarios.
   * 2a. No match → pass an errorText so useStreaming shows the "not in demo"
   *     message immediately without touching the streaming path.
   * 2b. Match → create an AbortController + streamResponse generator and
   *     hand them both to useStreaming.  useStreaming drives the loop and
   *     attaches citations on completion.
   */
  async function handleSend() {
    const text = draft.trim();
    if (!text || isStreaming) return;

    setDraft('');

    const scenarioId = matchScenario(text);

    if (!scenarioId) {
      // Unmatched — show the friendly "not in demo" note, no stream.
      submitMessage(text, null, null, NO_MATCH_MESSAGE);
      return;
    }

    const scenario = getScenarioById(scenarioId);
    const controller = new AbortController();
    const gen = streamResponse(scenarioId, { signal: controller.signal });

    // submitMessage takes ownership of the generator and drives it.
    submitMessage(text, gen, { citations: scenario.citations }, null);
  }

  /**
   * Pre-fills the composer from an empty-state example prompt click.
   */
  function handleExamplePrompt(prompt) {
    setDraft(prompt);
  }

  return (
    <div className="app">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="header">
        <div className="header-left">
          <span className="header-course-badge">
            {conversation.course.code}
          </span>
          <div className="header-divider" />
          <span className="header-course-name">
            {conversation.course.title}
          </span>
        </div>

        <div className="header-right">
          <div className="demo-switcher" role="group" aria-label="Demo state">
            <span className="demo-switcher-label">Demo</span>
            <button
              className={`demo-btn ${stateKey === 'returning' ? 'active' : ''}`}
              onClick={() => setStateKey('returning')}
              aria-pressed={stateKey === 'returning'}
              disabled={isStreaming}
            >
              Returning
            </button>
            <button
              className={`demo-btn ${stateKey === 'new' ? 'active' : ''}`}
              onClick={() => setStateKey('new')}
              aria-pressed={stateKey === 'new'}
              disabled={isStreaming}
            >
              New
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main className="main">
        {isEmpty ? (
          <EmptyState
            course={conversation.course}
            studentName={conversation.student.name}
            onSelectPrompt={handleExamplePrompt}
          />
        ) : (
          <div className="conversation-scroll">
            <div className="conversation-inner">
              {messages.map((message) => (
                <div className="turn" key={message.id}>
                  {message.role === 'user' ? (
                    <div className="user-message">
                      <div className="user-bubble">{message.content}</div>
                    </div>
                  ) : (
                    <TutorMessage message={message} />
                  )}
                </div>
              ))}
              <div ref={scrollAnchorRef} className="scroll-anchor" />
            </div>
          </div>
        )}

        <Composer
          value={draft}
          onChange={setDraft}
          onSubmit={handleSend}
          disabled={isStreaming}
        />
      </main>

    </div>
  );
}
