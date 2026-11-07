import { PaperPin } from "@/museum/player/_components/paper-pin"
import { cn } from "@workspace/ui/lib/utils"

type EndingSignsProps = {
  isVisible: boolean
}

function Sign({ verb, hint }: { verb: string; hint: string }) {
  return (
    <p className="text-base font-medium">
      <span className="text-2xl font-semibold font-display">{verb}</span>
      {` · ${hint}`}
    </p>
  )
}

// The two ways out of the night, written by the mirror once the house has
// said all it had to say. It leaves as soon as the visitor takes one.
export function EndingSigns({ isVisible }: EndingSignsProps) {
  return (
    <div className="inset-x-0 top-20 px-6 absolute flex justify-center">
      <aside
        aria-hidden={!isVisible}
        aria-live="polite"
        className={cn(
          "px-6 pt-6 pb-5 shadow-xl starting:-translate-y-4 max-w-sm relative bg-paper text-center text-paper-foreground transition-all motion-reduce:transition-opacity starting:-rotate-3 starting:opacity-0",
          isVisible
            ? "translate-y-0 ease-out rotate-1 opacity-100 duration-700"
            : "-translate-y-4 ease-in -rotate-2 opacity-0 duration-700"
        )}
      >
        <PaperPin className="left-2" />
        <PaperPin className="right-2" />
        <Sign verb="Partir" hint="la porte est ouverte" />
        <span className="my-3 h-0.5 w-10 mx-auto block bg-paper-accent" />
        <Sign verb="Rester" hint="regardez-vous" />
      </aside>
    </div>
  )
}
