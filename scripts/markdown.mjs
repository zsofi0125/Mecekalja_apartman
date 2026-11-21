/**
 * Minimal Markdown-to-HTML converter for the privacy policy sources in src/privacy/.
 * Supports exactly what those files use: #/##/### headings, paragraphs, bullet lists
 * (one nested level, 2-space indent) and [text](https://… | mailto:…) links.
 * All other text is HTML-escaped, so a stray "<" can never become markup.
 */
const escapeHtml = text =>
    String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function renderInline(text) {
    return escapeHtml(text).replace(
        /\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^)\s]+)\)/g,
        (_match, label, url) => {
            const external = url.startsWith('http') ? ' target="_blank" rel="noopener"' : '';
            return `<a href="${url}"${external}>${label}</a>`;
        }
    );
}

/** @param {string} markdown */
export function renderMarkdown(markdown) {
    const html = [];
    let paragraph = [];
    let openItems = 0; // 0 = no list, 1 = top-level list, 2 = nested list inside an item

    const flushParagraph = () => {
        if (paragraph.length) html.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
        paragraph = [];
    };
    const closeLists = () => {
        if (openItems === 2) html.push('</ul></li>');
        else if (openItems === 1) html.push('</li>');
        if (openItems) html.push('</ul>');
        openItems = 0;
    };

    for (const rawLine of markdown.replace(/\r\n/g, '\n').split('\n')) {
        const line = rawLine.trimEnd();
        const heading = /^(#{1,3}) (.+)$/.exec(line);
        const item = /^( {0,1}|  )- (.+)$/.exec(line);

        if (!line.trim()) {
            flushParagraph();
            closeLists();
        } else if (heading) {
            flushParagraph();
            closeLists();
            const level = heading[1].length;
            html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
        } else if (item) {
            flushParagraph();
            const nested = item[1].length === 2;
            if (nested) {
                if (openItems === 0) throw new Error(`Nested list item without a parent: "${line}"`);
                if (openItems === 1) {
                    html.push('<ul>');
                    openItems = 2;
                } else {
                    html.push('</li>');
                }
            } else if (openItems === 0) {
                html.push('<ul>');
                openItems = 1;
            } else {
                if (openItems === 2) {
                    html.push('</li></ul>');
                    openItems = 1;
                }
                html.push('</li>');
            }
            html.push(`<li>${renderInline(item[2])}`);
        } else {
            closeLists();
            paragraph.push(line.trim());
        }
    }
    flushParagraph();
    closeLists();
    return html.join('\n');
}
