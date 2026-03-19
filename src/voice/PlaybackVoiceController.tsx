"use client";

import { useEffect } from "react";
import { usePlayer, PREP_DURATION_SECONDS } from "@/state/player-context";
import { useWorkout } from "@/state/workout-context";
import { getVoiceEngine } from "./VoiceEngine";
import { WorkInterval, RestInterval, expandIntervals } from "@/domain/workout";
import { getVoiceVolume } from "@/state/settings-context";

const NATURAL_OPTIONS = { rate: 0.88, pitch: 1 };

function isWork(interval: unknown): interval is WorkInterval {
  return !!interval && (interval as WorkInterval).type === "work";
}

function isMuted(interval: WorkInterval | RestInterval | undefined): boolean {
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
    const intervals = expandIntervals(workoutState.workout.intervals);
    const current = intervals[player.currentIndex];
    const muted = current && isMuted(current);

    // Preparation countdown: "Get ready" at start, then 5, 4, 3, 2, 1 (buffer for speech)
    if (
      !muted &&
      player.isRunning &&
      player.preparationRemaining > 0 &&
      current
    ) {
      if (player.preparationRemaining === PREP_DURATION_SECONDS) {
        const name = isWork(current) ? current.title || "Work" : "Rest";
        engine.speak(`Get ready for ${name}`, speakOptions);
      } else if (player.preparationRemaining <= 5) {
        engine.speak(String(player.preparationRemaining), speakOptions);
      }
      return;
    }

    if (!current) return;

    const announceStart = current.voice?.announceStart ?? true;
    const announceHalfway = current.voice?.announceHalfway ?? false;
    const finalCountdown = (current.voice?.finalCountdownSeconds ?? 3) > 0;

    // Announce interval start when timer is at full duration (just started)
    if (
      !muted &&
      announceStart &&
      player.secondsRemainingInInterval === current.durationSeconds &&
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

    // Halfway announcement (work intervals only)
    const halfwayRemaining = Math.ceil(current.durationSeconds / 2);
    if (
      !muted &&
      announceHalfway &&
      isWork(current) &&
      player.isRunning &&
      player.secondsRemainingInInterval === halfwayRemaining &&
      current.durationSeconds > 3
    ) {
      engine.speak("Halfway!", speakOptions);
    }

    // Final countdown (3, 2, 1)
    if (
      !muted &&
      finalCountdown &&
      player.isRunning &&
      player.secondsRemainingInInterval > 0 &&
      player.secondsRemainingInInterval <= 3
    ) {
      engine.speak(String(player.secondsRemainingInInterval), speakOptions);
    }
  }, [
    enabled,
    workoutState.workout.intervals,
    player.currentIndex,
    player.isRunning,
    player.secondsRemainingInInterval,
    player.preparationRemaining,
  ]);

  return null;
}
