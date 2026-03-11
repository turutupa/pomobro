"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Workout } from "@/domain/workout";
import { createEmptyWorkout, normalizeWorkout } from "@/domain/workout";
import { decodeWorkout } from "@/domain/share";
import {
  loadWorkouts,
  saveWorkouts,
  addWorkout as addWorkoutStorage,
  updateWorkout as updateWorkoutStorage,
  deleteWorkout as deleteWorkoutStorage,
} from "@/lib/workouts-storage";

interface WorkoutsState {
  workouts: Workout[];
  currentId: string | null;
}

type WorkoutsAction =
  | { type: "load" }
  | { type: "setCurrent"; id: string | null }
  | { type: "add"; workout: Workout }
  | { type: "update"; id: string; patch: Partial<Workout> }
  | { type: "delete"; id: string }
  | { type: "import"; workout: Workout }
  | { type: "import_bundle"; workouts: Workout[] };

const WorkoutsContext = createContext<
  | {
      workouts: Workout[];
      currentId: string | null;
      currentWorkout: Workout | null;
      setCurrentId: (id: string | null) => void;
      addWorkout: () => Workout;
      updateCurrentWorkout: (patch: Partial<Workout>) => void;
      deleteWorkout: (id: string) => void;
      importWorkout: (workout: Workout) => void;
      importWorkouts: (workouts: Workout[]) => void;
    }
  | undefined
>(undefined);

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Map<string, T>();
  for (const item of items) seen.set(item.id, item);
  return [...seen.values()];
}

function reducer(state: WorkoutsState, action: WorkoutsAction): WorkoutsState {
  switch (action.type) {
    case "load": {
      const raw = loadWorkouts().map((w) => normalizeWorkout(w));
      const workouts = dedupeById(raw);
      return {
        workouts,
        currentId: state.currentId,
      };
    }
    case "setCurrent":
      return { ...state, currentId: action.id };
    case "add": {
      const workout = normalizeWorkout(action.workout);
      const next = dedupeById(addWorkoutStorage(workout));
      return { workouts: next, currentId: workout.id };
    }
    case "update": {
      const list = state.workouts.map((w) =>
        w.id === action.id ? normalizeWorkout({ ...w, ...action.patch }) : w
      );
      saveWorkouts(list);
      return { ...state, workouts: list };
    }
    case "delete": {
      const next = deleteWorkoutStorage(action.id);
      return {
        workouts: next,
        currentId: state.currentId === action.id ? null : state.currentId,
      };
    }
    case "import": {
      const workout = normalizeWorkout(action.workout);
      const next = dedupeById(addWorkoutStorage(workout));
      return { workouts: next, currentId: workout.id };
    }
    case "import_bundle": {
      let lastId: string | null = null;
      for (const w of action.workouts) {
        const normalized = normalizeWorkout({ ...w, id: crypto.randomUUID() });
        lastId = normalized.id;
        addWorkoutStorage(normalized);
      }
      const next = dedupeById(loadWorkouts().map((x) => normalizeWorkout(x)));
      return { workouts: next, currentId: lastId ?? state.currentId };
    }
    default:
      return state;
  }
}

export function WorkoutsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, {
    workouts: [],
    currentId: null,
  });

  useEffect(() => {
    dispatch({ type: "load" });
  }, []);

  const currentWorkout = state.workouts.find((w) => w.id === state.currentId) ?? null;

  const setCurrentId = useCallback((id: string | null) => {
    dispatch({ type: "setCurrent", id });
  }, []);

  const addWorkout = useCallback(() => {
    const workout = createEmptyWorkout();
    dispatch({ type: "add", workout });
    return workout;
  }, []);

  const updateCurrentWorkout = useCallback(
    (patch: Partial<Workout>) => {
      if (state.currentId) {
        dispatch({ type: "update", id: state.currentId, patch });
      }
    },
    [state.currentId]
  );

  const deleteWorkout = useCallback((id: string) => {
    dispatch({ type: "delete", id });
  }, []);

  const importWorkout = useCallback((workout: Workout) => {
    dispatch({ type: "import", workout: { ...workout, id: crypto.randomUUID() } });
  }, []);

  const importWorkouts = useCallback((workouts: Workout[]) => {
    if (workouts.length > 0) {
      dispatch({ type: "import_bundle", workouts });
    }
  }, []);

  const value = React.useMemo(
    () => ({
      workouts: state.workouts,
      currentId: state.currentId,
      currentWorkout,
      setCurrentId,
      addWorkout,
      updateCurrentWorkout,
      deleteWorkout,
      importWorkout,
      importWorkouts,
    }),
    [
      state.workouts,
      state.currentId,
      currentWorkout,
      setCurrentId,
      addWorkout,
      updateCurrentWorkout,
      deleteWorkout,
      importWorkout,
      importWorkouts,
    ]
  );

  return (
    <WorkoutsContext.Provider value={value}>
      {children}
    </WorkoutsContext.Provider>
  );
}

export function useWorkouts() {
  const ctx = useContext(WorkoutsContext);
  if (!ctx) throw new Error("useWorkouts must be used within WorkoutsProvider");
  return ctx;
}
