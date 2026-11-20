/**
 * ==============================================================================
 * Mecsekalja Apartman · Programs & Events Data
 * ==============================================================================
 */

/** @typedef {'hu'|'en'|'de'} LanguageCode */
/** @typedef {'relax'|'active'|'culture'|'family'|'food'} ProgramCategory */
/** @typedef {Record<LanguageCode, string>} LocalizedText */

/**
 * A recurring program (has `months`) or a dated event (has `dates`).
 * @typedef {Object} Program
 * @property {number} distanceKm - Approximate distance from the apartment
 * @property {boolean} kidFriendly
 * @property {ProgramCategory} category
 * @property {LocalizedText} title
 * @property {number[]} [months] - Months (1-12) in which a recurring program is available
 * @property {string|string[]} [dates] - ISO date, 'start..end' range, or list of ISO dates
 * @property {string} [url]
 */

/**
 * Helper to generate integer ranges (inclusive)
 * @param {number} a - First value
 * @param {number} b - Last value
 * @returns {number[]}
 */
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/** All year (months 1-12) */
const ALL_YEAR_MONTHS = range(1, 12);

/**
 * External event listing and program portal links
 */
const PROGRAM_TURIZMUS_PECS_EVENTS_URL = 'https://www.programturizmus.hu/ajanlat-pecs-programok-esemenyek-rendezvenyek.html';
const PROGRAM_TURIZMUS_ZSOLNAY_URL = 'https://www.programturizmus.hu/ajanlat-zsolnay-negyed.html';
const PROGRAM_TURIZMUS_CONCERTS_URL = 'https://www.programturizmus.hu/ajanlat-pecsi-koncertek.html';
const PECSI_MAMI_URL = 'https://pecsimami.hu/aktualis-programok/';
const PECS_HU_PROGRAMS_URL = 'https://pecs.hu/programok/';

/**
 * Builds a dated event.
 * @param {Object} event
 * @param {string|string[]} event.dates - ISO date ('YYYY-MM-DD'), range ('YYYY-MM-DD..YYYY-MM-DD'), or array of dates
 * @param {number} event.distanceKm - Approximate distance in km from the apartment
 * @param {boolean} event.kidFriendly
 * @param {'relax'|'active'|'culture'|'family'|'food'} event.category
 * @param {{hu: string, en: string, de?: string}} event.title - German falls back to English
 * @param {string} [event.url] - Information URL, defaults to the general Pécs events listing
 * @returns {Program}
 */
const createEvent = ({ dates, distanceKm, kidFriendly, category, title, url }) => ({
    dates,
    distanceKm,
    kidFriendly,
    category,
    title: { ...title, de: title.de || title.en },
    url: url || PROGRAM_TURIZMUS_PECS_EVENTS_URL
});

/**
 * Tells whether an event takes place on the given ISO date key ('YYYY-MM-DD').
 * @param {Program} event
 * @param {string} isoDate
 * @returns {boolean}
 */
const eventOccursOn = (event, isoDate) => {
    const { dates } = event;
    if (typeof dates === 'string' && dates.includes('..')) {
        const [firstDay, lastDay] = dates.split('..');
        return isoDate >= firstDay && isoDate <= lastDay;
    }
    return Array.isArray(dates) ? dates.includes(isoDate) : dates === isoDate;
};

/**
 * General recurring & seasonal sights and programs around Pécs.
 * Titles are keyed by language code.
 */
