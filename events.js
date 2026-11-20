/**
 * ==============================================================================
 * Mecsekalja Apartman · Programs & Events Data
 * Events are scraped at build time into events-data.js (see scripts/events/).
 * The previous hand-written list is archived in src/data/events-archive.js.
 * ==============================================================================
 */

/** @typedef {'hu'|'en'|'de'} LanguageCode */
/** @typedef {'relax'|'active'|'culture'|'family'|'food'} ProgramCategory */

/**
 * A recurring program (has `months`) or a dated event (has `dates`).
 * Scraped events carry only their original (Hungarian) title.
 * @typedef {Object} Program
 * @property {ProgramCategory} category
 * @property {boolean} kidFriendly
 * @property {Partial<Record<LanguageCode, string>>} title
 * @property {number[]} [months] - Months (1-12) in which a recurring program is available
 * @property {string|string[]} [dates] - ISO date, 'start..end' range, or list of ISO dates
 * @property {string} [time] - Start time(s), e.g. '19:00' or '10:00, 15:00'
 * @property {string} [venue]
 * @property {number} [distanceKm] - Approximate distance from the apartment
 * @property {string} [url] - Original event page
 * @property {string} [source] - Source id from scripts/events/sources
 */

/**
 * @typedef {Object} EventsFeed
 * @property {string} updatedOn - ISO date of the last scrape
 * @property {{ label: string, url: string }[]} sources - Sources that delivered events
 */

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

/** No hand-written recurring programs for now; all programs come from the scraped sources. */
/** @type {Program[]} */
const RECURRING_PROGRAMS = [];

/** Scraped events; empty (not broken) if events-data.js failed to load. */
/** @type {Program[]} */
const DATED_EVENTS = typeof SCRAPED_EVENTS === 'undefined' ? [] : SCRAPED_EVENTS;

/** @type {EventsFeed} */
const EVENTS_SOURCE_INFO = typeof EVENTS_FEED === 'undefined' ? { updatedOn: '', sources: [] } : EVENTS_FEED;
