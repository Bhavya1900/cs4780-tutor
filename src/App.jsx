/**
 * App.jsx
 *
 * Root of the CS 4780 Course Tutor.
 *
 * Competition-layer addition:
 *   - Real multi-chat workspace with New Chat + persistent history.
 *   - Existing streaming, Stop, Retry, citations, Study Trail and demo states
 *     remain intact.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

import { activeConversation, emptyConversation } from './data/conversations.js';
import { allScenarios, getScenarioById } from './data/scenarios.js';
import { streamResponse } from '../data/mock-stream.mjs';
import { matchScenario } from './utils/scenarioMatcher.js';
import { useStreaming } from './hooks/useStreaming.js';
import {
  saveConversation,
  loadConversation,
} from './utils/conversationStorage.js';
import {
  loadChats,
  saveChats,
  loadActiveChatId,
  saveActiveChatId,
} from './utils/chatStorage.js';

import { StudyTrailDesktop, StudyTrailMobile } from './components/StudyTrail.jsx';
import TutorMessage from './components/TutorMessage.jsx';
import EmptyState from './components/EmptyState.jsx';
import Composer from './components/Composer.jsx';
import ChatSidebar from './components/ChatSidebar.jsx';

const FIXTURES = {
  returning: activeConversation,
  new: emptyConversation,
};

const EDUCATIONAL_IDS = ['plain', 'code', 'math', 'table'];
const SUGGESTION_PROMPTS = allScenarios
  .filter((s) => EDUCATIONAL_IDS.includes(s.id))
  .map((s) => s.prompt);

const NO_MATCH_MESSAGE =
  'This demo is scoped to the supplied CS 4780 scenarios. I can’t answer questions outside that set — but here are some questions I *can* help with:';

const DEMO_CHAT_IDS = {
  returning: 'demo-returning',
  new: 'demo-new',
};

function createDemoChats() {
  return [
    {
      id: DEMO_CHAT_IDS.returning,
      title: 'Returning student',
      persona: 'returning',
      isDemo: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: loadConversation('returning', activeConversation.messages),
    },
    {
      id: DEMO_CHAT_IDS.new,
      title: 'New student',
      persona: 'new',
      isDemo: true,
      createdAt: Date.now() + 1,
      updatedAt: Date.now() + 1,
      messages: loadConversation('new', emptyConversation.messages),
    },
  ];
}

function getInitialWorkspace() {
  const storedChats = loadChats();
  const chats = storedChats?.length ? storedChats : createDemoChats();
  const storedActiveId = loadActiveChatId();
  const activeId =
    chats.some((chat) => chat.id === storedActiveId)
      ? storedActiveId
      : chats[0].id;

  return { chats, activeId };
}

function makeChatTitle(messages) {
  const firstUserMessage = messages.find((message) => message.role === 'user');
  if (!firstUserMessage?.content) return 'New chat';

  const clean = firstUserMessage.content.replace(/\s+/g, ' ').trim();
  if (clean.length <= 42) return clean;
  return `${clean.slice(0, 39).trimEnd()}…`;
}

function createChat() {
  const now = Date.now();
  return {
    id: `chat_${now}_${Math.random().toString(36).slice(2, 7)}`,
    title: 'New chat',
    persona: 'new',
    isDemo: false,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

export default function App() {
  // ---- Persistent multi-chat workspace --------------------------------------

  const [workspace] = useState(getInitialWorkspace);
  const [chats, setChats] = useState(workspace.chats);
  const [activeChatId, setActiveChatId] = useState(workspace.activeId);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeChatRef = useRef(workspace.activeId);
  const activeChat = chats.find((chat) => chat.id === activeChatId) ?? chats[0];

  // The existing persona concept remains for the supplied Returning/New demo
  // states. Normal chats use the "new" persona without affecting the fixtures.
  const activePersona = activeChat?.persona ?? 'new';

  // ---- Streaming hook -------------------------------------------------------

  const [initialMessages] = useState(() => activeChat?.messages ?? []);

  const {
    messages,
    isStreaming,
    submitMessage,
    retryMessage,
    stopStream,
    resetMessages,
  } = useStreaming(initialMessages);

  // ---- Composer -------------------------------------------------------------

  const [draft, setDraft] = useState('');
  const scrollAnchorRef = useRef(null);

  // ---- Persist chat workspace ------------------------------------------------

  useEffect(() => {
    if (isStreaming) return;

    setChats((previous) => {
      const current = previous.find((chat) => chat.id === activeChatRef.current);
      if (!current) return previous;

      const nextTitle = current.isDemo
        ? current.title
        : makeChatTitle(messages);

      const next = previous.map((chat) =>
        chat.id === activeChatRef.current
          ? {
              ...chat,
              title: nextTitle,
              updatedAt: Date.now(),
              messages,
            }
          : chat
      );

      saveChats(next);
      return next;
    });

    saveActiveChatId(activeChatRef.current);
  }, [messages, isStreaming]);

  // ---- Scroll to bottom on new message --------------------------------------

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ---- Chat selection -------------------------------------------------------

  const selectChat = useCallback(
    (chatId) => {
      if (chatId === activeChatRef.current || isStreaming) return;

      const nextChat = chats.find((chat) => chat.id === chatId);
      if (!nextChat) return;

      // Persist the current chat before moving away from it.
      saveChats(
        chats.map((chat) =>
          chat.id === activeChatRef.current
            ? { ...chat, messages, updatedAt: Date.now() }
            : chat
        )
      );

      activeChatRef.current = chatId;
      setActiveChatId(chatId);
      resetMessages(nextChat.messages);
      setDraft('');
      setSidebarOpen(false);
      saveActiveChatId(chatId);
    },
    [chats, isStreaming, messages, resetMessages]
  );

  // ---- New Chat -------------------------------------------------------------

  const handleNewChat = useCallback(() => {
    if (isStreaming) return;

    const nextChat = createChat();
    const currentChats = chats.map((chat) =>
      chat.id === activeChatRef.current
        ? { ...chat, messages, updatedAt: Date.now() }
        : chat
    );
    const nextChats = [nextChat, ...currentChats];

    setChats(nextChats);
    saveChats(nextChats);

    activeChatRef.current = nextChat.id;
    setActiveChatId(nextChat.id);
    resetMessages([]);
    setDraft('');
    setSidebarOpen(false);
    saveActiveChatId(nextChat.id);
  }, [chats, isStreaming, messages, resetMessages]);

  // ---- Demo state switcher --------------------------------------------------

  const switchPersona = useCallback(
    (persona) => {
      if (isStreaming) return;
      const demoId = DEMO_CHAT_IDS[persona];
      const demoChat = chats.find((chat) => chat.id === demoId);
      if (!demoChat) return;
      selectChat(demoId);
    },
    [chats, isStreaming, selectChat]
  );

  // ---- Current conversation metadata ----------------------------------------

  const conversation =
    FIXTURES[activePersona] ?? FIXTURES.new;
  const isEmpty = messages.length === 0;

  // ---- handleSend -----------------------------------------------------------

  async function handleSend(textOverride) {
    const text = (
      typeof textOverride === 'string' ? textOverride : draft
    ).trim();

    if (!text || isStreaming) return;

    if (typeof textOverride !== 'string') setDraft('');

    const scenarioId = matchScenario(text);

    if (!scenarioId) {
      submitMessage(
        text,
        null,
        null,
        NO_MATCH_MESSAGE,
        null,
        SUGGESTION_PROMPTS
      );
      return;
    }

    const scenario = getScenarioById(scenarioId);
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

  // ---- Stop / Retry ---------------------------------------------------------

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

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <button
            className="mobile-chat-toggle"
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open chat history"
          >
            <span className="mobile-chat-toggle-line" />
            <span className="mobile-chat-toggle-line" />
            <span className="mobile-chat-toggle-line" />
          </button>

          <span className="header-course-badge">
            {conversation.course.code}
          </span>
          <div className="header-divider" />
          <span className="header-course-name">
            {conversation.course.title}
          </span>
        </div>

        <div className="header-right">
          <span className="active-chat-title">{activeChat?.title}</span>
        </div>
      </header>

      <div className="app-body">
        <ChatSidebar
          chats={chats}
          activeChatId={activeChatId}
          activePersona={activePersona}
          onSelect={selectChat}
          onNewChat={handleNewChat}
          onClose={() => setSidebarOpen(false)}
          onDemo={switchPersona}
          mobileOpen={sidebarOpen}
        />

        <main className="main" aria-label="Course tutor conversation">
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
                        onRetry={
                          message.error
                            ? () => handleRetry(message)
                            : null
                        }
                        onSuggestion={handleSend}
                      />
                    )}
                  </div>
                ))}
                <div ref={scrollAnchorRef} className="scroll-anchor" />
              </div>
            </div>
          )}

          {!isEmpty && <StudyTrailMobile messages={messages} />}

          <Composer
            value={draft}
            onChange={setDraft}
            onSubmit={handleSend}
            onStop={handleStop}
            isStreaming={isStreaming}
          />
        </main>

        {!isEmpty && <StudyTrailDesktop messages={messages} />}
      </div>
    </div>
  );
}
