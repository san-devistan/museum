// Shared contract between the manor plan (which places props) and the props
// themselves. Keep these names stable: add to them, don't rename them.

export type PropId =
  | "cape-stand"
  | "perfume-console"
  | "birdcage"
  | "bench-ribbon"
  | "vanity"
  | "dress-form"
  | "dining-table"
  | "pale-mark"

export type PropSpot = {
  id: PropId
  // Floor point in world space. For "pale-mark", the centre of the mark on
  // the wall's face; for "bench-ribbon", the bench's centre.
  position: readonly [number, number, number]
  // Turn around Y; the prop's front faces +Z before the turn.
  rotationY: number
  // Varies repeated props such as the six dress forms (0 to 5 give six
  // different ones).
  seed?: number
}

// Floor footprint in metres before the turn, for colliders. Zero means the
// visitor walks through or it sits on something else.
export const propFootprints: Record<PropId, { width: number; depth: number }> =
  {
    "cape-stand": { width: 0.6, depth: 0.5 },
    "perfume-console": { width: 1.1, depth: 0.42 },
    birdcage: { width: 0.6, depth: 0.6 },
    "bench-ribbon": { width: 0, depth: 0 },
    vanity: { width: 1.15, depth: 0.5 },
    "dress-form": { width: 0.55, depth: 0.55 },
    // Table for two, both chairs included (hers pulled back).
    "dining-table": { width: 3.4, depth: 1.1 },
    "pale-mark": { width: 0, depth: 0 },
  }

// Height of furniture tops that other things stand on (ikebanas, cake).
export const propSurfaces = {
  perfumeConsoleTop: 0.82,
  diningTableTop: 0.76,
} as const

// Where a frame once hung: the 13th frame takes its place at midnight. Hang
// its centre at the frames' height (1.65 m).
export const paleMarkSize = { width: 1.2, height: 1.6 } as const

// The two ikebana centrepieces on the dining table, in the table's own
// metres before its turn (x along its length). The stretch between them is
// kept clear so one can reach the other. Madame sits at -x, the guest at +x.
export const diningCentrepieces = [
  { x: -0.35, z: 0 },
  { x: 0.35, z: 0 },
] as const

// Room around each centrepiece before it meets a plate, cake or candelabra.
export const diningCentrepieceRadius = 0.2

// A point given in a prop's own frame, placed in the world by its spot.
export function propPointToWorld(
  spot: PropSpot,
  local: readonly [number, number, number]
): [number, number, number] {
  const cos = Math.cos(spot.rotationY)
  const sin = Math.sin(spot.rotationY)
  const [x, y, z] = local
  return [
    spot.position[0] + x * cos + z * sin,
    spot.position[1] + y,
    spot.position[2] - x * sin + z * cos,
  ]
}

// The centrepieces' floor-of-table points in world space, for a table spot.
export function diningCentrepieceSpots(table: PropSpot) {
  return diningCentrepieces.map((piece) =>
    propPointToWorld(table, [piece.x, propSurfaces.diningTableTop, piece.z])
  )
}
