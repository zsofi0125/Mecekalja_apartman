/**
 * ==============================================================================
 * Mecsekalja Apartman · Events widget labels (loaded in the browser)
 * Page copy lives in translations.js and is rendered at build time.
 * ==============================================================================
 */

/**
 * Calendar widget and program filter labels.
 */
/**
 * @typedef {Object} EventsLabelSet
 * @property {string} prevMonth
 * @property {string} nextMonth
 * @property {string} h - Section heading
 * @property {string} p - Section intro
 * @property {string} all
 * @property {string} kid
 * @property {string} ok
 * @property {string} no
 * @property {string} km
 * @property {string} pick
 * @property {string} none
 * @property {string} note
 * @property {string} sources - Prefix of the source list under the programs
 * @property {string} updated - Prefix of the last update date
 * @property {Record<ProgramCategory, string>} t - Category names
 */

/** @type {Record<LanguageCode, EventsLabelSet>} */
const EVENTS_LABELS = {
    en: {
        prevMonth: 'Previous month',
        nextMonth: 'Next month',
        h: 'Current events in and around Pécs',
        p: 'Pick a day to see programs nearby. The calendar always starts from today’s date.',
        all: 'All',
        kid: 'For kids',
        ok: 'Kid-friendly',
        no: 'Not for little ones',
        km: 'km away',
        pick: 'Pick of the day',
        none: 'Nothing matches these filters.',
        note: 'Events are collected automatically from the organisers’ websites. Please check the details on the original page before you go.',
        sources: 'Sources:',
        updated: 'Last updated:',
        t: {
            relax: 'Relax',
            active: 'Active',
            culture: 'Culture',
            family: 'Family fun',
            food: 'Food & wine'
        }
    },
    hu: {
        prevMonth: 'Előző hónap',
        nextMonth: 'Következő hónap',
        h: 'Aktuális programok Pécsen és környékén',
        p: 'Válasszon egy napot, és nézze meg a közeli programokat. A naptár mindig a mai naptól indul.',
        all: 'Mind',
        kid: 'Gyerekeknek',
        ok: 'Gyerekbarát',
        no: 'Kisgyerekeknek nem ideális',
        km: 'km-re',
        pick: 'A nap ajánlata',
        none: 'Nincs a szűrőknek megfelelő program.',
        note: 'A programokat automatikusan gyűjtjük a szervezők oldalairól. Indulás előtt kérjük, ellenőrizze a részleteket az eredeti oldalon.',
        sources: 'Források:',
        updated: 'Utolsó frissítés:',
        t: {
            relax: 'Pihenés',
            active: 'Aktív',
            culture: 'Kultúra',
            family: 'Családi program',
            food: 'Gasztro és bor'
        }
    },
    de: {
        prevMonth: 'Vorheriger Monat',
        nextMonth: 'Nächster Monat',
        h: 'Aktuelle Veranstaltungen in und um Pécs',
        p: 'Wählen Sie einen Tag, um Programme in der Nähe zu sehen. Der Kalender beginnt immer mit dem heutigen Datum.',
        all: 'Alle',
        kid: 'Für Kinder',
        ok: 'Kinderfreundlich',
        no: 'Nicht für Kleinkinder',
        km: 'km entfernt',
        pick: 'Tipp des Tages',
        none: 'Keine Programme für diese Filter.',
        note: 'Die Veranstaltungen werden automatisch von den Websites der Veranstalter gesammelt. Bitte prüfen Sie die Details vor dem Besuch auf der Originalseite.',
        sources: 'Quellen:',
        updated: 'Zuletzt aktualisiert:',
        t: {
            relax: 'Entspannung',
            active: 'Aktiv',
            culture: 'Kultur',
            family: 'Familienspaß',
            food: 'Essen & Wein'
        }
    }
};

/**
 * Event source disclaimers and notes.
 */
/** @type {Record<LanguageCode, {no: string}>} */
const EVENTS_NOTES = {
    en: {
        no: 'Not specifically for kids'
    },
    hu: {
        no: 'Nem kifejezetten gyerekeknek'
    },
    de: {
        no: 'Nicht speziell für Kinder'
    }
};

/**
 * Locale codes for date formatting with Intl.DateTimeFormat.
 */
/** @type {Record<LanguageCode, string>} */
const DATE_LOCALES = {
    en: 'en-GB',
    hu: 'hu-HU',
    de: 'de-DE'
};
