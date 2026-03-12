import type { BeepSoundType } from "@/domain/workout";
import { getBeepVolume } from "@/state/settings-context";

const FREQUENCIES: Record<BeepSoundType, number> = {
  beep: 880,
  chime: 1320,
  bell: 660,
};

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  return new (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext
  )();
}

let ctx: AudioContext | null = null;

function ensureContext(): AudioContext | null {
  if (!ctx) ctx = getAudioContext();
  return ctx;
}

/** Call from a user gesture (e.g. play button click) to unlock audio. */
export async function resumeAudioContext(): Promise<void> {
  const c = ensureContext();
  if (!c) return;
  if (c.state === "suspended") {
    await c.resume();
  }
}

/** Resume when app returns to foreground (mobile browsers suspend when tab is hidden). */
if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && ctx?.state === "suspended") {
      ctx.resume();
    }
  });
}

function playTone(
  frequency: number,
  durationMs: number,
  startTime: number = 0,
): void {
  const context = ensureContext();
  if (!context) return;

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = "sine";
  const start = context.currentTime + startTime;
  const end = start + durationMs / 1000;
  const gain = 0.35 * getBeepVolume();
  gainNode.gain.setValueAtTime(gain, start);
  gainNode.gain.setValueAtTime(gain, end);

  oscillator.start(start);
  oscillator.stop(end);
  oscillator.onended = () => {
    oscillator.disconnect();
    gainNode.disconnect();
  };
}

export function playBeep(sound: BeepSoundType = "beep"): void {
  const freq = FREQUENCIES[sound];
  playTone(freq, 80);
}

export function playLongBeep(sound: BeepSoundType = "beep"): void {
  const freq = FREQUENCIES[sound];
  playTone(freq, 650);
}

/** Three long beeps for workout complete. */
export function playWorkoutCompleteBeeps(sound: BeepSoundType = "beep"): void {
  const gapMs = 400;
  playLongBeep(sound);
  setTimeout(() => playLongBeep(sound), 650 + gapMs);
  setTimeout(() => playLongBeep(sound), (650 + gapMs) * 2);
}
