// Regenerate the favicon set from public/images/klio-mark.svg.
// Run: node apps/web/scripts/generate-favicons.mjs (from the repo root or apps/web).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import pngToIco from 'png-to-ico';
import sharp from 'sharp';

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(appRoot, 'public/images/klio-mark.svg'));
const outDir = join(appRoot, 'public/images/favicon');

// Render the mark centered on a solid-white square with ~18% padding so it
// reads on both light and dark browser chrome.
async function render(size) {
  const pad = Math.round(size * 0.18);
  const inner = size - pad * 2;
  const mark = await sharp(svg)
    .resize(inner, inner, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toBuffer();
}

const targets = [
  ['favicon-16x16.png', 16],
  ['favicon-32x32.png', 32],
  ['android-chrome-192x192.png', 192],
  ['android-chrome-512x512.png', 512],
  ['apple-touch-icon.png', 180],
  ['mstile-150x150.png', 150],
];

for (const [name, size] of targets) {
  writeFileSync(join(outDir, name), await render(size));
  console.log('wrote', name);
}

writeFileSync(
  join(outDir, 'favicon.ico'),
  await pngToIco(await Promise.all([16, 32, 48].map(render))),
);
console.log('wrote favicon.ico');

// safari-pinned-tab is a monochrome mask SVG — reuse the mark geometry.
writeFileSync(join(outDir, 'safari-pinned-tab.svg'), svg);
console.log('wrote safari-pinned-tab.svg');
