/**
 * ==============================================================================
 * Mecsekalja Apartman · Programs & Events Data
 * ==============================================================================
 */

/** Helper to generate integer ranges (inclusive) */
const R = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/** All year (months 1-12) */
const AY = R(1, 12);

/**
 * External event listing and program portal links
 */
const PT = 'https://www.programturizmus.hu/ajanlat-pecs-programok-esemenyek-rendezvenyek.html';
const PZ = 'https://www.programturizmus.hu/ajanlat-zsolnay-negyed.html';
const PK = 'https://www.programturizmus.hu/ajanlat-pecsi-koncertek.html';
const PM = 'https://pecsimami.hu/aktualis-programok/';
const PH = 'https://pecs.hu/programok/';

/**
 * Event Factory function
 * @param {string|string[]} d - ISO date string ('YYYY-MM-DD'), range ('YYYY-MM-DD..YYYY-MM-DD'), or array of dates
 * @param {number} km - Approximate distance in km from apartment
 * @param {number} kid - 1 if kid-friendly, 0 otherwise
 * @param {string} t - Category tag ('relax'|'active'|'culture'|'family'|'food')
 * @param {string} hu - Hungarian title
 * @param {string} en - English title
 * @param {string} [de] - German title (defaults to English if omitted)
 * @param {string} [u] - Information URL
 */
const E = (d, km, kid, t, hu, en, de, u) => ({
    d,
    km,
    kid,
    t,
    n: [en, hu, de || en],
    u: u || PT
});

/**
 * Matches an event date definition against a target ISO date key
 */
const hit = (e, k) => {
    const d = e.d;
    if (typeof d === 'string' && d.includes('..')) {
        const [a, b] = d.split('..');
        return k >= a && k <= b;
    }
    return [].concat(d).includes(k);
};

/**
 * General recurring & seasonal sights and programs around Pécs.
 * Format of n: [English, Hungarian, German]
 */
const P = [
    { km: 8, kid: 1, t: 'active', m: AY, n: ['Hike to Misina Peak and the TV tower', 'Túra a Misina-tetőre és a tévétoronyhoz', 'Wanderung zum Misina-Gipfel und Fernsehturm'] },
    { km: 6, kid: 1, t: 'relax', m: AY, n: ['Forest walk at Dömörkapu', 'Erdei séta Dömörkapunál', 'Waldspaziergang bei Dömörkapu'] },
    { km: 9, kid: 1, t: 'family', m: AY, n: ['Pécs Zoo', 'Pécsi Állatkert', 'Zoo Pécs'] },
    { km: 5, kid: 1, t: 'culture', m: AY, n: ['Zsolnay Cultural Quarter', 'Zsolnay Kulturális Negyed', 'Zsolnay-Kulturviertel'] },
    { km: 6, kid: 1, t: 'culture', m: AY, n: ['Old town walk: Széchenyi Square and mosque', 'Belvárosi séta: Széchenyi tér és dzsámi', 'Altstadtspaziergang: Széchenyi-Platz und Moschee'] },
    { km: 6, kid: 1, t: 'food', m: AY, n: ['Coffee and cake in the old town', 'Kávé és sütemény a belvárosban', 'Kaffee und Kuchen in der Altstadt'] },
    { km: 22, kid: 1, t: 'family', m: R(6, 8), n: ['Orfű lakes: swimming and boat trips', 'Orfűi tavak: fürdés és csónakázás', 'Orfűer Seen: Baden und Bootsfahrten'] },
    { km: 22, kid: 1, t: 'active', m: R(4, 10), n: ['Cycling around Orfű', 'Kerékpározás Orfű körül', 'Radfahren rund um Orfű'] },
    { km: 27, kid: 1, t: 'relax', m: AY, n: ['Harkány thermal spa', 'Harkányi gyógyfürdő', 'Thermalbad Harkány'] },
    { km: 33, kid: 0, t: 'food', m: AY, n: ['Villány wine route tasting', 'Villányi borút, borkóstoló', 'Weinprobe an der Villányer Weinstraße'] }
];

/**
 * Specific dated events and performances
 */
