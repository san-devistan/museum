# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "fonttools[woff]>=4.60",
#   "freetype-py>=2.5",
#   "numpy>=2.0",
#   "scipy>=1.14",
# ]
# ///

from __future__ import annotations

import argparse
import math
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from fontTools import subset
from fontTools.misc.transform import Transform
from fontTools.pens.freetypePen import FreeTypePen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables import otTables
from fontTools.varLib import instancer
from scipy import ndimage

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "source" / "playwrite-fr-trad.ttf"
DEFAULT_OUTPUT = (
    ROOT.parents[2] / "packages" / "ui" / "src" / "fonts" / "dotted-script.woff2"
)

FAMILY = "Dotted Script"
POSTSCRIPT = "DottedScript-Regular"
VERSION = "1.000"
COPYRIGHT = (
    "Copyright 2023 The Playwrite Project Authors "
    "(https://github.com/TypeTogether/Playwrite). "
    "Dot-grid derivative made for the museum project."
)
LICENSE = (
    "This Font Software is licensed under the SIL Open Font License, "
    "Version 1.1. This license is available with a FAQ at: "
    "https://openfontlicense.org"
)

UNICODES = [
    *range(0x20, 0x7F),
    *range(0xA0, 0x100),
    0x152,
    0x153,
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

LAYOUT_FEATURES = ["calt", "ccmp", "locl", "kern", "dist", "mark", "mkmk"]
VALUE_FIELDS = ("XAdvance", "XPlacement", "YAdvance", "YPlacement")


@dataclass(frozen=True)
class Grid:
    pitch: int
    dot: float
    threshold: float
    stroke: float
    slant: float
    supersample: int

    def snap(self, value: float) -> int:
        return round(value / self.pitch) * self.pitch

    def lean(self, x: float, y: float) -> float:
        return x + y * math.tan(math.radians(self.slant))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Turn a joined cursive into a dot-grid display font."
    )
    parser.add_argument(
        "--pitch", type=int, default=72, help="dot spacing in font units"
    )
    parser.add_argument(
        "--dot", type=float, default=0.53, help="dot radius as a fraction of the pitch"
    )
    parser.add_argument(
        "--threshold", type=float, default=0.42, help="cell coverage that becomes a dot"
    )
    parser.add_argument(
        "--stroke",
        type=float,
        default=22,
        help="extra stroke weight on each side before dotting, in font units",
    )
    parser.add_argument(
        "--slant", type=float, default=12, help="italic angle in degrees"
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--ttf", type=Path, default=None, help="also write a TTF for previews"
    )
    return parser.parse_args()


def load_source() -> TTFont:
    font = instancer.instantiateVariableFont(TTFont(SOURCE), {"wght": 400})
    options = subset.Options()
    options.layout_features = LAYOUT_FEATURES
    options.name_IDs = []
    options.hinting = False
    options.glyph_names = True
    options.notdef_outline = True
    options.drop_tables += ["meta", "STAT", "gasp", "prep"]
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=UNICODES)
    subsetter.subset(font)
    return font


def snap_metrics(font: TTFont, grid: Grid) -> None:
    hmtx = font["hmtx"]
    for name in font.getGlyphOrder():
        advance, lsb = hmtx[name]
        hmtx[name] = (grid.snap(advance), lsb)


def gpos_subtables(font: TTFont):
    if "GPOS" not in font:
        return
    for lookup in font["GPOS"].table.LookupList.Lookup:
        for table in lookup.SubTable:
            yield getattr(table, "ExtSubTable", table)


def snap_positioning(font: TTFont, grid: Grid) -> None:
    for table in gpos_subtables(font):
        for anchor in iter_anchors(table):
            anchor.XCoordinate = grid.snap(
                grid.lean(anchor.XCoordinate, anchor.YCoordinate)
            )
            anchor.YCoordinate = grid.snap(anchor.YCoordinate)
        for value in iter_values(table):
            for field in VALUE_FIELDS:
                if getattr(value, field, None):
                    setattr(value, field, grid.snap(getattr(value, field)))


def iter_values(table: otTables.BaseTable):
    if isinstance(table, otTables.SinglePos):
        values = table.Value if isinstance(table.Value, list) else [table.Value]
        yield from (value for value in values if value)
    if isinstance(table, otTables.PairPos) and table.Format == 1:
        for pair_set in table.PairSet:
            for record in pair_set.PairValueRecord:
                yield from (value for value in (record.Value1, record.Value2) if value)
    if isinstance(table, otTables.PairPos) and table.Format == 2:
        for class1 in table.Class1Record:
            for record in class1.Class2Record:
                yield from (value for value in (record.Value1, record.Value2) if value)


def iter_anchors(table: otTables.BaseTable):
    if isinstance(table, otTables.MarkBasePos):
        yield from (record.MarkAnchor for record in table.MarkArray.MarkRecord)
        for record in table.BaseArray.BaseRecord:
            yield from (anchor for anchor in record.BaseAnchor if anchor)
    if isinstance(table, otTables.MarkMarkPos):
        yield from (record.MarkAnchor for record in table.Mark1Array.MarkRecord)
        for record in table.Mark2Array.Mark2Record:
            yield from (anchor for anchor in record.Mark2Anchor if anchor)


