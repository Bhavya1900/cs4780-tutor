/**
 * A stand-in for the tutor's streaming endpoint.
 *
 * There is no model behind this and you need no API key. It replays canned responses from
 * responses.json chunk by chunk, with realistic timing, so that what you build against
 * behaves like the real thing: tokens arrive gradually, the first one is slower than the
 * rest, and sometimes a response dies halfway through.
 *
 * Every run is identical, which means a bug you can reproduce is a bug we can reproduce.
 *
 * ── Usage ───────────────────────────────────────────────────────────────────
 *
 *   import { streamResponse, listScenarios } from './mock-stream.mjs'
 *
 *   for await (const chunk of streamResponse('code')) {
 *     setText(prev => prev + chunk)          // chunk is a string
 *   }
 *
 * It throws partway through the 'error-midstream' scenario. That is deliberate — decide
 * what your UI should do with a half-written message, because the real endpoint does this
 * too.
 *
 * ── Cancellation ────────────────────────────────────────────────────────────
 *
 *   const controller = new AbortController()
 *   for await (const chunk of streamResponse('long', { signal: controller.signal })) { … }
 *   controller.abort()                       // user pressed Stop
 *
 * Aborting ends the iteration cleanly rather than throwing.
 */

import responses from './responses.json' with { type: 'json' }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Scenario ids you can stream, with the prompt each one answers. */
export function listScenarios() {
    return responses.scenarios.map(({ id, prompt }) => ({ id, prompt }))
}

/** The full record for a scenario — text, citations, timings. */
export function getScenario(id) {
    const s = responses.scenarios.find((x) => x.id === id)
    if (!s) throw new Error(`Unknown scenario "${id}". Try: ${responses.scenarios.map((x) => x.id).join(', ')}`)
    return s
}

/**
 * Split text the way a model actually emits it: small pieces that do not respect
 * word, line, or markdown-syntax boundaries. A chunk can end in the middle of a
 * word, or between the two backticks of a fence.
 */
function chunkify(text) {
    const chunks = []
    let i = 0
    // Deterministic pseudo-random sizes: same input always splits the same way.
    let seed = 1337
    const next = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)

    while (i < text.length) {
        const size = 2 + Math.floor(next() * 6)   // 2–7 characters
        chunks.push(text.slice(i, i + size))
        i += size
    }
    return chunks
}

/**
 * Stream one scenario. Yields string chunks.
 *
 * @param {string} id                      scenario id from listScenarios()
 * @param {object} [opts]
 * @param {AbortSignal} [opts.signal]      abort to stop early
 * @param {number} [opts.speed]            multiplier on all delays; 0 streams instantly
 */
export async function* streamResponse(id, opts = {}) {
    const { signal, speed = 1 } = opts
    const scenario = getScenario(id)
    const chunks = chunkify(scenario.text)

    await sleep(scenario.first_token_delay_ms * speed)
    if (signal?.aborted) return

    // fails_before_first_token: nothing is ever yielded. Distinct from failing partway,
    // because there is no half-written message to decide what to do with.
    if (scenario.error && scenario.fails_before_first_token) {
        throw new Error(scenario.error)
    }

    for (const chunk of chunks) {
        if (signal?.aborted) return
        yield chunk
        await sleep(scenario.chunk_delay_ms * speed)
    }

    // A scenario carrying an `error` holds deliberately truncated text: it streams
    // everything it has and then dies, which is what a dropped connection looks like.
    // Throwing here rather than on a timer keeps it deterministic regardless of `speed`.
    if (scenario.error) {
        throw new Error(scenario.error)
    }
}