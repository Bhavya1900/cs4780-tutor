CS 4780 Course Tutor

Deployed link: https://cs4780-tutor.vercel.app/

A polished, frontend-first course tutor for CS 4780 --- Machine
Learning for Engineers, built as a Frontend Engineer Intern take-home
project.

The product is designed around one idea:

A course tutor should do more than answer questions --- it should
help a student navigate, revisit, and understand the course.

The application combines a deterministic streaming tutor, grounded
lecture citations, persistent conversations, course exploration
progress, a learning companion, saved concepts, and a responsive
learning workspace.

Course: CS 4780 --- Machine Learning for Engineers
Instructor: Dr. Elena Márquez

What the Product Does

The application provides a focused course-tutor experience backed by the
supplied course fixtures.

Core tutor experience

Returning-student and new-student demo states

Multiple persistent chats with New Chat and chat history

Streaming tutor responses

Thinking indicator before the first token

Stop generation while streaming

Retry after a simulated mid-stream failure

Markdown and GitHub-Flavored Markdown

Mathematical notation with KaTeX

Code blocks

Tables

Lecture citations tied to real lecture/slide data

Citation detail popovers

Learning features

Study Trail --- concepts encountered through resolved citations

Course Progress --- tracks explored slides across the supplied
3-lecture course

Learning Companion --- suggests the next relevant unexplored
slide

Saved Concepts --- bookmark concepts for later revision

Persistent learning state through browser localStorage

Product and UX

Premium dark academic interface

Desktop learning workspace with chat history and learning
information

Responsive mobile layout

Keyboard-accessible controls and visible focus states

Empty/onboarding state with real supported example prompts

Honest handling of unsupported questions

Why the Tutor Is Deterministic

This project intentionally does not connect to a live AI model or
backend.

The supplied assignment includes:

data/responses.json

data/mock-stream.mjs

three lecture JSON files

conversation fixtures

The tutor therefore uses those supplied fixtures as its deterministic
source of truth.

When a supported prompt is submitted:

User question
    ↓
scenarioMatcher
    ↓
scenario in responses.json
    ↓
mock-stream.mjs
    ↓
progressive chunks
    ↓
React state
    ↓
TutorMessage
    ↓
Markdown / math / code / tables / citations

This makes the demo reproducible and requires no API key, backend,
database, or network request.

Unsupported questions are handled explicitly rather than pretending that
arbitrary questions are supported.

Main Features in Detail

1. New Chat + Persistent History

Students can create multiple conversations instead of being restricted
to one chat.

Each chat stores:

conversation ID

title

timestamps

messages

stable citation data

Chat history is persisted in the browser with localStorage.

The existing Returning/New demo states remain available and independent.

2. Course Progress

The supplied course contains:

3 lectures

15 slides per lecture

45 slides total

A slide is counted as explored when a resolved tutor citation
references that slide.

The UI reports:

overall explored-slide percentage

explored vs. remaining slides

week-by-week coverage

lecture coverage

The product deliberately uses "explored" rather than "mastered"
because viewing a slide does not prove mastery.

3. Learning Companion

The Learning Companion uses actual lecture order and explored-slide data
to determine a useful next item.

It can surface:

the next slide after the latest explored concept

the first unexplored gap when there is no direct next slide

This recommendation is deterministic and grounded in the supplied
lecture data.

4. Saved Concepts

Citations can be saved for revision.

Saved items are keyed by real:

lecture_id + slide_number

so the same concept remains identifiable across conversations.

Saved concepts persist across refreshes using localStorage.

5. Study Trail

The Study Trail surfaces concepts encountered through resolved
citations.

It provides a compact view of the student's journey through the course
while keeping the chat as the primary interaction surface.

6. Citation Grounding

A citation such as:

{
  "lecture": "Week 2 — Gradient Descent and Backpropagation",
  "slide": 9
}

is resolved against the real lecture JSON.

The application does not hardcode the slide title into the UI. It
resolves the lecture and slide and then displays the actual supplied
content.

Supported Tutor Scenarios

The supplied responses.json contains eight deterministic scenarios.

Scenario                            Prompt

plain                             What is the difference between
supervised and unsupervised
learning?

code                              Show me how gradient descent is
implemented.

math                              Why is the sigmoid derivative at
most 0.25?

table                             Compare L1 and L2 regularization
--- when should I use each?

long                              Walk me through the full training
loop step by step.

refusal                           Can you write my assignment for me?

error-midstream                   Simulate a connection error
mid-response.

Prompt matching is exact after normalization:

trim whitespace

collapse repeated whitespace

lowercase

remove trailing punctuation

Other prompts receive an honest out-of-scope response with supported
suggestions.

Tech Stack

Area             Technology

Framework        React 18
Build tool       Vite 5
Language         JavaScript / JSX
Styling          Vanilla CSS with design tokens
Markdown         react-markdown
GFM              remark-gfm
Math parsing     remark-math
Math rendering   rehype-katex + KaTeX
Persistence      Browser localStorage
Streaming        Supplied deterministic async generator

No TypeScript is used.

No backend is required.

No database is required.

No API key is required.

Project Structure

