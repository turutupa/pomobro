"use client";

import { PlayerProvider, usePlayer } from "@/state/player-context";
import { PrepEnabledProvider } from "@/state/prep-enabled-context";
import { WorkoutProvider, useWorkout } from "@/state/workout-context";
import { useWorkouts } from "@/state/workouts-context";
import { useEffect, useRef, useLayoutEffect } from "react";
import { IntervalEditorList } from "./IntervalCards";
import { PlayerPanel } from "./PlayerPanel";
import { SettingsDropdown } from "./SettingsDropdown";
import { WorkoutHeader } from "./WorkoutHeader";
import { PlaybackVoiceController } from "@/voice/PlaybackVoiceController";
import { PlaybackBeepController } from "@/voice/PlaybackBeepController";
import { resumeAudioContext } from "@/voice/BeepEngine";

function WorkoutEditorSync() {
  const { state } = useWorkout();
  const { updateCurrentWorkout, currentId } = useWorkouts();
  const lastSynced = useRef<string>("");

  useEffect(() => {
    if (!currentId) return;
    const key = JSON.stringify(state.workout);
    if (key === lastSynced.current) return;
    lastSynced.current = key;
    updateCurrentWorkout(state.workout);
  }, [state.workout, currentId, updateCurrentWorkout]);

  return null;
}

export function WorkoutEditorScreen() {
  const { currentWorkout } = useWorkouts();

  if (!currentWorkout) return null;

  return (
    <PrepEnabledProvider>
      <WorkoutProvider key={currentWorkout.id} initialWorkout={currentWorkout}>
        <PlayerProvider workout={currentWorkout}>
          <WorkoutEditorSync />
          <WorkoutEditorContent />
        </PlayerProvider>
      </WorkoutProvider>
    </PrepEnabledProvider>
  );
}

function WorkoutEditorContent() {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden text-zinc-900 dark:text-zinc-100">
      <PlaybackVoiceController enabled />
      <PlaybackBeepController />
      <header className="flex shrink-0 w-full max-w-7xl flex-row items-center justify-between gap-2 px-4 py-4 md:mx-auto md:py-6 2xl:max-w-[1600px] [padding-inline-end:max(1rem,env(safe-area-inset-right))]">
        <div className="flex min-h-9 min-w-0 flex-1 items-center gap-2">
          <BackButton />
          <div className="min-w-0 flex-1">
            <WorkoutHeader />
          </div>
        </div>
        <SettingsDropdown />
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-4 overflow-hidden px-4 pb-0 md:flex-row md:gap-8 md:pb-8 2xl:max-w-[1600px]">
        <section className="scrollbar-thin min-h-0 w-full overflow-y-auto py-2 pb-40 md:pb-2 md:min-w-0 md:w-[42%] md:flex-none md:rounded-2xl md:bg-white/95 md:p-5 md:shadow-sm md:ring-1 md:ring-zinc-200/80 md:backdrop-blur dark:md:bg-zinc-900/95 dark:md:ring-zinc-700/50">
          <IntervalEditorList />
        </section>

        <section className="scrollbar-thin hidden min-h-0 min-w-0 flex-1 overflow-y-auto rounded-2xl bg-gradient-to-b from-slate-100 to-slate-200 p-5 text-slate-800 shadow-lg ring-1 ring-slate-200 dark:from-zinc-900 dark:to-zinc-950 dark:text-zinc-50 dark:ring-0 md:block md:p-6">
          <PlayerPanel />
        </section>
      </main>
      <MobilePlayerBar />
    </div>
  );
}

function MobilePlayerBar() {
  const { state: workoutState } = useWorkout();
  const { state: player, play, reset } = usePlayer();
  const prevIndexRef = useRef(player.currentIndex);
  const prevIsRunningRef = useRef(player.isRunning);
  const intervals = workoutState.workout.intervals;
  const previewIndex =
    !player.isRunning && workoutState.selectedIntervalId
      ? intervals.findIndex((i) => i.id === workoutState.selectedIntervalId)
      : -1;
  const effectiveIndex = player.isRunning ? player.currentIndex : previewIndex >= 0 ? previewIndex : 0;
  const current = intervals[effectiveIndex] ?? null;
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
    <div className="pointer-events-none fixed inset-x-0 bottom-0 flex flex-col items-center gap-4 pb-2 pt-16 md:hidden">
      <button
        type="button"
        onClick={
          player.isRunning
            ? () => reset(workoutState.workout)
            : async () => {
                await resumeAudioContext();
                play(
                  workoutState.workout,
                  previewIndex >= 0 ? previewIndex : undefined
                );
              }
        }
        disabled={!player.isRunning && intervals.length === 0}
        className={`pointer-events-auto w-32 cursor-pointer rounded-xl py-3.5 text-base font-bold uppercase tracking-wider shadow-lg transition-all disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none dark:disabled:bg-zinc-700 dark:disabled:text-zinc-400 ${
          player.isRunning
            ? "bg-red-500 text-white hover:bg-red-600 hover:shadow-xl dark:bg-red-500 dark:text-white dark:hover:bg-red-600"
            : "bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-xl dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
        }`}
      >
        {player.isRunning ? "Stop" : "Start"}
      </button>
      {player.isRunning && (
        <div className="absolute inset-x-0 bottom-0 h-1 w-full overflow-hidden bg-zinc-200/80 dark:bg-zinc-800">
          <div
            className={`h-full bg-emerald-500 dark:bg-emerald-400 ${instantTransition ? "transition-none" : "transition-[width] duration-1000 ease-linear"}`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

function BackButton() {
  const { setCurrentId } = useWorkouts();

  return (
    <button
      type="button"
      onClick={() => setCurrentId(null)}
      className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
      aria-label="Back to workouts"
    >
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 19l-7-7 7-7"
        />
      </svg>
    </button>
  );
}
