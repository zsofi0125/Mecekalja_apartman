import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRun, renderCrashMarkdown, renderReportMarkdown } from '../../scripts/events/health.mjs';

const ok = id => ({ id, label: `${id}.hu`, status: 'ok', scraped: 50, inWindow: 50, minEvents: 10, reason: null, cacheAgeDays: null });
const cached = (id, cacheAgeDays) => ({ ...ok(id), status: 'cached', reason: 'Scrape error: HTTP 503', cacheAgeDays, scraped: null });
const failed = id => ({ ...ok(id), status: 'failed', reason: 'Scrape error: boom', inWindow: 0, scraped: null });
const eight = overrides => ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id, index) => overrides[index] ?? ok(id));

test('all sources healthy → ok', () => {
    assert.equal(evaluateRun({ sources: eight([]), totalEvents: 900, previousTotal: 910 }).verdict, 'ok');
});

test('a source on cache for one day is only a note (probably a blip)', () => {
    const result = evaluateRun({ sources: eight([cached('a', 1.0)]), totalEvents: 900, previousTotal: 900 });
    assert.equal(result.verdict, 'ok');
    assert.equal(result.problems.length, 0);
    assert.equal(result.notes.length, 1);
});

test('a source on cache for two days or more raises an alert', () => {
    const result = evaluateRun({ sources: eight([cached('a', 2.0)]), totalEvents: 900, previousTotal: 900 });
    assert.equal(result.verdict, 'alert');
    assert.match(result.problems[0], /a\.hu.*HTTP 503.*2\.0 days/);
});

test('a source with no usable data raises an alert immediately', () => {
    const result = evaluateRun({ sources: eight([failed('a')]), totalEvents: 800, previousTotal: 900 });
    assert.equal(result.verdict, 'alert');
    assert.match(result.problems[0], /No usable cached data/);
});

test('half of the sources failing aborts the deploy', () => {
    const result = evaluateRun({ sources: eight([cached('a', 1), cached('b', 1), cached('c', 1), failed('d')]), totalEvents: 500, previousTotal: 900 });
    assert.equal(result.verdict, 'abort');
    assert.match(result.problems[0], /4 of 8 sources.*not redeployed/);
});

test('a total that falls below half of the previous total aborts the deploy', () => {
    const result = evaluateRun({ sources: eight([]), totalEvents: 300, previousTotal: 900 });
    assert.equal(result.verdict, 'abort');
    assert.match(result.problems[0], /dropped from 900 to 300/);
});

test('a moderate drop or a small previous total does not abort', () => {
    assert.equal(evaluateRun({ sources: eight([]), totalEvents: 600, previousTotal: 900 }).verdict, 'ok');
    assert.equal(evaluateRun({ sources: eight([]), totalEvents: 5, previousTotal: 20 }).verdict, 'ok');
    assert.equal(evaluateRun({ sources: eight([]), totalEvents: 900, previousTotal: null }).verdict, 'ok'); // first run
});

test('no events at all aborts the deploy', () => {
    assert.equal(evaluateRun({ sources: eight([]), totalEvents: 0, previousTotal: null }).verdict, 'abort');
});

test('the markdown report lists every source and the problems', () => {
    const sources = eight([cached('a', 2.5)]);
    const run = evaluateRun({ sources, totalEvents: 900, previousTotal: 900 });
    const markdown = renderReportMarkdown({
        generatedAt: '2026-11-20T04:15:00Z', window: { firstDay: '2026-11-20', lastDay: '2027-02-18' },
        totalEvents: 900, previousTotal: 900, mergedDuplicates: 271, sources, ...run
    }, 'https://github.com/x/y/actions/runs/1');
    assert.match(markdown, /Deployed, but some sources need attention/);
    assert.match(markdown, /900 events after merging 271 duplicates/);
    assert.match(markdown, /⚠️ a\.hu/);
    assert.match(markdown, /✅ h\.hu/);
    assert.match(markdown, /\[Workflow run\]\(https:\/\/github\.com\/x\/y\/actions\/runs\/1\)/);
});

test('the crash message tells the reader to check the log', () => {
    assert.match(renderCrashMarkdown('https://example.com/run'), /crashed.*workflow log/s);
});
