# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "fonttools[woff]>=4.60",
# ]
# ///

from __future__ import annotations

import argparse
from pathlib import Path

from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "source"
DEFAULT_OUTPUT = ROOT.parents[2] / "packages" / "ui" / "src" / "fonts"

# "Lora" is a Reserved Font Name, so the font is only wrapped in WOFF2: no
# subsetting, no instancing, no table rewrites (see the OFL FAQ on WOFF).
FACES = {
    "lora.ttf": "lora.woff2",
    "lora-italic.ttf": "lora-italic.woff2",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Wrap the pinned Lora variable fonts in WOFF2."
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    return parser.parse_args()


def main() -> None:
    settings = parse_args()
    settings.output.mkdir(parents=True, exist_ok=True)
    for source, target in FACES.items():
        font = TTFont(SOURCE / source, recalcBBoxes=False, recalcTimestamp=False)
        font.flavor = "woff2"
        path = settings.output / target
        font.save(path, reorderTables=False)
        print(f"wrote {path} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
