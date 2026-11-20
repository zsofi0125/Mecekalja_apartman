/**
 * Shared JSDoc types for the event scraper (no runtime code).
 *
 * @typedef {Object} RawEvent - What a source adapter returns
 * @property {string} title
 * @property {string} startDate - 'YYYY-MM-DD', Budapest local date
 * @property {string|null} [endDate] - Last day of a multi-day event
 * @property {string|null} [time] - 'HH:MM' start time
 * @property {string|null} [venue]
 * @property {string} url - Link back to the original event page
 * @property {string[]} [categories] - Source-provided labels, used only for tagging
 * @property {{ lat: number, lng: number }|null} [coordinates]
 *
 * @typedef {RawEvent & { source: string, category: string, kidFriendly: boolean }} TaggedEvent
 *
 * @typedef {Object} EventWindow
 * @property {string} firstDay
 * @property {string} lastDay
 *
 * @typedef {Object} EventSource
 * @property {string} id - Stable key, used for the cache and tagging overrides
 * @property {string} label - Shown under the program list
 * @property {string} homepage - Linked from the label
 * @property {number} [minEvents] - Fewer events in the window than this counts as a failed scrape (0 = may legitimately be empty)
 * @property {(window: EventWindow) => Promise<RawEvent[]>} scrape
 *
 * @typedef {Object} SourceReport
 * @property {string} id
 * @property {string} label
 * @property {'ok'|'cached'|'failed'} status - cached: live scrape failed, last good data shown; failed: no usable data
 * @property {number|null} scraped - Events the live scrape returned (null if it threw)
 * @property {number} inWindow - Events from this source inside the date window
 * @property {number} minEvents
 * @property {string|null} reason - Why the live scrape counts as failed
 * @property {number|null} cacheAgeDays - Age of the cached data in use
 *
 * @typedef {Object} ScrapeReport
 * @property {string} generatedAt
 * @property {EventWindow} window
 * @property {number} totalEvents
 * @property {number|null} previousTotal
 * @property {number} mergedDuplicates
 * @property {SourceReport[]} sources
 * @property {'ok'|'alert'|'abort'} verdict
 * @property {string[]} problems
 * @property {string[]} notes
 */
export {};
