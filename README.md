# CS 4780 Course Tutor

A frontend take-home assignment for a **Frontend Engineer Intern** position.

The project implements a chat surface that **teaches** — not a generic AI chatbot.
Every tutor answer is grounded in the actual supplied lecture slides, with citations
linking back to the exact week and slide number.

Course: **CS 4780 — Machine Learning for Engineers**
Instructor: **Dr. Elena Márquez**

---

## Features

| Feature | Description |
|---|---|
| **Returning / New student personas** | Two independent demo modes: a returning student with existing history and a new student with an empty conversation |
| **Persistent conversations** | Each persona's conversation is saved to `localStorage` and restored on refresh |
| **Independent persona switching** | Switching Returning ↔ New preserves both conversations separately |
| **Mock streaming tutor** | Responses stream progressively using a deterministic mock stream — no API key required |
| **Thinking indicator** | Three pulsing dots appear before the first token arrives |
| **Streaming cursor** | A blinking block cursor tracks the live end of the streaming response |
| **Stop generation** | An amber Stop button aborts the active stream cleanly; partial text is preserved |
| **Retry after error** | Mid-stream failures display the partial response plus a Retry button that re-streams the same answer |
| **Markdown rendering** | Full GFM Markdown including **bold**, *italic*, headings, lists, and links |
| **Code blocks** | Syntax-highlighted fenced code blocks with internal horizontal scroll |
| **GFM tables** | Full table support with internal horizontal scroll on narrow viewports |
| **Math / KaTeX** | Block and inline LaTeX math rendered via KaTeX (`$...$` and `$$...$$`) |
| **Lecture citations** | Citation chips below each completed answer — resolved against real lecture JSON |
| **Citation popovers** | Clicking a citation opens a popover showing the lecture, slide title, bullets, and formula |
| **Study Trail** | A deterministic list of concepts encountered so far, derived from resolved citations |
| **Empty / onboarding state** | Personalized welcome screen with example prompts drawn from real scenario data |
| **Unsupported question handling** | Unmatched prompts receive an honest "demo is scoped to these scenarios" reply with clickable suggestions |
| **Responsive UI** | Optimised for 390 px mobile through 1440 px+ desktop |
| **Keyboard accessible** | All interactive elements have visible focus rings and correct ARIA labels |

---

## Tech Stack

| Layer | Library / Technology |
|---|---|
| Framework | [React 18](https://react.dev/) |
| Build tool | [Vite 5](https://vitejs.dev/) |
| Language | JavaScript / JSX (no TypeScript) |
| Markdown | [react-markdown](https://github.com/remarkjs/react-markdown) |
| GFM tables | [remark-gfm](https://github.com/remarkjs/remark-gfm) |
| Math parsing | [remark-math](https://github.com/remarkjs/remark-math) |
| Math rendering | [rehype-katex](https://github.com/remarkjs/rehype-katex) + [KaTeX](https://katex.org/) |
| Fonts | [Inter](https://fonts.google.com/specimen/Inter) (Google Fonts) |
| Persistence | Browser `localStorage` |
| Styling | Vanilla CSS (design token–based dark theme) |

---

## Project Structure

```
cs4780-tutor/
├── data/                          # Supplied fixture files — DO NOT MODIFY
│   ├── conversation.json          # Returning student's existing conversation
│   ├── conversation-empty.json    # New student (empty conversation)
│   ├── responses.json             # Eight canned tutor responses
│   ├── mock-stream.mjs            # Deterministic async generator for streaming
│   └── lectures/
│       ├── lecture-01-linear-models.json
│       ├── lecture-02-gradient-descent.json
│       └── lecture-03-regularization.json
│
└── src/
    ├── App.jsx                    # Root component, persona switching, layout
    ├── main.jsx                   # React entry point
    ├── styles.css                 # Single stylesheet, token-based dark theme
    │
    ├── components/
    │   ├── Composer.jsx           # Message input, Send / Stop button
    │   ├── EmptyState.jsx         # Onboarding / welcome screen
    │   ├── StudyTrail.jsx         # Desktop panel + mobile strip for concepts
    │   ├── TutorMessage.jsx       # Assistant turn: Markdown, citations, popovers
    │   └── TutorThinking.jsx      # Animated thinking dots (pre-first-token)
    │
    ├── hooks/
    │   └── useStreaming.js        # All streaming state: submit, retry, stop
    │
    ├── utils/
    │   ├── citations.js           # Resolves citation objects → lecture + slide data
    │   ├── conversationStorage.js # localStorage save / load with sanitization
    │   └── scenarioMatcher.js     # Matches submitted text to a scenario ID
    │
    └── data/                      # JavaScript wrappers around fixture imports
        ├── conversations.js       # Exports activeConversation / emptyConversation
        ├── lectures.js            # Exports allLectures, getLectureById, getSlide
        └── scenarios.js           # Exports allScenarios, getScenarioById
```

> **`data/` is read-only.** The five supplied JSON files and the mock stream module
> are consumed as fixtures and are never modified at runtime or by the build.

---

## Running the Project

```bash
npm install

npm run dev
```

The dev server starts at `http://localhost:5173` (default Vite port).

---

## Production Build

```bash
npm run build
```

Outputs to `dist/`. There is one known advisory (not an error): the KaTeX fonts
cause the JS bundle to exceed Vite's default 500 kB chunk-size warning threshold.
This does not affect correctness or runtime performance.

---

## Demo Behavior

The tutor uses **eight deterministic, canned scenarios** defined in
`data/responses.json` and replayed via `data/mock-stream.mjs`.

There is **no real AI model, no API key, no backend, and no network request**.
Every streaming response is a pre-written answer tokenized locally in the browser.

### Supported scenarios (type these exactly to trigger them)

| Scenario | Prompt |
|---|---|
| `plain` | What is the difference between supervised and unsupervised learning? |
| `code` | Show me how gradient descent is implemented. |
| `math` | Why is the sigmoid derivative at most 0.25? |
| `table` | Compare L1 and L2 regularization — when should I use each? |
| `long` | Walk me through the full training loop step by step. |
| `refusal` | Can you write my assignment for me? |
| `error-midstream` | Simulate a connection error mid-response. |
| `slow` | Explain why overfitting happens in very deep networks. |

Prompts are matched by exact normalized text (trimmed, lowercased, whitespace-collapsed).
Any other input receives the "out of demo scope" message with clickable suggestions.

---

## Phases

The project was built incrementally over six phases:

| Phase | Description |
|---|---|
| 1 | Frontend foundation (Vite + React + design system) |
| 2 | Data layer (conversations, lectures, scenarios) |
| 3 | Core tutor experience (Markdown, math, tables, citation chips) |
| 4A | Mock streaming (async generator, thinking dots, streaming cursor) |
| 4B | Stream control (Stop, Retry, mid-stream error, AbortController) |
| 5 | Conversation persistence, independent personas, Study Trail, citation popovers |
| 6 | Final polish, accessibility, responsive QA, README |