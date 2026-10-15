import sharp from 'sharp';

// ছবি WebP-তে বদলে ২০০ KB-এর নিচে নামানো।
// প্রথমে বড় মাপ + ভালো মান দিয়ে চেষ্টা; বড় হলে আগে মান, তারপর মাপ কমিয়ে আবার চেষ্টা।
export const MAX_IMAGE_BYTES = 200 * 1024;
const WIDTHS = [1600, 1200, 900, 700, 500];
const QUALITIES = [82, 72, 62, 52, 42, 32];

export async function toWebpUnder(input, maxBytes = MAX_IMAGE_BYTES) {
    for (const w of WIDTHS) {
        for (const q of QUALITIES) {
            const buffer = await sharp(input, { failOn: 'none' })
                .rotate() // ফোনের ছবির ঘোরানো (EXIF) ঠিক করে, তারপর মেটাডেটা বাদ যায়
                .resize({ width: w, height: w, fit: 'inside', withoutEnlargement: true })
                .webp({ quality: q, effort: 4 })
                .toBuffer();
            if (buffer.length <= maxBytes) return { buffer, quality: q, maxSide: w };
        }
    }
    throw new Error('ছবি ২০০ KB-এর নিচে আনা যায়নি');
}

// আপলোডের আগে ছবি ঠিক করা। SVG (ভেক্টর) যেমন আছে তেমন থাকে; আগে থেকেই ছোট WebP হলে ছোঁয়া হয় না।
export async function optimizeUpload(buffer, mimetype) {
    if (mimetype === 'image/svg+xml') return { buffer, mimetype };
    if (mimetype === 'image/webp' && buffer.length <= MAX_IMAGE_BYTES) return { buffer, mimetype };
    const out = await toWebpUnder(buffer);
    return { buffer: out.buffer, mimetype: 'image/webp' };
}
