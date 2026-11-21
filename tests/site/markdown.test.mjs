import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../../scripts/markdown.mjs';

test('renders headings, paragraphs and escapes raw HTML', () => {
    assert.equal(renderMarkdown('# Title\nLine one\n\nSecond <b>'), '<h1>Title</h1>\n<p>Line one</p>\n<p>Second &lt;b&gt;</p>');
});

test('renders nested bullet lists with balanced tags', () => {
    const html = renderMarkdown('- A\n  - A1\n  - A2\n- B\n\nEnd').replace(/\n/g, '');
    assert.equal(html, '<ul><li>A<ul><li>A1</li><li>A2</li></ul></li><li>B</li></ul><p>End</p>');
});

test('links only http(s) and mailto; other bracket text stays literal', () => {
    assert.equal(
        renderMarkdown('[x](https://a.hu) [m](mailto:a@b.hu) [Airbnb link] [j](javascript:alert(1))'),
        '<p><a href="https://a.hu" target="_blank" rel="noopener">x</a> <a href="mailto:a@b.hu">m</a> [Airbnb link] [j](javascript:alert(1))</p>'
    );
});
