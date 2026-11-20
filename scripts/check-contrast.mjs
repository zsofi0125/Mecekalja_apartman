/** WCAG contrast audit of the theme colour pairs used in style.css. Usage: node scripts/check-contrast.mjs */
const channel = value => { const c = value / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const luminance = hex => {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};
const ratio = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

const themes = {
    light: { bg: '#f4f7f1', card: '#ffffff', ink: '#1f2d25', mute: '#4f5f56', green: '#2f5d46', sage: '#d9e6d6', heroTop: '#cfe5d3' },
    dark: { bg: '#141c17', card: '#1c2822', ink: '#eaf1ea', mute: '#a3b4a8', green: '#8cc5a0', sage: '#25382d', heroTop: '#1f3a2b' }
};
const pairs = [
    ['ink', 'bg'], ['mute', 'bg'], ['mute', 'card'], ['green', 'bg'], ['green', 'card'],
    ['green', 'sage'], ['mute', 'sage'], ['bg', 'green'], ['green', 'heroTop'], ['mute', 'heroTop']
];
let failures = 0;
for (const [theme, colors] of Object.entries(themes)) {
    for (const [fg, bg] of pairs) {
        const value = ratio(colors[fg], colors[bg]);
        const ok = value >= 4.5;
        if (!ok) failures++;
        console.log(`${ok ? 'ok  ' : 'FAIL'} ${theme.padEnd(5)} ${fg} on ${bg}: ${value.toFixed(2)}`);
    }
}
process.exitCode = failures ? 1 : 0;
