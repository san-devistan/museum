import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  MathUtils,
  Vector3,
} from "three"

// A satin ribbon swept along a path: a thin band with real thickness, soft
// cupped edges, pleats where it gathers, and blush baked into its folds as
// vertex colours. Pieces may carry an untied pose, kept as a morph target.

/** One cross-section of the ribbon, written by a piece's `station`. */
export type SatinStation = {
  position: Vector3
  /** Where the satin face looks; squared to the path by the sweep. */
  facing: Vector3
  /** Which way the width runs; when set, it wins over `facing`. */
  across: Vector3
  width: number
  /** Turn of the face around the path, in radians. */
  twist: number
  /** Edges lifting towards the face (+) or away from it (−), in metres. */
  cup: number
  /** Depth of the soft pleats across the width, in metres. */
  pleat: number
  /** Blush in the folds, 0 (lit satin) to 1 (deep), on each side. */
  shade: number
  backShade: number
}

export type StationFn = (s: number, out: SatinStation) => void

export type SatinPiece = {
  station: StationFn
  /** The same ribbon loosened, reached through the morph target. */
  untied?: StationFn
  segments: number
  /** Depth of a V-cut at the end (and at the start), in metres. */
  notch?: number
  notchStart?: number
}

export type SatinTone = { light: Color; shade: Color }

export type SatinSpec = {
  thickness: number
  tone: SatinTone
  /** Width that one unit of the u texture coordinate spans. */
  uvWidth: number
}

const across = 8
const pleatWaves = 2.5
const tangentStep = 0.002

type Buffers = {
  positions: number[]
  uvs: number[]
  colors: number[]
  untiedPositions: number[]
  indices: number[]
  hasUntied: boolean
}

export function createStation(): SatinStation {
  return {
    position: new Vector3(),
    facing: new Vector3(0, 0, 1),
    across: new Vector3(),
    width: 0.05,
    twist: 0,
    cup: 0,
    pleat: 0,
    shade: 0,
    backShade: 0.4,
  }
}

function resetStation(station: SatinStation) {
  station.facing.set(0, 0, 1)
  station.across.set(0, 0, 0)
  station.twist = 0
  station.cup = 0
  station.pleat = 0
  station.shade = 0
  station.backShade = 0.4
}

const sample = createStation()
const before = createStation()
const after = createStation()
const tangent = new Vector3()
const normal = new Vector3()
const binormal = new Vector3()
const turned = new Vector3()
const point = new Vector3()
const tint = new Color()

function evaluate(fn: StationFn, s: number, out: SatinStation) {
  resetStation(out)
  fn(MathUtils.clamp(s, 0, 1), out)
}

/** The station at `s` plus its frame: tangent, face normal, width direction. */
function frameAt(fn: StationFn, s: number) {
  evaluate(fn, s, sample)
  evaluate(fn, s - tangentStep, before)
  evaluate(fn, s + tangentStep, after)
  tangent.subVectors(after.position, before.position).normalize()
  if (sample.across.lengthSq() > 0) {
    binormal
      .copy(sample.across)
      .addScaledVector(tangent, -sample.across.dot(tangent))
      .normalize()
    normal.crossVectors(binormal, tangent).normalize()
  } else {
    normal
      .copy(sample.facing)
      .addScaledVector(tangent, -sample.facing.dot(tangent))
      .normalize()
  }
  if (sample.twist !== 0) {
    turned.crossVectors(tangent, normal)
    normal
      .multiplyScalar(Math.cos(sample.twist))
      .addScaledVector(turned, Math.sin(sample.twist))
      .normalize()
  }
  binormal.crossVectors(tangent, normal).normalize()
  return sample
}

function pleatAt(lateral: number) {
  return Math.cos(lateral * Math.PI * pleatWaves)
}

/** A point on one face of the band; `side` is +1 (face) or −1 (back). */
function surfacePoint(
  station: SatinStation,
  lateral: number,
  side: number,
  thickness: number
) {
  const bulge =
    station.cup * lateral * lateral + station.pleat * pleatAt(lateral)
  return point
    .copy(station.position)
    .addScaledVector(binormal, (lateral * station.width) / 2)
    .addScaledVector(normal, (side * thickness) / 2 + bulge)
}

function foldShade(station: SatinStation, lateral: number, side: number) {
  const base = side > 0 ? station.shade : station.backShade
  const valley = 0.5 - 0.5 * pleatAt(lateral)
  const depth = MathUtils.clamp(station.pleat / 0.004, 0, 1)
  return MathUtils.clamp(base + 0.35 * valley * depth, 0, 1)
}

function lengthOf(fn: StationFn) {
  const steps = 64
  let length = 0
  evaluate(fn, 0, before)
  for (let step = 1; step <= steps; step += 1) {
    evaluate(fn, step / steps, after)
    length += after.position.distanceTo(before.position)
    before.position.copy(after.position)
  }
  return length
}

type Grid = { rows: number; columns: number }

/** V-cut depths as shares of the piece's length. */
type Notches = { start: number; end: number }

/** Along-path parameter of a vertex, with the V-cuts carved into the ends. */
function paramAt(notches: Notches, along: number, lateral: number) {
  const inset = 1 - Math.abs(lateral)
  return MathUtils.lerp(notches.start * inset, 1 - notches.end * inset, along)
}

