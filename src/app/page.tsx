"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { WorkoutListScreen } from "@/components/WorkoutListScreen";
import { SettingsDropdown } from "@/components/SettingsDropdown";
import { useWorkouts } from "@/state/workouts-context";
import { decodeWorkoutOrBundle } from "@/domain/share";

function AppContent() {
  const router = useRouter();
  const { workouts, addWorkout, importWorkout, importWorkouts } = useWorkouts();

  // Handle ?data= URL import on load
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const data = params.get("data");
    if (data) {
      const decoded = decodeWorkoutOrBundle(data);
      if (decoded) {
        if (Array.isArray(decoded)) {
          const last = importWorkouts(decoded);
          if (last) {
            const url = new URL(window.location.href);
            url.searchParams.delete("data");
            url.pathname = `/workout/${last.id}`;
            window.history.replaceState({}, "", url.toString());
            router.replace(`/workout/${last.id}`);
          }
        } else {
          const w = importWorkout(decoded);
          const url = new URL(window.location.href);
          url.searchParams.delete("data");
          url.pathname = `/workout/${w.id}`;
          window.history.replaceState({}, "", url.toString());
          router.replace(`/workout/${w.id}`);
        }
      }
    }
  }, [importWorkout, importWorkouts, router]);

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden text-zinc-900 dark:text-zinc-100">
      {/* Subtle gradient orb */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary-500/20 blur-3xl dark:bg-primary-500/10" />
      <div className="pointer-events-none absolute top-1/2 -left-20 h-60 w-60 rounded-full bg-sky-400/10 blur-3xl dark:bg-sky-500/5" />

      <header className="relative flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-8 md:mx-auto md:py-12 [padding-inline-end:max(1rem,env(safe-area-inset-right))]">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-500/15 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400">
            <svg
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 32 32"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 8v16M10 8h6a5 5 0 0 1 0 10" />
            </svg>
          </div>
          <div className="flex items-baseline gap-3">
            <h1 className="font-brand text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-4xl">
              Pomobro
            </h1>
            <span className="hidden text-sm text-zinc-500 dark:text-zinc-400 md:inline">
              Voice-guided interval timer
            </span>
          </div>
        </div>
        <SettingsDropdown />
      </header>
      <main className="relative mx-auto w-full max-w-5xl flex-1 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] md:pb-12">
        <WorkoutListScreen />
      </main>
    </div>
  );
}

export default function Home() {
  return <AppContent />;
}
