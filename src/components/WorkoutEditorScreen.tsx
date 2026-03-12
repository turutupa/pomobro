"use client";

import { useRouter } from "next/navigation";
import { FaPause, FaPlay, FaThLarge, FaStopwatch, FaUndo } from "react-icons/fa";
import { expandIntervals } from "@/domain/workout";
import { PlayerProvider, usePlayer } from "@/state/player-context";
import {
  PhonePlaybackViewProvider,
  usePhonePlaybackView,
  useIsMobile,
} from "@/state/phone-playback-view-context";
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
          <PhonePlaybackViewProvider>
            <WorkoutEditorSync />
            <WorkoutEditorContent />
          </PhonePlaybackViewProvider>
        </PlayerProvider>
      </WorkoutProvider>
    </PrepEnabledProvider>
  );
}

function WorkoutEditorContent() {
  const { view } = usePhonePlaybackView();
  const isMobile = useIsMobile();

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

      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-4 overflow-hidden px-2 pb-0 md:px-4 md:flex-row md:gap-8 md:pb-8 2xl:max-w-[1600px]">
        <section
          className={`scrollbar-thin min-h-0 w-full overflow-y-auto py-2 px-1 pb-40 md:pb-2 md:min-w-0 md:w-[42%] md:flex-none md:rounded-2xl md:bg-zinc-100 md:p-5 md:shadow-sm dark:md:bg-zinc-900/95 ${isMobile && view === "player" ? "hidden" : ""} md:!block`}
        >
          <IntervalEditorList />
        </section>

        <section
          className={`scrollbar-thin min-h-0 min-w-0 flex-1 overflow-y-auto rounded-2xl bg-primary-600 p-5 text-white shadow-lg dark:bg-zinc-800 dark:text-zinc-100 md:p-6 ${isMobile && view === "cards" ? "hidden" : "block"} md:block`}
        >
          <PlayerPanel hideControls={isMobile} />
        </section>
      </main>
      <MobilePlayerBar />
    </div>
  );
}

function MobilePlayerBar() {
  const { state: workoutState } = useWorkout();
  const { state: player, play, pause, reset } = usePlayer();
  const { view, toggleView } = usePhonePlaybackView();
  const prevIndexRef = useRef(player.currentIndex);
  const prevIsRunningRef = useRef(player.isRunning);
  const intervals = workoutState.workout.intervals;
  const playbackIntervals = expandIntervals(intervals);
  const isInPlaybackMode = player.isRunning || player.isPaused;
  const effectiveIndex = isInPlaybackMode ? player.currentIndex : 0;
  const current = playbackIntervals[effectiveIndex] ?? null;
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
    <div className="pointer-events-none fixed inset-x-0 bottom-0 flex flex-col items-center gap-4 pb-5 pt-12 md:hidden">
      <div className="pointer-events-auto flex w-full max-w-xs items-center justify-center gap-3 px-4">
        <div className="flex min-w-12 flex-1 items-center justify-start">
          <button
            type="button"
            onClick={toggleView}
            aria-label={view === "cards" ? "Switch to timer view" : "Switch to cards view"}
            className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-zinc-600 text-white transition-colors hover:bg-zinc-500 dark:bg-zinc-600 dark:hover:bg-zinc-500"
          >
            {view === "cards" ? (
              <FaStopwatch className="h-5 w-5" />
            ) : (
              <FaThLarge className="h-5 w-5" />
            )}
          </button>
        </div>
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
          disabled={!isInPlaybackMode && playbackIntervals.length === 0}
          aria-label={
            player.isRunning
              ? "Pause workout"
              : player.isPaused
                ? "Resume workout"
                : "Start workout"
          }
          className={`flex min-w-32 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold uppercase tracking-wider shadow-lg transition-all disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none dark:disabled:bg-zinc-700 dark:disabled:text-zinc-400 ${
            player.isRunning
              ? "bg-amber-500 text-white hover:bg-amber-400 shadow-xl dark:bg-amber-600 dark:text-white dark:hover:bg-amber-500"
              : "bg-primary-600 text-white hover:bg-primary-500 hover:shadow-xl dark:bg-primary-500 dark:text-white dark:hover:bg-primary-400"
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
        <div className="flex min-w-12 flex-1 items-center justify-end">
          {isInPlaybackMode && (
            <button
              type="button"
              onClick={() => reset(workoutState.workout)}
              className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-zinc-600 text-white transition-colors hover:bg-zinc-500 dark:bg-zinc-600 dark:hover:bg-zinc-500"
              aria-label="Reset"
            >
              <FaUndo className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      {isInPlaybackMode && view === "cards" && (
        <div className="absolute inset-x-0 bottom-0 h-2 w-full overflow-hidden bg-zinc-200/80 dark:bg-zinc-800">
          <div
            className={`h-full bg-primary-500 dark:bg-primary-400 ${instantTransition ? "transition-none" : "transition-[width] duration-1000 ease-linear"}`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push("/")}
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
