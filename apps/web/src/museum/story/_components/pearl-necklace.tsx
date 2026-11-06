import { workCount } from "@/museum/story/_lib/story-store"
import { cn } from "@workspace/ui/lib/utils"

type PearlNecklaceProps = {
  wokenCount: number
  isPlaying: boolean
}

// The thread hangs between two pins as a shallow curve (a quadratic Bézier),
// in the SVG's own units.
const thread = {
  from: { x: 12, y: 6 },
  sag: { x: 120, y: 40 },
  to: { x: 228, y: 6 },
}
const pearlRadius = 6.5
const pearlSpan = { start: 0.1, end: 0.9 }

function threadPoint(t: number) {
  const { from, sag, to } = thread
  const a = (1 - t) ** 2
  const b = 2 * (1 - t) * t
  const c = t ** 2
  return {
    x: a * from.x + b * sag.x + c * to.x,
    y: a * from.y + b * sag.y + c * to.y,
  }
}

const pearls = Array.from({ length: workCount }, (_, index) => {
  const t =
    pearlSpan.start +
    ((pearlSpan.end - pearlSpan.start) * index) / (workCount - 1)
  return { index, ...threadPoint(t) }
})

const threadPath = `M${thread.from.x} ${thread.from.y} Q${thread.sag.x} ${thread.sag.y} ${thread.to.x} ${thread.to.y}`

function countLabel(count: number) {
  const noun = count > 1 ? "images réveillées" : "image réveillée"
  return `${count} ${noun} sur ${workCount}`
}

// Drawn around its own origin, so the CSS scale grows it from its centre.
function Pearl({ x, y, isAwake }: { x: number; y: number; isAwake: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle
        r={pearlRadius}
        className="fill-background/30 stroke-foreground/35"
        strokeWidth={1}
      />
      {isAwake ? (
        <g className="ease-out transition duration-700 motion-reduce:transition-opacity starting:scale-50 starting:opacity-0">
          <circle
            r={pearlRadius}
            className="fill-paper-pin stroke-paper/80"
            strokeWidth={1}
          />
          <circle cx={-2} cy={-2.2} r={1.9} className="fill-paper/90" />
        </g>
      ) : null}
    </g>
  )
}

// One pearl threads on per woken image, left to right.
export function PearlNecklace({ wokenCount, isPlaying }: PearlNecklaceProps) {
  return (
    <div
      className={cn(
        "top-5 inset-x-0 absolute flex justify-center transition-opacity duration-700 starting:opacity-0",
        isPlaying ? "opacity-80" : "opacity-100"
      )}
    >
      <figure aria-label={countLabel(wokenCount)}>
        <svg
          aria-hidden="true"
          viewBox="0 0 240 40"
          className="h-10 w-60 overflow-visible"
        >
          <path
            d={threadPath}
            fill="none"
            className="stroke-foreground/30"
            strokeWidth={1}
          />
          <circle
            cx={thread.from.x}
            cy={thread.from.y}
            r={2.5}
            className="fill-paper-pin"
          />
          <circle
            cx={thread.to.x}
            cy={thread.to.y}
            r={2.5}
            className="fill-paper-pin"
          />
          {pearls.map((pearl) => (
            <Pearl
              key={pearl.index}
              x={pearl.x}
              y={pearl.y}
              isAwake={pearl.index < wokenCount}
            />
          ))}
        </svg>
      </figure>
    </div>
  )
}