/** @type {Program[]} */
const RECURRING_PROGRAMS = [
    { distanceKm: 8, kidFriendly: true, category: 'active', months: ALL_YEAR_MONTHS, title: { hu: 'Túra a Misina-tetőre és a tévétoronyhoz', en: 'Hike to Misina Peak and the TV tower', de: 'Wanderung zum Misina-Gipfel und Fernsehturm' } },
    { distanceKm: 6, kidFriendly: true, category: 'relax', months: ALL_YEAR_MONTHS, title: { hu: 'Erdei séta Dömörkapunál', en: 'Forest walk at Dömörkapu', de: 'Waldspaziergang bei Dömörkapu' } },
    { distanceKm: 9, kidFriendly: true, category: 'family', months: ALL_YEAR_MONTHS, title: { hu: 'Pécsi Állatkert', en: 'Pécs Zoo', de: 'Zoo Pécs' } },
    { distanceKm: 5, kidFriendly: true, category: 'culture', months: ALL_YEAR_MONTHS, title: { hu: 'Zsolnay Kulturális Negyed', en: 'Zsolnay Cultural Quarter', de: 'Zsolnay-Kulturviertel' } },
    { distanceKm: 6, kidFriendly: true, category: 'culture', months: ALL_YEAR_MONTHS, title: { hu: 'Belvárosi séta: Széchenyi tér és dzsámi', en: 'Old town walk: Széchenyi Square and mosque', de: 'Altstadtspaziergang: Széchenyi-Platz und Moschee' } },
    { distanceKm: 6, kidFriendly: true, category: 'food', months: ALL_YEAR_MONTHS, title: { hu: 'Kávé és sütemény a belvárosban', en: 'Coffee and cake in the old town', de: 'Kaffee und Kuchen in der Altstadt' } },
    { distanceKm: 22, kidFriendly: true, category: 'family', months: range(6, 8), title: { hu: 'Orfűi tavak: fürdés és csónakázás', en: 'Orfű lakes: swimming and boat trips', de: 'Orfűer Seen: Baden und Bootsfahrten' } },
    { distanceKm: 22, kidFriendly: true, category: 'active', months: range(4, 10), title: { hu: 'Kerékpározás Orfű körül', en: 'Cycling around Orfű', de: 'Radfahren rund um Orfű' } },
    { distanceKm: 27, kidFriendly: true, category: 'relax', months: ALL_YEAR_MONTHS, title: { hu: 'Harkányi gyógyfürdő', en: 'Harkány thermal spa', de: 'Thermalbad Harkány' } },
    { distanceKm: 33, kidFriendly: false, category: 'food', months: ALL_YEAR_MONTHS, title: { hu: 'Villányi borút, borkóstoló', en: 'Villány wine route tasting', de: 'Weinprobe an der Villányer Weinstraße' } }
];

/**
 * Specific dated events and performances
 */
