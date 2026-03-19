"use client";

import { useRef, useLayoutEffect } from "react";
import { FaPlay, FaPause, FaUndo } from "react-icons/fa";
import { useWorkout } from "@/state/workout-context";
import { usePlayer } from "@/state/player-context";
import {
  WorkInterval,
  RestInterval,
  PrepInterval,
  expandIntervals,
} from "@/domain/workout";
import { resumeAudioContext } from "@/voice/BeepEngine";

function getLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type TextVariant = "light" | "dark";

const textClasses = {
  light: {
    muted: "text-white/80",
    mutedStrong: "text-white/90",
    primary: "text-white",
    primaryBold: "text-white",
    progressBg: "bg-white/25",
  },
  dark: {
    muted: "text-zinc-600",
    mutedStrong: "text-zinc-700",
    primary: "text-zinc-900",
    primaryBold: "text-zinc-900",
    progressBg: "bg-black/15",
  },
} as const;

function NextIntervalInfo({
  interval,
  variant,
  size = "default",
}: {
  interval: WorkInterval | RestInterval | PrepInterval | null;
  variant: TextVariant;
  size?: "default" | "large";
}) {
  const t = textClasses[variant];
  if (!interval) {
    return (
      <div
        className={`text-center font-medium ${size === "large" ? "text-base" : "text-sm"} ${t.muted}`}
      >
        Coming next: —
      </div>
    );
  }

  const title =
    interval.type === "work"
      ? (interval as WorkInterval).title || "Work"
      : interval.type === "prep"
        ? "Get ready"
        : "Rest";

  return (
    <div className="min-w-0 break-words text-center">
      <div
        className={`font-semibold uppercase tracking-wider ${size === "large" ? "text-sm" : "text-xs"} ${t.muted}`}
      >
        Coming next
      </div>
      <div
        className={`font-display mt-1 font-bold ${t.primaryBold} ${size === "large" ? "text-xl md:text-2xl" : "text-lg"}`}
      >
        {title} · {formatSeconds(interval.durationSeconds)}
      </div>
    </div>
  );
}

