import { createRandom, type Random } from "@/museum/_lib/relief/height-field"
import { createCanvasTexture } from "@/museum/_lib/surface-texture"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import {
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  type CanvasTexture,
} from "three"

const { manor, palette } = sceneTokens
const sky = { width: 256, height: 640 }

function paintSkyGradient(
  context: CanvasRenderingContext2D,
  isMoonlit: boolean
) {
  const gradient = context.createLinearGradient(0, 0, 0, sky.height)
  gradient.addColorStop(0, manor.nightSky)
  gradient.addColorStop(0.55, isMoonlit ? manor.nightHaze : manor.nightSky)
  gradient.addColorStop(1, manor.nightHaze)
  context.fillStyle = gradient
  context.fillRect(0, 0, sky.width, sky.height)
  if (!isMoonlit) {
    return
  }
  const glow = context.createRadialGradient(190, 150, 4, 190, 150, 260)
  glow.addColorStop(0, "rgba(219, 232, 246, 0.85)")
  glow.addColorStop(0.08, "rgba(180, 205, 240, 0.45)")
  glow.addColorStop(0.4, "rgba(120, 150, 200, 0.14)")
  glow.addColorStop(1, "rgba(0, 0, 0, 0)")
  context.fillStyle = glow
  context.fillRect(0, 0, sky.width, sky.height)
}

function paintClouds(context: CanvasRenderingContext2D, random: Random) {
  context.save()
  context.filter = "blur(10px)"
  for (let index = 0; index < 16; index += 1) {
    const alpha = 0.05 + random() * 0.08
    context.fillStyle = `rgba(150, 170, 205, ${alpha.toFixed(3)})`
    context.beginPath()
    context.ellipse(
      random() * sky.width,
      40 + random() * sky.height * 0.55,
      40 + random() * 70,
      8 + random() * 14,
      (random() - 0.5) * 0.3,
      0,
      Math.PI * 2
    )
    context.fill()
  }
  context.restore()
}

type Branch = {
  x: number
  y: number
  angle: number
  length: number
  width: number
}

function drawBranch(
  context: CanvasRenderingContext2D,
  random: Random,
  branch: Branch,
  depth: number
) {
  const endX = branch.x + Math.cos(branch.angle) * branch.length
  const endY = branch.y + Math.sin(branch.angle) * branch.length
  context.lineWidth = branch.width
  context.beginPath()
  context.moveTo(branch.x, branch.y)
  context.quadraticCurveTo(
    (branch.x + endX) / 2 + (random() - 0.5) * branch.length * 0.3,
    (branch.y + endY) / 2,
    endX,
    endY
  )
  context.stroke()
  if (depth <= 0 || branch.width < 0.6) {
    return
  }
  const forks = 2 + Math.floor(random() * 2)
  for (let fork = 0; fork < forks; fork += 1) {
    drawBranch(
      context,
      random,
      {
        x: endX,
        y: endY,
        angle: branch.angle + (random() - 0.5) * 1.3,
        length: branch.length * (0.6 + random() * 0.2),
        width: branch.width * 0.62,
      },
      depth - 1
    )
  }
}

function paintTrees(context: CanvasRenderingContext2D, random: Random) {
  context.strokeStyle = "#010204"
  context.lineCap = "round"
  const trunks = [
    { x: 30, lean: -1.45, length: 170, width: 9 },
    { x: 210, lean: -1.7, length: 220, width: 11 },
    { x: 120, lean: -1.55, length: 90, width: 5 },
  ]
  for (const trunk of trunks) {
    drawBranch(
      context,
      random,
      {
        x: trunk.x,
        y: sky.height + 10,
        angle: trunk.lean,
        length: trunk.length,
        width: trunk.width,
      },
      6
    )
  }
  const ground = context.createLinearGradient(
    0,
    sky.height * 0.86,
    0,
    sky.height
  )
  ground.addColorStop(0, "rgba(1, 2, 4, 0)")
  ground.addColorStop(1, "rgba(1, 2, 4, 0.95)")
  context.fillStyle = ground
  context.fillRect(0, sky.height * 0.8, sky.width, sky.height * 0.2)
}

function paintFrost(context: CanvasRenderingContext2D, random: Random) {
  context.save()
  const edge = context.createRadialGradient(
    sky.width / 2,
    sky.height * 0.55,
    sky.width * 0.45,
    sky.width / 2,
    sky.height * 0.55,
    sky.height * 0.62
  )
  edge.addColorStop(0, "rgba(219, 232, 246, 0)")
  edge.addColorStop(1, "rgba(219, 232, 246, 0.32)")
  context.fillStyle = edge
  context.fillRect(0, 0, sky.width, sky.height)
  context.fillStyle = manor.frost
  for (let index = 0; index < 900; index += 1) {
    const x = random() * sky.width
    const y = random() * sky.height
    const fromEdge = Math.min(x, sky.width - x, sky.height - y) / sky.width
    if (random() > fromEdge * 4) {
      context.globalAlpha = 0.08 + random() * 0.2
      context.fillRect(x, y, 1 + random() * 2, 1)
    }
  }
  context.restore()
}

