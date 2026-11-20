/**
 * Polite HTTP helpers for the build-time event scraper: identifying User-Agent,
 * request timeout, one retry, and a short pause between requests to the same site.
 */
import { SITE_URL } from '../site.config.mjs';

const USER_AGENT = `MecsekaljaApartmanEventsBot/1.0 (+${SITE_URL})`;
const REQUEST_TIMEOUT_MS = 25_000;
const PAUSE_BETWEEN_REQUESTS_MS = 400;
const RETRY_DELAY_MS = 1_500;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * @param {string} url
 * @param {RequestInit} [init]
 * @returns {Promise<Response>}
 */
async function request(url, init = {}) {
    const headers = { 'User-Agent': USER_AGENT, 'Accept-Language': 'hu-HU,hu;q=0.9', ...init.headers };
    for (let attempt = 1; ; attempt++) {
        try {
            const response = await fetch(url, { ...init, headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
            if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
            await sleep(PAUSE_BETWEEN_REQUESTS_MS);
            return response;
        } catch (error) {
            if (attempt >= 2) throw error;
            await sleep(RETRY_DELAY_MS);
        }
    }
}

/** @param {string} url @param {RequestInit} [init] */
export const fetchText = async (url, init) => (await request(url, init)).text();

/** @param {string} url @param {RequestInit} [init] */
export const fetchJson = async (url, init) => (await request(url, init)).json();

/**
 * Fetches JSON and also returns the response headers (WordPress puts paging info there).
 * @param {string} url
 */
export async function fetchJsonWithHeaders(url) {
    const response = await request(url);
    return { body: await response.json(), headers: response.headers };
}
