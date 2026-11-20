/**
 * Pure building blocks of the scrape run (no file or network access of their own besides
 * the sources they are given), so they can be unit-tested: windowing, distance filter,
 * per-source collection with cache fallback, cache format, and the browser output.
 */

/** @typedef {import('./types.mjs').RawEvent} RawEvent */
/** @typedef {import('./types.mjs').TaggedEvent} TaggedEvent */
/** @typedef {import('./types.mjs').EventWindow} EventWindow */
/** @typedef {import('./types.mjs').EventSource} EventSource */
/** @typedef {import('./types.mjs').SourceReport} SourceReport */
/** @typedef {Record<string, { fetchedAt: string, events: RawEvent[] }>} CachedSources */
/** @typedef {{ sources: CachedSources, lastRun: { total: number, at: string }|null }} EventsCache */

/** Centre of Pécs; touring performances further away than MAX_DISTANCE_KM are dropped. */
export const PECS_CENTRE = { lat: 46.0727, lng: 18.2323 };
export const MAX_DISTANCE_KM = 45;
const MS_PER_DAY = 864e5;

/** Reads the cache file's content; the first version stored the source map at the top level. */
export function normalizeCache(parsed) {
    const isObject = parsed && typeof parsed === 'object';
    if (isObject && parsed.sources && typeof parsed.sources === 'object') {
        return { sources: parsed.sources, lastRun: parsed.lastRun ?? null };
    }
    return { sources: isObject ? parsed : {}, lastRun: null };
}

export function distanceKm(from, to) {
    const toRadians = degrees => (degrees * Math.PI) / 180;
    const dLat = toRadians(to.lat - from.lat);
    const dLng = toRadians(to.lng - from.lng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(a));
}

/**
 * Drops events outside the window or far from Pécs, and clips multi-day events to the window
 * (so a long exhibition starts "today" and matches the same exhibition from another source).
 * @param {RawEvent} event
 * @param {EventWindow} window
 * @returns {RawEvent|null}
 */
export function fitToWindow(event, window) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(event.startDate)) return null;
    if (event.coordinates && distanceKm(PECS_CENTRE, event.coordinates) > MAX_DISTANCE_KM) return null;
    const lastDay = event.endDate && event.endDate > event.startDate ? event.endDate : event.startDate;
    if (lastDay < window.firstDay || event.startDate > window.lastDay) return null;

    const startDate = event.startDate < window.firstDay ? window.firstDay : event.startDate;
    const endDate = lastDay > window.lastDay ? window.lastDay : lastDay;
    return { ...event, startDate, endDate: endDate > startDate ? endDate : null };
}

/** @param {string|undefined} fetchedAt @param {Date} now */
export const cacheAgeInDays = (fetchedAt, now) => {
    const fetchedTime = fetchedAt ? new Date(fetchedAt).getTime() : NaN;
    return Number.isNaN(fetchedTime) ? null : Math.max(0, (now.getTime() - fetchedTime) / MS_PER_DAY);
};

/**
 * Scrapes one source. The live result counts as failed when the scrape throws, returns fewer
 * events than the source's `minEvents`, or returns nothing although the previous run had events
 * in today's window (a silent markup change). A failed source falls back to its last good
 * result; a good result replaces the cached one.
 * @param {EventSource} source
 * @param {EventWindow} window
 * @param {CachedSources} cachedSources - Updated in place on success
 * @param {Date} [now]
 * @returns {Promise<{ events: RawEvent[], report: SourceReport }>}
 */
export async function collectSource(source, window, cachedSources, now = new Date()) {
    const cached = cachedSources[source.id];
    const cachedEvents = cached?.events ?? [];
    const cachedInWindow = cachedEvents.filter(event => fitToWindow(event, window));
    const minEvents = source.minEvents ?? 0;

    /** @type {RawEvent[]|null} */
    let liveEvents = null;
    let error = null;
    try {
        liveEvents = await source.scrape(window);
    } catch (caught) {
        error = caught instanceof Error ? caught.message : String(caught);
    }
    const liveInWindow = (liveEvents ?? []).filter(event => fitToWindow(event, window));

    let reason = null;
    if (error) reason = `Scrape error: ${error}`;
    else if (liveInWindow.length < minEvents) reason = `Only ${liveInWindow.length} events found, expected at least ${minEvents}`;
    else if (!liveInWindow.length && cachedInWindow.length) reason = `No events found, but the previous run had ${cachedInWindow.length}`;

    const base = { id: source.id, label: source.label, scraped: liveEvents ? liveEvents.length : null, minEvents, reason };
    if (!reason && liveEvents) {
        cachedSources[source.id] = { fetchedAt: now.toISOString(), events: liveEvents };
        return { events: liveEvents, report: { ...base, status: 'ok', inWindow: liveInWindow.length, cacheAgeDays: null } };
    }

    const useCache = cachedInWindow.length > liveInWindow.length;
    return {
        events: useCache ? cachedEvents : (liveEvents ?? []),
        report: {
            ...base,
            status: useCache ? 'cached' : 'failed',
            inWindow: useCache ? cachedInWindow.length : liveInWindow.length,
            cacheAgeDays: useCache ? cacheAgeInDays(cached?.fetchedAt, now) : null
        }
    };
}

/** Shape stored in events-data.js and read by app.js. @param {TaggedEvent} event */
export function toBrowserProgram(event) {
    return {
        dates: event.endDate ? `${event.startDate}..${event.endDate}` : event.startDate,
        ...(event.time ? { time: event.time } : {}),
        ...(event.venue ? { venue: event.venue } : {}),
        category: event.category,
        kidFriendly: event.kidFriendly,
        title: { hu: event.title },
        url: event.url,
        source: event.source
    };
}

/** Chronological order, then by time (events without a time last), then by title. @param {TaggedEvent[]} events */
export const sortChronologically = events =>
    [...events].sort(
        (a, b) =>
            a.startDate.localeCompare(b.startDate) ||
            (a.time || '99').localeCompare(b.time || '99') ||
            a.title.localeCompare(b.title, 'hu')
    );

export function renderEventsDataFile(programs, activeSources, updatedOn) {
    const lines = programs.map(program => `    ${JSON.stringify(program)}`).join(',\n');
    return `/**
 * GENERATED by scripts/events/index.mjs (npm run scrape) – do not edit by hand.
 * Upcoming events scraped from the sources listed in EVENTS_FEED.
 */

/** @type {Program[]} */
const SCRAPED_EVENTS = [
${lines}
];

/** @type {EventsFeed} */
const EVENTS_FEED = ${JSON.stringify({ updatedOn, sources: activeSources }, null, 4)};
`;
}
