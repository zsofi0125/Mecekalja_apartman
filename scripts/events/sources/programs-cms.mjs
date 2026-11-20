/**
 * Adapter for the CMS shared by pecsiprogram.hu and zsolnaynegyed.hu. Their program
 * lists are filled by the same JSON endpoint (POST /programs_url) that the sites'
 * own pages call; each list section on the page has its own content id.
 */
import { load } from 'cheerio';
import { fetchJson, fetchText } from '../http.mjs';
import { normalizeTime } from '../dates.mjs';
import { cleanUrl, htmlToText } from '../text.mjs';

const PAGE_SIZE = 100;
const MAX_PAGES_PER_SECTION = 30;
const DATE_RANGE = /(\d{4})\.(\d{2})\.(\d{2})\.(?:\s*[\d:]+)?\s*[-–]\s*(\d{4})\.(\d{2})\.(\d{2})\./;

/** @typedef {import('../types.mjs').RawEvent} RawEvent */

/** @param {any} row @param {string} origin @returns {RawEvent|null} */
function toRawEvent(row, origin) {
    const title = htmlToText(row.name);
    const url = cleanUrl(row.url, origin);
    if (!title || !url) return null;

    const range = DATE_RANGE.exec(htmlToText(row.date_string));
    const isMultiDay = range && range.slice(1, 4).join('-') !== range.slice(4, 7).join('-');
    return {
        title,
        url,
        startDate: isMultiDay ? range.slice(1, 4).join('-') : row.current_day_iteration,
        endDate: isMultiDay ? range.slice(4, 7).join('-') : null,
        time: isMultiDay ? null : normalizeTime(row.time),
        venue: htmlToText(row.place || row.location) || null,
        categories: (row.tags || []).map(tag => tag.name)
    };
}

/**
 * @param {{ id: string, label: string, homepage: string, listPageUrl: string, minEvents: number }} config
 * @returns {import('../types.mjs').EventSource}
 */
export function createProgramsCmsSource({ id, label, homepage, listPageUrl, minEvents }) {
    const { origin } = new URL(listPageUrl);

    async function fetchSection(contentId, window) {
        /** @type {RawEvent[]} */
        const events = [];
        for (let page = 1; page <= MAX_PAGES_PER_SECTION; page++) {
            const body = new URLSearchParams({
                content_id: contentId, name: '', tags: '', lang: 'hu',
                date_start: window.firstDay, date_end: window.lastDay,
                program_page: String(page), programs_limit: String(PAGE_SIZE)
            });
            const data = await fetchJson(`${origin}/programs_url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: listPageUrl, 'X-Requested-With': 'XMLHttpRequest' },
                body
            });
            if (data.error?.length) throw new Error(`${origin}: ${data.error.join('; ')}`);
            const rows = Array.isArray(data.response) ? data.response : [];
            events.push(...rows.map(row => toRawEvent(row, origin)).filter(Boolean));
            if (rows.length < PAGE_SIZE) break;
        }
        return events;
    }

    return {
        id, label, homepage, minEvents,
        async scrape(window) {
            const $ = load(await fetchText(listPageUrl));
            const contentIds = [...new Set(
                $('section.programsSection[data-tab="list"][data-content-id]').map((_, section) => $(section).attr('data-content-id')).get()
            )];
            if (!contentIds.length) throw new Error(`No program list found on ${listPageUrl}`);

            const events = [];
            for (const contentId of contentIds) events.push(...await fetchSection(contentId, window));
            return events;
        }
    };
}
