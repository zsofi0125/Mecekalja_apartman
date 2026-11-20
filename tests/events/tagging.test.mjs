import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONCERT_RULE, tagEvent } from '../../scripts/events/tagging.mjs';

const tag = (title, sourceId = 'pecs-hu', categories = []) => tagEvent({ title, categories }, sourceId);

test('kids keywords from any source set the "Gyerekeknek" flag (accents and case ignored)', () => {
    for (const title of ['Gyerekkoncert a Kodályban', 'CSALÁDI nap a parkban', 'Mesedélután a könyvtárban', 'Bábszínházi előadás']) {
        assert.equal(tag(title).kidFriendly, true, title);
    }
    assert.equal(tag('Kortárs kiállítás megnyitó').kidFriendly, false);
});

test('theatre sources are always "Kultúra" and never auto-tagged for kids', () => {
    for (const sourceId of ['pnsz', 'harmadik-szinhaz']) {
        assert.deepEqual(tag('Mese a gyerekeknek – családi előadás', sourceId), { category: 'culture', kidFriendly: false });
    }
});

test('gastro events are "Gasztro és bor" and never kid-tagged, even with a kids keyword', () => {
    assert.deepEqual(tag('Borkóstoló a pincében'), { category: 'food', kidFriendly: false });
    assert.deepEqual(tag('Családi gasztronómiai nap'), { category: 'food', kidFriendly: false });
});

test('"Családi program" events are tagged for kids', () => {
    assert.deepEqual(tag('Vasárnapi program', 'pecs-hu', ['Családi program']), { category: 'family', kidFriendly: true });
    assert.deepEqual(tag('Játszóház', 'pecsimami'), { category: 'family', kidFriendly: true });
});

test('"Aktív" and "Pihenés" events are kid-tagged only when a kids keyword matches', () => {
    assert.deepEqual(tag('Mecsek túra a Misinán'), { category: 'active', kidFriendly: false });
    assert.deepEqual(tag('Családi túra a Mecsekben'), { category: 'active', kidFriendly: true });
    assert.deepEqual(tag('Wellness délután'), { category: 'relax', kidFriendly: false });
    assert.deepEqual(tag('Meseolvasás és relaxáció'), { category: 'relax', kidFriendly: true });
});

test('source-provided category labels take part in matching', () => {
    assert.equal(tag('Esti program', 'iranypecs', ['Gyerekprogram']).kidFriendly, true);
});

test('everything else is "Kultúra" without the kids flag', () => {
    assert.deepEqual(tag('Időszaki kiállítás'), { category: 'culture', kidFriendly: false });
});

test('whole-word keywords do not match inside longer words', () => {
    assert.equal(tag('Borbély Sándor kiállítása').category, 'culture');
});

// ------------------------------------------------------------ Koncertek
const tagAt = (title, venue, sourceId = 'pecs-hu', categories = []) => tagEvent({ title, venue, categories }, sourceId);

test('concert keywords in the title tag the event "Koncertek" (substring, case and accents ignored)', () => {
    for (const title of ['Adventi koncert a Dómban', 'Párnatollhullás koncertje', 'GYERMEK Koncertek', 'Gyerekkoncert', 'Jazz banda élőben', 'Az énekes új lemeze', 'ÉNEKESNŐ estje', 'enekes talalkozo']) {
        assert.equal(tag(title).category, 'concert', title);
    }
    assert.equal(tag('Kortárs kiállítás').category, 'culture');
});

test('the source\'s own category labels count as text too', () => {
    assert.equal(tag('Esti program', 'pecsiprogram', ['Koncert', 'Zene']).category, 'concert');
});

test('concert venues tag the event "Koncertek" whatever the title says', () => {
    assert.equal(tagAt('Sub Bass Monster', 'Pécsi Est').category, 'concert');
    assert.equal(tagAt('Nyári est', 'Káptalan Kert').category, 'concert');
    assert.equal(tagAt('Nyári est', 'KÁPTALAN KERT, Pécs').category, 'concert');
    assert.equal(tagAt('Nyári est', 'pecsi est').category, 'concert');
});

test('venue matching is by whole words and needs an exact venue, not a lookalike', () => {
    assert.equal(tagAt('Bál', 'Pécsi Estélyi Terem').category, 'culture');
    assert.equal(tagAt('Nyári est', 'Pécs, Kert utca').category, 'culture');
    assert.equal(tagAt('Nyári est', null).category, 'culture');
    assert.equal(tagAt('Nyári est', undefined).category, 'culture');
});

test('gastro still wins over concert; concert wins over active, relax and family', () => {
    assert.deepEqual(tag('Borkóstoló élő koncerttel'), { category: 'food', kidFriendly: false });
    assert.equal(tag('Futófesztivál koncerttel').category, 'concert');
    assert.equal(tag('Wellness koncert').category, 'concert');
    assert.equal(tag('Családi koncert').category, 'concert');
});

test('a concert is kid-tagged only when a kids keyword matches', () => {
    assert.equal(tag('Esti koncert').kidFriendly, false);
    assert.equal(tag('Gyerekkoncert').kidFriendly, true);
    assert.equal(tag('Családi koncert a Kodályban').kidFriendly, true);
    assert.equal(tagAt('Sub Bass Monster', 'Pécsi Est').kidFriendly, false);
});

test('theatre sources: a concert is listed under "Koncertek" but is still never kid-tagged', () => {
    assert.deepEqual(tag('Adventi Koncertek', 'pnsz'), { category: 'concert', kidFriendly: false });
    assert.deepEqual(tag('Gyerekkoncert a színházban', 'harmadik-szinhaz'), { category: 'concert', kidFriendly: false });
    assert.deepEqual(tag('Esőember', 'pnsz'), { category: 'culture', kidFriendly: false });
});

test('the concert rule keeps keywords and venues in two separate, plain lists', () => {
    assert.deepEqual(CONCERT_RULE.keywords, ['koncert', 'banda', 'énekes']);
    assert.deepEqual(CONCERT_RULE.venues, ['Pécsi Est', 'Káptalan Kert']);
});

test('terms appended to the lists take effect (extensibility)', () => {
    CONCERT_RULE.keywords.push('Zenekar');
    CONCERT_RULE.venues.push('Kodály Központ');
    try {
        assert.equal(tag('A Pannon zenekar játszik').category, 'concert');
        assert.equal(tagAt('Esti program', 'Kodály Központ').category, 'concert');
    } finally {
        CONCERT_RULE.keywords.pop();
        CONCERT_RULE.venues.pop();
    }
    assert.equal(tag('A Pannon zenekar játszik').category, 'culture');
});