/** @type {Program[]} */
const DATED_EVENTS = [
    createEvent({ dates: '2026-11-20..2026-11-22', distanceKm: 5, kidFriendly: true, category: 'family', title: { hu: 'XXXIX. Vasútmodell parádé a Főpályaudvaron (LEGO, játékvonatok)', en: 'Model railway show at the main station (LEGO, toy trains)', de: 'Modelleisenbahn-Schau am Hauptbahnhof (LEGO, Spielzeugeisenbahnen)' }, url: PECSI_MAMI_URL + 'xxxix-vasutmodell-parade-palyaudvaron' }),
    createEvent({ dates: '2026-11-20', distanceKm: 5, kidFriendly: true, category: 'family', title: { hu: 'Öko-Kuckó családi délután (15:30–18:30)', en: 'Eco-Kuckó family afternoon (3:30–6:30 pm)', de: 'Öko-Kuckó Familiennachmittag (15:30–18:30)' }, url: PECSI_MAMI_URL + 'oko-kucko-csaladi-delutan-5' }),
    createEvent({ dates: '2026-11-19', distanceKm: 5, kidFriendly: true, category: 'family', title: { hu: 'Kalandozás a csillagos égbolton – planetáriumi előadás (16:00)', en: 'Adventure under the stars – planetarium show (4 pm)', de: 'Abenteuer am Sternenhimmel – Planetariumsshow (16:00)' }, url: PECSI_MAMI_URL + 'kalandozas-csillagos-egbolton-eloadas-planetariumban-272' }),
    createEvent({ dates: '2026-11-21', distanceKm: 5, kidFriendly: true, category: 'family', title: { hu: 'Rumini kalandjáték a gyerekkönyvtárban (9:00)', en: 'Rumini adventure game at the children’s library (9 am)', de: 'Rumini-Abenteuerspiel in der Kinderbibliothek (9:00)' }, url: PECSI_MAMI_URL + 'az-ellopott-kincs-nyomaban-rumini-kalandjatek-csorba-gyozo-konyvtar-2' }),
    createEvent({ dates: '2026-11-21', distanceKm: 5, kidFriendly: true, category: 'family', title: { hu: 'Kultik matié: Shaun, a bárány és Moszatvég szörnye (10:00)', en: 'Kids’ cinema: Shaun the Sheep – The Beast of Mossy Bottom (10 am)', de: 'Kinderkino: Shaun das Schaf – Das Biest von Mossy Bottom (10:00)' }, url: PECSI_MAMI_URL + 'kultik-matine-shaun-barany-es-moszatveg-szornye-filmvetites-kultik-pecs-urania' }),
    createEvent({ dates: '2026-11-18..2026-12-30', distanceKm: 5, kidFriendly: true, category: 'culture', title: { hu: 'Dallam és Bábu egy ütemre – a Bóbita Bábszínház kiállítása', en: 'Melody and puppet in rhythm – exhibition at Bóbita Puppet Theatre', de: 'Melodie und Puppe im Takt – Ausstellung im Bóbita-Puppentheater' }, url: PECS_HU_PROGRAMS_URL + 'dallam-es-babu-egy-utemre-bobita-babszinhaz-tematikus-kiallitasa/' }),
    createEvent({ dates: '2026-11-13..2026-12-13', distanceKm: 5, kidFriendly: true, category: 'family', title: { hu: 'Karácsonyi családi fotózás a Zsolnay Negyedben', en: 'Christmas family photo shoot in the Zsolnay Quarter', de: 'Weihnachtliches Familienfotoshooting im Zsolnay-Viertel' }, url: PROGRAM_TURIZMUS_ZSOLNAY_URL }),
    createEvent({ dates: '2026-11-16..2026-11-22', distanceKm: 5, kidFriendly: true, category: 'family', title: { hu: 'Családi és gyermekprogramok a Zsolnay Negyedben', en: 'Family and children’s programs in the Zsolnay Quarter', de: 'Familien- und Kinderprogramme im Zsolnay-Viertel' }, url: 'https://www.programturizmus.hu/ajanlat-csaladi-program-pecs.html' }),
    createEvent({ dates: '2026-12-28', distanceKm: 5, kidFriendly: true, category: 'family', title: { hu: 'Varázsóra – Megrázó kísérletek', en: 'Magic hour – shocking experiments', de: 'Zauberstunde – verblüffende Experimente' }, url: PECS_HU_PROGRAMS_URL + 'varazsora-megrazo-kiserletek-12-28/' }),
    createEvent({ dates: '2026-12-05', distanceKm: 5, kidFriendly: true, category: 'family', title: { hu: 'Csempehajtogatás – füzetborító műhely', en: 'Tile-folding workshop: notebook covers', de: 'Kachel-Faltwerkstatt: Heftumschläge' }, url: PECS_HU_PROGRAMS_URL + 'csempehajtogatas-fuzetborito-muhely-12-5/' }),
    createEvent({ dates: ['2026-11-21', '2026-12-19'], distanceKm: 5, kidFriendly: false, category: 'active', title: { hu: 'Csempehajtogatás – képkészítő műhely', en: 'Tile-folding workshop: make a picture', de: 'Kachel-Faltwerkstatt: Bild gestalten' }, url: PECS_HU_PROGRAMS_URL }),
    createEvent({ dates: '2026-12-05', distanceKm: 5, kidFriendly: false, category: 'active', title: { hu: 'Csempehajtogatás – képeslapkészítő műhely', en: 'Tile-folding workshop: make postcards', de: 'Kachel-Faltwerkstatt: Postkarten' }, url: PECS_HU_PROGRAMS_URL }),
    createEvent({ dates: '2026-11-22', distanceKm: 5, kidFriendly: false, category: 'active', title: { hu: 'Kerámia élményfestés a Zsolnay Negyedben', en: 'Ceramic painting experience in the Zsolnay Quarter', de: 'Keramikmalen im Zsolnay-Viertel' }, url: PECS_HU_PROGRAMS_URL + 'keramia-elmenyfestes-11-22/' }),
    createEvent({ dates: '2026-11-19', distanceKm: 5, kidFriendly: false, category: 'culture', title: { hu: 'Vivaldi: A négy évszak – gyertyafényes koncert', en: 'Vivaldi’s Four Seasons by candlelight', de: 'Vivaldis Vier Jahreszeiten bei Kerzenschein' }, url: PROGRAM_TURIZMUS_CONCERTS_URL }),
    createEvent({ dates: '2026-11-19', distanceKm: 5, kidFriendly: false, category: 'culture', title: { hu: 'Metronóm Jazz Klub: Dés András Quartet', en: 'Metronóm Jazz Club: Dés András Quartet', de: 'Metronóm Jazzclub: Dés András Quartet' }, url: PROGRAM_TURIZMUS_ZSOLNAY_URL }),
    createEvent({ dates: '2026-11-20', distanceKm: 5, kidFriendly: false, category: 'culture', title: { hu: 'Kowalsky meg a Vega – koncert', en: 'Kowalsky meg a Vega – concert', de: 'Kowalsky meg a Vega – Konzert' }, url: PROGRAM_TURIZMUS_CONCERTS_URL }),
    createEvent({ dates: '2026-11-27', distanceKm: 5, kidFriendly: false, category: 'culture', title: { hu: 'Zsolnay Táncház a Misija tamburazenekarral', en: 'Zsolnay folk dance house with the Misija tamburica band', de: 'Zsolnay-Tanzhaus mit der Tamburica-Band Misija' }, url: PROGRAM_TURIZMUS_ZSOLNAY_URL }),
    createEvent({ dates: '2026-11-28', distanceKm: 5, kidFriendly: false, category: 'culture', title: { hu: 'Magyar Banda – koncert', en: 'Magyar Banda – concert', de: 'Magyar Banda – Konzert' }, url: PROGRAM_TURIZMUS_CONCERTS_URL }),
    createEvent({ dates: ['2026-11-28', '2026-12-05', '2026-12-12', '2026-12-19'], distanceKm: 5, kidFriendly: false, category: 'culture', title: { hu: 'Adventi koncertek a Pécsi Nemzeti Színházban', en: 'Advent concerts at the Pécs National Theatre', de: 'Adventskonzerte im Nationaltheater Pécs' }, url: PROGRAM_TURIZMUS_CONCERTS_URL }),
    createEvent({ dates: ['2026-11-21', '2026-11-28', '2026-12-05', '2026-12-12', '2026-12-19'], distanceKm: 5, kidFriendly: false, category: 'food', title: { hu: 'Pécsi sörtúr: sörfőzde-látogatás kóstolóval', en: 'Pécs beer tour: brewery visit with tasting', de: 'Pécsi-Biertour: Brauereibesuch mit Verkostung' }, url: 'https://www.programturizmus.hu/ajanlat-pecsi-sortura.html' }),
    createEvent({ dates: '2026-11-29', distanceKm: 5, kidFriendly: false, category: 'food', title: { hu: 'Adventi Borszalon', en: 'Advent wine salon', de: 'Advents-Weinsalon' }, url: 'https://www.programturizmus.hu/ajanlat-adventi-borszalon.html' }),
    createEvent({ dates: '2026-12-05', distanceKm: 5, kidFriendly: false, category: 'culture', title: { hu: 'Braindogs – Tom Waits dalok élőben (20:00)', en: 'Braindogs – Tom Waits songs live (8 pm)', de: 'Braindogs – Tom-Waits-Songs live (20:00)' }, url: 'https://www.e78.hu/programok/braindogs-tom-waits-dalok-eloben_2026' }),
    createEvent({ dates: '2026-12-12', distanceKm: 5, kidFriendly: false, category: 'culture', title: { hu: 'Ennio Morricone filmzenéje gyertyafénynél', en: 'Ennio Morricone film music by candlelight', de: 'Ennio-Morricone-Filmmusik bei Kerzenschein' }, url: PROGRAM_TURIZMUS_CONCERTS_URL }),
    createEvent({ dates: '2026-12-15', distanceKm: 5, kidFriendly: false, category: 'culture', title: { hu: 'Diótörő gyertyafényben (Palatinus Grand Hotel)', en: 'The Nutcracker by candlelight (Palatinus Grand Hotel)', de: 'Der Nussknacker bei Kerzenschein (Palatinus Grand Hotel)' }, url: PROGRAM_TURIZMUS_CONCERTS_URL }),
    createEvent({ dates: '2026-12-17', distanceKm: 5, kidFriendly: false, category: 'culture', title: { hu: 'Blues Guitar Showdown (19:00)', en: 'Blues Guitar Showdown (7 pm)', de: 'Blues Guitar Showdown (19:00)' }, url: 'https://www.e78.hu/programok/blues-guitar-showdown-little-g.-weevil-tommy-katona-petendi-tamas' }),
    createEvent({ dates: ['2026-12-20', '2026-12-21'], distanceKm: 5, kidFriendly: false, category: 'culture', title: { hu: 'A Zsolnay Mauzóleum titkai a téli napfordúlón', en: 'Secrets of the Zsolnay Mausoleum at the winter solstice', de: 'Geheimnisse des Zsolnay-Mausoleums zur Wintersonnenwende' }, url: PROGRAM_TURIZMUS_ZSOLNAY_URL }),
    createEvent({ dates: '2026-12-28', distanceKm: 5, kidFriendly: false, category: 'culture', title: { hu: 'Párnatollhullás – a Kiscsillag akusztikus koncertje (19:00)', en: 'Párnatollhullás – acoustic concert by Kiscsillag (7 pm)', de: 'Párnatollhullás – Akustikkonzert von Kiscsillag (19:00)' }, url: 'https://www.kodalykozpont.hu/programok/parnatollhullas-a-kiscsillag-akusztikus-csilles-koncertje' }),
    createEvent({ dates: '2026-12-29', distanceKm: 5, kidFriendly: false, category: 'culture', title: { hu: 'Boban Marković Orkestar – évzáró koncert (19:00)', en: 'Boban Marković Orkestar – year-end concert (7 pm)', de: 'Boban Marković Orkestar – Jahresabschlusskonzert (19:00)' }, url: 'https://www.kodalykozpont.hu/programok/boban-markovic-orkestar-evzaro-koncert' }),
    createEvent({ dates: '2026-12-31', distanceKm: 5, kidFriendly: false, category: 'culture', title: { hu: 'Városi szilveszter Pécs', en: 'Pécs city New Year’s Eve', de: 'Stadt-Silvester in Pécs' }, url: 'https://www.programturizmus.hu/ajanlat-varosi-szilveszter-pecs.html' }),
    createEvent({ dates: '2027-01-09', distanceKm: 5, kidFriendly: false, category: 'culture', title: { hu: 'Made in Pécs Fesztivál 2027', en: 'Made in Pécs Festival 2027', de: 'Made-in-Pécs-Festival 2027' }, url: 'https://www.programturizmus.hu/ajanlat-made-in-pecs-fesztival.html' })
];
