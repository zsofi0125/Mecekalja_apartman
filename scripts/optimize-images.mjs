/**
 * Generates web-optimised WebP gallery images (480/800/1200px wide) and the
 * Open Graph cover from the original camera photos. Originals are never modified.
 * Usage: npm run images
 */
import sharp from 'sharp';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';

const ORIGINALS_DIR = 'img/apartman_imgs';
const OUTPUT_DIR = 'img/gallery';
const OPEN_GRAPH_OUTPUT = 'img/og-cover.jpg';
const WIDTHS = [480, 800, 1200];

/** Gallery order matters: it is the order shown on the page. */
export const GALLERY_SOURCES = [
    'bedrooms/IMG_7049.JPG',
    'kitchen/IMG_7044.JPG',
    'bedrooms/IMG_7052.JPG',
    'bedrooms/IMG_7056.JPG',
    'bedrooms/IMG_7059.JPG',
    'bathroom/IMG_7033.JPEG'
];

await mkdir(OUTPUT_DIR, { recursive: true });

for (const relativePath of GALLERY_SOURCES) {
    const sourcePath = path.join(ORIGINALS_DIR, relativePath);
    const baseName = path.parse(relativePath).name.replace('IMG_', '');
    for (const width of WIDTHS) {
        // rotate() applies the EXIF orientation so the output is truly portrait
        const info = await sharp(sourcePath)
            .rotate()
            .resize({ width })
            .webp({ quality: 74 })
            .toFile(path.join(OUTPUT_DIR, `${baseName}-${width}.webp`));
        console.log(`${baseName}-${width}.webp  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)} KB`);
    }
}

await sharp(path.join(ORIGINALS_DIR, GALLERY_SOURCES[0]))
    .rotate()
    .resize(1200, 630, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(OPEN_GRAPH_OUTPUT);
console.log(`${OPEN_GRAPH_OUTPUT} written`);