const EVENTS = [
    E('2026-11-20..2026-11-22', 5, 1, 'family', 'XXXIX. Vasútmodell parádé a Főpályaudvaron (LEGO, játékvonatok)', 'Model railway show at the main station (LEGO, toy trains)', 'Modelleisenbahn-Schau am Hauptbahnhof (LEGO, Spielzeugeisenbahnen)', PM + 'xxxix-vasutmodell-parade-palyaudvaron'),
    E('2026-11-20', 5, 1, 'family', 'Öko-Kuckó családi délután (15:30–18:30)', 'Eco-Kuckó family afternoon (3:30–6:30 pm)', 'Öko-Kuckó Familiennachmittag (15:30–18:30)', PM + 'oko-kucko-csaladi-delutan-5'),
    E('2026-11-19', 5, 1, 'family', 'Kalandozás a csillagos égbolton – planetáriumi előadás (16:00)', 'Adventure under the stars – planetarium show (4 pm)', 'Abenteuer am Sternenhimmel – Planetariumsshow (16:00)', PM + 'kalandozas-csillagos-egbolton-eloadas-planetariumban-272'),
    E('2026-11-21', 5, 1, 'family', 'Rumini kalandjáték a gyerekkönyvtárban (9:00)', 'Rumini adventure game at the children’s library (9 am)', 'Rumini-Abenteuerspiel in der Kinderbibliothek (9:00)', PM + 'az-ellopott-kincs-nyomaban-rumini-kalandjatek-csorba-gyozo-konyvtar-2'),
    E('2026-11-21', 5, 1, 'family', 'Kultik matié: Shaun, a bárány és Moszatvég szörnye (10:00)', 'Kids’ cinema: Shaun the Sheep – The Beast of Mossy Bottom (10 am)', 'Kinderkino: Shaun das Schaf – Das Biest von Mossy Bottom (10:00)', PM + 'kultik-matine-shaun-barany-es-moszatveg-szornye-filmvetites-kultik-pecs-urania'),
    E('2026-11-18..2026-12-30', 5, 1, 'culture', 'Dallam és Bábu egy ütemre – a Bóbita Bábszínház kiállítása', 'Melody and puppet in rhythm – exhibition at Bóbita Puppet Theatre', 'Melodie und Puppe im Takt – Ausstellung im Bóbita-Puppentheater', PH + 'dallam-es-babu-egy-utemre-bobita-babszinhaz-tematikus-kiallitasa/'),
    E('2026-11-13..2026-12-13', 5, 1, 'family', 'Karácsonyi családi fotózás a Zsolnay Negyedben', 'Christmas family photo shoot in the Zsolnay Quarter', 'Weihnachtliches Familienfotoshooting im Zsolnay-Viertel', PZ),
    E('2026-11-16..2026-11-22', 5, 1, 'family', 'Családi és gyermekprogramok a Zsolnay Negyedben', 'Family and children’s programs in the Zsolnay Quarter', 'Familien- und Kinderprogramme im Zsolnay-Viertel', 'https://www.programturizmus.hu/ajanlat-csaladi-program-pecs.html'),
    E('2026-12-28', 5, 1, 'family', 'Varázsóra – Megrázó kísérletek', 'Magic hour – shocking experiments', 'Zauberstunde – verblüffende Experimente', PH + 'varazsora-megrazo-kiserletek-12-28/'),
    E('2026-12-05', 5, 1, 'family', 'Csempehajtogatás – füzetborító műhely', 'Tile-folding workshop: notebook covers', 'Kachel-Faltwerkstatt: Heftumschläge', PH + 'csempehajtogatas-fuzetborito-muhely-12-5/'),
    E(['2026-11-21', '2026-12-19'], 5, 0, 'active', 'Csempehajtogatás – képkészítő műhely', 'Tile-folding workshop: make a picture', 'Kachel-Faltwerkstatt: Bild gestalten', PH),
    E('2026-12-05', 5, 0, 'active', 'Csempehajtogatás – képeslapkészítő műhely', 'Tile-folding workshop: make postcards', 'Kachel-Faltwerkstatt: Postkarten', PH),
    E('2026-11-22', 5, 0, 'active', 'Kerámia élményfestés a Zsolnay Negyedben', 'Ceramic painting experience in the Zsolnay Quarter', 'Keramikmalen im Zsolnay-Viertel', PH + 'keramia-elmenyfestes-11-22/'),
    E('2026-11-19', 5, 0, 'culture', 'Vivaldi: A négy évszak – gyertyafényes koncert', 'Vivaldi’s Four Seasons by candlelight', 'Vivaldis Vier Jahreszeiten bei Kerzenschein', PK),
    E('2026-11-19', 5, 0, 'culture', 'Metronóm Jazz Klub: Dés András Quartet', 'Metronóm Jazz Club: Dés András Quartet', 'Metronóm Jazzclub: Dés András Quartet', PZ),
    E('2026-11-20', 5, 0, 'culture', 'Kowalsky meg a Vega – koncert', 'Kowalsky meg a Vega – concert', 'Kowalsky meg a Vega – Konzert', PK),
    E('2026-11-27', 5, 0, 'culture', 'Zsolnay Táncház a Misija tamburazenekarral', 'Zsolnay folk dance house with the Misija tamburica band', 'Zsolnay-Tanzhaus mit der Tamburica-Band Misija', PZ),
    E('2026-11-28', 5, 0, 'culture', 'Magyar Banda – koncert', 'Magyar Banda – concert', 'Magyar Banda – Konzert', PK),
    E(['2026-11-28', '2026-12-05', '2026-12-12', '2026-12-19'], 5, 0, 'culture', 'Adventi koncertek a Pécsi Nemzeti Színházban', 'Advent concerts at the Pécs National Theatre', 'Adventskonzerte im Nationaltheater Pécs', PK),
    E(['2026-11-21', '2026-11-28', '2026-12-05', '2026-12-12', '2026-12-19'], 5, 0, 'food', 'Pécsi sörtúr: sörfőzde-látogatás kóstolóval', 'Pécs beer tour: brewery visit with tasting', 'Pécsi-Biertour: Brauereibesuch mit Verkostung', 'https://www.programturizmus.hu/ajanlat-pecsi-sortura.html'),
    E('2026-11-29', 5, 0, 'food', 'Adventi Borszalon', 'Advent wine salon', 'Advents-Weinsalon', 'https://www.programturizmus.hu/ajanlat-adventi-borszalon.html'),
    E('2026-12-05', 5, 0, 'culture', 'Braindogs – Tom Waits dalok élőben (20:00)', 'Braindogs – Tom Waits songs live (8 pm)', 'Braindogs – Tom-Waits-Songs live (20:00)', 'https://www.e78.hu/programok/braindogs-tom-waits-dalok-eloben_2026'),
    E('2026-12-12', 5, 0, 'culture', 'Ennio Morricone filmzenéje gyertyafénynél', 'Ennio Morricone film music by candlelight', 'Ennio-Morricone-Filmmusik bei Kerzenschein', PK),
    E('2026-12-15', 5, 0, 'culture', 'Diótörő gyertyafényben (Palatinus Grand Hotel)', 'The Nutcracker by candlelight (Palatinus Grand Hotel)', 'Der Nussknacker bei Kerzenschein (Palatinus Grand Hotel)', PK),
    E('2026-12-17', 5, 0, 'culture', 'Blues Guitar Showdown (19:00)', 'Blues Guitar Showdown (7 pm)', 'Blues Guitar Showdown (19:00)', 'https://www.e78.hu/programok/blues-guitar-showdown-little-g.-weevil-tommy-katona-petendi-tamas'),
    E(['2026-12-20', '2026-12-21'], 5, 0, 'culture', 'A Zsolnay Mauzóleum titkai a téli napfordúlón', 'Secrets of the Zsolnay Mausoleum at the winter solstice', 'Geheimnisse des Zsolnay-Mausoleums zur Wintersonnenwende', PZ),
    E('2026-12-28', 5, 0, 'culture', 'Párnatollhullás – a Kiscsillag akusztikus koncertje (19:00)', 'Párnatollhullás – acoustic concert by Kiscsillag (7 pm)', 'Párnatollhullás – Akustikkonzert von Kiscsillag (19:00)', 'https://www.kodalykozpont.hu/programok/parnatollhullas-a-kiscsillag-akusztikus-csilles-koncertje'),
    E('2026-12-29', 5, 0, 'culture', 'Boban Marković Orkestar – évzáró koncert (19:00)', 'Boban Marković Orkestar – year-end concert (7 pm)', 'Boban Marković Orkestar – Jahresabschlusskonzert (19:00)', 'https://www.kodalykozpont.hu/programok/boban-markovic-orkestar-evzaro-koncert'),
    E('2026-12-31', 5, 0, 'culture', 'Városi szilveszter Pécs', 'Pécs city New Year’s Eve', 'Stadt-Silvester in Pécs', 'https://www.programturizmus.hu/ajanlat-varosi-szilveszter-pecs.html'),
    E('2027-01-09', 5, 0, 'culture', 'Made in Pécs Fesztivál 2027', 'Made in Pécs Festival 2027', 'Made-in-Pécs-Festival 2027', 'https://www.programturizmus.hu/ajanlat-made-in-pecs-fesztival.html')
];
