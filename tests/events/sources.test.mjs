/**
 * Each source adapter against a saved real response (tests/events/fixtures), offline.
 * When a site changes its markup, the matching test fails here first, with a readable message,
 * instead of the daily run silently producing fewer events.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, mockFetch, TEST_WINDOW } from './helpers.mjs';
import { pnszSource } from '../../scripts/events/sources/pnsz.mjs';
import { pecsimamiSource, parseHungarianDateText } from '../../scripts/events/sources/pecsimami.mjs';
import { pecsHuSource } from '../../scripts/events/sources/pecs-hu.mjs';
import { iranyPecsSource } from '../../scripts/events/sources/iranypecs.mjs';
import { harmadikSzinhazSource } from '../../scripts/events/sources/harmadik-szinhaz.mjs';
import { madeInPecsSource } from '../../scripts/events/sources/made-in-pecs.mjs';
import { createProgramsCmsSource } from '../../scripts/events/sources/programs-cms.mjs';

/** Runs `body` with a fake fetch and always restores the real one. */
async function withFetch(routes, body) {
    const mock = mockFetch(routes);
    try {
        return await body(mock);
    } finally {
        mock.restore();
    }
}

const assertWellFormed = events => {
    assert.ok(events.length > 0, 'no events');
    for (const event of events) {
        assert.ok(event.title?.trim(), 'empty title');
        assert.match(event.startDate, /^\d{4}-\d{2}-\d{2}$/);
        assert.match(event.url, /^https?:\/\//);
        if (event.time) assert.match(event.time, /^\d{2}:\d{2}$/);
        if (event.endDate) assert.ok(event.endDate > event.startDate, 'end date must be after start date');
    }
};

// ---------------------------------------------------------------- pnsz.hu
const PNSZ_ROUTES = {
    'https://www.pnsz.hu/havi-musor': fixture('pnsz-2026-11.html'),
    'https://www.pnsz.hu/havi-musor/2026-12': fixture('pnsz-2026-12.html'),
    'https://www.pnsz.hu/havi-musor/2027-01': fixture('pnsz-2027-01.html')
};

test('pnsz: reads title, date, time, venue and link, and follows "next month" within the window', async () => {
    await withFetch(PNSZ_ROUTES, async ({ calls }) => {
        const events = await pnszSource.scrape(TEST_WINDOW);
        assertWellFormed(events);
        assert.equal(events.length, 7);
        assert.deepEqual(events[0], {
            title: 'Esőember', url: 'https://www.pnsz.hu/szindarab/esoember/503',
            startDate: '2026-11-21', time: '19:00', venue: 'Kamaraszínház'
        });
        assert.deepEqual(calls.map(call => call.url), Object.keys(PNSZ_ROUTES));
    });
});

test('pnsz: stops following months once the next one starts after the window', async () => {
    await withFetch(PNSZ_ROUTES, async ({ calls }) => {
        await pnszSource.scrape({ firstDay: '2026-11-20', lastDay: '2026-11-30' });
        assert.equal(calls.length, 1);
    });
});

test('pnsz: a failing page rejects (so the run falls back to its cache)', async () => {
    await withFetch({ 'https://www.pnsz.hu/havi-musor': { status: 500 } }, async () => {
        await assert.rejects(pnszSource.scrape(TEST_WINDOW), /HTTP 500/);
    });
});

// ------------------------------------------------------------ pecsimami.hu
const PECSIMAMI_URL = 'https://pecsimami.hu/helyi-programok/aktualis-programok';
const PECSIMAMI_ROUTES = {
    [PECSIMAMI_URL]: fixture('pecsimami-page0.html'),
    [`${PECSIMAMI_URL}?page=1`]: fixture('pecsimami-page1.html')
};
const PECSIMAMI_WINDOW = { firstDay: '2026-11-20', lastDay: '2027-03-31' };

test('pecsimami: follows the pager and parses the free-text dates', async () => {
    await withFetch(PECSIMAMI_ROUTES, async ({ calls }) => {
        const events = await pecsimamiSource.scrape(PECSIMAMI_WINDOW);
        assertWellFormed(events);
        assert.equal(events.length, 11);
        assert.equal(calls.length, 2);
        const byTitle = prefix => events.find(event => event.title.startsWith(prefix));

        assert.deepEqual(
            [byTitle('Könyvcsere').startDate, byTitle('Könyvcsere').time, byTitle('Könyvcsere').venue],
            ['2026-11-20', '10:00', 'Csorba Győző Könyvtár - Tudásközpont']
        );
        assert.deepEqual([byTitle('XXXIX').startDate, byTitle('XXXIX').endDate], ['2026-11-20', '2026-11-22']); // "20-22."
        assert.equal(byTitle('Önbizalomtól').time, '09:00'); // "Iddőpont" typo and "9:00"
        assert.equal(byTitle('Cini-cini').time, '10:00'); // "10.00"
        assert.deepEqual([byTitle('TÉT(játszó)TÉR').startDate, byTitle('TÉT(játszó)TÉR').time], ['2026-11-21', '15:00']); // "21, (szombat)"
        assert.deepEqual([byTitle('Dzsungelmese').startDate, byTitle('Dzsungelmese').time], ['2026-11-21', '16:00']); // no dot after the year
    });
});

test('pecsimami: a listed past year (site typo "2026. Február") is moved to next year', async () => {
    await withFetch(PECSIMAMI_ROUTES, async () => {
        const events = await pecsimamiSource.scrape(PECSIMAMI_WINDOW);
        assert.ok(events.some(event => event.title.startsWith('Csigaház') && event.startDate === '2027-02-20'));
        assert.ok(events.every(event => event.startDate >= '2026-11-20'));
    });
});

test('pecsimami: date parser handles ranges, month names and missing dates', () => {
    const today = '2026-11-20';
    assert.deepEqual(parseHungarianDateText('2026. December 5. (szombat) 16:30', today), { startDate: '2026-12-05', endDate: null, time: '16:30' });
    assert.deepEqual(parseHungarianDateText('2026. November 28-30. (szombat-hétfő) 10:00', today), { startDate: '2026-11-28', endDate: '2026-11-30', time: '10:00' });
    assert.deepEqual(parseHungarianDateText('2026. December 30 - Január 2. 10:00', today), { startDate: '2026-12-30', endDate: '2027-01-02', time: '10:00' });
    assert.equal(parseHungarianDateText('Hamarosan', today), null);
    assert.equal(parseHungarianDateText('2026. Smarch 5.', today), null);
    assert.equal(parseHungarianDateText('2026. Február 30.', today), null);
});

// -------------------------------------------------------------- pecs.hu
const PECS_HU_API = 'https://pecs.hu/wp-json/wp/v2';
const eventsUrl = page => `${PECS_HU_API}/event?per_page=100&page=${page}&_fields=title,link,program_category,acf`;
const CATEGORIES_URL = `${PECS_HU_API}/program_category?per_page=100&_fields=id,name`;

test('pecs.hu: reads events from the WordPress API with category names, multi-day ranges and coordinates', async () => {
    await withFetch({
        [CATEGORIES_URL]: fixture('pecs-hu-categories.json'),
        [eventsUrl(1)]: { body: fixture('pecs-hu-events.json'), headers: { 'x-wp-totalpages': '1' } }
    }, async () => {
        const events = await pecsHuSource.scrape(TEST_WINDOW);
        assertWellFormed(events);
        assert.equal(events.length, 4);
        assert.deepEqual(
            [events[0].title, events[0].startDate, events[0].time, events[0].venue],
            ['Művészetpedagógiai foglalkozás felnőtteknek', '2026-11-21', '15:00', 'Zsolnay Negyed Látogatóközpont']
        );
        const tasting = events.find(event => event.title.startsWith('Egyéni borkóstolók'));
        assert.deepEqual([tasting.startDate, tasting.endDate, tasting.time], ['2026-07-18', '2026-12-05', null]);
        assert.deepEqual(tasting.categories, ['Gasztronómia']);
        assert.ok(events.find(event => event.title.startsWith('Varázsóra')).categories.includes('Gyerekprogram'));
        assert.equal(typeof events[0].coordinates.lat, 'number');
    });
});

test('pecs.hu: follows the API pages until the last one', async () => {
    await withFetch({
        [CATEGORIES_URL]: fixture('pecs-hu-categories.json'),
        [eventsUrl(1)]: { body: fixture('pecs-hu-events.json'), headers: { 'x-wp-totalpages': '2' } },
        [eventsUrl(2)]: { body: '[]', headers: { 'x-wp-totalpages': '2' } }
    }, async ({ calls }) => {
        await pecsHuSource.scrape(TEST_WINDOW);
        assert.ok(calls.some(call => call.url === eventsUrl(2)));
        assert.equal(calls.length, 3);
    });
});

// ---------------------------------------------------------- iranypecs.hu
const ICAL_URL = 'https://iranypecs.hu/?mec-ical-feed=1';
const icalOf = (...entries) => `BEGIN:VCALENDAR\r\n${entries.map(lines => `BEGIN:VEVENT\r\n${lines.join('\r\n')}\r\nEND:VEVENT`).join('\r\n')}\r\nEND:VCALENDAR\r\n`;

test('iranypecs: reads the iCal sample (UTC times shown in Budapest time)', async () => {
    await withFetch({ [ICAL_URL]: fixture('iranypecs.ics') }, async () => {
        const events = await iranyPecsSource.scrape(TEST_WINDOW);
        assertWellFormed(events);
        const concert = events.find(event => event.title === 'Karácsonyi dallamok');
        assert.deepEqual([concert.startDate, concert.time], ['2026-12-30', '19:30']); // 18:30Z = 19:30 CET
        assert.match(concert.url, /^https:\/\/iranypecs\.hu\/program\//);
    });
});

test('iranypecs: weekly rules expand to the listed weekdays only, up to UNTIL', async () => {
    const feed = icalOf([
        'DTSTART:20261120T090000Z', 'DTEND:20261120T170000Z', 'RRULE:FREQ=WEEKLY;UNTIL=20261130T170000Z;BYDAY=TU,WE,TH,FR,SA,SU',
        'SUMMARY:Kiállítás', 'URL:https://iranypecs.hu/program/kiallitas/'
    ]);
    await withFetch({ [ICAL_URL]: feed }, async () => {
        const events = await iranyPecsSource.scrape(TEST_WINDOW);
        assert.deepEqual(events.map(event => event.startDate), [
            '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29'
        ]); // never a Monday
        assert.ok(events.every(event => event.time === '10:00'));
    });
});

test('iranypecs: daily rules respect COUNT and the end of the window', async () => {
    const feed = icalOf(
        ['DTSTART:20261201T080000Z', 'RRULE:FREQ=DAILY;COUNT=3', 'SUMMARY:Háromnapos', 'URL:https://iranypecs.hu/program/a/'],
        ['DTSTART:20270215T080000Z', 'RRULE:FREQ=DAILY', 'SUMMARY:Végtelen', 'URL:https://iranypecs.hu/program/b/']
    );
    await withFetch({ [ICAL_URL]: feed }, async () => {
        const events = await iranyPecsSource.scrape(TEST_WINDOW);
        assert.deepEqual(events.filter(event => event.title === 'Háromnapos').map(event => event.startDate), ['2026-12-01', '2026-12-02', '2026-12-03']);
        assert.deepEqual(events.filter(event => event.title === 'Végtelen').map(event => event.startDate), ['2027-02-15', '2027-02-16', '2027-02-17', '2027-02-18']);
    });
});

test('iranypecs: all-day events use an exclusive end date; folded lines and escaped commas are decoded', async () => {
    const feed = icalOf([
        'DTSTART;VALUE=DATE:20261201', 'DTEND;VALUE=DATE:20261204', 'SUMMARY:Adventi vásár\\, nagy', ' és hosszú nevű',
        'URL:https://iranypecs.hu/program/vasar/', 'LOCATION:Széchenyi tér', 'CATEGORIES:Vásár,Advent'
    ]);
    await withFetch({ [ICAL_URL]: feed }, async () => {
        const [event] = await iranyPecsSource.scrape(TEST_WINDOW);
        assert.equal(event.title, 'Adventi vásár, nagyés hosszú nevű');
        assert.deepEqual([event.startDate, event.endDate, event.time], ['2026-12-01', '2026-12-03', null]);
        assert.deepEqual(event.categories, ['Vásár', 'Advent']);
        assert.equal(event.venue, 'Széchenyi tér');
    });
});

test('iranypecs: entries without a title, date or link are skipped', async () => {
    const feed = icalOf(['DTSTART:20261201T080000Z', 'URL:https://iranypecs.hu/x/'], ['SUMMARY:Nincs dátum', 'URL:https://iranypecs.hu/y/']);
    await withFetch({ [ICAL_URL]: feed }, async () => {
        assert.deepEqual(await iranyPecsSource.scrape(TEST_WINDOW), []);
    });
});

// ------------------------------------------------ pecsiharmadikszinhaz.hu
test('harmadik színház: reads the events embedded in the Wix page, once per id, with Budapest times', async () => {
    await withFetch({ 'https://www.pecsiharmadikszinhaz.hu/musornaptar': fixture('harmadik-szinhaz.html') }, async () => {
        const events = await harmadikSzinhazSource.scrape(TEST_WINDOW);
        assertWellFormed(events);
        assert.equal(events.length, 4); // the sample lists one event twice
        const local = events[0];
        assert.deepEqual([local.startDate, local.time, local.venue], ['2026-11-20', '19:00', 'Pécsi Harmadik Színház']); // 18:00Z = 19:00 CET
        assert.match(local.url, /^https:\/\/www\.pecsiharmadikszinhaz\.hu\/event-details\/.+/);
    });
});

test('harmadik színház: touring performances carry coordinates so they can be filtered by distance', async () => {
    await withFetch({ 'https://www.pecsiharmadikszinhaz.hu/musornaptar': fixture('harmadik-szinhaz.html') }, async () => {
        const events = await harmadikSzinhazSource.scrape(TEST_WINDOW);
        const miskolc = events.find(event => event.title.includes('Miskolc'));
        assert.ok(miskolc.coordinates.lat > 47.5);
        assert.ok(events.every(event => typeof event.coordinates?.lat === 'number'));
    });
});

test('harmadik színház: a page without the embedded data rejects instead of returning nothing', async () => {
    await withFetch({ 'https://www.pecsiharmadikszinhaz.hu/musornaptar': '<html><body>redesigned</body></html>' }, async () => {
        await assert.rejects(harmadikSzinhazSource.scrape(TEST_WINDOW), /Wix warmup data not found/);
    });
});

// ---------------------------------------------------- madeinpecs.mytix.hu
test('made in pécs: reads the shop\'s program list', async () => {
    await withFetch({ 'https://admin.madeinpecs.mytix.hu/storage/programs.json': fixture('made-in-pecs-programs.json') }, async () => {
        const events = await madeInPecsSource.scrape(TEST_WINDOW);
        assertWellFormed(events);
        assert.equal(events.length, 9);
        assert.deepEqual(events[0], {
            title: 'The Devotees - Depeche Mode Tribute', url: 'https://madeinpecs.mytix.hu/events/the-devotees',
            startDate: '2026-11-20', time: '20:00', venue: 'Pécsi Est'
        });
    });
});

test('made in pécs: an unexpected response shape gives no events instead of crashing', async () => {
    await withFetch({ 'https://admin.madeinpecs.mytix.hu/storage/programs.json': '{"error":"maintenance"}' }, async () => {
        assert.deepEqual(await madeInPecsSource.scrape(TEST_WINDOW), []);
    });
});

// ----------------------------------------- pecsiprogram.hu / zsolnaynegyed.hu
const CMS_LIST_PAGE = 'https://www.pecsiprogram.hu/programok';
const CMS_ENDPOINT = 'https://www.pecsiprogram.hu/programs_url';
const cmsSource = createProgramsCmsSource({
    id: 'pecsiprogram', label: 'pecsiprogram.hu', homepage: 'https://www.pecsiprogram.hu/', listPageUrl: CMS_LIST_PAGE, minEvents: 1
});

test('programs CMS: queries every list section (not the calendar) with the page as Referer', async () => {
    await withFetch({
        [CMS_LIST_PAGE]: fixture('programs-cms-list-page.html'),
        [CMS_ENDPOINT]: { body: fixture('programs-cms-rows.json') }
    }, async ({ calls }) => {
        const events = await cmsSource.scrape(TEST_WINDOW);
        assertWellFormed(events);
        const posts = calls.filter(call => call.init?.method === 'POST');
        assert.deepEqual(posts.map(call => new URLSearchParams(String(call.init.body)).get('content_id')), ['742', '9871']);
        for (const post of posts) {
            assert.equal(post.init.headers.Referer, CMS_LIST_PAGE);
            const body = new URLSearchParams(String(post.init.body));
            assert.deepEqual([body.get('date_start'), body.get('date_end')], [TEST_WINDOW.firstDay, TEST_WINDOW.lastDay]);
        }
        assert.equal(events.length, 6); // 3 sample rows from each of the 2 sections
    });
});

test('programs CMS: multi-day rows use the printed range, single-day rows the day and time', async () => {
    await withFetch({
        [CMS_LIST_PAGE]: fixture('programs-cms-list-page.html'),
        [CMS_ENDPOINT]: { body: fixture('programs-cms-rows.json') }
    }, async () => {
        const events = await cmsSource.scrape(TEST_WINDOW);
        const exhibition = events.find(event => event.title.startsWith('Dallam és bábu'));
        assert.deepEqual([exhibition.startDate, exhibition.endDate, exhibition.time], ['2026-05-09', '2026-12-30', null]);
        assert.equal(exhibition.venue, 'Bóbita Bábszínház');
        assert.ok(exhibition.categories.includes('Bábszínház'));
        const timed = events.find(event => event.title === 'Amiről a sírok mesélnek');
        assert.deepEqual([timed.startDate, timed.endDate, timed.time], ['2026-11-20', null, '14:00']);
    });
});

test('programs CMS: an error answer from the endpoint rejects', async () => {
    await withFetch({
        [CMS_LIST_PAGE]: fixture('programs-cms-list-page.html'),
        [CMS_ENDPOINT]: { body: { error: ['Invalid request: Referer missing.'], success: [], response: '' } }
    }, async () => {
        await assert.rejects(cmsSource.scrape(TEST_WINDOW), /Referer missing/);
    });
});

test('programs CMS: a page with no list section rejects (site redesign)', async () => {
    await withFetch({ [CMS_LIST_PAGE]: '<html><body><div>new design</div></body></html>' }, async () => {
        await assert.rejects(cmsSource.scrape(TEST_WINDOW), /No program list found/);
    });
});
