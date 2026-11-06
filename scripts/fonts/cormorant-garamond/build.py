# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "fonttools[woff]>=4.60",
# ]
# ///

from __future__ import annotations

import argparse
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "source" / "cormorant-garamond.ttf"
DEFAULT_OUTPUT = (
    ROOT.parents[2] / "packages" / "ui" / "src" / "fonts" / "cormorant-garamond.woff2"
)

# Titles only: medium to bold is enough.
WEIGHTS = (500, 700)

# Latin and the French typography: accents, « », ’, …, Œ œ Ÿ.
UNICODES = [
    *range(0x20, 0x7F),
    *range(0xA0, 0x100),
    0x152,
    0x153,
    0x178,
    0x2013,
    0x2014,
    0x2018,
    0x2019,
    0x201A,
    0x201C,
    0x201D,
    0x201E,
    0x2022,
    0x2026,
    0x2039,
    0x203A,
    0x20AC,
    0x2122,
]

LAYOUT_FEATURES = ["calt", "ccmp", "locl", "kern", "liga", "mark", "mkmk"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Subset Cormorant Garamond for the display titles."
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    return parser.parse_args()


def build() -> TTFont:
    font = TTFont(SOURCE)
    options = subset.Options()
    options.layout_features = LAYOUT_FEATURES
    options.hinting = False
    options.notdef_outline = True
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=UNICODES)
    subsetter.subset(font)
    return instancer.instantiateVariableFont(
        font, {"wght": instancer.AxisTriple(WEIGHTS[0], 600, WEIGHTS[1])}
    )


def main() -> None:
    settings = parse_args()
    font = build()
    settings.output.parent.mkdir(parents=True, exist_ok=True)
    font.flavor = "woff2"
    font.save(settings.output)
    print(f"wrote {settings.output} ({settings.output.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