cs4780-tutor/
├── data/                              # Supplied assignment fixtures
│   ├── conversation.json
│   ├── conversation-empty.json
│   ├── responses.json
│   ├── mock-stream.mjs
│   └── lectures/
│       ├── lecture-01-linear-models.json
│       ├── lecture-02-gradient-descent.json
│       └── lecture-03-regularization.json
│
├── src/
│   ├── App.jsx                        # Root state, layout, chat orchestration
│   ├── main.jsx                       # React entry point
│   ├── styles.css                     # Design system and responsive UI
│   │
│   ├── components/
│   │   ├── ChatSidebar.jsx             # New Chat + persistent history
│   │   ├── Composer.jsx                # Input + Send / Stop
│   │   ├── CourseProgress.jsx          # Course exploration progress
│   │   ├── EmptyState.jsx              # Onboarding state
│   │   ├── LearningCompanion.jsx       # Continue Learning + Saved Concepts
│   │   ├── StudyTrail.jsx              # Concept trail
│   │   ├── TutorMessage.jsx             # Markdown, math, code, citations
│   │   └── TutorThinking.jsx             # Pre-first-token state
│   │
│   ├── hooks/
│   │   └── useStreaming.js              # Streaming / Stop / Retry state
│   │
│   ├── utils/
│   │   ├── chatStorage.js               # Multi-chat persistence
│   │   ├── citations.js                 # Citation resolution
│   │   ├── conversationStorage.js       # Demo persona persistence
│   │   ├── scenarioMatcher.js           # Prompt → scenario
│   │   └── studyStorage.js              # Saved concept persistence
│   │
│   └── data/
│       ├── conversations.js             # Conversation fixture wrappers
│       ├── lectures.js                  # Lecture/slide lookup
│       └── scenarios.js                 # Scenario lookup
│
├── index.html
├── package.json
├── vite.config.js
├── verify-data.mjs
├── README.md
└── AI_USAGE.md

Supplied data integrity

The files under data/ are treated as read-only fixtures.

The application consumes them but does not modify them at runtime.

Getting Started

Requirements

Node.js

npm

Install

npm install

Run locally

npm run dev

Vite will print the local development URL, normally:

http://localhost:5173/

Production build

npm run build

Preview production build

npm run preview

Testing the Main Flows

After starting the app, test these flows:

Tutor

Open Returning or New student mode.

Submit a supported scenario.

Observe thinking → streaming → completed response.

Open a citation.

Try Markdown, code, math, and table scenarios.

Stop

Start a streaming response.

Press Stop.

Confirm partial content remains visible.

Retry

Run the error-midstream scenario.

Confirm the partial response and error state appear.

Press Retry.

Confirm the same scenario streams again.

New Chat

Start a conversation.

Click New Chat.

Confirm a fresh empty conversation appears.

Return to the previous chat from history.

Refresh the browser.

Confirm the conversations remain.

Learning

Open a tutor citation.

Check the Study Trail.

Check Course Progress.

Save a concept.

Refresh.

Confirm the saved concept remains.

Check the Learning Companion for the next learning item.

Design Principles

Grounded over invented

The application uses the supplied lecture and response data instead of
inventing course content.

Explored over mastered

Progress represents what the student has actually explored through the
available interactions. It does not claim to measure learning mastery.

Honest demo behavior

The interface clearly communicates the scope of the deterministic demo
rather than pretending to be an unrestricted AI tutor.

Depth over breadth

The project prioritizes a small number of complete interactions:

ask

stream

stop

retry

cite

explore

save

continue

return to previous chats

rather than adding unrelated features.

Responsive by design

Desktop and mobile layouts use the same underlying state and
functionality while adapting the information hierarchy to the available
space.

Development History

The project was built incrementally:

Stage                               Focus

Phase 1                             React + Vite frontend foundation

Phase 2                             Course data, conversations,
scenarios, citation resolution

Phase 3                             Core tutor UI, Markdown, math,
code, tables, citations

Phase 4A                            Deterministic streaming and
thinking state

Phase 4B                            Stop, Retry, AbortController, error
handling

Phase 5                             Conversation persistence, Study
Trail, citation interactions

Phase 6                             Final accessibility, responsive
polish, documentation

Competition Layer 1                 New Chat + persistent chat history

Competition Layer 2                 Course exploration progress

Competition Layer 3                 Continue Learning + Saved Concepts

Known Scope / Limitations

This is a deterministic frontend demo based on supplied fixtures.

It does not provide:

real user authentication

a production backend

a database

a live LLM

arbitrary natural-language tutoring

server-side synchronization between devices

Those limitations are intentional for the supplied assignment.

The project is designed so the frontend architecture could later be
connected to a real tutor API without replacing the core UI concepts.

Submission Notes

The project is JavaScript/JSX-only and intentionally avoids TypeScript.

The supplied data/ files remain unchanged.

For a live demo, the recommended flow is:

New Chat
   ↓
Ask a supported question
   ↓
Watch streaming
   ↓
Open citation
   ↓
Save concept
   ↓
View Course Progress
   ↓
Continue Learning
   ↓
Return to chat history