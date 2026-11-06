import type { VesselKind } from "@/museum/gallery/ikebana/_lib/ikebana-vessel"

export type IkebanaVariant = 0 | 1 | 2 | 3

export type Polar = {
  angle: number
  reach: number
  height: number
  size: number
}

export type Slots = {
  alliums: readonly Polar[]
  blooms: readonly Polar[]
  callas: readonly Polar[]
  spathes: readonly Polar[]
  crystals: readonly Polar[]
}

export type WillowRecipe = {
  angle: number
  reach: number
  height: number
  turns: number
}

export type Recipe = {
  seed: number
  yaw: number
  mirror: boolean
  lift: number
  vessel: VesselKind
  slots: Slots
  willow: WillowRecipe | null
  moss: number | null
  strandEdge: number
  strands: readonly { offset: number; hang: boolean }[]
}

export const ikebanaRecipes: Record<IkebanaVariant, Recipe> = {
  0: {
    seed: 1103,
    yaw: 0,
    mirror: false,
    lift: 1,
    vessel: "crumpled",
    slots: {
      alliums: [
        { angle: 2.7, reach: 0.04, height: 1.0, size: 0.062 },
        { angle: -0.5, reach: 0.07, height: 0.9, size: 0.056 },
        { angle: 1.3, reach: 0.15, height: 0.78, size: 0.05 },
        { angle: -2.1, reach: 0.14, height: 0.72, size: 0.046 },
      ],
      blooms: [
        { angle: 0.15, reach: 0.13, height: 0.43, size: 0.042 },
        { angle: -0.45, reach: 0.15, height: 0.38, size: 0.038 },
        { angle: 0.6, reach: 0.1, height: 0.48, size: 0.04 },
      ],
      callas: [{ angle: 2.0, reach: 0.15, height: 0.4, size: 0.1 }],
      spathes: [{ angle: 0.75, reach: 0.13, height: 0.64, size: 0.21 }],
      crystals: [{ angle: -0.95, reach: 0.12, height: 0.54, size: 0.17 }],
    },
    willow: { angle: -2.25, reach: 0.24, height: 1.04, turns: 5.5 },
    moss: 2.05,
    strandEdge: 0.25,
    strands: [
      { offset: -0.32, hang: false },
      { offset: -0.1, hang: true },
      { offset: 0.08, hang: true },
      { offset: 0.28, hang: false },
    ],
  },
  1: {
    seed: 2909,
    yaw: 1.2,
    mirror: true,
    lift: 1,
    vessel: "column",
    slots: {
      alliums: [
        { angle: 0.4, reach: 0.03, height: 1.18, size: 0.07 },
        { angle: 2.6, reach: 0.05, height: 1.06, size: 0.052 },
      ],
      blooms: [],
      callas: [
        { angle: -0.6, reach: 0.11, height: 0.76, size: 0.12 },
        { angle: 1.7, reach: 0.12, height: 0.7, size: 0.11 },
        { angle: 3.4, reach: 0.1, height: 0.82, size: 0.1 },
      ],
      spathes: [{ angle: 0.9, reach: 0.16, height: 0.92, size: 0.24 }],
      crystals: [],
    },
    willow: { angle: -2.4, reach: 0.34, height: 1.24, turns: 7 },
    moss: null,
    strandEdge: Math.PI / 2 + 0.2,
    strands: [
      { offset: -0.18, hang: true },
      { offset: 0.14, hang: true },
    ],
  },
  2: {
    seed: 4723,
    yaw: 3.7,
    mirror: false,
    lift: 1,
    vessel: "suiban",
    slots: {
      alliums: [{ angle: -1.9, reach: 0.12, height: 0.62, size: 0.05 }],
      blooms: [
        { angle: 0.3, reach: 0.13, height: 0.14, size: 0.05 },
        { angle: 1.1, reach: 0.16, height: 0.11, size: 0.046 },
        { angle: 0.7, reach: 0.06, height: 0.18, size: 0.052 },
        { angle: 1.8, reach: 0.1, height: 0.15, size: 0.044 },
        { angle: -0.4, reach: 0.17, height: 0.12, size: 0.042 },
      ],
      callas: [],
      spathes: [],
      crystals: [
        { angle: 2.8, reach: 0.1, height: 0.42, size: 0.2 },
        { angle: -2.6, reach: 0.15, height: 0.34, size: 0.15 },
      ],
    },
    willow: { angle: 2.3, reach: 0.38, height: 0.78, turns: 4.5 },
    moss: -1.1,
    strandEdge: Math.PI - 0.3,
    strands: [
      { offset: -0.26, hang: false },
      { offset: 0.2, hang: false },
    ],
  },
  3: {
    seed: 8317,
    yaw: 5.2,
    mirror: true,
    lift: 1,
    vessel: "moonJar",
    slots: {
      alliums: [
        { angle: 1.9, reach: 0.18, height: 0.82, size: 0.06 },
        { angle: 2.5, reach: 0.22, height: 0.68, size: 0.05 },
        { angle: -2.9, reach: 0.16, height: 0.92, size: 0.055 },
      ],
      blooms: [
        { angle: 0.2, reach: 0.16, height: 0.5, size: 0.046 },
        { angle: -0.6, reach: 0.18, height: 0.46, size: 0.042 },
      ],
      callas: [{ angle: -2.0, reach: 0.17, height: 0.56, size: 0.1 }],
      spathes: [
        { angle: 0.9, reach: 0.18, height: 0.7, size: 0.22 },
        { angle: -1.3, reach: 0.17, height: 0.78, size: 0.18 },
      ],
      crystals: [{ angle: 3.0, reach: 0.15, height: 0.64, size: 0.16 }],
    },
    willow: null,
    moss: null,
    strandEdge: -Math.PI / 2,
    strands: [
      { offset: -0.3, hang: true },
      { offset: -0.12, hang: true },
      { offset: 0.06, hang: false },
      { offset: 0.24, hang: true },
      { offset: 0.38, hang: true },
    ],
  },
}
