/**
 * Build-time event scraper. Fetches every source in scripts/events/sources, keeps
 * events from today up to LOOKAHEAD_DAYS ahead near Pécs, tags and deduplicates them,
 * and writes events-data.js for the Programs section.
 *
 * A failing source never fails the run by itself: its last good result from
 * src/data/events-cache.json is used and the problem is reported. The run only exits
 * with an error (so nothing is deployed) when the result as a whole looks broken –
 * see health.mjs. Every run writes scrape-report.json / scrape-report.md.
 * Usage: npm run scrape (also part of npm run build)
 */
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { EVENT_SOURCES } from './sources/index.mjs';
import { getEventWindow } from './dates.mjs';
import { tagEvent } from './tagging.mjs';
import { dedupeEvents } from './dedupe.mjs';
import {
    collectSource, fitToWindow, normalizeCache, renderEventsDataFile, sortChronologically, toBrowserProgram
} from './pipeline.mjs';
import { evaluateRun, renderReportMarkdown } from './health.mjs';

const CACHE_FILE = 'src/data/events-cache.json';
const OUTPUT_FILE = 'events-data.js';
const REPORT_JSON_FILE = 'scrape-report.json';
const REPORT_MARKDOWN_FILE = 'scrape-report.md';

const runUrl = process.env.GITHUB_RUN_ID && process.env.GITHUB_REPOSITORY
    ? `${process.env.GITHUB_SERVER_URL ?? 'https://github.com'}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null;

async function readCache() {
    try {
        return normalizeCache(JSON.parse(await readFile(CACHE_FILE, 'utf8')));
    } catch {
        return normalizeCache(null);
    }
}

/** Shows up as an annotation on the GitHub run page; plain text elsewhere. */
function logProblem(level, message) {
    console[level === 'error' ? 'error' : 'warn'](process.env.GITHUB_ACTIONS ? `::${level}::${message}` : `⚠ ${message}`);
}

const now = new Date();
const window = getEventWindow(now);
const cache = await readCache();
const previousTotal = cache.lastRun?.total ?? null;

/** @type {import('./types.mjs').TaggedEvent[]} */
const tagged = [];
const sourceReports = [];
const activeSources = [];

for (const source of EVENT_SOURCES) {
    const { events, report } = await collectSource(source, window, cache.sources, now);
    const inWindow = events.map(event => fitToWindow(event, window)).filter(Boolean);
    tagged.push(...inWindow.map(event => ({ ...event, source: source.id, ...tagEvent(event, source.id) })));
    sourceReports.push(report);
    if (inWindow.length) activeSources.push({ label: source.label, url: source.homepage });
    const icon = { ok: '✓', cached: '↺', failed: '✗' }[report.status];
    console.log(`${icon} ${source.label}: ${report.scraped ?? 'error'} scraped, ${report.inWindow} in window${report.reason ? ` – ${report.reason}` : ''}`);
}

const programs = sortChronologically(dedupeEvents(tagged));
const totalEvents = programs.length;
const verdict = evaluateRun({ sources: sourceReports, totalEvents, previousTotal });
/** @type {import('./types.mjs').ScrapeReport} */
const report = {
    generatedAt: now.toISOString(),
    window,
    totalEvents,
    previousTotal,
    mergedDuplicates: tagged.length - totalEvents,
    sources: sourceReports,
    ...verdict
};

const markdown = renderReportMarkdown(report, runUrl);
await writeFile(REPORT_JSON_FILE, JSON.stringify(report, null, 2) + '\n');
await writeFile(REPORT_MARKDOWN_FILE, markdown);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown);

for (const problem of report.problems) logProblem(report.verdict === 'abort' ? 'error' : 'warning', problem);
for (const note of report.notes) console.log(`ℹ ${note}`);

if (report.verdict === 'abort') {
    // Keep the good per-source results, but leave events-data.js and the previous total alone.
    await writeFile(CACHE_FILE, JSON.stringify(cache, null, 1) + '\n');
    console.error(`Aborted: ${report.problems[0]}`);
    process.exitCode = 1;
} else {
    cache.lastRun = { total: totalEvents, at: now.toISOString() };
    await writeFile(CACHE_FILE, JSON.stringify(cache, null, 1) + '\n');
    await writeFile(OUTPUT_FILE, renderEventsDataFile(programs.map(toBrowserProgram), activeSources, window.firstDay));
    console.log(`Wrote ${totalEvents} events (${report.mergedDuplicates} duplicates merged) from ${activeSources.length} sources to ${OUTPUT_FILE} [${report.verdict}]`);
}
