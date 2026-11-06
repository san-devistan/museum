import type { ProfilePoint } from "@/museum/gallery/mouldings/_lib/wall-sweep"

export const dado = {
  fieldBottom: 0.15,
  fieldTop: 0.42,
  fieldInset: 0.018,
  top: 0.5,
  bay: 0.8,
} as const

export const defaultPictureRailY = 3.3

export const baseProfile: readonly ProfilePoint[] = [
  [0, 0],
  [0.032, 0],
  [0.032, 0.108],
  [0.028, 0.114],
  [0.025, 0.122],
  [0.027, 0.131],
  [0.024, 0.139],
  [0.02, 0.146],
  [dado.fieldInset, dado.fieldBottom],
  [0, dado.fieldBottom],
]

export const fieldProfile: readonly ProfilePoint[] = [
  [0, dado.fieldBottom],
  [dado.fieldInset, dado.fieldBottom],
  [dado.fieldInset, dado.fieldTop],
  [0, dado.fieldTop],
]

export const chairRailProfile: readonly ProfilePoint[] = [
  [0, dado.fieldTop],
  [0.022, dado.fieldTop],
  [0.03, 0.424],
  [0.04, 0.43],
  [0.048, 0.438],
  [0.052, 0.448],
  [0.05, 0.458],
  [0.044, 0.464],
  [0.046, 0.47],
  [0.05, 0.476],
  [0.05, 0.488],
  [0.044, 0.494],
  [0.03, 0.498],
  [0, dado.top],
]

export function pictureRailProfile(
  pictureRailY: number
): readonly ProfilePoint[] {
  return [
    [0, pictureRailY - 0.02],
    [0.014, pictureRailY - 0.016],
    [0.022, pictureRailY - 0.006],
    [0.026, pictureRailY + 0.006],
    [0.024, pictureRailY + 0.018],
    [0.018, pictureRailY + 0.026],
    [0.02, pictureRailY + 0.032],
    [0.02, pictureRailY + 0.04],
    [0, pictureRailY + 0.045],
  ]
}

export function corniceProfile(ceiling: number): readonly ProfilePoint[] {
  return [
    [0, ceiling - 0.52],
    [0.012, ceiling - 0.515],
    [0.016, ceiling - 0.505],
    [0.014, ceiling - 0.495],
    [0.02, ceiling - 0.488],
    [0.02, ceiling - 0.45],
    [0.03, ceiling - 0.44],
    [0.045, ceiling - 0.43],
    [0.06, ceiling - 0.41],
    [0.075, ceiling - 0.38],
    [0.085, ceiling - 0.35],
    [0.1, ceiling - 0.33],
    [0.13, ceiling - 0.32],
    [0.13, ceiling - 0.285],
    [0.15, ceiling - 0.28],
    [0.17, ceiling - 0.265],
    [0.17, ceiling - 0.23],
    [0.2, ceiling - 0.225],
    [0.23, ceiling - 0.21],
    [0.24, ceiling - 0.19],
    [0.24, ceiling - 0.13],
    [0.255, ceiling - 0.12],
    [0.27, ceiling - 0.1],
    [0.29, ceiling - 0.07],
    [0.31, ceiling - 0.04],
    [0.33, ceiling - 0.015],
    [0.34, ceiling],
    [0, ceiling],
  ]
}

// Radius and height of the carved rose the chandelier hangs from.
export function ceilingRoseProfile(ceiling: number): readonly ProfilePoint[] {
  return [
    [0.62, ceiling],
    [0.6, ceiling - 0.012],
    [0.56, ceiling - 0.018],
    [0.52, ceiling - 0.016],
    [0.48, ceiling - 0.024],
    [0.44, ceiling - 0.034],
    [0.4, ceiling - 0.036],
    [0.36, ceiling - 0.03],
    [0.32, ceiling - 0.034],
    [0.28, ceiling - 0.05],
    [0.24, ceiling - 0.058],
    [0.2, ceiling - 0.052],
    [0.16, ceiling - 0.06],
    [0.12, ceiling - 0.075],
    [0.06, ceiling - 0.082],
    [0, ceiling - 0.084],
  ]
}
