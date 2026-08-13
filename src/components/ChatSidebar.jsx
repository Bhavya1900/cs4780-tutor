import React from 'react';
import CourseProgress from './CourseProgress.jsx';

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M5 5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4.4A2.5 2.5 0 0 1 5 12.5v-7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ChatSidebar({
  chats,
  activeChatId,
  onSelect,
  onNewChat,
  onClose,
  onDemo,
  activePersona,
  mobileOpen,
}) {
  const regularChats = chats.filter((chat) => !chat.isDemo);

  return (
    <>
      {mobileOpen && <button className="sidebar-backdrop" onClick={onClose} aria-label="Close chat menu" />}

      <aside className={`chat-sidebar${mobileOpen ? ' chat-sidebar--open' : ''}`} aria-label="Chat history">
        <div className="chat-sidebar-top">
          <div className="sidebar-brand">
            <div className="sidebar-brand-mark">CS</div>
            <div>
              <p className="sidebar-brand-code">CS 4780</p>
              <p className="sidebar-brand-name">Course Tutor</p>
            </div>
          </div>

          <button className="sidebar-close" onClick={onClose} type="button" aria-label="Close chat menu">
            <CloseIcon />
          </button>

          <button className="new-chat-btn" onClick={onNewChat} type="button">
            <PlusIcon />
            <span>New chat</span>
            <kbd>⌘ K</kbd>
          </button>

          <div className="demo-state-panel">
            <div className="demo-state-heading">
              <span>Preview student state</span>
              <span className="demo-state-badge">Demo</span>
            </div>
            <div className="demo-sidebar-switcher" role="group" aria-label="Demo persona">
              <button
                type="button"
                className={activePersona === 'returning' ? 'active' : ''}
                onClick={() => onDemo('returning')}
                aria-pressed={activePersona === 'returning'}
              >
                Returning
              </button>
              <button
                type="button"
                className={activePersona === 'new' ? 'active' : ''}
                onClick={() => onDemo('new')}
                aria-pressed={activePersona === 'new'}
              >
                New student
              </button>
            </div>
          </div>
        </div>

        <div className="chat-sidebar-content">
          <div className="sidebar-section">
            <div className="sidebar-section-heading">
              <span>Recent chats</span>
              <span className="sidebar-section-count">{regularChats.length}</span>
            </div>

            {regularChats.length === 0 ? (
              <div className="sidebar-empty">
                <ChatIcon />
                <p>Your conversations will appear here.</p>
              </div>
            ) : (
              <div className="chat-list">
                {regularChats.map((chat) => (
                  <button
                    key={chat.id}
                    type="button"
                    className={`chat-list-item${chat.id === activeChatId ? ' active' : ''}`}
                    onClick={() => onSelect(chat.id)}
                  >
                    <span className="chat-list-icon"><ChatIcon /></span>
                    <span className="chat-list-copy">
                      <span className="chat-list-title">{chat.title}</span>
                      <span className="chat-list-meta">
                        {chat.messages.length} {chat.messages.length === 1 ? 'message' : 'messages'}
                        {chat.updatedAt ? ` · ${formatTime(chat.updatedAt)}` : ''}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="sidebar-section sidebar-learn-section">
            <div className="sidebar-section-heading"><span>Learn</span></div>
            <CourseProgress
              chats={chats}
              activeChatId={activeChatId}
              compact
            />
          </div>
        </div>

      </aside>
    </>
  );
}
