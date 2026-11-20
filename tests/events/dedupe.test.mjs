import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dedupeEvents } from '../../scripts/events/dedupe.mjs';

const event = overrides => ({
    title: 'Dallam és bábu egy ütemre', startDate: '2026-11-20', endDate: null, time: null, venue: null,
    url: 'https://a.example/1', source: 'pecsiprogram', category: 'family', kidFriendly: true, ...overrides
});

test('same normalized title on the same day is one event (case, accents and punctuation ignored)', () => {
    const result = dedupeEvents([event({}), event({ title: 'DALLAM ÉS BÁBU – egy ütemre!', source: 'pecs-hu', url: 'https://b.example/2' })]);
    assert.equal(result.length, 1);
    assert.equal(result[0].source, 'pecsiprogram'); // the earlier (higher-priority) source wins
    assert.equal(result[0].url, 'https://a.example/1');
});

test('the same title on different days stays separate', () => {
    assert.equal(dedupeEvents([event({}), event({ startDate: '2026-11-21' })]).length, 2);
});

test('different titles on the same day stay separate', () => {
    assert.equal(dedupeEvents([event({}), event({ title: 'Egészen más program' })]).length, 2);
});

test('start times are merged into one sorted list without repeats', () => {
    const [merged] = dedupeEvents([
        event({ time: '10:00' }), event({ time: '09:00', source: 'x' }), event({ time: '10:00', source: 'y' }), event({ time: null, source: 'z' })
    ]);
    assert.equal(merged.time, '09:00, 10:00');
});

test('missing venue is filled from a duplicate; the longest end date wins', () => {
    const [merged] = dedupeEvents([event({ endDate: '2026-11-22' }), event({ venue: 'Zsolnay Negyed', endDate: '2026-11-25', source: 'x' })]);
    assert.equal(merged.venue, 'Zsolnay Negyed');
    assert.equal(merged.endDate, '2026-11-25');
});

test('the winning source keeps its own tags (theatre events stay "Kultúra")', () => {
    const [merged] = dedupeEvents([
        event({ source: 'pnsz', category: 'culture', kidFriendly: false }),
        event({ source: 'pecsimami', category: 'family', kidFriendly: true })
    ]);
    assert.equal(merged.category, 'culture');
    assert.equal(merged.kidFriendly, false);
});

test('does not modify its input', () => {
    const input = [event({ time: '10:00' }), event({ time: '11:00', source: 'x' })];
    dedupeEvents(input);
    assert.equal(input[0].time, '10:00');
});