def coverage_grid(font: TTFont, name: str, grid: Grid):
    glyf = font["glyf"]
    glyph = glyf[name]
    glyph.recalcBounds(glyf)
    margin = grid.pitch * 2 + grid.stroke
    lean_left = min(
        grid.lean(glyph.xMin, glyph.yMin), grid.lean(glyph.xMin, glyph.yMax)
    )
    lean_right = max(
        grid.lean(glyph.xMax, glyph.yMin), grid.lean(glyph.xMax, glyph.yMax)
    )
    column_start = math.floor((lean_left - margin) / grid.pitch)
    column_end = math.ceil((lean_right + margin) / grid.pitch)
    row_start = math.floor((glyph.yMin - margin) / grid.pitch)
    row_end = math.ceil((glyph.yMax + margin) / grid.pitch)
    columns = column_end - column_start + 1
    rows = row_end - row_start + 1

    sample = grid.supersample
    scale = sample / grid.pitch
    shift_x = (0.5 - column_start) * sample
    shift_y = (0.5 - row_start) * sample
    raster = FreeTypePen(font.getGlyphSet())
    font.getGlyphSet()[name].draw(raster)
    shear = scale * math.tan(math.radians(grid.slant))
    image = raster.array(
        width=columns * sample,
        height=rows * sample,
        transform=Transform(scale, 0, shear, scale, shift_x, shift_y),
    )
    if grid.stroke > 0:
        size = max(1, round(grid.stroke * scale)) * 2 + 1
        footprint = disk(size)
        image = ndimage.grey_dilation(image, footprint=footprint)

    cells = image.reshape(rows, sample, columns, sample).mean(axis=(1, 3))
    return cells[::-1], column_start, row_start


def disk(size: int) -> np.ndarray:
    radius = size / 2
    axis = np.arange(size) - radius + 0.5
    return (axis[:, None] ** 2 + axis[None, :] ** 2) <= radius**2


def pick_dots(cells: np.ndarray, threshold: float) -> np.ndarray:
    dots = cells >= threshold
    labels, count = ndimage.label(cells > 0.04, structure=np.ones((3, 3)))
    for label in range(1, count + 1):
        component = labels == label
        if dots[component].any():
            continue
        dots.flat[np.argmax(np.where(component, cells, -1))] = True
    return dots


def draw_dot(pen: TTGlyphPen, center: tuple[int, int], radius: float) -> None:
    cx, cy = center
    r = round(radius)
    k = round(radius * 0.4142)
    pen.moveTo((cx + r, cy))
    pen.qCurveTo((cx + r, cy - k), (cx + k, cy - r), (cx, cy - r))
    pen.qCurveTo((cx - k, cy - r), (cx - r, cy - k), (cx - r, cy))
    pen.qCurveTo((cx - r, cy + k), (cx - k, cy + r), (cx, cy + r))
    pen.qCurveTo((cx + k, cy + r), (cx + r, cy + k), (cx + r, cy))
    pen.closePath()


def dotted_glyph(font: TTFont, name: str, grid: Grid):
    pen = TTGlyphPen(None)
    source = font["glyf"][name]
    if source.numberOfContours == 0:
        return pen.glyph()
    cells, column_start, row_start = coverage_grid(font, name, grid)
    radius = grid.pitch * grid.dot
    for row, column in zip(*np.nonzero(pick_dots(cells, grid.threshold))):
        center = (
            (column_start + int(column)) * grid.pitch,
            (row_start + int(row)) * grid.pitch,
        )
        draw_dot(pen, center, radius)
    return pen.glyph()


def replace_outlines(font: TTFont, grid: Grid) -> None:
    glyf = font["glyf"]
    hmtx = font["hmtx"]
    order = font.getGlyphOrder()
    dotted = {name: dotted_glyph(font, name, grid) for name in order}
    for name in order:
        glyph = dotted[name]
        glyf[name] = glyph
        glyph.recalcBounds(glyf)
        advance, _ = hmtx[name]
        hmtx[name] = (advance, getattr(glyph, "xMin", 0))
    for table in ("gvar", "HVAR", "fvar", "avar", "cvar", "MVAR"):
        if table in font:
            del font[table]
    font["maxp"].recalc(font)
    font["OS/2"].recalcAvgCharWidth(font)


def rename(font: TTFont) -> None:
    names = {
        0: COPYRIGHT,
        1: FAMILY,
        2: "Regular",
        3: f"{VERSION};MUSEUM;{POSTSCRIPT}",
        4: f"{FAMILY} Regular",
        5: f"Version {VERSION}",
        6: POSTSCRIPT,
        13: LICENSE,
        14: "https://openfontlicense.org",
    }
    table = font["name"]
    table.names = []
    for name_id, value in names.items():
        table.setName(value, name_id, 3, 1, 0x409)
    font["head"].fontRevision = float(VERSION)
    font["OS/2"].achVendID = "NONE"


def set_slant(font: TTFont, grid: Grid) -> None:
    font["post"].italicAngle = -grid.slant
    font["hhea"].caretSlopeRise = 1000
    font["hhea"].caretSlopeRun = round(1000 * math.tan(math.radians(grid.slant)))


def build(settings: argparse.Namespace) -> TTFont:
    grid = Grid(
        pitch=settings.pitch,
        dot=settings.dot,
        threshold=settings.threshold,
        stroke=settings.stroke,
        slant=settings.slant,
        supersample=8,
    )
    font = load_source()
    snap_metrics(font, grid)
    snap_positioning(font, grid)
    replace_outlines(font, grid)
    set_slant(font, grid)
    rename(font)
    return font


def main() -> None:
    settings = parse_args()
    font = build(settings)
    if settings.ttf:
        settings.ttf.parent.mkdir(parents=True, exist_ok=True)
        font.flavor = None
        font.save(settings.ttf)
    settings.output.parent.mkdir(parents=True, exist_ok=True)
    font.flavor = "woff2"
    font.save(settings.output, reorderTables=False)
    print(f"wrote {settings.output} ({settings.output.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
