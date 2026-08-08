/**
 * App.jsx
 *
 * Root of the CS 4780 Course Tutor application.
 *
 * Phase 3 renders:
 *   - Sticky course header with demo state switcher
 *   - Conversation message list (from conversation.json)
 *   - Empty/welcome state (from conversation-empty.json)
 *   - Message composer
 *
 * Streaming and citation panels are in later phases.
 */

import React, { useState, useEffect, useRef } from 'react';

import { activeConversation, emptyConversation, isEmptyConversation } from './data/conversations.js';
import TutorMessage from './components/TutorMessage.jsx';
import EmptyState from './components/EmptyState.jsx';
import Composer from './components/Composer.jsx';

// ─── Available demo states ────────────────────────────────────────────────────

const STATES = {
  returning: activeConversation,
  new: emptyConversation,
};

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [stateKey, setStateKey] = useState('returning');
  const [messages, setMessages] = useState(activeConversation.messages);
  const [draft, setDraft] = useState('');
  const scrollAnchorRef = useRef(null);

  // Sync the message list when the demo state changes
  useEffect(() => {
    setMessages(STATES[stateKey].messages);
    setDraft('');
  }, [stateKey]);

  // Scroll to the bottom whenever new messages are added
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const conversation = STATES[stateKey];
  const isEmpty = isEmptyConversation(conversation) && messages.length === 0;

  /**
   * Appends a user message to local state.
   * Phase 4 will also trigger the mock streaming tutor response here.
   */
  function handleSend() {
    const text = draft.trim();
    if (!text) return;

    const userMessage = {
      id: `local_${Date.now()}`,
      role: 'user',
      created_at: new Date().toISOString(),
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setDraft('');
  }

  /**
   * Pre-fills the composer when the student clicks an example prompt.
   */
  function handleExamplePrompt(prompt) {
    setDraft(prompt);
  }

  return (
    <div className="app">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="header">
        {/* Left: course identity */}
        <div className="header-left">
          <span className="header-course-badge">
            {conversation.course.code}
          </span>
          <div className="header-divider" />
          <span className="header-course-name">
            {conversation.course.title}
          </span>
        </div>

        {/* Right: demo state switcher */}
        <div className="header-right">
          <div className="demo-switcher" role="group" aria-label="Demo state">
            <span className="demo-switcher-label">Demo</span>
            <button
              className={`demo-btn ${stateKey === 'returning' ? 'active' : ''}`}
              onClick={() => setStateKey('returning')}
              aria-pressed={stateKey === 'returning'}
            >
              Returning
            </button>
            <button
              className={`demo-btn ${stateKey === 'new' ? 'active' : ''}`}
              onClick={() => setStateKey('new')}
              aria-pressed={stateKey === 'new'}
            >
              New
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main className="main">
        {isEmpty ? (
          /* ── Empty / welcome state ─────────────────────────────────────── */
          <EmptyState
            course={conversation.course}
            studentName={conversation.student.name}
            onSelectPrompt={handleExamplePrompt}
          />
        ) : (
          /* ── Conversation ──────────────────────────────────────────────── */
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
              {/* Scroll target — keeps the view pinned to the newest message */}
              <div ref={scrollAnchorRef} className="scroll-anchor" />
            </div>
          </div>
        )}

        {/* Composer — always present below the content */}
        <Composer
          value={draft}
          onChange={setDraft}
          onSubmit={handleSend}
          disabled={false}
        />
      </main>

    </div>
  );
}
