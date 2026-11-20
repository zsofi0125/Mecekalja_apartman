/**
 * ==============================================================================
 * Mecsekalja Apartman · Client-side behaviour
 * Page copy is pre-rendered per language by scripts/build.mjs; this file only
 * drives the interactive events calendar and the mobile gallery carousel.
 * ==============================================================================
 */

(function () {
    'use strict';

    /** @type {LanguageCode} */
    const DEFAULT_LANGUAGE = 'hu';
    /** Scraped events have only their original Hungarian title. */
    /** @type {LanguageCode[]} */
    const TITLE_FALLBACK_ORDER = ['hu', 'en'];
    const MS_PER_DAY = 864e5;
    const CAROUSEL_EDGE_TOLERANCE_PX = 15;
    const CAROUSEL_SCROLL_SETTLE_MS = 80;
    const CAROUSEL_RESIZE_SETTLE_MS = 150;

    // --------------------------------------------------------------------------
    // 1. Helpers
    // --------------------------------------------------------------------------
    /** @param {string} id */
    const byId = id => document.getElementById(id);

    /** @param {unknown} text */
    const escapeHtml = text =>
        String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

    /** Only http(s) links are rendered; anything else is dropped. */
    /** @param {string} url */
    const toSafeUrl = url => (/^https?:\/\//i.test(url) ? escapeHtml(url) : '');

    /** @param {Date} date */
    const toIsoDate = date =>
        date.getFullYear() +
        '-' +
        String(date.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(date.getDate()).padStart(2, '0');

    /** @param {Date} date */
    const startOfDay = date => new Date(date.getFullYear(), date.getMonth(), date.getDate());
    /** @param {Date} date */
    const startOfMonth = date => new Date(date.getFullYear(), date.getMonth(), 1);

    // --------------------------------------------------------------------------
    // 2. Events widget state
    // --------------------------------------------------------------------------
    const today = startOfDay(new Date());
    const eventsState = {
        visibleMonth: startOfMonth(today),
        selectedDate: today,
        categoryFilter: 'all',
        kidFriendlyOnly: false
    };

    // --------------------------------------------------------------------------
    // 3. Events widget rendering
    // --------------------------------------------------------------------------
    /**
     * @param {Program} program
     * @param {LanguageCode} language
     */
    function getProgramTitle(program, language) {
        return program.title[language] || TITLE_FALLBACK_ORDER.map(code => program.title[code]).find(Boolean) || '';
    }

    /** @param {EventsLabelSet} labels */
    function renderCategoryChips(labels) {
        const container = byId('chips');
        if (!container) return;

        const categoryButtons = /** @type {('all'|ProgramCategory)[]} */ (['all', ...Object.keys(labels.t)])
            .map(category => {
                const isActive = eventsState.categoryFilter === category;
                const label = category === 'all' ? labels.all : labels.t[category];
                return `<button data-f="${category}" class="${isActive ? 'on' : ''}">${escapeHtml(label)}</button>`;
            })
            .join('');
        const kidsButton = `<button data-k="1" class="${eventsState.kidFriendlyOnly ? 'on' : ''}">👶 ${escapeHtml(labels.kid)}</button>`;
        container.innerHTML = categoryButtons + kidsButton;
    }

    /**
     * @param {string} locale
     * @param {EventsLabelSet} labels
     */
    function renderCalendar(locale, labels) {
        const container = byId('cal');
        if (!container) return;

        const { visibleMonth, selectedDate } = eventsState;
        const leadingBlanks = (visibleMonth.getDay() + 6) % 7; // week starts on Monday
        const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
        const canGoBack = visibleMonth > startOfMonth(today);

        const weekdayHeaders = Array.from(
            { length: 7 },
            (_, offset) => `<i>${new Date(2024, 0, 1 + offset).toLocaleDateString(locale, { weekday: 'short' })}</i>`
        ).join('');

        let dayCells = '<span></span>'.repeat(leadingBlanks);
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day);
            const classes = [
                date.getTime() === today.getTime() ? 'td' : '',
                date.getTime() === selectedDate.getTime() ? 'sl' : ''
            ].join(' ').trim();
            dayCells += `<button data-d="${toIsoDate(date)}" ${date < today ? 'disabled' : ''} class="${classes}">${day}</button>`;
        }

        container.innerHTML = `
            <div class="ch">
                <button data-m="-1" ${canGoBack ? '' : 'disabled'} aria-label="${escapeHtml(labels.prevMonth)}">‹</button>
                <b>${visibleMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}</b>
                <button data-m="1" aria-label="${escapeHtml(labels.nextMonth)}">›</button>
            </div>
            <div class="cg">${weekdayHeaders}${dayCells}</div>
        `;
    }

    /**
     * @param {Program} program
     * @param {boolean} isPickOfTheDay
     * @param {EventsLabelSet} labels
     * @param {LanguageCode} language
     */
    function renderProgramCard(program, isPickOfTheDay, labels, language) {
        const title = escapeHtml(getProgramTitle(program, language));
        const safeUrl = program.url ? toSafeUrl(program.url) : '';
        const titleMarkup = safeUrl
            ? `<a href="${safeUrl}" target="_blank" rel="noopener">${title}</a>`
            : title;

        return `
            <div class="pg ${isPickOfTheDay ? 'pk' : ''}">
                <div class="pg-body">
                    ${isPickOfTheDay ? `<span class="pk-l">★ ${escapeHtml(labels.pick)}</span>` : ''}
                    <strong>${program.dates ? '📅 ' : ''}${titleMarkup}</strong>
                    <div class="bd2">
                        ${program.time ? `<em>🕒 ${escapeHtml(program.time)}</em>` : ''}
                        ${program.venue ? `<em class="pg-venue">📍 ${escapeHtml(program.venue)}</em>` : ''}
                        ${program.distanceKm === undefined ? '' : `<em>~${Number(program.distanceKm)} ${escapeHtml(labels.km)}</em>`}
                        <em>${escapeHtml(labels.t[program.category])}</em>
                        ${program.kidFriendly ? `<em class="k">👶 ${escapeHtml(labels.ok)}</em>` : ''}
                    </div>
                </div>
            </div>`;
    }

    /**
     * @param {LanguageCode} language
     * @param {EventsLabelSet} labels
     * @param {string} locale
     */
    function renderDayPrograms(language, labels, locale) {
        const container = byId('dp');
        if (!container) return;

        const { selectedDate, categoryFilter, kidFriendlyOnly } = eventsState;
        const month = selectedDate.getMonth() + 1;
        const isoDate = toIsoDate(selectedDate);

        const programsOfTheDay = RECURRING_PROGRAMS.filter(program => (program.months || []).includes(month))
            .concat(DATED_EVENTS.filter(event => eventOccursOn(event, isoDate)));
        const dayOfYear = Math.floor((selectedDate.getTime() - new Date(selectedDate.getFullYear(), 0, 0).getTime()) / MS_PER_DAY);
        const pickOfTheDay = programsOfTheDay.length
            ? programsOfTheDay[dayOfYear % programsOfTheDay.length]
            : null;

        let visiblePrograms = programsOfTheDay.filter(
            program => (categoryFilter === 'all' || program.category === categoryFilter) && (!kidFriendlyOnly || program.kidFriendly)
        );
        if (pickOfTheDay && visiblePrograms.includes(pickOfTheDay)) {
            visiblePrograms = [pickOfTheDay, ...visiblePrograms.filter(program => program !== pickOfTheDay)];
        }

        const heading = `<h3 id="dp-heading">${escapeHtml(selectedDate.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }))}</h3>`;
        const body = visiblePrograms.length
            ? visiblePrograms
                  .map(program => renderProgramCard(program, program === pickOfTheDay, labels, language))
                  .join('')
            : `<p>${escapeHtml(labels.none)}</p>`;
        // The heading stays put; the cards and the source note scroll (keyboard-focusable, named by the heading).
        container.innerHTML = `${heading}<div class="dp-list" role="region" tabindex="0" aria-labelledby="dp-heading">${body}${renderSourceNote(labels, locale)}</div>`;
    }

    /**
     * "Sources: a, b and c. Last updated: …" with links to every source that delivered events.
     * @param {EventsLabelSet} labels
     * @param {string} locale
     */
    function renderSourceNote(labels, locale) {
        const { sources, updatedOn } = EVENTS_SOURCE_INFO;
        const sourceLinks = sources
            .map(source => {
                const safeUrl = toSafeUrl(source.url);
                return safeUrl ? `<a href="${safeUrl}" target="_blank" rel="noopener">${escapeHtml(source.label)}</a>` : '';
            })
            .filter(Boolean);
        const sourceList = sourceLinks.length
            ? ` ${escapeHtml(labels.sources)} ${new Intl.ListFormat(locale, { type: 'conjunction' }).format(sourceLinks)}.`
            : '';
        const [year, month, day] = updatedOn.split('-').map(Number);
        const updated = year
            ? ` ${escapeHtml(labels.updated)} ${escapeHtml(new Date(year, month - 1, day).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' }))}.`
            : '';
        return `<p class="nt">${escapeHtml(labels.note)}${sourceList}${updated}</p>`;
    }

    function renderEventsWidget() {
        const pageLanguage = document.documentElement.lang;
        const activeLanguage = /** @type {LanguageCode} */ (pageLanguage in EVENTS_LABELS ? pageLanguage : DEFAULT_LANGUAGE);
        const labels = EVENTS_LABELS[activeLanguage];
        const locale = DATE_LOCALES[activeLanguage];

        renderCategoryChips(labels);
        renderCalendar(locale, labels);
        renderDayPrograms(activeLanguage, labels, locale);
    }

    function initEventsWidget() {
        const eventsSection = byId('events');
        if (!eventsSection) return;

        eventsSection.addEventListener('click', event => {
            const button = event.target instanceof Element ? event.target.closest('button') : null;
            if (!button) return;

            const { f: category, k: kidToggle, m: monthOffset, d: isoDate } = button.dataset;
            if (category) {
                eventsState.categoryFilter = category;
            } else if (kidToggle) {
                eventsState.kidFriendlyOnly = !eventsState.kidFriendlyOnly;
            } else if (monthOffset) {
                const { visibleMonth } = eventsState;
                eventsState.visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + Number(monthOffset), 1);
            } else if (isoDate) {
                const [year, month, day] = isoDate.split('-').map(Number);
                eventsState.selectedDate = new Date(year, month - 1, day);
            } else {
                return;
            }
            renderEventsWidget();
        });

        renderEventsWidget();
    }

    // --------------------------------------------------------------------------
    // 4. Gallery carousel (infinite loop on narrow screens)
    // --------------------------------------------------------------------------
    /**
     * Surrounds the real slides with one clone on each side so scrolling past
     * either end can jump invisibly to the opposite real slide. Clones are hidden
     * by CSS once the gallery switches to its desktop grid.
     */
    /**
     * @param {Element} track
     * @param {Element[]} realSlides
     */
    function addLoopClones(track, realSlides) {
        /** @param {Element} slide */
        const createClone = slide => {
            const clone = /** @type {Element} */ (slide.cloneNode(true));
            clone.classList.add('clone');
            clone.setAttribute('aria-hidden', 'true');
            clone.querySelectorAll('img').forEach(image => image.setAttribute('alt', ''));
            return clone;
        };
        track.prepend(createClone(realSlides[realSlides.length - 1]));
        track.append(createClone(realSlides[0]));
    }

    function initGalleryCarousel() {
        const maybeScroller = /** @type {HTMLElement | null} */ (document.querySelector('.gal-wrap'));
        const track = maybeScroller && maybeScroller.querySelector('.gal');
        if (!maybeScroller || !track) return;
        const scroller = maybeScroller;

        const realSlides = /** @type {HTMLElement[]} */ (Array.from(track.querySelectorAll('.gal-item')));
        if (realSlides.length < 2) return;
        addLoopClones(track, realSlides);

        const slides = /** @type {HTMLElement[]} */ (Array.from(track.children));
        const firstRealSlide = slides[1];
        const lastRealSlide = slides[slides.length - 2];
        const isScrollable = () => scroller.scrollWidth > scroller.clientWidth;
        let isJumping = false;
        /** @type {ReturnType<typeof setTimeout> | undefined} */
        let settleTimer;

        /** @param {HTMLElement} slide */
        const scrollToSlide = slide => scroller.scrollTo({ left: slide.offsetLeft, behavior: 'instant' });

        /** @param {HTMLElement} targetSlide */
        function jumpWithoutSnapping(targetSlide) {
            isJumping = true;
            scroller.style.scrollSnapType = 'none';
            scrollToSlide(targetSlide);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    scroller.style.scrollSnapType = 'x mandatory';
                    isJumping = false;
                });
            });
        }

        function loopIfAtEdge() {
            if (isJumping || !isScrollable()) return;

            const position = scroller.scrollLeft;
            if (position <= slides[0].offsetLeft + CAROUSEL_EDGE_TOLERANCE_PX) {
                jumpWithoutSnapping(lastRealSlide);
            } else if (position >= slides[slides.length - 1].offsetLeft - CAROUSEL_EDGE_TOLERANCE_PX) {
                jumpWithoutSnapping(firstRealSlide);
            }
        }

        const showFirstRealSlide = () => {
            if (isScrollable()) scrollToSlide(firstRealSlide);
        };

        scroller.addEventListener('scrollend', loopIfAtEdge);
        scroller.addEventListener('scroll', () => {
            clearTimeout(settleTimer);
            settleTimer = setTimeout(loopIfAtEdge, CAROUSEL_SCROLL_SETTLE_MS);
        }, { passive: true });

        window.addEventListener('resize', () => {
            clearTimeout(settleTimer);
            settleTimer = setTimeout(showFirstRealSlide, CAROUSEL_RESIZE_SETTLE_MS);
        });

        requestAnimationFrame(showFirstRealSlide);
    }

    // --------------------------------------------------------------------------
    // 5. Bootstrap
    // --------------------------------------------------------------------------
    function init() {
        initGalleryCarousel();
        initEventsWidget();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
