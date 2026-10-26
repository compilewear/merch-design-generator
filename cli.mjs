#!/usr/bin/env node
// compilewear — render any text into a print-ready merch PNG.
//
//   compilewear "it works on my machine"
//   compilewear "line one\nline two" --chest --ink black --out ./out
//
// Output: 4500×5400 transparent PNG(s), white and/or black ink.

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { loadFonts, render } from './lib/render.mjs';

const args = process.argv.slice(2);
const flags = {};
let text = null;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--chest') flags.placement = 'chest';
  else if (a === '--front') flags.placement = 'front';
  else if (a === '--ink') flags.ink = args[++i];
  else if (a === '--weight') flags.weight = Number(args[++i]);
  else if (a === '--out') flags.out = args[++i];
  else if (a === '--subscale') flags.subscale = Number(args[++i]);
  else if (a === '--name') flags.name = args[++i];
  else if (!a.startsWith('--') && text === null) text = a;
}

if (!text) {
  console.log(`usage: compilewear "<text>" [options]

  "multi\\nline"          newlines are supported
  --chest | --front      placement (default: front)
  --ink white|black|both ink color    (default: both)
  --weight 400|700       font weight  (default: 400)
  --subscale 0.4         scale lines 2+ relative to line 1
  --name my-design       output basename (default: "print")
  --out ./out            output directory (default: ./out)`);
  process.exit(text === null ? 1 : 0);
}

const design = {
  name: flags.name ?? 'print',
  lines: text.split('\\n'),
  placement: flags.placement ?? 'front',
  weight: flags.weight ?? 400,
  ...(flags.subscale !== undefined ? { subscale: flags.subscale } : {}),
};

const inks =
  flags.ink === 'white' ? [['white', '#ffffff']]
  : flags.ink === 'black' ? [['black', '#111111']]
  : [['white', '#ffffff'], ['black', '#111111']];

const outDir = path.resolve(flags.out ?? 'out');
await mkdir(outDir, { recursive: true });
const fonts = await loadFonts();

for (const [inkName, ink] of inks) {
  const png = await render(design, ink, fonts);
  const file = path.join(outDir, `${design.name}-${inkName}.png`);
  await writeFile(file, png);
  console.log(`  ✓ ${file}`);
}
