/**
 * Generates small web-optimised WebP versions of the feature-card icons next to their PNG
 * originals (img/icons/<name>.png -> img/icons/<name>.webp). Only the WebP files are deployed.
 * Usage: npm run images
 */
import sharp from 'sharp';
import path from 'node:path';

const ICONS_DIR = 'img/icons';
/** 3x the largest size the icons are shown at (see .card .ic img), so they stay sharp on dense screens. */
const OUTPUT_SIZE_PX = 96;
export const FEATURE_ICONS = ['parking', 'hiking-boots', 'public-transport', 'online-shopping'];

for (const name of FEATURE_ICONS) {
    const info = await sharp(path.join(ICONS_DIR, `${name}.png`))
        .resize(OUTPUT_SIZE_PX, OUTPUT_SIZE_PX, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 88, alphaQuality: 100 })
        .toFile(path.join(ICONS_DIR, `${name}.webp`));
    console.log(`${name}.webp  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)} KB`);
}
