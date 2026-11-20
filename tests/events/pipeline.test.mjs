import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectSource, fitToWindow, normalizeCache, toBrowserProgram } from '../../scripts/events/pipeline.mjs';
import { TEST_WINDOW } from './helpers.mjs';

const NOW = new Date('2026-11-20T04:15:00Z');
const event = (startDate, overrides = {}) => ({ title: `Event ${startDate}`, startDate, url: 'https://example.hu/e', ...overrides });
const sourceOf = (scrape, minEvents = 0) => ({ id: 'demo', label: 'demo.hu', homepage: 'https://demo.hu', minEvents, scrape });
const days = n => Array.from({ length: n }, (_, index) => event(`2026-12-${String(index + 1).padStart(2, '0')}`));
const cacheWith = (events, fetchedAt = '2026-11-19T04:15:00.000Z') => ({ demo: { fetchedAt, events } });

test('fitToWindow keeps events inside the window and drops the rest', () => {
    assert.ok(fitToWindow(event('2026-11-20'), TEST_WINDOW));
    assert.ok(fitToWindow(event('2027-02-18'), TEST_WINDOW));
    assert.equal(fitToWindow(event('2026-11-19'), TEST_WINDOW), null);
    assert.equal(fitToWindow(event('2027-02-19'), TEST_WINDOW), null);
    assert.equal(fitToWindow(event('not-a-date'), TEST_WINDOW), null);
});

test('fitToWindow clips multi-day events to the window', () => {
    const clipped = fitToWindow(event('2026-05-09', { endDate: '2027-06-30' }), TEST_WINDOW);
    assert.equal(clipped.startDate, '2026-11-20');
    assert.equal(clipped.endDate, '2027-02-18');
    assert.equal(fitToWindow(event('2026-11-01', { endDate: '2026-11-20' }), TEST_WINDOW).endDate, null); // ends today
    assert.equal(fitToWindow(event('2026-11-01', { endDate: '2026-11-19' }), TEST_WINDOW), null);
});

test('fitToWindow drops touring events far from Pécs but keeps local ones', () => {
    assert.equal(fitToWindow(event('2026-12-01', { coordinates: { lat: 48.1, lng: 20.69 } }), TEST_WINDOW), null); // Miskolc
    assert.ok(fitToWindow(event('2026-12-01', { coordinates: { lat: 46.0784, lng: 18.2481 } }), TEST_WINDOW)); // Zsolnay Quarter
});

test('normalizeCache reads the current and the first (flat) cache format', () => {
    assert.deepEqual(normalizeCache({ sources: { a: 1 }, lastRun: { total: 5, at: 'x' } }), { sources: { a: 1 }, lastRun: { total: 5, at: 'x' } });
    assert.deepEqual(normalizeCache({ a: 1 }), { sources: { a: 1 }, lastRun: null });
    assert.deepEqual(normalizeCache(null), { sources: {}, lastRun: null });
});

test('a healthy scrape is reported ok and replaces the cache', async () => {
    const cache = cacheWith(days(2));
    const { events, report } = await collectSource(sourceOf(async () => days(5), 3), TEST_WINDOW, cache, NOW);
    assert.equal(events.length, 5);
    assert.equal(report.status, 'ok');
    assert.equal(report.reason, null);
    assert.equal(cache.demo.events.length, 5);
    assert.equal(cache.demo.fetchedAt, NOW.toISOString());
});

test('a throwing source falls back to its cache and says so', async () => {
    const cache = cacheWith(days(4));
    const { events, report } = await collectSource(sourceOf(async () => { throw new Error('HTTP 503'); }), TEST_WINDOW, cache, NOW);
    assert.equal(events.length, 4);
    assert.equal(report.status, 'cached');
    assert.match(report.reason, /HTTP 503/);
    assert.equal(Math.round(report.cacheAgeDays), 1);
    assert.equal(cache.demo.fetchedAt, '2026-11-19T04:15:00.000Z'); // the good cache is untouched
});

test('a throwing source without cache is reported failed with no events', async () => {
    const { events, report } = await collectSource(sourceOf(async () => { throw new Error('boom'); }), TEST_WINDOW, {}, NOW);
    assert.deepEqual(events, []);
    assert.equal(report.status, 'failed');
    assert.equal(report.scraped, null);
});

test('an empty result is a failure when the previous run had events in the window', async () => {
    const cache = cacheWith(days(3));
    const { events, report } = await collectSource(sourceOf(async () => []), TEST_WINDOW, cache, NOW);
    assert.equal(report.status, 'cached');
    assert.match(report.reason, /previous run had 3/);
    assert.equal(events.length, 3);
});

test('an empty result is fine for a source that has nothing in the window anyway (e.g. summer break)', async () => {
    const stale = cacheWith([event('2026-06-01')]);
    const { report } = await collectSource(sourceOf(async () => []), TEST_WINDOW, stale, NOW);
    assert.equal(report.status, 'ok');
});

test('fewer events than minEvents counts as failed; cache wins when it has more', async () => {
    const cache = cacheWith(days(10));
    const { events, report } = await collectSource(sourceOf(async () => days(2), 5), TEST_WINDOW, cache, NOW);
    assert.equal(report.status, 'cached');
    assert.match(report.reason, /Only 2 events found, expected at least 5/);
    assert.equal(events.length, 10);
    assert.equal(cache.demo.events.length, 10); // partial result is not stored
});

test('a partial result is still used when there is no better cache, but reported failed', async () => {
    const { events, report } = await collectSource(sourceOf(async () => days(2), 5), TEST_WINDOW, {}, NOW);
    assert.equal(events.length, 2);
    assert.equal(report.status, 'failed');
});

test('toBrowserProgram produces the compact shape app.js reads', () => {
    const program = toBrowserProgram({
        title: 'Koncert', startDate: '2026-12-05', endDate: '2026-12-07', time: null, venue: 'Kodály Központ',
        url: 'https://example.hu/k', source: 'pecs-hu', category: 'culture', kidFriendly: false
    });
    assert.deepEqual(program, {
        dates: '2026-12-05..2026-12-07', venue: 'Kodály Központ', category: 'culture', kidFriendly: false,
        title: { hu: 'Koncert' }, url: 'https://example.hu/k', source: 'pecs-hu'
    });
});
