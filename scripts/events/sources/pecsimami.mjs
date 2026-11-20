/**
 * pecsimami.hu – family programme list. Dates are free text in the teaser
 * ("Időpont: 2026. November 20-22. (péntek-vasárnap) 10:00 / Helyszín: …"),
 * so parsing is tolerant of the typos and variants seen on the site.
 */
import { load } from 'cheerio';
import { fetchText } from '../http.mjs';
import { addDays, normalizeTime, parseHungarianMonth, toIsoDate } from '../dates.mjs';
import { cleanUrl, htmlToText } from '../text.mjs';

const START_URL = 'https://pecsimami.hu/helyi-programok/aktualis-programok';
const MAX_PAGES = 30;
/** A listed "current" program dated this far in the past has a mistyped year (e.g. 2026 for 2027). */
const YEAR_TYPO_TOLERANCE_DAYS = 31;

const LETTERS = 'A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű';
const DATE_PATTERN = new RegExp(
    `(\\d{4})\\.?\\s*([${LETTERS}]+)\\.?\\s*(\\d{1,2})\\.?` + // 2026. November 20.
    `(?:\\s*[-–]\\s*(?:([${LETTERS}]+)\\.?\\s*)?(\\d{1,2})\\b)?` // optional "-22." or "- December 2."
);

/** @typedef {import('../types.mjs').RawEvent} RawEvent */

/** Splits the teaser into "label: value" lines. */
function readTeaserFields(teaserHtml) {
    const lines = teaserHtml.split(/<br\s*\/?>|<\/p>/i).map(htmlToText).filter(Boolean);
    const field = labelPattern => lines.find(line => labelPattern.test(line))?.replace(labelPattern, '').trim() || '';
    return { when: field(/^I+d+őpont:\s*/i), where: field(/^Helyszín:\s*/i) };
}

/**
 * @param {string} text
 * @param {string} today
 * @returns {{ startDate: string, endDate: string|null, time: string|null }|null}
 */
export function parseHungarianDateText(text, today) {
    const match = DATE_PATTERN.exec(text);
    if (!match) return null;
    const [, yearText, monthName, dayText, endMonthName, endDayText] = match;
    const month = parseHungarianMonth(monthName);
    if (!month) return null;

    let year = Number(yearText);
    let startDate = toIsoDate(year, month, Number(dayText));
    if (startDate && startDate < addDays(today, -YEAR_TYPO_TOLERANCE_DAYS)) {
        year += 1;
        startDate = toIsoDate(year, month, Number(dayText));
    }
    if (!startDate) return null;

    let endDate = null;
    if (endDayText) {
        const endMonth = endMonthName ? parseHungarianMonth(endMonthName) : month;
        const endYear = endMonth && endMonth < month ? year + 1 : year;
        endDate = endMonth ? toIsoDate(endYear, endMonth, Number(endDayText)) : null;
        if (endDate && endDate <= startDate) endDate = null;
    }
    return { startDate, endDate, time: normalizeTime(text.slice(match.index + match[0].length)) };
}

/** @type {import('../types.mjs').EventSource} */
export const pecsimamiSource = {
    id: 'pecsimami',
    label: 'pecsimami.hu',
    homepage: START_URL,
    minEvents: 30,
    async scrape(window) {
        /** @type {RawEvent[]} */
        const events = [];
        let pageUrl = START_URL;
        for (let page = 0; page < MAX_PAGES && pageUrl; page++) {
            const $ = load(await fetchText(pageUrl));
            let reachedWindowEnd = false;
            $('.view-content .views-row').each((_, row) => {
                const link = $(row).find('.views-row-title a').first();
                const title = link.text().trim();
                const url = cleanUrl(link.attr('href') || '', pageUrl);
                const { when, where } = readTeaserFields($(row).find('.views-row-teaser').html() || '');
                const date = parseHungarianDateText(when, window.firstDay);
                if (!title || !url || !date) return;
                if (date.startDate > window.lastDay) reachedWindowEnd = true;
                events.push({ title, url, ...date, venue: where || null });
            });
            const nextHref = $('.pager-next a').attr('href');
            pageUrl = !reachedWindowEnd && nextHref ? cleanUrl(nextHref, pageUrl) : null;
        }
        return events;
    }
};
