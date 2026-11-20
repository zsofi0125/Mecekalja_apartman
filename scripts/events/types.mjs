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
 * @property {(window: EventWindow) => Promise<RawEvent[]>} scrape
 */
export {};
