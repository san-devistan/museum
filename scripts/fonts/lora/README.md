# Lora

Reading face of the interface: the HUD, the artwork card, the subtitles, the
objective card, and the body of the wall labels (`--font-sans`).

Lora by Cyreal, from Google Fonts (OFL 1.1, pinned in `source/`), variable
weight 400 to 700, roman and italic.

## Build

```sh
uv run scripts/fonts/lora/build.py
```

Writes `packages/ui/src/fonts/lora.woff2` and `lora-italic.woff2`.

"Lora" is a Reserved Font Name, so the build only wraps the fonts in WOFF2:
no subsetting or other change, which the OFL allows without renaming (see
`source/OFL.txt`).
