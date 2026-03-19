"use client";

import { useState, useEffect } from "react";
import { totalDurationSeconds } from "@/domain/workout";
import { useWorkout } from "@/state/workout-context";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export function WorkoutHeader() {
  const { state, updateMeta } = useWorkout();
  const [localName, setLocalName] = useState(state.workout.name);

  useEffect(() => {
    setLocalName(state.workout.name);
  }, [state.workout.name]);

  if (typeof window === "undefined") return null;

  const totalSeconds = totalDurationSeconds(state.workout);

  return (
    <div className="flex h-9 min-w-0 flex-1 items-center">
      <input
        type="text"
        autoComplete="off"
        autoCorrect="on"
        autoCapitalize="words"
        data-lpignore="true"
        data-form-type="other"
        value={localName}
        onChange={(e) => setLocalName(e.target.value)}
        onBlur={() => updateMeta(localName)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="font-display min-h-9 min-w-0 flex-1 rounded-lg border-0 bg-transparent px-3 py-0 text-lg font-semibold leading-9 text-zinc-950 outline-none focus:ring-2 focus:ring-primary-500/50 dark:text-zinc-200"
        placeholder="Workout name"
      />
    </div>
  );
}

export function WorkoutHeaderTotal() {
  const { state } = useWorkout();
  if (typeof window === "undefined") return null;
  const totalSeconds = totalDurationSeconds(state.workout);
  return (
    <div className="pl-14 pr-3 text-xs font-medium text-zinc-500 dark:text-zinc-400">
      Total: {formatDuration(totalSeconds)}
      {state.workout.sets && state.workout.sets > 1 && (
        <span className="ml-1">({state.workout.sets} circuits)</span>
      )}
    </div>
  );
}
