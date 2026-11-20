import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mockFetch } from './helpers.mjs';
import { fetchJson, fetchText } from '../../scripts/events/http.mjs';

const URL_UNDER_TEST = 'https://example.hu/data';

test('requests identify the bot with a User-Agent', async () => {
    const mock = mockFetch({ [URL_UNDER_TEST]: 'ok' });
    try {
        assert.equal(await fetchText(URL_UNDER_TEST), 'ok');
        assert.match(mock.calls[0].init.headers['User-Agent'], /^MecsekaljaApartmanEventsBot\/1\.0 \(\+https:\/\//);
    } finally {
        mock.restore();
    }
});

test('a failed request is retried once', async () => {
    let attempts = 0;
    const mock = mockFetch({ [URL_UNDER_TEST]: () => (++attempts === 1 ? { status: 503 } : { body: { fine: true } }) });
    try {
        assert.deepEqual(await fetchJson(URL_UNDER_TEST), { fine: true });
        assert.equal(attempts, 2);
    } finally {
        mock.restore();
    }
});

test('two failures in a row reject with the status code', async () => {
    const mock = mockFetch({ [URL_UNDER_TEST]: { status: 502 } });
    try {
        await assert.rejects(fetchText(URL_UNDER_TEST), /HTTP 502/);
        assert.equal(mock.calls.length, 2);
    } finally {
        mock.restore();
    }
});
