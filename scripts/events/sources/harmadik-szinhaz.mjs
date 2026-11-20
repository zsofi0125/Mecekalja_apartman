/**
 * Pécsi Harmadik Színház – a Wix site. The event list is embedded in the page's
 * "wix-warmup-data" JSON, which is read instead of the rendered markup. The company
 * also tours, so guest performances far from Pécs are dropped later by distance.
 */
import { fetchText } from '../http.mjs';
import { toBudapestDateTime } from '../dates.mjs';
import { cleanUrl } from '../text.mjs';

const PAGE_URL = 'https://www.pecsiharmadikszinhaz.hu/musornaptar';
const EVENT_PAGE_BASE = 'https://www.pecsiharmadikszinhaz.hu/event-details/';
const WARMUP_DATA = /<script type="application\/json" id="wix-warmup-data">([\s\S]*?)<\/script>/;

/** Collects every object that looks like a Wix event (id + title + scheduling + location). */
function findWixEvents(node, found = []) {
    if (Array.isArray(node)) node.forEach(child => findWixEvents(child, found));
    else if (node && typeof node === 'object') {
        if (node.id && node.title && node.scheduling?.config && node.location) found.push(node);
        else Object.values(node).forEach(child => findWixEvents(child, found));
    }
    return found;
}

/** @type {import('../types.mjs').EventSource} */
export const harmadikSzinhazSource = {
    id: 'harmadik-szinhaz',
    label: 'pecsiharmadikszinhaz.hu',
    homepage: PAGE_URL,
    async scrape() {
        const match = WARMUP_DATA.exec(await fetchText(PAGE_URL));
        if (!match) throw new Error('Wix warmup data not found');

        const byId = new Map(findWixEvents(JSON.parse(match[1])).map(event => [event.id, event]));
        return [...byId.values()].flatMap(event => {
            const startInstant = event.scheduling.config.startDate;
            const url = cleanUrl(event.slug ? EVENT_PAGE_BASE + encodeURIComponent(event.slug) : '');
            if (!startInstant || !url) return [];
            const { date, time } = toBudapestDateTime(new Date(startInstant));
            const { lat, lng } = event.location.coordinates || {};
            return [{
                title: String(event.title).trim(),
                url,
                startDate: date,
                time,
                venue: event.location.name || null,
                coordinates: typeof lat === 'number' ? { lat, lng } : null
            }];
        });
    }
};
