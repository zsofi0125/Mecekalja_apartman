/**
 * ==============================================================================
 * Mecsekalja Apartman · Programs & Events Data
 * ==============================================================================
 */

/** @typedef {'hu'|'en'|'de'} LanguageCode */
/** @typedef {'relax'|'active'|'culture'|'family'|'food'} ProgramCategory */
/** @typedef {Record<LanguageCode, string>} LocalizedText */

/**
 * A recurring program (has `months`) or a dated event (has `dates`).
 * @typedef {Object} Program
 * @property {number} distanceKm - Approximate distance from the apartment
 * @property {boolean} kidFriendly
 * @property {ProgramCategory} category
 * @property {LocalizedText} title
 * @property {number[]} [months] - Months (1-12) in which a recurring program is available
 * @property {string|string[]} [dates] - ISO date, 'start..end' range, or list of ISO dates
 * @property {string} [url]
 */

/**
 * Helper to generate integer ranges (inclusive)
 * @param {number} a - First value
 * @param {number} b - Last value
 * @returns {number[]}
 */
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/** All year (months 1-12) */
const ALL_YEAR_MONTHS = range(1, 12);

/**
 * External event listing and program portal links
 */
const PROGRAM_TURIZMUS_PECS_EVENTS_URL = 'https://www.programturizmus.hu/ajanlat-pecs-programok-esemenyek-rendezvenyek.html';
const PROGRAM_TURIZMUS_ZSOLNAY_URL = 'https://www.programturizmus.hu/ajanlat-zsolnay-negyed.html';
const PROGRAM_TURIZMUS_CONCERTS_URL = 'https://www.programturizmus.hu/ajanlat-pecsi-koncertek.html';
const PECSI_MAMI_URL = 'https://pecsimami.hu/aktualis-programok/';
const PECS_HU_PROGRAMS_URL = 'https://pecs.hu/programok/';

/**
 * Builds a dated event.
 * @param {Object} event
 * @param {string|string[]} event.dates - ISO date ('YYYY-MM-DD'), range ('YYYY-MM-DD..YYYY-MM-DD'), or array of dates
 * @param {number} event.distanceKm - Approximate distance in km from the apartment
 * @param {boolean} event.kidFriendly
 * @param {'relax'|'active'|'culture'|'family'|'food'} event.category
 * @param {{hu: string, en: string, de?: string}} event.title - German falls back to English
 * @param {string} [event.url] - Information URL, defaults to the general Pécs events listing
 * @returns {Program}
 */
const createEvent = ({ dates, distanceKm, kidFriendly, category, title, url }) => ({
    dates,
    distanceKm,
    kidFriendly,
    category,
    title: { ...title, de: title.de || title.en },
    url: url || PROGRAM_TURIZMUS_PECS_EVENTS_URL
});

/**
 * Tells whether an event takes place on the given ISO date key ('YYYY-MM-DD').
 * @param {Program} event
 * @param {string} isoDate
 * @returns {boolean}
 */
const eventOccursOn = (event, isoDate) => {
    const { dates } = event;
    if (typeof dates === 'string' && dates.includes('..')) {
        const [firstDay, lastDay] = dates.split('..');
        return isoDate >= firstDay && isoDate <= lastDay;
    }
    return Array.isArray(dates) ? dates.includes(isoDate) : dates === isoDate;
};

/**
 * Recurring programs are temporarily empty. The previous hardcoded list is kept in
 * src/data/events-archive.js (not deployed) until a real data source is connected.
 * @type {Program[]}
 */
const RECURRING_PROGRAMS = [];

/**
 * Dated events are temporarily empty (see above).
 * @type {Program[]}
 */
const DATED_EVENTS = [];
