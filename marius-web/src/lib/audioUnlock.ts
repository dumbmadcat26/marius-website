const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

let unlocked = false;

/** Play a silent buffer inside a user gesture so later hover audio can start. */
export function unlockAudioPlayback(): void {
  if (unlocked || typeof window === "undefined") return;
  unlocked = true;

  const audio = new Audio(SILENT_WAV);
  audio.preload = "auto";
  void audio.play().catch(() => {
    unlocked = false;
  });
}
