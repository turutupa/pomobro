"use client";

import { useRouter } from "next/navigation";
import {
  FaPause,
  FaPlay,
  FaTh,
  FaClock,
  FaUndo,
  FaThList,
  FaPen,
} from "react-icons/fa";
import {
  expandIntervals,
  type WorkInterval,
  type RestInterval,
} from "@/domain/workout";
import { PlayerProvider, usePlayer } from "@/state/player-context";
import {
  PhonePlaybackViewProvider,
  usePhonePlaybackView,
  useIsMobile,
} from "@/state/phone-playback-view-context";
import {
  PreviewModeProvider,
  usePreviewMode,
} from "@/state/preview-mode-context";
import { WorkoutProvider, useWorkout } from "@/state/workout-context";
import { useWorkouts } from "@/state/workouts-context";
import { TutorialProvider } from "@/state/tutorial-context";
import { useCallback, useEffect, useRef, useState, useLayoutEffect } from "react";
import { IntervalEditorList } from "./IntervalCards";
import { PlayerPanel } from "./PlayerPanel";
import { SettingsDropdown } from "./SettingsDropdown";
import { WorkoutHeader, WorkoutHeaderTotal } from "./WorkoutHeader";
import { PlaybackVoiceController } from "@/voice/PlaybackVoiceController";
import { PlaybackBeepController } from "@/voice/PlaybackBeepController";
import { TutorialOverlay } from "./TutorialOverlay";
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
    <PreviewModeProvider>
      <WorkoutProvider key={currentWorkout.id} initialWorkout={currentWorkout}>
        <PlayerProvider workout={currentWorkout}>
          <PhonePlaybackViewProvider>
            <TutorialProvider>
              <WorkoutEditorSync />
              <WorkoutEditorContent />
              <TutorialOverlay />
            </TutorialProvider>
          </PhonePlaybackViewProvider>
        </PlayerProvider>
      </WorkoutProvider>
    </PreviewModeProvider>
  );
}

const DEFAULT_WORK_COLOR = "#0ea5e9";
const DEFAULT_REST_COLOR = "#475569";
/** Distinct color for "get ready" countdown so it's clearly different from work/rest. */
const PREP_BG_COLOR = "#0d9488"; // teal - distinct from amber pause/looper

