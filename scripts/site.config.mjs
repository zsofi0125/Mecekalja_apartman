/** Single source of truth for site-wide build settings. */
export const SITE_URL = 'https://mecsekaljaapartman.hu';
export const SUPPORTED_LANGUAGES = ['hu', 'en', 'de'];
export const DEFAULT_LANGUAGE = 'hu';
export const OPEN_GRAPH_LOCALES = { hu: 'hu_HU', en: 'en_GB', de: 'de_DE' };
export const OPEN_GRAPH_IMAGE_PATH = 'img/og-cover.jpg';

/** House rules PDFs per language (clean slugs; served from /houserules/). */
export const HOUSE_RULES_FILES = {
    hu: 'houserules/hazirend-hu.pdf',
    en: 'houserules/house-rules-en.pdf',
    de: 'houserules/hausordnung-de.pdf'
};
/** Folder name of the legal-notice page below each language folder, e.g. /hu/impressum/. */
export const LEGAL_PAGE_SLUG = 'impressum';
/** Privacy policy folder per language, e.g. /hu/adatkezelesi-tajekoztato/. */
export const PRIVACY_PAGE_SLUGS = {
    hu: 'adatkezelesi-tajekoztato',
    en: 'privacy-policy',
    de: 'datenschutz'
};

/**
 * Google Analytics 4 measurement ID (public, format "G-XXXXXXXXXX"). Leave empty to ship no
 * analytics at all: the script is only ever added after the visitor accepts, and only if set.
 */
export const GA_MEASUREMENT_ID = 'G-TX60V6N8RH';
