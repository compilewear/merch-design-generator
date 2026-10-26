#!/usr/bin/env node
// Turns designs/designs.json into print-ready 4500×5400 transparent PNGs.
// Fonts are open-source (SIL OFL) — JetBrains Mono — downloaded once into
// assets/fonts/. OFL explicitly permits commercial use on physical products.
//
// Usage: npm run generate → PNGs land in designs/out/{name}-{ink}.png

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { root, loadFonts, render } from './lib/render.mjs';

// Optional arg: a subfolder under designs/ with its own designs.json
// (e.g. "logic" → designs/logic/). Default renders the root collection.
const DESIGNS_DIR = process.argv[2]
  ? path.join(root, 'designs', process.argv[2])
  : path.join(root, 'designs');
const OUT_DIR = path.join(DESIGNS_DIR, 'out');

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
