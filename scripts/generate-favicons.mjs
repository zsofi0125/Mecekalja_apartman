/**
 * Generates the browser-tab / home-screen icons from img/icons/navigator.png
 * (written to the site root, next to index.html). Only these PNGs are deployed.
 * Usage: npm run images
 */
import sharp from 'sharp';

const SOURCE = 'img/icons/navigator.png';
/** Tab icons: 32 px (16 px at 2x), 48 px (multiple of 48 for Google results / Windows), 192 px (Android, PWA). */
export const TAB_ICON_SIZES = [32, 48, 192];
const APPLE_TOUCH_SIZE = 180;
/** iOS paints transparent icon areas black, so the home-screen icon gets the site's light background and some padding. */
const APPLE_TOUCH_BACKGROUND = '#f4f7f1';
const APPLE_TOUCH_ARTWORK_SIZE = 150;
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

for (const size of TAB_ICON_SIZES) {
    const info = await sharp(SOURCE)
        .resize(size, size, { fit: 'contain', background: TRANSPARENT })
        .png({ compressionLevel: 9 })
        .toFile(`favicon-${size}.png`);
    console.log(`favicon-${size}.png  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)} KB`);
}

const artwork = await sharp(SOURCE).resize(APPLE_TOUCH_ARTWORK_SIZE, APPLE_TOUCH_ARTWORK_SIZE, { fit: 'contain', background: TRANSPARENT }).toBuffer();
const appleInfo = await sharp({ create: { width: APPLE_TOUCH_SIZE, height: APPLE_TOUCH_SIZE, channels: 3, background: APPLE_TOUCH_BACKGROUND } })
    .composite([{ input: artwork, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toFile('apple-touch-icon.png');
console.log(`apple-touch-icon.png  ${appleInfo.width}x${appleInfo.height}  ${(appleInfo.size / 1024).toFixed(1)} KB`);
