# merch-design-generator

Generate **print-ready 4500×5400 transparent PNGs** for print-on-demand apparel from a plain JSON file — no design tools, no manual exports.

![Sample output: $ git push --force / 127.0.0.1 is home / it works on my machine](docs/preview.png)

The same script powers the catalog at [compilewear.com](https://compilewear.com) — dev-humor apparel printed on demand.

## How it works

```
designs.json ──► satori (JSX-like layout → SVG)
             ──► resvg  (SVG → PNG raster, transparent bg)
             ──► sharp  (auto-trim transparent margins)
```

Every design is rendered twice — once in white ink, once in black — so you can pair each variant with garment colors that actually contrast it. Output lands in `designs/out/{name}-{ink}.png` at full print resolution, trimmed to the artwork.

## Quick start

```sh
npm install
npm run generate          # renders designs/designs.json → designs/out/
npm run generate logic    # renders designs/logic/designs.json → designs/logic/out/
```

Fonts download automatically on first run (JetBrains Mono, SIL OFL — explicitly licensed for commercial use on physical products).

## CLI — render your own text

```sh
npm run cli -- "it works on my machine"
npm run cli -- "line one\nline two" --chest --ink black --out ./out
npm run cli -- "permission denied" --weight 700 --name denied
```

Or install it globally / via npx:

```sh
npm i -g .
compilewear "it works on my machine"
```

| Flag | Default | Meaning |
|---|---|---|
| `"\n"` | — | Literal `\n` splits lines |
| `--chest` / `--front` | `front` | Print placement size |
| `--ink` | `both` | `white`, `black`, or `both` |
| `--weight` | `400` | Font weight (`400` or `700`) |
| `--subscale` | `1` | Shrink lines 2+ relative to line 1 |
| `--name` | `print` | Output basename |
| `--out` | `./out` | Output directory |

## designs.json format

```json
[
  {
    "name": "git-push-force",
    "lines": ["$ git push --force"],
    "placement": "front",
    "weight": 700
  }
]
```

| Field | Type | Default | Meaning |
|---|---|---|---|
| `name` | string | — | Output filename: `{name}-{ink}.png` |
| `lines` | string[] | — | Text lines, rendered top-to-bottom, centered |
| `placement` | `"front"` \| `"chest"` | — | `front` fills a ~3600px print area; `chest` renders smaller for a left-chest mark |
| `weight` | `400` \| `700` | `400` | JetBrains Mono weight |
| `subscale` | number | `1` | Scales lines 2+ down relative to line 1 (title/subtitle lockups) |

Whitespace is preserved (`whiteSpace: pre`) — ASCII-art and aligned text render exactly as written. See `designs/logic/designs.json` for multi-line examples like a Pascal-triangle Sierpinski.

## Why JSON instead of a design tool

- **Diffable** — a design change is a git diff, not a file someone saved over
- **Parametric** — fonts, sizes, placements are data; fork and tune the constants
- **Scriptable** — regenerate the entire catalog in one command when you swap typefaces
- **Reproducible** — the same JSON always produces the same pixels

## Using the PNGs

Files are sized for standard POD front prints (4500×5400px ≈ 15″×18″ at 300 DPI) with transparent backgrounds. Upload straight into Printify, Printful, Gelato, etc. — white-ink variants for dark garments, black-ink for light.

## License

Code: [MIT](LICENSE). Bundled fonts: [SIL Open Font License](https://openfontlicense.org/) (JetBrains Mono — the license explicitly permits use on physical products sold commercially).
