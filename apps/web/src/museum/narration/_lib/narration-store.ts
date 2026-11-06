import type { VoiceTone } from "@/museum/narration/_lib/narration-cues"
import { create } from "zustand"

// Work narration sits beside the artwork card, which covers the bottom right.
export type CaptionPlacement = "center" | "beside-card"

export type NarrationLine = {
  cueIndex: number
  text: string
  placement: CaptionPlacement
  tone: VoiceTone
}

// `cueIndex` is the spoken line of the current narration, or -1 while the
// voice is silent. The text stays after a line ends so it can fade out.
export const useNarrationStore = create<NarrationLine>()(() => ({
  cueIndex: -1,
  text: "",
  placement: "center",
  tone: "voice",
}))

export function showNarrationLine(line: NarrationLine | null) {
  const state = useNarrationStore.getState()
  if (line === null) {
    if (state.cueIndex !== -1) {
      useNarrationStore.setState({ cueIndex: -1 })
    }
    return
  }
  if (
    state.cueIndex !== line.cueIndex ||
    state.text !== line.text ||
    state.placement !== line.placement ||
    state.tone !== line.tone
  ) {
    useNarrationStore.setState(line)
  }
}

export type WhisperCaption = {
  cueIndex: number
  text: string
}

// The ikebanas' whisper has its own caption, shown alongside the main one.
// Like it, `cueIndex` is -1 while silent and the text stays to fade out.
export const useWhisperCaptionStore = create<WhisperCaption>()(() => ({
  cueIndex: -1,
  text: "",
}))

export function showWhisperCaption(caption: WhisperCaption | null) {
  const state = useWhisperCaptionStore.getState()
  if (caption === null) {
    if (state.cueIndex !== -1) {
      useWhisperCaptionStore.setState({ cueIndex: -1 })
    }
    return
  }
  if (state.cueIndex !== caption.cueIndex || state.text !== caption.text) {
    useWhisperCaptionStore.setState(caption)
  }
}
