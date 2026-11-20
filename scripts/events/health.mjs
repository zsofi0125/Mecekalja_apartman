/**
 * Judges a finished scrape run and renders the status report.
 *
 * Verdicts:
 *   ok     – everything healthy (a source that failed only today is just a note)
 *   alert  – deploy normally, but a human should look (opens a GitHub issue)
 *   abort  – do not deploy: the previous site stays live and the run fails
 */

/** @typedef {import('./types.mjs').SourceReport} SourceReport */
/** @typedef {import('./types.mjs').ScrapeReport} ScrapeReport */

export const THRESHOLDS = {
    /** A source running on cached data for this long needs attention (one bad day is usually a blip). */
    alertAfterDays: 2,
    /** Abort when at least this share of sources is not delivering fresh events. */
    abortSourceShare: 0.5,
    /** Abort when the total falls below this share of the previous run's total … */
    abortDropRatio: 0.5,
    /** … but only once the previous total was large enough to be meaningful. */
    minTotalForDropCheck: 50
};

/** @param {SourceReport} source */
function describeProblem(source) {
    if (source.status === 'cached') {
        return `${source.label}: ${source.reason}. Showing cached events from ${source.cacheAgeDays?.toFixed(1) ?? '?'} days ago.`;
    }
    return `${source.label}: ${source.reason}. No usable cached data.`;
}

/**
 * @param {{ sources: SourceReport[], totalEvents: number, previousTotal: number|null }} run
 * @returns {{ verdict: 'ok'|'alert'|'abort', problems: string[], notes: string[] }}
 */
export function evaluateRun({ sources, totalEvents, previousTotal }) {
    const problems = [];
    const notes = [];
    for (const source of sources.filter(candidate => candidate.status !== 'ok')) {
        const needsAttention = source.status === 'failed' || (source.cacheAgeDays ?? Infinity) >= THRESHOLDS.alertAfterDays;
        (needsAttention ? problems : notes).push(describeProblem(source));
    }

    const notDelivering = sources.filter(source => source.status !== 'ok').length;
    let abortReason = null;
    if (totalEvents === 0) {
        abortReason = 'The run produced no events at all.';
    } else if (notDelivering >= Math.ceil(sources.length * THRESHOLDS.abortSourceShare)) {
        abortReason = `${notDelivering} of ${sources.length} sources are not delivering fresh events.`;
    } else if (previousTotal !== null && previousTotal >= THRESHOLDS.minTotalForDropCheck && totalEvents < previousTotal * THRESHOLDS.abortDropRatio) {
        abortReason = `The event total dropped from ${previousTotal} to ${totalEvents}.`;
    }
    if (abortReason) return { verdict: 'abort', problems: [`${abortReason} The site was not redeployed.`, ...problems], notes };
    return { verdict: problems.length ? 'alert' : 'ok', problems, notes };
}

const STATUS_ICON = { ok: '✅', cached: '⚠️', failed: '❌' };
const VERDICT_TITLE = {
    ok: 'All sources healthy',
    alert: 'Deployed, but some sources need attention',
    abort: 'Not deployed – the previous site stays live'
};

/**
 * Markdown used for the workflow summary and the alert issue.
 * @param {ScrapeReport} report
 * @param {string|null} [runUrl]
 */
export function renderReportMarkdown(report, runUrl = null) {
    const rows = report.sources.map(source => {
        const detail = source.reason ? `${source.reason}${source.cacheAgeDays !== null ? ` (cache ${source.cacheAgeDays.toFixed(1)} d old)` : ''}` : '';
        return `| ${STATUS_ICON[source.status]} ${source.label} | ${source.inWindow} | ${source.scraped ?? '–'} | ${detail.replace(/\|/g, '\\|')} |`;
    });
    const sections = [
        `### Event scraper: ${VERDICT_TITLE[report.verdict]}`,
        `${report.totalEvents} events after merging ${report.mergedDuplicates} duplicates, window ${report.window.firstDay} → ${report.window.lastDay}.`
    ];
    if (report.problems.length) sections.push('**Needs attention**', report.problems.map(problem => `- ${problem}`).join('\n'));
    if (report.notes.length) sections.push('**Notes (first bad day, no action yet)**', report.notes.map(note => `- ${note}`).join('\n'));
    sections.push(['| Source | In window | Scraped | Details |', '|---|---:|---:|---|', ...rows].join('\n'));
    if (runUrl) sections.push(`[Workflow run](${runUrl})`);
    return sections.join('\n\n') + '\n';
}

/** Stand-in report when the scraper died before writing its own. @param {string|null} runUrl */
export function renderCrashMarkdown(runUrl = null) {
    return [
        '### Event scraper: crashed',
        'The scraper stopped before it could write a status report, so the site was not redeployed. Check the workflow log for the error.',
        runUrl ? `[Workflow run](${runUrl})` : ''
    ].filter(Boolean).join('\n\n') + '\n';
}
