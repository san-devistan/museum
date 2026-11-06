import { useMuseumStore } from "@/museum/_lib/museum-store"
import { PaperPin } from "@/museum/player/_components/paper-pin"
import { useStoryStore } from "@/museum/story/_lib/story-store"
import { cn } from "@workspace/ui/lib/utils"

const instagram = {
  handle: "@dollashashin",
  href: "https://www.instagram.com/dollashashin/",
}
const email = "dollashashin@gmail.com"

// Ending A's last card, outside under the steady neon once the house has
// said goodbye: who she is and how to reach her.
export function ContactCard() {
  const isOutside = useMuseumStore((state) => state.phase === "entrance")
  const isShown = useStoryStore((state) => state.contactShown)
  const isVisible = isOutside && isShown

  return (
    <div className="inset-y-0 left-0 px-10 pointer-events-none absolute flex items-center">
      <aside
        aria-hidden={!isVisible}
        aria-live="polite"
        className={cn(
          "max-w-sm px-6 pt-7 pb-6 shadow-xl starting:-translate-y-4 relative bg-paper text-paper-foreground transition-all motion-reduce:transition-opacity starting:rotate-3 starting:opacity-0",
          isVisible
            ? "translate-y-0 ease-out pointer-events-auto -rotate-1 opacity-100 duration-1000"
            : "-translate-y-4 ease-in rotate-2 opacity-0 duration-500"
        )}
        inert={!isVisible}
      >
        <PaperPin className="left-2" />
        <PaperPin className="right-2" />
        <p className="text-2xl leading-tight font-semibold font-display">
          Dolla Shashin · Dounia Limam
        </p>
        <span className="mt-3 h-0.5 w-10 block bg-paper-accent" />
        <p className="mt-4 text-sm/relaxed">
          Portfolio et travaux récents&nbsp;:{" "}
          <a
            className="font-medium underline underline-offset-4 hover:text-paper-accent"
            href={instagram.href}
            rel="noreferrer"
            target="_blank"
          >
            {instagram.handle}
          </a>
        </p>
        <p className="mt-2 text-sm/relaxed">
          Contact et demandes de devis&nbsp;:{" "}
          <a
            className="font-medium underline underline-offset-4 hover:text-paper-accent"
            href={`mailto:${email}`}
          >
            {email}
          </a>
        </p>
      </aside>
    </div>
  )
}