function WorkoutEditorContent() {
  const { view } = usePhonePlaybackView();
  const isMobile = useIsMobile();
  const { previewMode, togglePreviewMode } = usePreviewMode();
  const { state: workoutState } = useWorkout();
  const { state: player } = usePlayer();
  const playbackIntervals = expandIntervals(workoutState.workout.intervals);
  const isInPlaybackMode = player.isRunning || player.isPaused;
  const effectiveIndex = isInPlaybackMode ? player.currentIndex : 0;
  const currentInterval = playbackIntervals[effectiveIndex] ?? null;
  const currentIntervalForPrep = playbackIntervals[player.currentIndex];
  const inPreparation =
    player.isRunning &&
    currentIntervalForPrep &&
    "type" in currentIntervalForPrep &&
    currentIntervalForPrep.type === "prep";
  const showGetReadyAsDefault =
    !isInPlaybackMode &&
    playbackIntervals.length > 0 &&
    playbackIntervals[0] &&
    "type" in playbackIntervals[0] &&
    playbackIntervals[0].type === "prep";
  const timerViewBgColor =
    inPreparation || showGetReadyAsDefault
      ? PREP_BG_COLOR
      : currentInterval
        ? currentInterval.type === "work"
          ? ((currentInterval as WorkInterval).color ?? DEFAULT_WORK_COLOR)
          : ((currentInterval as RestInterval).color ?? DEFAULT_REST_COLOR)
        : undefined;

  // Track whether the user has scrolled on mobile for compact header
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !isMobile) return;
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          setScrolled(el.scrollTop > 8);
          ticking = false;
        });
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [isMobile]);

  return (
    <div ref={scrollRef} className="flex h-screen w-full flex-col overflow-y-auto text-zinc-900 dark:text-zinc-100 md:overflow-hidden">
      <PlaybackVoiceController enabled />
      <PlaybackBeepController />
      <header
        className="sticky top-0 z-30 flex w-full max-w-7xl shrink-0 flex-col gap-1 px-4 py-3 md:relative md:bg-transparent md:dark:bg-transparent md:backdrop-blur-none md:shadow-none md:mx-auto md:py-6 2xl:max-w-[1600px] [padding-inline-end:max(1rem,env(safe-area-inset-right))]"
      >
        {/* Gradient scrim: fades from solid to transparent (mobile only) */}
        {isMobile && (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 -z-10"
            style={{
              height: "200%",
              background: scrolled
                ? "linear-gradient(to bottom, var(--scrim-color) 0%, var(--scrim-color) 50%, transparent 100%)"
                : "linear-gradient(to bottom, var(--scrim-color) 0%, transparent 100%)",
            }}
          />
        )}
        <div className="flex h-9 min-h-9 min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <BackButton />
            <WorkoutHeader />
          </div>
          <div className="flex shrink-0 items-center gap-0">
            <button
              type="button"
              onClick={togglePreviewMode}
              className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors ${
                previewMode
                  ? "bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              }`}
              aria-label={previewMode ? "Edit mode" : "Preview layout"}
              title={previewMode ? "Edit mode" : "Preview layout"}
            >
              {previewMode ? (
                <FaPen className="h-4 w-4" />
              ) : (
                <FaThList className="h-5 w-5" />
              )}
            </button>
            <SettingsDropdown workout={workoutState.workout} />
          </div>
        </div>
        {/* GPU-accelerated collapse: transform + opacity only, no layout thrash */}
        <div
          className="origin-top will-change-transform"
          style={{
            transform: isMobile && scrolled ? "scaleY(0)" : "scaleY(1)",
            opacity: isMobile && scrolled ? 0 : 1,
            height: isMobile && scrolled ? 0 : "auto",
            transition: "transform 150ms ease-out, opacity 150ms ease-out",
          }}
        >
          <WorkoutHeaderTotal />
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-4 px-2 pb-0 md:overflow-hidden md:flex-row md:gap-8 md:px-4 md:pb-8 2xl:max-w-[1600px]">
        <section
          className={`scrollbar-thin min-h-0 w-full px-1 pt-2 pb-44 md:overflow-y-auto md:pb-2 md:min-w-0 md:w-[42%] md:flex-none md:rounded-2xl md:bg-zinc-100 md:p-5 md:shadow-sm dark:md:bg-zinc-900/95 ${isMobile && view === "player" ? "hidden" : ""} md:!block`}
        >
          <IntervalEditorList />
        </section>

        <section
          data-tutorial="timer-panel"
          className={`scrollbar-thin flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto rounded-2xl p-5 text-white shadow-lg dark:text-zinc-100 md:min-h-full md:overflow-hidden md:p-6 ${isMobile && view === "cards" ? "hidden" : "block"} ${isMobile && view === "player" ? "pb-24" : ""} md:block ${!timerViewBgColor ? "bg-primary-600 dark:bg-zinc-800" : ""}`}
          style={
            timerViewBgColor ? { backgroundColor: timerViewBgColor } : undefined
          }
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col md:h-full">
            <PlayerPanel
              hideControls={isMobile}
              backgroundColor={timerViewBgColor}
            />
          </div>
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
  const currentForPrep = playbackIntervals[player.currentIndex];
  const inPreparation =
    player.isRunning &&
    currentForPrep &&
    "type" in currentForPrep &&
    currentForPrep.type === "prep";
  const currentTotal = inPreparation
    ? (currentForPrep?.durationSeconds ?? 7)
    : (current?.durationSeconds ?? 0);
  const displaySeconds = player.isRunning
    ? inPreparation
      ? player.secondsRemainingInInterval
      : player.secondsRemainingInInterval
    : currentTotal;
  const elapsed = player.isRunning
    ? inPreparation
      ? (currentForPrep?.durationSeconds ?? 7) -
        player.secondsRemainingInInterval
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
            aria-label={
              view === "cards" ? "Switch to timer view" : "Switch to cards view"
            }
            className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-zinc-600 text-white transition-colors hover:bg-zinc-500 dark:bg-zinc-600 dark:hover:bg-zinc-500"
          >
            {view === "cards" ? (
              <FaClock className="h-5 w-5" />
            ) : (
              <FaTh className="h-5 w-5" />
            )}
          </button>
        </div>
        <button
          type="button"
          data-tutorial="play-button"
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
