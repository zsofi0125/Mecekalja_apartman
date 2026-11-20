/**
 * Pécsi Nemzeti Színház – monthly programme pages (/havi-musor/YYYY-MM),
 * followed via the "következő hónap" link until the window ends.
 */
import { load } from 'cheerio';
import { fetchText } from '../http.mjs';
import { normalizeTime } from '../dates.mjs';
import { cleanUrl } from '../text.mjs';

const START_URL = 'https://www.pnsz.hu/havi-musor';
const MAX_MONTHS = 6;

/** @type {import('../types.mjs').EventSource} */
export const pnszSource = {
    id: 'pnsz',
    label: 'pnsz.hu',
    homepage: START_URL,
    async scrape(window) {
        const events = [];
        let pageUrl = START_URL;
        for (let month = 0; month < MAX_MONTHS && pageUrl; month++) {
            const $ = load(await fetchText(pageUrl));
            $('article.eloadas').each((_, article) => {
                const item = $(article);
                const link = item.find('h2.cim a').first();
                const [date, time] = (item.find('time[datetime]').attr('datetime') || '').split(' ');
                const url = cleanUrl(link.attr('href') || '', pageUrl);
                const title = link.text().trim();
                if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !title || !url) return;
                events.push({
                    title,
                    url,
                    startDate: date,
                    time: normalizeTime(time),
                    venue: item.find('.helyszin').first().text().trim() || null
                });
            });
            const nextHref = $('#musor-next').attr('href');
            const nextMonth = nextHref?.match(/(\d{4}-\d{2})$/)?.[1];
            pageUrl = nextHref && nextMonth && `${nextMonth}-01` <= window.lastDay ? cleanUrl(nextHref, pageUrl) : null;
        }
        return events;
    }
};
