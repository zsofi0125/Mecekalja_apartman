/**
 * iranypecs.hu – the tourism portal's events (Modern Events Calendar). The HTML list
 * loads further items by AJAX, but the plugin's public iCal feed carries all of them,
 * so the feed is parsed instead of the paginated page.
 */
import { fetchText } from '../http.mjs';
import { addDays, toBudapestDateTime } from '../dates.mjs';
import { cleanUrl } from '../text.mjs';

const FEED_URL = 'https://iranypecs.hu/?mec-ical-feed=1';
const MAX_OCCURRENCES = 400;
const WEEKDAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/** @typedef {import('../types.mjs').RawEvent} RawEvent */

/** Unfolds continuation lines and returns one property map per VEVENT. */
function parseCalendar(ics) {
    const lines = ics.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
    /** @type {Record<string, { params: string, value: string }>[]} */
    const events = [];
    let current = null;
    for (const line of lines) {
        if (line === 'BEGIN:VEVENT') current = {};
        else if (line === 'END:VEVENT') { if (current) events.push(current); current = null; }
        else if (current) {
            const match = /^([A-Z-]+)((?:;[^:]*)?):(.*)$/.exec(line);
            if (match) current[match[1]] = { params: match[2], value: match[3] };
        }
    }
    return events;
}

const unescapeText = value => value.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();

/** @returns {{ date: string, time: string|null }} */
function readDateTime(property) {
    const value = property.value;
    if (/VALUE=DATE(?!-)/.test(property.params) || /^\d{8}$/.test(value)) {
        return { date: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`, time: null };
    }
    const [, y, mo, d, h, mi] = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/.exec(value) || [];
    if (!y) return { date: '', time: null };
    if (value.endsWith('Z')) return toBudapestDateTime(new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi)));
    return { date: `${y}-${mo}-${d}`, time: `${h}:${mi}` };
}

/** Start dates of a daily/weekly RRULE within the window (other rules: first date only). */
function expandOccurrences(firstDate, rrule, window) {
    if (!rrule) return [firstDate];
    const rule = Object.fromEntries(rrule.split(';').map(part => part.split('=')));
    const until = rule.UNTIL ? `${rule.UNTIL.slice(0, 4)}-${rule.UNTIL.slice(4, 6)}-${rule.UNTIL.slice(6, 8)}` : window.lastDay;
    const lastDay = until < window.lastDay ? until : window.lastDay;
    const count = rule.COUNT ? Number(rule.COUNT) : Infinity;
    const interval = Number(rule.INTERVAL || 1);
    const byDay = rule.BYDAY ? rule.BYDAY.split(',').map(code => code.slice(-2)) : null;
    if (!['DAILY', 'WEEKLY'].includes(rule.FREQ)) return [firstDate];

    const dates = [];
    for (let date = firstDate, step = 0; date <= lastDay && dates.length < Math.min(count, MAX_OCCURRENCES); date = addDays(date, 1), step++) {
        const weekday = WEEKDAY_CODES[new Date(`${date}T12:00:00Z`).getUTCDay()];
        const inInterval = rule.FREQ === 'DAILY' ? step % interval === 0 : Math.floor(step / 7) % interval === 0;
        const onAllowedDay = byDay ? byDay.includes(weekday) : rule.FREQ === 'DAILY' || step % 7 === 0;
        if (inInterval && onAllowedDay) dates.push(date);
    }
    return dates;
}

/** @type {import('../types.mjs').EventSource} */
export const iranyPecsSource = {
    id: 'iranypecs',
    label: 'iranypecs.hu',
    homepage: 'https://iranypecs.hu/programok/',
    minEvents: 20,
    async scrape(window) {
        /** @type {RawEvent[]} */
        const events = [];
        for (const entry of parseCalendar(await fetchText(FEED_URL))) {
            if (!entry.SUMMARY || !entry.DTSTART) continue;
            const title = unescapeText(entry.SUMMARY.value);
            const url = cleanUrl(entry.URL?.value || '');
            const start = readDateTime(entry.DTSTART);
            if (!title || !url || !start.date) continue;

            const end = entry.DTEND ? readDateTime(entry.DTEND) : null;
            // An all-day DTEND is exclusive in iCal, a timed one is the actual last moment.
            const lastDay = end?.date ? (end.time === null ? addDays(end.date, -1) : end.date) : start.date;
            const common = {
                title, url,
                venue: entry.LOCATION ? unescapeText(entry.LOCATION.value) || null : null,
                categories: entry.CATEGORIES ? unescapeText(entry.CATEGORIES.value).split(',') : []
            };

            if (entry.RRULE) {
                for (const date of expandOccurrences(start.date, entry.RRULE.value, window)) {
                    events.push({ ...common, startDate: date, time: start.time });
                }
            } else {
                const isMultiDay = lastDay > start.date;
                events.push({ ...common, startDate: start.date, endDate: isMultiDay ? lastDay : null, time: isMultiDay ? null : start.time });
            }
        }
        return events;
    }
};
