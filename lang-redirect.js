/**
 * Sends first-time visitors of the language chooser to the page matching
 * their browser language. Crawlers and no-JS users keep the plain links.
 */
(function redirectToPreferredLanguage() {
    'use strict';
    const supportedLanguages = ['hu', 'en', 'de'];
    const browserLanguage = (navigator.language || '').slice(0, 2).toLowerCase();
    if (supportedLanguages.includes(browserLanguage)) {
        window.location.replace(browserLanguage + '/');
    }
})();
