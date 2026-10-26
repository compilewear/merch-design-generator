#!/usr/bin/env node
// Turns designs/designs.json into print-ready 4500×5400 transparent PNGs.
// Fonts are open-source (SIL OFL) — JetBrains Mono — downloaded once into
// assets/fonts/. OFL explicitly permits commercial use on physical products.
//
// Usage: npm run generate → PNGs land in designs/out/{name}-{ink}.png

import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const FONT_DIR = path.join(root, 'assets/fonts');
// Optional arg: a subfolder under designs/ with its own designs.json
// (e.g. "logic" → designs/logic/). Default renders the root collection.
const DESIGNS_DIR = process.argv[2]
  ? path.join(root, 'designs', process.argv[2])
  : path.join(root, 'designs');
const OUT_DIR = path.join(DESIGNS_DIR, 'out');

const W = 4500;
const H = 5400;

const FONT_SOURCES = [
  {
    name: 'JetBrains Mono',
    file: 'jetbrains-mono-400.ttf',
    weight: 400,
    url: 'https://cdn.jsdelivr.net/fontsource/fonts/jetbrains-mono@latest/latin-400-normal.ttf',
  },
  {
    name: 'JetBrains Mono',
    file: 'jetbrains-mono-700.ttf',
    weight: 700,
    url: 'https://cdn.jsdelivr.net/fontsource/fonts/jetbrains-mono@latest/latin-700-normal.ttf',
  },
];

async function loadFonts() {
  await mkdir(FONT_DIR, { recursive: true });
  const fonts = [];
  for (const f of FONT_SOURCES) {
    const p = path.join(FONT_DIR, f.file);
    if (!existsSync(p)) {
      console.log(`Downloading ${f.name} ${f.weight}…`);
      const resp = await fetch(f.url);
      if (!resp.ok) throw new Error(`Font download failed: ${f.url} (${resp.status})`);
      await writeFile(p, Buffer.from(await resp.arrayBuffer()));
    }
    fonts.push({ name: f.name, data: await readFile(p), weight: f.weight, style: 'normal' });
  }
  return fonts;
}

// JetBrains Mono advance ≈ 0.6em — size text to fill a target pixel width so
// every output PNG is print-resolution regardless of phrase length.
const MONO_ADVANCE = 0.6;
const fontSize = (design, maxLen) => {
  const targetPx = design.placement === 'chest' ? 1400 : 3600;
  const byWidth = Math.floor(targetPx / (MONO_ADVANCE * Math.max(maxLen, 1)));
  // fitHeight: many-line designs must also respect the canvas height
  const byHeight = Math.floor(H / (1.3 * design.lines.length));
  return Math.min(2400, byWidth, byHeight);
};

// Crops transparent margins so the PNG is just the artwork (+~4% padding).
// Scanning a 25%-scale copy for bounds keeps this fast on 4500×5400 canvases.
async function trimToContent(png) {
  const probe = await sharp(png)
    .ensureAlpha()
    .resize({ width: Math.round(W / 4) })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { data, info } = probe;
  const w = info.width;
  let top = info.height, left = w, right = -1, bottom = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  if (right < 0) return png; // fully transparent — nothing to trim

  const pad = Math.round(Math.max(right - left, bottom - top) * 4 * 0.04);
  const x0 = Math.max(0, left * 4 - pad);
  const y0 = Math.max(0, top * 4 - pad);
  const x1 = Math.min(W, (right + 1) * 4 + pad);
  const y1 = Math.min(H, (bottom + 1) * 4 + pad);
  return sharp(png)
    .extract({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 })
    .png()
    .toBuffer();
}

async function render(design, ink, fonts) {
  const maxLen = Math.max(...design.lines.map((l) => l.length));
  const tree = {
    type: 'div',
    props: {
      style: {
        width: W,
        height: H,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      },
      children: design.lines.map((line, i) => ({
        type: 'div',
        props: {
          style: {
            fontFamily: 'JetBrains Mono',
            fontWeight: design.weight ?? 400,
            // subscale shrinks secondary lines for a title/subtitle lockup
            fontSize: Math.round(fontSize(design, maxLen) * (i === 0 ? 1 : (design.subscale ?? 1))),
            color: ink,
            lineHeight: 1.25,
            whiteSpace: 'pre',
          },
          children: line,
        },
      })),
    },
  };

  const svg = await satori(tree, { width: W, height: H, fonts });
  const png = new Resvg(svg, { background: 'transparent', fitTo: { mode: 'original' } })
    .render()
    .asPng();
  return trimToContent(png);
}

const designs = JSON.parse(
  await readFile(path.join(DESIGNS_DIR, 'designs.json'), 'utf8')
);
const fonts = await loadFonts();
await mkdir(OUT_DIR, { recursive: true });

for (const d of designs) {
  for (const [inkName, ink] of [['white', '#ffffff'], ['black', '#111111']]) {
    const png = await render(d, ink, fonts);
    const file = path.join(OUT_DIR, `${d.name}-${inkName}.png`);
    await writeFile(file, png);
    console.log(`  ✓ ${d.name}-${inkName}.png`);
  }
}

console.log(`Done — ${designs.length * 2} PNGs in ${path.relative(root, OUT_DIR)}/`);
