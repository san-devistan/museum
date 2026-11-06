import { cn } from "@workspace/ui/lib/utils"

type CrosshairProps = {
  isVisible: boolean
  isFocused: boolean
}

export function Crosshair({ isVisible, isFocused }: CrosshairProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "inset-0 absolute flex items-center justify-center transition-opacity duration-300",
        isVisible ? "opacity-100" : "opacity-0"
      )}
    >
      <div
        className={cn(
          "size-1.5 rounded-full bg-foreground/80 ring-1 ring-background/60 transition-transform duration-200",
          isFocused && "scale-150"
        )}
      />
    </div>
  )
}