function lateralAt(column: number) {
  return (column / across) * 2 - 1
}

type Vertex = { row: number; lateral: number; side: number }

function writeVertices(
  piece: SatinPiece,
  spec: SatinSpec,
  buffers: Buffers,
  grid: Grid
) {
  const length = lengthOf(piece.station)
  const notches = {
    start: (piece.notchStart ?? 0) / length,
    end: (piece.notch ?? 0) / length,
  }
  for (const { row, lateral, side } of pieceVertices(grid)) {
    const s = paramAt(notches, row / grid.rows, lateral)
    const station = frameAt(piece.station, s)
    const shade = foldShade(station, lateral, side)
    surfacePoint(station, lateral, side, spec.thickness)
    buffers.positions.push(point.x, point.y, point.z)
    buffers.uvs.push((s * length) / spec.uvWidth, (lateral + 1) / 2)
    tint.copy(spec.tone.light).lerp(spec.tone.shade, shade)
    buffers.colors.push(tint.r, tint.g, tint.b)
    if (piece.untied) {
      frameAt(piece.untied, s)
      surfacePoint(sample, lateral, side, spec.thickness)
      buffers.untiedPositions.push(point.x, point.y, point.z)
    }
  }
}

/** Vertex layout: face grid, back grid, then the two edges (face, back). */
function pieceVertices(grid: Grid) {
  const vertices: Vertex[] = []
  for (const side of [1, -1]) {
    for (let row = 0; row <= grid.rows; row += 1) {
      for (let column = 0; column <= grid.columns; column += 1) {
        vertices.push({ row, lateral: lateralAt(column), side })
      }
    }
  }
  for (const lateral of [-1, 1]) {
    for (let row = 0; row <= grid.rows; row += 1) {
      vertices.push({ row, lateral, side: 1 }, { row, lateral, side: -1 })
    }
  }
  return vertices
}

function pieceIndices(grid: Grid, offset: number) {
  const indices: number[] = []
  const stride = grid.columns + 1
  const faceSize = (grid.rows + 1) * stride
  for (const [base, isBack] of [
    [offset, false],
    [offset + faceSize, true],
  ] as const) {
    for (let row = 0; row < grid.rows; row += 1) {
      for (let column = 0; column < grid.columns; column += 1) {
        const a = base + row * stride + column
        const b = a + 1
        const c = a + stride
        const d = c + 1
        if (isBack) {
          indices.push(a, c, b, b, c, d)
        } else {
          indices.push(a, b, c, b, d, c)
        }
      }
    }
  }
  const edgeBase = offset + faceSize * 2
  const edgeSize = (grid.rows + 1) * 2
  for (const [base, isRight] of [
    [edgeBase, false],
    [edgeBase + edgeSize, true],
  ] as const) {
    for (let row = 0; row < grid.rows; row += 1) {
      const face = base + row * 2
      const back = face + 1
      const nextFace = face + 2
      const nextBack = face + 3
      if (isRight) {
        indices.push(face, back, nextFace, back, nextBack, nextFace)
      } else {
        indices.push(face, nextFace, back, back, nextFace, nextBack)
      }
    }
  }
  return indices
}

function smoothNormals(
  positions: readonly number[],
  indices: readonly number[]
) {
  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
  geometry.setIndex([...indices])
  geometry.computeVertexNormals()
  const normals = Array.from(geometry.getAttribute("normal").array)
  geometry.dispose()
  return normals
}

/** Sweeps every piece into one drawable, with an untie morph if any piece has one. */
export function sweepSatin(
  pieces: readonly SatinPiece[],
  spec: SatinSpec
): BufferGeometry {
  const buffers: Buffers = {
    positions: [],
    uvs: [],
    colors: [],
    untiedPositions: [],
    indices: [],
    hasUntied: pieces.some((piece) => piece.untied),
  }
  for (const piece of pieces) {
    const grid = { rows: piece.segments, columns: across }
    const offset = buffers.positions.length / 3
    writeVertices(piece, spec, buffers, grid)
    if (buffers.hasUntied && !piece.untied) {
      buffers.untiedPositions.push(...buffers.positions.slice(offset * 3))
    }
    buffers.indices.push(...pieceIndices(grid, offset))
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(buffers.positions, 3)
  )
  geometry.setAttribute(
    "normal",
    new Float32BufferAttribute(
      smoothNormals(buffers.positions, buffers.indices),
      3
    )
  )
  geometry.setAttribute("uv", new Float32BufferAttribute(buffers.uvs, 2))
  geometry.setAttribute("color", new Float32BufferAttribute(buffers.colors, 3))
  geometry.setIndex(buffers.indices)
  if (buffers.hasUntied) {
    geometry.morphAttributes.position = [
      new Float32BufferAttribute(buffers.untiedPositions, 3),
    ]
    geometry.morphAttributes.normal = [
      new Float32BufferAttribute(
        smoothNormals(buffers.untiedPositions, buffers.indices),
        3
      ),
    ]
  }
  geometry.computeBoundingSphere()
  return geometry
}
