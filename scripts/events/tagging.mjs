/**
 * Keyword-based tagging of scraped events: assigns one ProgramCategory and the
 * "Gyerekeknek" (kidFriendly) flag. Rules are plain data so they can be extended
 * without touching the matching logic.
 *
 * Keyword syntax for CATEGORY_RULES / KIDS_KEYWORDS (matched against the accent-free,
 * lowercase words of title + source categories):
 *   'bor'        – the whole word "bor"
 *   'gasztro*'   – any word starting with "gasztro" (gasztronómia, gasztroest …)
 *   'bor kostolo' – consecutive words (each part follows the same syntax)
 * The concert rule (CONCERT_RULE) is written in normal Hungarian spelling instead.
 */
import { normalizeForMatching } from './text.mjs';

/** Words that mark an event as suitable for children ("Gyerekeknek"). */
export const KIDS_KEYWORDS = ['gyerek*', 'csalad*', 'mese*', 'babszinhaz*'];

/**
 * Sources whose events are "Kultúra" and never auto-tagged "Gyerekeknek"
 * (theatre programmes; per the site owner's rule). Concerts are the one exception to the
 * category: a theatre's "… koncert" is listed under "Koncertek" (it is still never kid-tagged).
 * @type {Record<string, { category: string, kidFriendly: false }>}
 */
export const SOURCE_OVERRIDES = {
    pnsz: { category: 'culture', kidFriendly: false },
    'harmadik-szinhaz': { category: 'culture', kidFriendly: false }
};

/**
 * "Koncertek". Two separate lists – an event is a concert if EITHER one matches.
 * Append new terms to the lists; write them in normal Hungarian spelling (accents and
 * upper/lower case are ignored when matching).
 */
export const CONCERT_RULE = {
    category: 'concert',
    /**
     * Found anywhere inside the title or the source's own category labels, so "koncert" also
     * matches "koncertje", "Koncertek" and "Gyerekkoncert".
     */
    keywords: ['koncert', 'banda', 'énekes'],
    /**
     * Venue names, matched against the event's venue as whole words: "Pécsi Est" matches
     * "Pécsi Est Klub" but not "Pécsi Estélyi Terem".
     */
    venues: ['Pécsi Est', 'Káptalan Kert']
};

const normalizeList = terms => terms.map(normalizeForMatching).filter(Boolean);

/**
 * @param {{ title: string, categories?: string[], venue?: string|null }} event
 * @returns {boolean}
 */
export function isConcert(event) {
    const text = normalizeForMatching([event.title, ...(event.categories || [])].join(' '));
    if (normalizeList(CONCERT_RULE.keywords).some(keyword => text.includes(keyword))) return true;

    const paddedVenue = ` ${normalizeForMatching(event.venue)} `;
    return normalizeList(CONCERT_RULE.venues).some(venue => paddedVenue.includes(` ${venue} `));
}

/**
 * Category rules, first match wins (so the order is the precedence). A rule matches either by
 * `keywords` (see the syntax above) or by a `test(event)` function. `kids` says how the
 * "Gyerekeknek" flag is decided:
 *   'never'    – gastro events are never tagged for kids
 *   'always'   – family programmes are always tagged for kids
 *   'keywords' – only when KIDS_KEYWORDS match
 * @type {{ category: string, kids: 'never'|'always'|'keywords', keywords?: string[], test?: (event: any) => boolean }[]}
 */
export const CATEGORY_RULES = [
    {
        category: 'food',
        kids: 'never',
        keywords: ['gasztro*', 'bor', 'borkostol*', 'borfesztival*', 'borvacsor*', 'borest*', 'borhaz*', 'pince*',
            'kostolo*', 'sor', 'sorfesztival*', 'palinka*', 'fozo*', 'fozes*', 'vacsora*', 'street food', 'etterem*']
    },
    {
        category: CONCERT_RULE.category,
        kids: 'keywords',
        test: isConcert
    },
    {
        category: 'active',
        kids: 'keywords',
        keywords: ['sport*', 'tura', 'turak', 'turaz*', 'futas*', 'futo*', 'kerekpar*', 'bicikli*', 'joga*', 'verseny*',
            'tanchaz*', 'korcsoly*', 'uszas*', 'kalandpark*', 'aktiv']
    },
    {
        category: 'relax',
        kids: 'keywords',
        keywords: ['wellness*', 'furdo*', 'spa', 'relax*', 'meditac*', 'piknik*', 'pihenes*', 'hangfurdo*']
    },
    {
        category: 'family',
        kids: 'always',
        keywords: [...KIDS_KEYWORDS, 'gyerekprogram*', 'jatszohaz*', 'csaladi program']
    }
];

export const DEFAULT_CATEGORY = { category: 'culture', kids: 'keywords' };

/** @param {string} keyword @returns {(word: string) => boolean} */
const wordMatcher = keyword =>
    keyword.endsWith('*') ? word => word.startsWith(keyword.slice(0, -1)) : word => word === keyword;

/** True if `keyword` (single word or phrase) occurs in the word list. */
function containsKeyword(words, keyword) {
    const parts = keyword.split(' ').map(wordMatcher);
    return words.some((_, start) => parts.every((matches, offset) => start + offset < words.length && matches(words[start + offset])));
}

/** Keywords must be written accent-free and lowercase, like the normalized words. */
/** @param {string[]} words @param {string[]} keywords */
export const matchesAny = (words, keywords) => keywords.some(keyword => containsKeyword(words, keyword));

/**
 * @param {{ title: string, categories?: string[], venue?: string|null }} event
 * @param {string} sourceId
 * @returns {{ category: string, kidFriendly: boolean }}
 */
export function tagEvent(event, sourceId) {
    const override = SOURCE_OVERRIDES[sourceId];
    if (override) return { ...override, category: isConcert(event) ? CONCERT_RULE.category : override.category };

    const words = normalizeForMatching([event.title, ...(event.categories || [])].join(' ')).split(' ');
    const rule = CATEGORY_RULES.find(candidate => (candidate.test ? candidate.test(event) : matchesAny(words, candidate.keywords ?? []))) || DEFAULT_CATEGORY;
    const kidFriendly = rule.kids === 'always' || (rule.kids === 'keywords' && matchesAny(words, KIDS_KEYWORDS));
    return { category: rule.category, kidFriendly };
}
