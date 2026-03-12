"use client";

import { useRef, useLayoutEffect } from "react";
import { useWorkout } from "@/state/workout-context";
import { usePlayer } from "@/state/player-context";
import { WorkInterval, RestInterval, expandIntervals } from "@/domain/workout";
import { resumeAudioContext } from "@/voice/BeepEngine";

function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function NextIntervalInfo({ interval }: { interval: WorkInterval | RestInterval | null }) {
  if (!interval) {
    return (
      <div className="text-sm font-medium text-white/80 dark:text-zinc-500">
        Coming next: —
      </div>
    );
  }

  const title =
    interval.type === "work"
      ? interval.title || "Work"
      : "Rest";

  return (
    <div className="min-w-0 break-words">
      <div className="text-xs font-semibold uppercase tracking-wider text-white/80 dark:text-zinc-500">
        Coming next
      </div>
      <div className="font-display mt-1 text-lg font-bold text-white dark:text-zinc-100">
        {title} · {formatSeconds(interval.durationSeconds)}
      </div>
    </div>
  );
}

function InnerPlayer() {
  const { state: workoutState } = useWorkout();
  const {
    state: player,
    play,
    pause,
    reset,
  } = usePlayer();

  const intervals = workoutState.workout.intervals;
  const playbackIntervals = expandIntervals(intervals);
  const sets = Math.max(1, workoutState.workout.sets ?? 1);
  const effectiveIndex = player.isRunning ? player.currentIndex : 0;
  const current = playbackIntervals[effectiveIndex] ?? null;
  const isLastInterval = effectiveIndex === playbackIntervals.length - 1;
  const hasMoreSets = player.isRunning && sets > 1 && player.currentSetIndex < sets - 1;
  const next =
    effectiveIndex >= 0 && effectiveIndex < playbackIntervals.length - 1
      ? playbackIntervals[effectiveIndex + 1]
      : isLastInterval && hasMoreSets
        ? playbackIntervals[0]
        : null;

  const inPreparation = player.isRunning && player.preparationRemaining > 0;
  const currentTotal = inPreparation ? 7 : (current?.durationSeconds ?? 0);
  const displaySeconds =
    player.isRunning
      ? inPreparation
        ? player.preparationRemaining
        : player.secondsRemainingInInterval
      : currentTotal;
  const elapsed =
    player.isRunning
      ? inPreparation
        ? 7 - player.preparationRemaining
        : currentTotal > 0
          ? Math.max(0, currentTotal - player.secondsRemainingInInterval)
          : 0
      : 0;
  const progress =
    currentTotal > 1
      ? Math.min(1, elapsed / (currentTotal - 1))
      : currentTotal === 1
        ? Math.min(1, elapsed)
        : 0;

  const prevIndexRef = useRef(player.currentIndex);
  const prevIsRunningRef = useRef(player.isRunning);
  const prevInPrepRef = useRef(inPreparation);
  const isNewInterval = player.currentIndex !== prevIndexRef.current;
  const isStopping = prevIsRunningRef.current && !player.isRunning;
  const isPrepEnding = prevInPrepRef.current && !inPreparation;
  const instantTransition = isNewInterval || isStopping || isPrepEnding;
  useLayoutEffect(() => {
    prevIndexRef.current = player.currentIndex;
    prevIsRunningRef.current = player.isRunning;
    prevInPrepRef.current = inPreparation;
  });

  return (
    <div className="flex min-w-0 flex-1 flex-col justify-center gap-6">
      <div className="min-w-0 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80 dark:text-zinc-500">
            Current interval
          </div>
          {player.isRunning && sets > 1 && (
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/80 dark:text-zinc-500">
              Circuit {player.currentSetIndex + 1} of {sets}
            </div>
          )}
        </div>
        <div className="font-display break-words text-3xl font-extrabold leading-tight tracking-tight text-white dark:text-zinc-50 md:text-4xl">
          {inPreparation
            ? "Get ready"
            : current
              ? current.type === "work"
                ? current.title || "Work"
                : "Rest"
              : "No intervals"}
        </div>
        <div className="text-sm font-medium leading-relaxed text-white/90 dark:text-zinc-400">
          {player.isRunning
            ? inPreparation
              ? current?.type === "work"
                ? `${current.title || "Work"} starts in ${player.preparationRemaining}...`
                : "Starting in a moment..."
              : current
                ? current.type === "work"
                  ? "Focus on the movement. Your screen can stay off."
                  : "Breathe. Recover before the next push."
                : "Build a workout on the left to get started."
            : current
              ? workoutState.selectedIntervalId
                ? `Start from ${current.type === "work" ? current.title || "Work" : "Rest"}`
                : "Click Start to begin."
              : "Build a workout on the left to get started."}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-baseline justify-between gap-2">
          <div className="font-display text-5xl font-extrabold tabular-nums tracking-tight text-white dark:text-zinc-50 md:text-6xl">
            {formatSeconds(displaySeconds || 0)}
          </div>
          <div className="text-xs font-medium text-white/80 dark:text-zinc-400">
            / {formatSeconds(currentTotal)}
          </div>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-white/25 dark:bg-zinc-800">
          <div
            className={`h-full rounded-full bg-primary-200 dark:bg-primary-400 ${instantTransition ? "transition-none" : "transition-[width] duration-1000 ease-linear"}`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <NextIntervalInfo interval={next} />
      </div>

      <div className="flex items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={() => reset(workoutState.workout)}
          className="cursor-pointer rounded-xl border-2 border-white/80 px-8 py-3.5 text-base font-bold uppercase tracking-wider text-white transition-colors hover:bg-white/20 dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
        >
          Stop
        </button>
        <button
          type="button"
          onClick={
            player.isRunning
              ? pause
              : async () => {
                  await resumeAudioContext();
                  play(workoutState.workout);
                }
          }
          disabled={playbackIntervals.length === 0}
          className="cursor-pointer rounded-xl bg-white px-8 py-3.5 text-base font-bold uppercase tracking-wider text-primary-600 shadow-lg transition-all hover:bg-white/95 hover:shadow-xl disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-white/60 dark:bg-primary-500 dark:text-white dark:hover:bg-primary-400 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-400"
        >
          {player.isRunning ? "Pause" : "Start"}
        </button>
      </div>
    </div>
  );
}

export function PlayerPanel() {
  return <InnerPlayer />;
}
