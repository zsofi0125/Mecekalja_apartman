/**
 * Keeps one GitHub issue ("Event scraper needs attention") in step with the latest
 * scrape report: opens it when a source needs attention, refreshes its text silently
 * on later runs, and closes it once everything is healthy again.
 * Runs in the deploy workflow with the `gh` CLI; locally it only prints what it would do.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { renderCrashMarkdown, renderReportMarkdown } from './health.mjs';

const REPORT_FILE = 'scrape-report.json';
const BODY_FILE = 'scrape-issue-body.md';
const LABEL = 'scraper-alert';
const TITLE = 'Event scraper needs attention';
const FOOTER = '\n---\nThis issue is created and updated automatically. It closes itself when every source is healthy again.\n';

const runUrl = process.env.GITHUB_RUN_ID && process.env.GITHUB_REPOSITORY
    ? `${process.env.GITHUB_SERVER_URL ?? 'https://github.com'}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null;

async function readReport() {
    try {
        return JSON.parse(await readFile(REPORT_FILE, 'utf8'));
    } catch {
        return null;
    }
}

const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8' }).trim();

const report = await readReport();
const needsAttention = !report || report.verdict !== 'ok';
const body = (report ? renderReportMarkdown(report, runUrl) : renderCrashMarkdown(runUrl)) + FOOTER;

if (!process.env.GITHUB_ACTIONS) {
    console.log(`[dry run] issue would be ${needsAttention ? 'opened or updated' : 'closed (if open)'}:\n\n${body}`);
    process.exit(0);
}

await writeFile(BODY_FILE, body);
gh('label', 'create', LABEL, '--color', 'D93F0B', '--description', 'Raised automatically by the event scraper', '--force');
const openIssue = gh('issue', 'list', '--label', LABEL, '--state', 'open', '--json', 'number', '--jq', '.[0].number // empty');

if (needsAttention && !openIssue) {
    console.log(gh('issue', 'create', '--title', TITLE, '--label', LABEL, '--body-file', BODY_FILE));
} else if (needsAttention) {
    gh('issue', 'edit', openIssue, '--body-file', BODY_FILE); // editing the body does not notify anyone again
    console.log(`Updated issue #${openIssue}`);
} else if (openIssue) {
    gh('issue', 'close', openIssue, '--comment', `All sources are healthy again${runUrl ? ` ([run](${runUrl}))` : ''}.`);
    console.log(`Closed issue #${openIssue}`);
} else {
    console.log('All sources healthy, no open alert issue.');
}