function InnerPlayer({
  hideControls,
  backgroundColor,
}: {
  hideControls?: boolean;
  backgroundColor?: string;
}) {
  const { state: workoutState } = useWorkout();
  const { state: player, play, pause, reset } = usePlayer();

  const intervals = workoutState.workout.intervals;
  const playbackIntervals = expandIntervals(intervals);
  const sets = Math.max(1, workoutState.workout.sets ?? 1);
  const isInPlaybackMode = player.isRunning || player.isPaused;
  const effectiveIndex = isInPlaybackMode ? player.currentIndex : 0;
  const current = playbackIntervals[effectiveIndex] ?? null;
  const isLastInterval = effectiveIndex === playbackIntervals.length - 1;
  const hasMoreSets =
    isInPlaybackMode && sets > 1 && player.currentSetIndex < sets - 1;
  const inPreparation =
    player.isRunning && current && "type" in current && current.type === "prep";
  const firstInterval = playbackIntervals[0];
  const showGetReadyAsDefault =
    !isInPlaybackMode &&
    playbackIntervals.length > 0 &&
    firstInterval &&
    "type" in firstInterval &&
    firstInterval.type === "prep";
  const next =
    showGetReadyAsDefault || inPreparation
      ? firstInterval &&
        "type" in firstInterval &&
        firstInterval.type === "prep"
        ? (playbackIntervals[1] ?? null)
        : (firstInterval ?? null)
      : effectiveIndex >= 0 && effectiveIndex < playbackIntervals.length - 1
        ? playbackIntervals[effectiveIndex + 1]
        : isLastInterval && hasMoreSets
          ? playbackIntervals[0]
          : null;

  const showingGetReady = inPreparation || showGetReadyAsDefault;
  const prepTotal =
    (showGetReadyAsDefault ? firstInterval : inPreparation ? current : null)
      ?.durationSeconds ?? 7;
  const currentTotal = showingGetReady
    ? prepTotal
    : (current?.durationSeconds ?? 0);
  const displaySeconds = isInPlaybackMode
    ? player.secondsRemainingInInterval
    : currentTotal;
  const elapsed = isInPlaybackMode
    ? inPreparation
      ? prepTotal - player.secondsRemainingInInterval
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
  const prevShowGetReadyRef = useRef(showGetReadyAsDefault);
  const isNewInterval = player.currentIndex !== prevIndexRef.current;
  const isStopping = prevIsRunningRef.current && !player.isRunning;
  const isPrepEnding = prevInPrepRef.current && !inPreparation;
  const isLeavingGetReadyDefault =
    prevShowGetReadyRef.current && !showGetReadyAsDefault;
  const instantTransition =
    isNewInterval || isStopping || isPrepEnding || isLeavingGetReadyDefault;
  useLayoutEffect(() => {
    prevIndexRef.current = player.currentIndex;
    prevIsRunningRef.current = player.isRunning;
    prevInPrepRef.current = inPreparation;
    prevShowGetReadyRef.current = showGetReadyAsDefault;
  });

  const variant: TextVariant =
    backgroundColor &&
    /^#[0-9a-fA-F]{6}$/.test(backgroundColor) &&
    getLuminance(backgroundColor) > 0.6
      ? "dark"
      : "light";
  const t = textClasses[variant];

  if (hideControls) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="min-w-0 shrink-0 space-y-1 pt-2">
          <div className="flex items-center justify-between gap-2">
            <div
              className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${t.muted}`}
            >
              Current interval
            </div>
            {isInPlaybackMode && sets > 1 && (
              <div
                className={`text-[10px] font-semibold uppercase tracking-wider ${t.muted}`}
              >
                Circuit {player.currentSetIndex + 1} of {sets}
              </div>
            )}
          </div>
          <div
            className={`font-display break-words text-xl font-extrabold leading-tight tracking-tight md:text-2xl ${t.primary}`}
          >
            {showingGetReady
              ? "Get ready"
              : current
                ? current.type === "work"
                  ? current.title || "Work"
                  : "Rest"
                : "No intervals"}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4">
          <div
            className={`font-display font-extrabold tabular-nums tracking-tight text-8xl sm:text-9xl md:text-8xl ${t.primary}`}
          >
            {formatSeconds(displaySeconds || 0)}
          </div>
          <div className={`text-base font-medium sm:text-lg ${t.muted}`}>
            / {formatSeconds(currentTotal)}
          </div>
          <div
            className={`h-3 w-full max-w-sm overflow-hidden rounded-full ${t.progressBg}`}
          >
            <div
              className={`h-full rounded-full bg-primary-200 dark:bg-primary-400 ${instantTransition ? "transition-none" : "transition-[width] duration-1000 ease-linear"}`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center pb-2 pt-4 md:pb-4">
          <NextIntervalInfo interval={next} variant={variant} size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col md:h-full">
      <div className="min-w-0 shrink-0 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div
            className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${t.muted}`}
          >
            Current interval
          </div>
          {isInPlaybackMode && sets > 1 && (
            <div
              className={`text-[10px] font-semibold uppercase tracking-wider ${t.muted}`}
            >
              Circuit {player.currentSetIndex + 1} of {sets}
            </div>
          )}
        </div>
        <div
          className={`font-display break-words text-3xl font-extrabold leading-tight tracking-tight md:text-4xl ${t.primary}`}
        >
          {showingGetReady
            ? "Get ready"
            : current
              ? current.type === "work"
                ? current.title || "Work"
                : "Rest"
              : "No intervals"}
        </div>
        <div className={`text-sm font-medium leading-relaxed ${t.mutedStrong}`}>
          {player.isRunning
            ? inPreparation
              ? next && "type" in next && next.type === "work"
                ? `${(next as WorkInterval).title || "Work"} starts in ${player.secondsRemainingInInterval}...`
                : "Starting in a moment..."
              : current
                ? current.type === "work"
                  ? "Focus on the movement. Your screen can stay off."
                  : "Breathe. Recover before the next push."
                : "Build a workout on the left to get started."
            : showGetReadyAsDefault && next
              ? next.type === "work"
                ? `${next.title || "Work"} starts after the countdown`
                : "Rest starts after the countdown"
              : player.isPaused
                ? "Paused. Click Start to resume."
                : current
                  ? workoutState.selectedIntervalId
                    ? `Start from ${current.type === "work" ? current.title || "Work" : "Rest"}`
                    : "Click Start to begin."
                  : "Build a workout on the left to get started."}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4">
        <div className="flex flex-col items-center gap-2">
          <div
            className={`font-display text-6xl font-extrabold tabular-nums tracking-tight md:text-7xl ${t.primary}`}
          >
            {formatSeconds(displaySeconds || 0)}
          </div>
          <div className={`text-sm font-medium md:text-base ${t.muted}`}>
            / {formatSeconds(currentTotal)}
          </div>
        </div>
        <div
          className={`h-3 w-full max-w-md overflow-hidden rounded-full ${t.progressBg}`}
        >
          <div
            className={`h-full rounded-full bg-primary-200 dark:bg-primary-400 ${instantTransition ? "transition-none" : "transition-[width] duration-1000 ease-linear"}`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <NextIntervalInfo interval={next} variant={variant} />
      </div>

      <div className="mt-auto flex shrink-0 items-center justify-between gap-4 pt-4">
        <button
          type="button"
          onClick={() => reset(workoutState.workout)}
          className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-400/60 bg-zinc-200/90 px-8 py-3.5 text-base font-bold uppercase tracking-wider text-zinc-700 transition-colors hover:bg-zinc-300/90 dark:border-zinc-600 dark:bg-zinc-700/80 dark:text-zinc-200 dark:hover:bg-zinc-600/80"
        >
          <FaUndo className="h-4 w-4" />
          Reset
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
          aria-label={
            player.isRunning
              ? "Pause workout"
              : player.isPaused
                ? "Resume workout"
                : "Start workout"
          }
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-base font-bold uppercase tracking-wider shadow-lg transition-all disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-white/60 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-400 ${
            player.isRunning
              ? "bg-amber-500 text-white hover:bg-amber-400 shadow-xl dark:bg-amber-600 dark:text-white dark:hover:bg-amber-500"
              : "bg-white text-primary-600 hover:bg-white/95 hover:shadow-xl dark:bg-primary-500 dark:text-white dark:hover:bg-primary-400"
          }`}
        >
          {player.isRunning ? (
            <>
              <FaPause className="h-4 w-4" />
              Pause
            </>
          ) : (
            <>
              <FaPlay className="h-4 w-4" />
              Start
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function PlayerPanel({
  hideControls,
  backgroundColor,
}: {
  hideControls?: boolean;
  backgroundColor?: string;
}) {
  return (
    <InnerPlayer
      hideControls={hideControls}
      backgroundColor={backgroundColor}
    />
  );
}
