/**
 * Cookie consent (opt-in). Until the visitor accepts, nothing is loaded or written:
 * no Google Analytics, no Google Map, no cookies, no localStorage / sessionStorage.
 * "Decline" is kept in memory only, so it writes nothing (the banner returns on the next page view).
 * "Accept" stores one flag in localStorage, then loads Google Analytics and the map.
 */
(function () {
    'use strict';

    const CONSENT_STORAGE_KEY = 'cookie-consent';
    const CONSENT_GRANTED = 'granted';
    const ANALYTICS_COOKIE_PATTERN = /^(_ga(_.+)?|_gid|_gat.*)$/;

    const maybeBanner = /** @type {HTMLElement | null} */ (document.querySelector('[data-cookie-banner]'));
    if (!maybeBanner) return;
    const banner = maybeBanner;
    const measurementId = banner.dataset.gaId || '';
    let isAnalyticsLoaded = false;

    function hasStoredConsent() {
        try {
            return localStorage.getItem(CONSENT_STORAGE_KEY) === CONSENT_GRANTED;
        } catch {
            return false;
        }
    }

    /** @param {boolean} isGranted */
    function storeConsent(isGranted) {
        try {
            if (isGranted) localStorage.setItem(CONSENT_STORAGE_KEY, CONSENT_GRANTED);
            else localStorage.removeItem(CONSENT_STORAGE_KEY);
        } catch {
            // Storage blocked: consent then only lasts for this page view.
        }
    }

    function loadAnalytics() {
        if (!measurementId || isAnalyticsLoaded) return;
        isAnalyticsLoaded = true;
        const analyticsWindow = /** @type {Window & { dataLayer?: unknown[] }} */ (window);
        const dataLayer = (analyticsWindow.dataLayer = analyticsWindow.dataLayer || []);
        function gtag() {
            dataLayer.push(arguments);
        }
        gtag('js', new Date());
        gtag('config', measurementId, { anonymize_ip: true });
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
        document.head.append(script);
    }

    /** Google's documented opt-out switch, for a script already running on this page. */
    function disableAnalytics() {
        if (measurementId) /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (window))[`ga-disable-${measurementId}`] = true;
    }

    function deleteAnalyticsCookies() {
        const hostParts = location.hostname.split('.');
        const domains = ['', location.hostname];
        for (let index = 1; index < hostParts.length - 1; index++) domains.push(`.${hostParts.slice(index).join('.')}`);
        document.cookie.split(';').forEach(entry => {
            const name = entry.split('=')[0].trim();
            if (!ANALYTICS_COOKIE_PATTERN.test(name)) return;
            domains.forEach(domain => {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain ? `; domain=${domain}` : ''}`;
            });
        });
    }

    function loadMaps() {
        document.querySelectorAll('iframe[data-src]').forEach(frame => {
            frame.setAttribute('src', frame.getAttribute('data-src') || '');
            frame.removeAttribute('data-src');
        });
        document.querySelectorAll('[data-map-consent]').forEach(overlay => overlay.setAttribute('hidden', ''));
    }

    /** @param {boolean} shouldFocus */
    function showBanner(shouldFocus) {
        banner.removeAttribute('hidden');
        if (shouldFocus) /** @type {HTMLElement | null} */ (banner.querySelector('[data-cookie-accept]'))?.focus();
    }

    function accept() {
        storeConsent(true);
        loadAnalytics();
        loadMaps();
        banner.setAttribute('hidden', '');
    }

    function decline() {
        storeConsent(false);
        disableAnalytics();
        deleteAnalyticsCookies();
        banner.setAttribute('hidden', '');
    }

    banner.querySelector('[data-cookie-accept]')?.addEventListener('click', accept);
    banner.querySelector('[data-cookie-decline]')?.addEventListener('click', decline);
    document.querySelectorAll('[data-cookie-settings]').forEach(trigger =>
        trigger.addEventListener('click', () => showBanner(true)));
    // Map stays blocked until accepted, but a visitor can load it for this page view with one click.
    document.querySelectorAll('[data-map-consent-load]').forEach(button => button.addEventListener('click', loadMaps));

    if (hasStoredConsent()) {
        loadAnalytics();
        loadMaps();
    } else {
        showBanner(false);
    }
})();
