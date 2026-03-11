"use client";

import { useEffect } from "react";
import { WorkoutListScreen } from "@/components/WorkoutListScreen";
import { WorkoutEditorScreen } from "@/components/WorkoutEditorScreen";
import { SettingsDropdown } from "@/components/SettingsDropdown";
import { WorkoutsProvider, useWorkouts } from "@/state/workouts-context";
import { decodeWorkoutOrBundle } from "@/domain/share";

function AppContent() {
  const { workouts, currentId, setCurrentId, importWorkout, importWorkouts } = useWorkouts();

  // Handle ?data= URL import on load
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const data = params.get("data");
    if (data) {
      const decoded = decodeWorkoutOrBundle(data);
      if (decoded) {
        if (Array.isArray(decoded)) {
          importWorkouts(decoded);
        } else {
          importWorkout(decoded);
        }
        // Clear URL without full reload
        const url = new URL(window.location.href);
        url.searchParams.delete("data");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [importWorkout, importWorkouts]);

  // Clear invalid currentId (e.g. deleted workout)
  const hasWorkout = currentId !== null && workouts.some((w) => w.id === currentId);
  useEffect(() => {
    if (currentId !== null && !hasWorkout) {
      setCurrentId(null);
    }
  }, [currentId, hasWorkout, setCurrentId]);

  // Show list when no workout selected
  if (currentId === null) {
    return (
      <div className="relative flex min-h-screen w-full flex-col overflow-hidden text-zinc-900 dark:text-zinc-100">
        {/* Subtle gradient orb */}
        <div className="pointer-events-none absolute -top-40 -right-40 h-80 w-80 rounded-full bg-teal-400/20 blur-3xl dark:bg-teal-500/10" />
        <div className="pointer-events-none absolute top-1/2 -left-20 h-60 w-60 rounded-full bg-sky-400/10 blur-3xl dark:bg-sky-500/5" />

        <header className="relative flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-8 md:mx-auto md:py-12 [padding-inline-end:max(1rem,env(safe-area-inset-right))]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 dark:bg-teal-400/20 dark:text-teal-400">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 32 32" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 8v16M10 8h6a5 5 0 0 1 0 10" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-4xl">
              Pomobro
            </h1>
          </div>
          <SettingsDropdown />
        </header>
        <main className="relative mx-auto w-full max-w-5xl flex-1 px-4 pb-8 md:pb-12">
          <WorkoutListScreen />
        </main>
      </div>
    );
  }

  // Show editor when workout selected
  if (hasWorkout) {
    return <WorkoutEditorScreen />;
  }

  // Fallback: currentId points to deleted workout — show list (useEffect above will clear)
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden text-zinc-900 dark:text-zinc-100">
      <div className="pointer-events-none absolute -top-40 -right-40 h-80 w-80 rounded-full bg-teal-400/20 blur-3xl dark:bg-teal-500/10" />
      <div className="pointer-events-none absolute top-1/2 -left-20 h-60 w-60 rounded-full bg-sky-400/10 blur-3xl dark:bg-sky-500/5" />
      <header className="relative flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-8 md:mx-auto md:py-12 [padding-inline-end:max(1rem,env(safe-area-inset-right))]">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 dark:bg-teal-400/20 dark:text-teal-400">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 32 32" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 8v16M10 8h6a5 5 0 0 1 0 10" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-4xl">
            Pomobro
          </h1>
        </div>
        <SettingsDropdown />
      </header>
      <main className="relative mx-auto w-full max-w-5xl flex-1 px-4 pb-8 md:pb-12">
        <WorkoutListScreen />
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <WorkoutsProvider>
      <AppContent />
    </WorkoutsProvider>
  );
}
