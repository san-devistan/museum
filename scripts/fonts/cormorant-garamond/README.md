# Cormorant Garamond

Display serif for the titles on the artwork card and the objective card
(`--font-display`).

Cormorant Garamond by Christian Thalmann, from Google Fonts (OFL 1.1, pinned
in `source/`).

## Build

```sh
uv run scripts/fonts/cormorant-garamond/build.py
```

Writes `packages/ui/src/fonts/cormorant-garamond.woff2`: Latin with the French
accents and punctuation, weights 500 to 700. The family has no Reserved Font
Name, so the subset keeps its name.
