export type ArtworkCredit = {
  role: string
  names: string
}

export type ExhibitKind = "photograph" | "arrangement"

export type ArtworkLabel = {
  id: string
  kind: ExhibitKind
  title: string
  artist?: string
  year?: string
  medium?: string
  statement?: string
  credits?: readonly ArtworkCredit[]
  link?: string
}

export type PlanarSpot = { x: number; z: number }

export type ExhibitSpot = {
  label: ArtworkLabel
  position: PlanarSpot
  normal: PlanarSpot | null
  reach: number
  // Read on every focus check: while it returns false, the spot is ignored.
  isFocusable?: () => boolean
}
