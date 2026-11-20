/**
 * pecs.hu – the city portal. Its program page is rendered by JavaScript, so events are
 * read from the site's public WordPress REST API (custom post type "event", ACF fields).
 */
import { fetchJson, fetchJsonWithHeaders } from '../http.mjs';
import { normalizeTime } from '../dates.mjs';
import { cleanUrl, htmlToText } from '../text.mjs';

const API = 'https://pecs.hu/wp-json/wp/v2';
const PAGE_SIZE = 100;
const MAX_PAGES = 20;

/** @typedef {import('../types.mjs').RawEvent} RawEvent */

async function fetchCategoryNames() {
    const categories = await fetchJson(`${API}/program_category?per_page=100&_fields=id,name`);
    return new Map(categories.map(category => [category.id, htmlToText(category.name)]));
}

/** @param {any} post @param {Map<number, string>} categoryNames @returns {RawEvent|null} */
function toRawEvent(post, categoryNames) {
    const details = (post.acf?.meta_data || []).find(block => block.acf_fc_layout === 'event');
    const title = htmlToText(post.title?.rendered);
    const url = cleanUrl(post.link);
    if (!details?.start_date || !title || !url) return null;

    const endDate = details.end_date && details.end_date !== details.start_date ? details.end_date : null;
    const place = details.event_gmap || {};
    return {
        title,
        url,
        startDate: details.start_date,
        endDate,
        time: endDate ? null : normalizeTime(details.start_time),
        venue: htmlToText(place.name || details.location) || null,
        categories: (post.program_category || []).map(id => categoryNames.get(id)).filter(Boolean),
        coordinates: typeof place.lat === 'number' ? { lat: place.lat, lng: place.lng } : null
    };
}

/** @type {import('../types.mjs').EventSource} */
export const pecsHuSource = {
    id: 'pecs-hu',
    label: 'pecs.hu',
    homepage: 'https://pecs.hu/programok/',
    minEvents: 20,
    async scrape() {
        const categoryNames = await fetchCategoryNames();
        const events = [];
        for (let page = 1; page <= MAX_PAGES; page++) {
            const { body, headers } = await fetchJsonWithHeaders(
                `${API}/event?per_page=${PAGE_SIZE}&page=${page}&_fields=title,link,program_category,acf`
            );
            events.push(...body.map(post => toRawEvent(post, categoryNames)).filter(Boolean));
            if (page >= Number(headers.get('x-wp-totalpages') || 1)) break;
        }
        return events;
    }
};
