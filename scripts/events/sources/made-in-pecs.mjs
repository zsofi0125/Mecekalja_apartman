/**
 * Made in Pécs (Pécsi Est) ticket shop on MyTix. The shop is a JavaScript app; its
 * program list is the public JSON file the app itself loads.
 */
import { fetchJson } from '../http.mjs';
import { normalizeTime } from '../dates.mjs';
import { cleanUrl } from '../text.mjs';

const PROGRAMS_JSON = 'https://admin.madeinpecs.mytix.hu/storage/programs.json';
const SHOP_URL = 'https://madeinpecs.mytix.hu/';

/** @type {import('../types.mjs').EventSource} */
export const madeInPecsSource = {
    id: 'made-in-pecs',
    label: 'madeinpecs.mytix.hu',
    homepage: SHOP_URL,
    async scrape() {
        const programs = await fetchJson(PROGRAMS_JSON);
        return (Array.isArray(programs) ? programs : []).flatMap(program => {
            const [, year, month, day] = /^(\d{4})\.(\d{2})\.(\d{2})/.exec(program.date || '') || [];
            const url = cleanUrl(program.url ? `events/${encodeURIComponent(program.url)}` : '', SHOP_URL);
            if (!year || !program.name || !url) return [];
            return [{
                title: String(program.name).trim(),
                url,
                startDate: `${year}-${month}-${day}`,
                time: normalizeTime(program.gate_open),
                venue: program.location || null
            }];
        });
    }
};
