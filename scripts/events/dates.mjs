/**
 * Date helpers. All calendar dates are ISO 'YYYY-MM-DD' strings in Hungarian local time,
 * because the visitors' calendar shows Pécs events by their local date.
 */
export const EVENTS_TIME_ZONE = 'Europe/Budapest';
export const LOOKAHEAD_DAYS = 90;

const budapestParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENTS_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});

/**
 * Converts an absolute instant to Budapest local date and time.
 * @param {Date} instant
 * @returns {{ date: string, time: string }}
 */
export function toBudapestDateTime(instant) {
    const parts = Object.fromEntries(budapestParts.formatToParts(instant).map(part => [part.type, part.value]));
    return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

/** @param {string} isoDate @param {number} days */
export function addDays(isoDate, days) {
    const date = new Date(`${isoDate}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

/** The visible window: today (Budapest) up to LOOKAHEAD_DAYS ahead. */
export function getEventWindow(now = new Date()) {
    const firstDay = toBudapestDateTime(now).date;
    return { firstDay, lastDay: addDays(firstDay, LOOKAHEAD_DAYS) };
}

/** @param {number} year @param {number} month @param {number} day */
export function toIsoDate(year, month, day) {
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const check = new Date(`${iso}T12:00:00Z`);
    return check.getUTCMonth() + 1 === month && check.getUTCDate() === day ? iso : null;
}

/** 'HH:MM' from strings such as '19:00:00', '19.00' or '9:00'; null if there is no time. */
export function normalizeTime(text) {
    const match = /(\d{1,2})[:.](\d{2})/.exec(text || '');
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59 || (hours === 0 && minutes === 0)) return null;
    return `${String(hours).padStart(2, '0')}:${match[2]}`;
}

const HUNGARIAN_MONTH_PREFIXES = ['jan', 'feb', 'már', 'ápr', 'máj', 'jún', 'júl', 'aug', 'sze', 'okt', 'nov', 'dec'];

/** Month number (1-12) from a Hungarian month name or abbreviation, e.g. 'November', 'dec.'. */
export function parseHungarianMonth(name) {
    const index = HUNGARIAN_MONTH_PREFIXES.indexOf(name.toLowerCase().slice(0, 3));
    return index === -1 ? null : index + 1;
}
