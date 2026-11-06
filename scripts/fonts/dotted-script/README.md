# Dotted Script

Display font inspired by Softulka's Dotted Ink: a joined cursive rebuilt from
round dots on one shared grid, so letters keep their connections.

It is generated from Playwrite FR Trad (OFL 1.1, pinned in `source/`).
Every glyph is rasterised onto a slanted dot grid; advances, kerning and mark
anchors are snapped to the same grid so joins line up between letters. The
cursive joining (`calt`) and accents (`mark`, `mkmk`) are kept.

## Build

```sh
uv run scripts/fonts/dotted-script/build.py
```

Writes `packages/ui/src/fonts/dotted-script.woff2`. Add `--ttf <path>` to also
get a TTF for previews.

## Tuning

| Flag          | Default | Effect                                         |
| ------------- | ------- | ---------------------------------------------- |
| `--pitch`     | 72      | Dot spacing in font units. Lower = finer grid. |
| `--dot`       | 0.53    | Dot radius as a fraction of the pitch.         |
| `--stroke`    | 22      | Extra weight added before dotting.             |
| `--threshold` | 0.42    | Cell coverage needed to place a dot.           |
| `--slant`     | 12      | Grid lean in degrees.                          |

The output is a derivative of Playwrite under the SIL Open Font License 1.1
(see `source/OFL.txt`); it is renamed as the license requires.
