"use client";

import { useEffect, useRef } from "react";
import { usePlayer } from "@/state/player-context";
import { useWorkout } from "@/state/workout-context";
import { playBeep, playLongBeep, playWorkoutCompleteBeeps } from "./BeepEngine";
import type { BeepSoundType, Interval, WorkInterval } from "@/domain/workout";

function isWork(interval: Interval): interval is WorkInterval {
  return interval.type === "work";
}

function getBeepSettings(interval: Interval): { enabled: boolean; sound: BeepSoundType } {
  const sound: BeepSoundType = (isWork(interval) ? interval.voice?.beepSound : interval.beepSound) ?? "beep";
  const enabled = isWork(interval) ? interval.voice?.beep : interval.beep;
  return { enabled: !!enabled, sound };
}

export function PlaybackBeepController() {
  const { state: workoutState } = useWorkout();
  const { state: player } = usePlayer();
  const prevRef = useRef({ remaining: 0, index: -1, running: false, prepRemaining: 0 });
  const lastPlayedRef = useRef<string | null>(null);

  useEffect(() => {
    const intervals = workoutState.workout.intervals;
    const current = intervals[player.currentIndex] ?? null;
    const { remaining, index, running, prepRemaining } = prevRef.current;
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
      if (lastInterval) {
        const { enabled: endEnabled, sound: endSound } = getBeepSettings(lastInterval);
        if (endEnabled) {
          playWorkoutCompleteBeeps(endSound);
        }
      }
    }

    if (!current) {
      prevRef.current = { remaining: rem, index: player.currentIndex, running: player.isRunning, prepRemaining: player.preparationRemaining };
      return;
    }

    const { enabled, sound } = getBeepSettings(current);

    if (!enabled || !player.isRunning) {
      lastPlayedRef.current = null;
      prevRef.current = { remaining: rem, index: player.currentIndex, running: player.isRunning, prepRemaining: player.preparationRemaining };
      return;
    }

    // Long beep when interval starts (from prep, from previous interval, or at full duration)
    const fromPrep = prepRemaining > 0 && player.preparationRemaining === 0;
    const fromPrevInterval = player.currentIndex > index;
    const atIntervalStart = player.preparationRemaining === 0 && currentTotal > 0 && rem === currentTotal;
    const startKey = `start-${player.currentIndex}`;
    if ((fromPrep || fromPrevInterval || atIntervalStart) && lastPlayedRef.current !== startKey) {
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

    prevRef.current = { remaining: rem, index: player.currentIndex, running: player.isRunning, prepRemaining: player.preparationRemaining };
  }, [
    workoutState.workout.intervals,
    workoutState.workout.sets,
    player.currentIndex,
    player.currentSetIndex,
    player.isRunning,
    player.secondsRemainingInInterval,
    player.preparationRemaining,
  ]);

  return null;
}
