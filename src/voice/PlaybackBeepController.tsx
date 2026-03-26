"use client";

import type {
  BeepSoundType,
  PrepInterval,
  RestInterval,
  WorkInterval,
} from "@/domain/workout";
import { expandIntervals } from "@/domain/workout";
import { usePlayer } from "@/state/player-context";
import { useWorkout } from "@/state/workout-context";
import { useEffect, useRef } from "react";
import { playBeep, playLongBeep, playWorkoutCompleteBeeps } from "./BeepEngine";

function isWork(
  interval: WorkInterval | RestInterval,
): interval is WorkInterval {
  return interval.type === "work";
}

function getBeepSettings(
  interval: WorkInterval | RestInterval | PrepInterval,
): { enabled: boolean; sound: BeepSoundType } {
  if (interval.type === "prep") {
    return {
      enabled: !!interval.beep,
      sound: interval.beepSound ?? "beep",
    };
  }
  const sound: BeepSoundType =
    (isWork(interval) ? interval.voice?.beepSound : interval.beepSound) ??
    "beep";
  const enabled = isWork(interval) ? interval.voice?.beep : interval.beep;
  return { enabled: !!enabled, sound };
}

export function PlaybackBeepController() {
  const { state: workoutState } = useWorkout();
  const { state: player } = usePlayer();
  const prevRef = useRef({
    remaining: 0,
    index: -1,
    running: false,
  });
  const lastPlayedRef = useRef<string | null>(null);

  useEffect(() => {
    const intervals = expandIntervals(workoutState.workout.intervals);
    const current = intervals[player.currentIndex] ?? null;
    const { remaining, index, running } = prevRef.current;
    const rem = player.secondsRemainingInInterval;
    const currentTotal = current?.durationSeconds ?? 0;
    const sets = Math.max(1, workoutState.workout.sets ?? 1);

    // Three long beeps when workout completes (last interval of last set ended, not user stop).
    const onLastSet = player.currentSetIndex === sets - 1;
    const workoutJustCompleted =
      remaining === 1 &&
      running &&
      !player.isRunning &&
      index === intervals.length - 1 &&
      onLastSet;
    if (workoutJustCompleted && lastPlayedRef.current !== "workout-complete") {
      lastPlayedRef.current = "workout-complete";
      const lastInterval = intervals[index];
      const settings = lastInterval ? getBeepSettings(lastInterval) : null;
      const sound = settings?.enabled ? settings.sound : "beep";
      playWorkoutCompleteBeeps(sound);
    }

    if (!current) {
      prevRef.current = {
        remaining: rem,
        index: player.currentIndex,
        running: player.isRunning,
      };
      return;
    }

    const { enabled, sound } = getBeepSettings(current);

    if (!enabled || !player.isRunning) {
      lastPlayedRef.current = null;
      prevRef.current = {
        remaining: rem,
        index: player.currentIndex,
        running: player.isRunning,
      };
      return;
    }

    // Skip beeps during voice announcement delay
    if (player.isInVoiceDelay) {
      prevRef.current = {
        remaining: rem,
        index: player.currentIndex,
        running: player.isRunning,
      };
      return;
    }

    // Long beep when interval starts (from previous interval or at full duration)
    const fromPrevInterval = player.currentIndex > index;
    const atIntervalStart = currentTotal > 0 && rem === currentTotal;
    const startKey = `start-${player.currentIndex}`;
    if (
      (fromPrevInterval || atIntervalStart) &&
      lastPlayedRef.current !== startKey
    ) {
      lastPlayedRef.current = startKey;
      playLongBeep(sound);
    }

    // One beep per second in last 3 seconds - only when we enter that second (rem changed to 3, 2, or 1)
    const inCountdown = rem > 0 && rem <= 3;
    const enteredNewSecond = inCountdown && rem !== remaining;
    const countdownKey = `countdown-${player.currentIndex}-${rem}`;
    if (enteredNewSecond && lastPlayedRef.current !== countdownKey) {
      lastPlayedRef.current = countdownKey;
      playBeep(sound);
    }

    prevRef.current = {
      remaining: rem,
      index: player.currentIndex,
      running: player.isRunning,
    };
  }, [
    workoutState.workout.intervals,
    workoutState.workout.sets,
    player.currentIndex,
    player.currentSetIndex,
    player.isRunning,
    player.isInVoiceDelay,
    player.secondsRemainingInInterval,
  ]);

  return null;
}
