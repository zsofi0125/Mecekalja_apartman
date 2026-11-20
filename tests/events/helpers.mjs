/**
 * Test helpers: fixture loading and a fake `fetch`, so adapters are tested offline
 * against saved real responses.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// No pauses or retry waits in tests (read lazily by scripts/events/http.mjs).
process.env.EVENTS_REQUEST_PAUSE_MS = '0';
process.env.EVENTS_RETRY_DELAY_MS = '0';

/** The window the saved samples were captured for. */
export const TEST_WINDOW = { firstDay: '2026-11-20', lastDay: '2027-02-18' };

/** @param {string} name */
export const fixture = name => readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), 'utf8');

/**
 * Replaces globalThis.fetch. `routes` maps an exact URL to a response description,
 * or to a function (url, init) => description for requests that depend on the body.
 * Unknown URLs fail the test with a clear message.
 * @param {Record<string, any>} routes
 * @returns {{ calls: { url: string, init: RequestInit|undefined }[], restore: () => void }}
 */
export function mockFetch(routes) {
    const originalFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (url, init) => {
        const key = String(url);
        calls.push({ url: key, init });
        if (!(key in routes)) throw new Error(`Unexpected request in test: ${key}`);
        const route = typeof routes[key] === 'function' ? routes[key](key, init) : routes[key];
        const { body = '', status = 200, headers = {} } = typeof route === 'string' ? { body: route } : route;
        return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers });
    };
    return { calls, restore: () => { globalThis.fetch = originalFetch; } };
}
