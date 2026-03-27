"use client";

import { useEffect } from "react";
import { usePlayer } from "@/state/player-context";
import { useWorkout } from "@/state/workout-context";
import { getVoiceEngine } from "./VoiceEngine";
import {
  WorkInterval,
  RestInterval,
  PrepInterval,
  expandIntervals,
} from "@/domain/workout";
import { getVoiceVolume } from "@/state/settings-context";

const NATURAL_OPTIONS = { rate: 0.88, pitch: 1 };
/** Countdown numbers need to be snappy — cancel previous speech and speak faster. */
const COUNTDOWN_OPTIONS = { rate: 1.1, pitch: 1 };

function isWork(interval: unknown): interval is WorkInterval {
  return !!interval && (interval as WorkInterval).type === "work";
}

function isPrep(interval: unknown): interval is PrepInterval {
  return !!interval && (interval as PrepInterval).type === "prep";
}

function isMuted(
  interval: WorkInterval | RestInterval | PrepInterval | undefined,
): boolean {
  if (!interval) return false;
  return !!interval.voice?.mute;
}

export function PlaybackVoiceController({ enabled }: { enabled: boolean }) {
  const { state: workoutState } = useWorkout();
  const { state: player } = usePlayer();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const engine = getVoiceEngine();
    const voiceVolume = getVoiceVolume();
    const speakOptions = { ...NATURAL_OPTIONS, volume: voiceVolume };
    const countdownOptions = { ...COUNTDOWN_OPTIONS };
    const intervals = expandIntervals(workoutState.workout.intervals);
    const current = intervals[player.currentIndex];
    const muted = current && isMuted(current);

    // Prep interval: "Get ready" during voice delay, then 5, 4, 3, 2, 1 countdown
    if (!muted && player.isRunning && current && isPrep(current)) {
      if (player.isInVoiceDelay) {
        const next = intervals[player.currentIndex + 1];
        const name =
          next && isWork(next)
            ? (next as WorkInterval).title || "Work"
            : "Rest";
        engine.speak(`Get ready for ${name}`, speakOptions);
        return;
      }
      const rem = player.secondsRemainingInInterval;
      if (rem <= 5 && rem > 0) {
        engine.cancel();
        engine.speak(String(rem), { ...countdownOptions, volume: voiceVolume });
      }
      return;
    }

    if (!current || isPrep(current)) return;

    const announceStart = current.voice?.announceStart ?? true;
    const announceHalfway = current.voice?.announceHalfway ?? false;
    const finalCountdown = (current.voice?.finalCountdownSeconds ?? 3) > 0;

    // Announce interval during the voice delay phase (1s before timer starts)
    if (
      !muted &&
      announceStart &&
      player.isInVoiceDelay &&
      player.isRunning
    ) {
      if (isWork(current)) {
        engine.speak(current.title || "Work", speakOptions);
      } else {
        engine.speak(
          `Rest for ${current.durationSeconds} seconds`,
          speakOptions,
        );
      }
    }

    // Halfway announcement (work intervals only) — not during voice delay
    const halfwayRemaining = Math.ceil(current.durationSeconds / 2);
    if (
      !muted &&
      announceHalfway &&
      isWork(current) &&
      player.isRunning &&
      !player.isInVoiceDelay &&
      player.secondsRemainingInInterval === halfwayRemaining &&
      current.durationSeconds > 3
    ) {
      engine.speak("Halfway!", speakOptions);
    }

    // Final countdown (3, 2, 1) — not during voice delay
    if (
      !muted &&
      finalCountdown &&
      player.isRunning &&
      !player.isInVoiceDelay &&
      player.secondsRemainingInInterval > 0 &&
      player.secondsRemainingInInterval <= 3
    ) {
      engine.cancel();
      engine.speak(String(player.secondsRemainingInInterval), { ...countdownOptions, volume: voiceVolume });
    }
  }, [
    enabled,
    workoutState.workout.intervals,
    player.currentIndex,
    player.isRunning,
    player.isInVoiceDelay,
    player.secondsRemainingInInterval,
  ]);

  return null;
}
