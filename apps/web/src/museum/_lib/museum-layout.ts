export type Vec3 = readonly [number, number, number]

export type Collider = {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export const eyeHeight = 1.6

// The manor's front wall: its inside face at z = 0, the facade beyond it.
// Every room is laid out by the manor plan (gallery/_lib/manor-plan).
export const frontWall = { z: 0, thickness: 0.3 } as const

export const entranceDoor = {
  centerX: 0,
  width: 1.8,
  height: 2.8,
  innerZ: frontWall.z,
  outerZ: frontWall.z + frontWall.thickness,
} as const

// The close shot on the portal: the door, both lanterns, the nearest windows
// and the neon sign at the top, with only the ground floor in frame.
export const cameraStart = {
  position: [0, 1.65, 3.6] satisfies Vec3,
  lookAt: [0, 1.85, 0] satisfies Vec3,
  fov: 70,
} as const

export const playerSpawn = {
  position: [0, eyeHeight, -2.5] satisfies Vec3,
  yaw: 0,
} as const

export const playerRadius = 0.35
