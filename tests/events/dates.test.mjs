import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, getEventWindow, normalizeTime, parseHungarianMonth, toBudapestDateTime, toIsoDate } from '../../scripts/events/dates.mjs';

test('toBudapestDateTime converts UTC to Hungarian local time, including DST', () => {
    assert.deepEqual(toBudapestDateTime(new Date('2026-12-31T23:30:00Z')), { date: '2027-01-01', time: '00:30' }); // CET, UTC+1
    assert.deepEqual(toBudapestDateTime(new Date('2026-07-01T10:00:00Z')), { date: '2026-07-01', time: '12:00' }); // CEST, UTC+2
});

test('getEventWindow starts today (Budapest) and ends 90 days later', () => {
    assert.deepEqual(getEventWindow(new Date('2026-11-20T23:30:00Z')), { firstDay: '2026-11-21', lastDay: '2027-02-19' });
});

test('addDays crosses month and year boundaries', () => {
    assert.equal(addDays('2026-12-30', 3), '2027-01-02');
    assert.equal(addDays('2027-03-01', -1), '2027-02-28');
});

test('toIsoDate rejects impossible dates', () => {
    assert.equal(toIsoDate(2026, 11, 5), '2026-11-05');
    assert.equal(toIsoDate(2027, 2, 30), null);
});

test('normalizeTime understands the spellings seen on the sources', () => {
    assert.equal(normalizeTime('19:00:00'), '19:00');
    assert.equal(normalizeTime('9:00'), '09:00');
    assert.equal(normalizeTime('10.00'), '10:00');
    assert.equal(normalizeTime('18:00–20:30'), '18:00');
    assert.equal(normalizeTime('00:00'), null); // midnight placeholder = "no time given"
    assert.equal(normalizeTime('25:00'), null);
    assert.equal(normalizeTime(''), null);
    assert.equal(normalizeTime(undefined), null);
});

test('parseHungarianMonth accepts full names and abbreviations', () => {
    assert.equal(parseHungarianMonth('November'), 11);
    assert.equal(parseHungarianMonth('dec.'), 12);
    assert.equal(parseHungarianMonth('Március'), 3);
    assert.equal(parseHungarianMonth('Szeptember'), 9);
    assert.equal(parseHungarianMonth('Nope'), null);
});
