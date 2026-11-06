import { cn } from "@workspace/ui/lib/utils"

// The pin holding a paper card (the artwork card, the objective) to the view.
export function PaperPin({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "top-2 size-2 shadow-sm absolute rounded-full bg-paper-pin ring-1 ring-paper-foreground/20",
        className
      )}
    />
  )
}