// Leaded diamond panes, the way old manor casements are glazed.
function paintLattice(context: CanvasRenderingContext2D) {
  const step = 48
  context.strokeStyle = "rgba(4, 4, 6, 0.92)"
  context.lineWidth = 3
  for (
    let offset = -sky.height;
    offset < sky.width + sky.height;
    offset += step
  ) {
    context.beginPath()
    context.moveTo(offset, 0)
    context.lineTo(offset + sky.height * 0.62, sky.height)
    context.moveTo(offset, 0)
    context.lineTo(offset - sky.height * 0.62, sky.height)
    context.stroke()
  }
}

function paintSky(context: CanvasRenderingContext2D, isMoonlit: boolean) {
  const random = createRandom(isMoonlit ? 71 : 73)
  paintSkyGradient(context, isMoonlit)
  paintClouds(context, random)
  paintTrees(context, random)
  paintFrost(context, random)
  paintLattice(context)
}

const skies = new Map<boolean, CanvasTexture>()

export function skyTexture(isMoonlit: boolean) {
  const cached = skies.get(isMoonlit)
  if (cached) {
    return cached
  }
  const texture = createCanvasTexture({
    ...sky,
    colorSpace: SRGBColorSpace,
    paint: (context) => paintSky(context, isMoonlit),
  })
  skies.set(isMoonlit, texture)
  return texture
}

function paintRain(context: CanvasRenderingContext2D) {
  const random = createRandom(83)
  const size = { width: 128, height: 512 }
  context.fillStyle = palette.black
  context.fillRect(0, 0, size.width, size.height)
  context.lineCap = "round"
  for (let index = 0; index < 70; index += 1) {
    const x = random() * size.width
    const y = random() * size.height
    const length = 20 + random() * 90
    const alpha = 0.15 + random() * 0.45
    context.strokeStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`
    context.lineWidth = 0.6 + random() * 1.2
    context.beginPath()
    context.moveTo(x, y)
    context.quadraticCurveTo(
      x + (random() - 0.5) * 4,
      y + length / 2,
      x + (random() - 0.5) * 3,
      y + length
    )
    context.stroke()
    context.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.9).toFixed(3)})`
    context.beginPath()
    context.arc(x, y + length, 1.3 + random(), 0, Math.PI * 2)
    context.fill()
  }
}

let rain: CanvasTexture | null = null

export function rainTexture() {
  if (rain) {
    return rain
  }
  rain = createCanvasTexture({
    width: 128,
    height: 512,
    colorSpace: NoColorSpace,
    paint: paintRain,
  })
  rain.wrapS = RepeatWrapping
  rain.wrapT = RepeatWrapping
  rain.repeat.set(1, 0.8)
  return rain
}

function paintLace(context: CanvasRenderingContext2D) {
  const size = 256
  const random = createRandom(97)
  context.fillStyle = "rgb(120, 120, 120)"
  context.fillRect(0, 0, size, size)
  context.strokeStyle = "rgb(205, 205, 205)"
  context.lineWidth = 1
  for (let line = 0; line < size; line += 6) {
    context.beginPath()
    context.moveTo(0, line)
    context.lineTo(size, line + 3)
    context.moveTo(line, 0)
    context.lineTo(line + 3, size)
    context.stroke()
  }
  context.fillStyle = "rgb(255, 255, 255)"
  for (let index = 0; index < 14; index += 1) {
    const x = random() * size
    const y = random() * size
    for (let petal = 0; petal < 5; petal += 1) {
      const angle = (petal / 5) * Math.PI * 2
      context.beginPath()
      context.ellipse(
        x + Math.cos(angle) * 6,
        y + Math.sin(angle) * 6,
        5,
        2.4,
        angle,
        0,
        Math.PI * 2
      )
      context.fill()
    }
  }
}

let lace: CanvasTexture | null = null

export function curtainLaceTexture() {
  if (lace) {
    return lace
  }
  lace = createCanvasTexture({
    width: 256,
    height: 256,
    colorSpace: NoColorSpace,
    paint: paintLace,
  })
  lace.wrapS = RepeatWrapping
  lace.wrapT = RepeatWrapping
  return lace
}
