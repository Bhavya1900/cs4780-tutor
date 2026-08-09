/**
 * App.jsx
 *
 * Root of the CS 4780 Course Tutor -- Phase 5.
 *
 * Phase 5 additions (on top of 4B):
 *
 *   PERSISTENCE
 *   - Each persona (returning / new) has its own localStorage key.
 *   - Initial messages are loaded from localStorage, falling back to the
 *     JSON fixture on first visit.
 *   - After every settled state update (isStreaming goes false), the current
 *     persona's messages are saved.  Transient streaming fields are stripped
 *     before saving (handled by conversationStorage.js).
 *
 *   INDEPENDENT PERSONAS
 *   - switchPersona() saves the outgoing messages, loads the incoming ones,
 *     and calls resetMessages() -- the demo switcher now behaves correctly.
 *   - activePersonaRef keeps a non-reactive copy of the active key so the
 *     save effect reads the right key without creating a dependency loop.
 *
 *   STUDY TRAIL
 *   - StudyTrailDesktop renders beside the conversation column (desktop only).
 *   - StudyTrailMobile renders above the composer (mobile only).
 *   - Both derive data deterministically from citation metadata on messages.
 *
 *   HANDLESEN OVERRIDE
 *   - handleSend accepts an optional text argument so example prompts and
 *     suggestion chips auto-send through the real streaming path.
 *
 *   NO-MATCH SUGGESTIONS
 *   - SUGGESTION_PROMPTS derived from allScenarios (never hardcoded).
 *   - Passed to submitMessage; stored on the no-match assistant message.
 *   - TutorMessage renders them as clickable chips.
 *
 *   LAYOUT
 *   - New .app-body flex-row wrapper holds <main> + StudyTrailDesktop.
 *
 * Everything from Phase 4B (Stop, Retry, error states) preserved unchanged.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// -- Phase 2 data layer -------------------------------------------------------
import { activeConversation, emptyConversation } from './data/conversations.js';
import { getScenarioById } from './data/scenarios.js';
import { allScenarios } from './data/scenarios.js';

// -- Phase 4A/4B --------------------------------------------------------------
import { streamResponse } from '../data/mock-stream.mjs';
import { matchScenario } from './utils/scenarioMatcher.js';
import { useStreaming } from './hooks/useStreaming.js';

// -- Phase 5 ------------------------------------------------------------------
import { saveConversation, loadConversation } from './utils/conversationStorage.js';
import { StudyTrailDesktop, StudyTrailMobile } from './components/StudyTrail.jsx';

// -- Components ---------------------------------------------------------------
import TutorMessage from './components/TutorMessage.jsx';
import EmptyState from './components/EmptyState.jsx';
import Composer from './components/Composer.jsx';

// -- Fixtures keyed by persona ------------------------------------------------
const FIXTURES = {
  returning: activeConversation,
  new: emptyConversation,
};

// -- Suggestion prompts from real scenario data (never hardcoded) -------------
//
// Pick four educational scenarios whose prompts make good "try asking" chips.
// These are the IDs that produce rich, well-illustrated responses.
const EDUCATIONAL_IDS = ['plain', 'code', 'math', 'table'];
const SUGGESTION_PROMPTS = allScenarios
  .filter((s) => EDUCATIONAL_IDS.includes(s.id))
  .map((s) => s.prompt);

// -- No-match message copy ----------------------------------------------------
const NO_MATCH_MESSAGE =
  "This demo is scoped to the supplied CS\u00a04780 scenarios. I can\u2019t answer questions outside that set \u2014 but here are some questions I *can* help with:";

// -- App ----------------------------------------------------------------------

export default function App() {
  // ---- Persona state --------------------------------------------------------

  const [activePersona, setActivePersona] = useState('returning');

  // Non-reactive ref so the save effect always reads the current persona
  // without it being listed as a dependency (avoids the save triggering on
  // every persona switch before the new messages arrive).
  const activePersonaRef = useRef('returning');

  // ---- Streaming hook -------------------------------------------------------

  // Load the returning student's conversation once at mount time.
  // useState lazy initialiser runs only once.
  const [initialMessages] = useState(() =>
    loadConversation('returning', activeConversation.messages)
  );

  const {
    messages,
    isStreaming,
    submitMessage,
    retryMessage,
    stopStream,
    resetMessages,
  } = useStreaming(initialMessages);

  // ---- Composer draft -------------------------------------------------------

  const [draft, setDraft] = useState('');
  const scrollAnchorRef = useRef(null);

  // ---- Persistence: save after every settled update -------------------------

  useEffect(() => {
    // Skip while a stream is in flight -- transient messages are not worth saving.
    if (isStreaming) return;
    // Nothing to save for a brand-new empty persona.
    if (messages.length === 0) return;
    saveConversation(activePersonaRef.current, messages);
  }, [messages, isStreaming]);

  // ---- Scroll to bottom on new message --------------------------------------

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ---- Persona switcher -----------------------------------------------------

  const switchPersona = useCallback(
    (persona) => {
      if (persona === activePersonaRef.current || isStreaming) return;

      // Persist outgoing persona before switching.
      saveConversation(activePersonaRef.current, messages);

      // Load incoming persona.
      const fixture = FIXTURES[persona].messages;
      const next = loadConversation(persona, fixture);

      activePersonaRef.current = persona;
      setActivePersona(persona);
      resetMessages(next);
      setDraft('');
    },
    [isStreaming, messages, resetMessages]
  );

  // ---- Current conversation metadata (for header + EmptyState) --------------

  const conversation = FIXTURES[activePersona];
  const isEmpty = messages.length === 0;

  // ---- handleSend -----------------------------------------------------------

  /**
   * Submit a question.
   *
   * Accepts an optional textOverride so example prompts and suggestion chips
   * can send through the real streaming path without going through the draft.
   *
   * @param {string} [textOverride]
   */
  async function handleSend(textOverride) {
    const text = (
      typeof textOverride === 'string' ? textOverride : draft
    ).trim();

    if (!text || isStreaming) return;

    // Clear the draft only when we used it (not when an override was supplied).
    if (typeof textOverride !== 'string') setDraft('');

    const scenarioId = matchScenario(text);

    if (!scenarioId) {
      // Unmatched -- show the explanation + suggestion chips, no stream.
      submitMessage(text, null, null, NO_MATCH_MESSAGE, null, SUGGESTION_PROMPTS);
      return;
    }

    const scenario = getScenarioById(scenarioId);

    // One AbortController, wired to both the generator AND the hook ref.
    const controller = new AbortController();
    const gen = streamResponse(scenarioId, { signal: controller.signal });

    submitMessage(
      text,
      gen,
      { citations: scenario.citations, _scenarioId: scenarioId },
      null,
      controller
    );
  }

  // ---- handleStop / handleRetry ---------------------------------------------

  function handleStop() {
    stopStream();
  }

  async function handleRetry(message) {
    const scenarioId = message.scenarioId;
    if (!scenarioId) return;

    const scenario = getScenarioById(scenarioId);
    if (!scenario) return;

    const controller = new AbortController();
    const gen = streamResponse(scenarioId, { signal: controller.signal });

    retryMessage(
      message.id,
      gen,
      { citations: scenario.citations, _scenarioId: scenarioId },
      controller
    );
  }

  // ---- Render ---------------------------------------------------------------

  return (
    <div className="app">

      {/* Header */}
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
          <div className="demo-switcher" role="group" aria-label="Demo persona">
            <span className="demo-switcher-label">Demo</span>
            <button
              className={`demo-btn${activePersona === 'returning' ? ' active' : ''}`}
              onClick={() => switchPersona('returning')}
              aria-pressed={activePersona === 'returning'}
              disabled={isStreaming}
            >
              Returning
            </button>
            <button
              className={`demo-btn${activePersona === 'new' ? ' active' : ''}`}
              onClick={() => switchPersona('new')}
              aria-pressed={activePersona === 'new'}
              disabled={isStreaming}
            >
              New
            </button>
          </div>
        </div>
      </header>

      {/* Body: conversation column + desktop study trail */}
      <div className="app-body">

        <main className="main">
          {isEmpty ? (
            <EmptyState
              course={conversation.course}
              studentName={conversation.student?.name}
              prompts={SUGGESTION_PROMPTS}
              onSend={handleSend}
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
                      <TutorMessage
                        message={message}
                        onRetry={message.error ? () => handleRetry(message) : null}
                        onSuggestion={handleSend}
                      />
                    )}
                  </div>
                ))}
                <div ref={scrollAnchorRef} className="scroll-anchor" />
              </div>
            </div>
          )}

          {/* Mobile Study Trail: between scroll area and composer */}
          {!isEmpty && <StudyTrailMobile messages={messages} />}

          <Composer
            value={draft}
            onChange={setDraft}
            onSubmit={handleSend}
            onStop={handleStop}
            isStreaming={isStreaming}
          />
        </main>

        {/* Desktop Study Trail: beside the conversation */}
        {!isEmpty && <StudyTrailDesktop messages={messages} />}

      </div>
    </div>
  );
}
