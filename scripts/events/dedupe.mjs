/**
 * Merges identical events across (and within) sources: same normalized title on the
 * same start date is one program. Different start times are kept as a time list.
 */
import { normalizeForMatching } from './text.mjs';

/** @typedef {import('./types.mjs').TaggedEvent} TaggedEvent */

/** @param {TaggedEvent} event */
const dedupeKey = event => `${normalizeForMatching(event.title)}|${event.startDate}`;

/** @param {(string|null|undefined)[]} times */
const mergeTimes = times => [...new Set(times.filter(Boolean).flatMap(time => String(time).split(', ')))].sort().join(', ') || null;

/**
 * Events earlier in the list win (sources are processed in priority order);
 * later duplicates only contribute missing details and extra start times.
 * @param {TaggedEvent[]} events
 * @returns {TaggedEvent[]}
 */
export function dedupeEvents(events) {
    /** @type {Map<string, TaggedEvent>} */
    const byKey = new Map();
    for (const event of events) {
        const key = dedupeKey(event);
        const existing = byKey.get(key);
        if (!existing) {
            byKey.set(key, { ...event });
            continue;
        }
        existing.time = mergeTimes([existing.time, event.time]);
        existing.venue ||= event.venue;
        existing.endDate = [existing.endDate, event.endDate].filter(Boolean).sort().pop() || null;
    }
    return [...byKey.values()];
}
