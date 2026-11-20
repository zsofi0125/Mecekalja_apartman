import { load } from 'cheerio';

/** Plain, whitespace-collapsed text from an HTML fragment (also decodes entities). */
export function htmlToText(html) {
    return load(`<div>${html ?? ''}</div>`)('div').first().text().replace(/\s+/g, ' ').trim();
}

/** Lowercase, accent-free, punctuation-free form used for keyword matching and deduplication. */
export function normalizeForMatching(text) {
    return String(text ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

/** Absolute http(s) URL, resolved against `base`; anything else becomes null. */
export function cleanUrl(url, base) {
    try {
        const parsed = new URL(url, base);
        return /^https?:$/.test(parsed.protocol) ? parsed.href : null;
    } catch {
        return null;
    }
}
