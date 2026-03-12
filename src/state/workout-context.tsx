"use client";

import React, { createContext, useContext, useMemo, useReducer } from "react";
import {
  Workout,
  Interval,
  createEmptyWorkout,
  addWorkIntervalAfter,
  addRestAfter,
  addRestBetween,
  deleteInterval as deleteIntervalDomain,
  moveInterval as moveIntervalDomain,
  normalizeWorkout,
} from "@/domain/workout";

interface WorkoutState {
  workout: Workout;
  selectedIntervalId: string | null;
  lastAddedIntervalId: string | null;
}

type Action =
  | { type: "setWorkout"; workout: Workout }
  | { type: "selectInterval"; id: string | null }
  | { type: "addWorkAfter"; afterId: string | null }
  | { type: "clearLastAddedIntervalId" }
  | { type: "addRestAfter"; afterId: string }
  | { type: "addRestBetween"; beforeId: string }
  | { type: "deleteInterval"; id: string }
  | { type: "moveInterval"; id: string; newIndex: number }
  | { type: "updateInterval"; id: string; patch: Partial<Interval> }
  | { type: "updateMeta"; name?: string; description?: string; sets?: number };

const WorkoutContext = createContext<
  | {
      state: WorkoutState;
      dispatch: React.Dispatch<Action>;
    }
  | undefined
>(undefined);

function reducer(state: WorkoutState, action: Action): WorkoutState {
  switch (action.type) {
    case "setWorkout": {
      const workout = normalizeWorkout(action.workout);
      return { ...state, workout };
    }
    case "selectInterval":
      return { ...state, selectedIntervalId: action.id };
    case "addWorkAfter": {
      const workout = addWorkIntervalAfter(state.workout, action.afterId);
      const oldIds = new Set(state.workout.intervals.map((i) => i.id));
      const newInterval = workout.intervals.find((i) => !oldIds.has(i.id));
      return {
        ...state,
        workout,
        lastAddedIntervalId: newInterval?.id ?? null,
      };
    }
    case "clearLastAddedIntervalId":
      return { ...state, lastAddedIntervalId: null };
    case "addRestAfter": {
      const workout = addRestAfter(state.workout, action.afterId);
      return { ...state, workout };
    }
    case "addRestBetween": {
      const workout = addRestBetween(state.workout, action.beforeId);
      return { ...state, workout };
    }
    case "deleteInterval": {
      const workout = deleteIntervalDomain(state.workout, action.id);
      const selectedIntervalId =
        state.selectedIntervalId === action.id ? null : state.selectedIntervalId;
      return { ...state, workout, selectedIntervalId };
    }
    case "moveInterval": {
      const workout = moveIntervalDomain(
        state.workout,
        action.id,
        action.newIndex
      );
      return { ...state, workout };
    }
    case "updateInterval": {
      const workout: Workout = {
        ...state.workout,
        intervals: state.workout.intervals.map((interval) =>
          interval.id === action.id
            ? ({ ...interval, ...action.patch } as Interval)
            : interval
        ),
      };
      return { ...state, workout: normalizeWorkout(workout) };
    }
    case "updateMeta": {
      const workout: Workout = {
        ...state.workout,
        name: action.name ?? state.workout.name,
        description:
          action.description === undefined
            ? state.workout.description
            : action.description,
        sets:
          action.sets === undefined
            ? state.workout.sets
            : action.sets,
      };
      return { ...state, workout };
    }
    default:
      return state;
  }
}

export function WorkoutProvider({
  initialWorkout,
  children,
}: {
  initialWorkout?: Workout;
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, {
    workout: initialWorkout ? normalizeWorkout(initialWorkout) : createEmptyWorkout(),
    selectedIntervalId: null,
    lastAddedIntervalId: null,
  });

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <WorkoutContext.Provider value={value}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) {
    throw new Error("useWorkout must be used within a WorkoutProvider");
  }
  const { state, dispatch } = ctx;

  const actions = {
    setWorkout: (workout: Workout) => dispatch({ type: "setWorkout", workout }),
    selectInterval: (id: string | null) =>
      dispatch({ type: "selectInterval", id }),
    addWorkAfter: (afterId: string | null) =>
      dispatch({ type: "addWorkAfter", afterId }),
    clearLastAddedIntervalId: () =>
      dispatch({ type: "clearLastAddedIntervalId" }),
    addRestAfter: (afterId: string) =>
      dispatch({ type: "addRestAfter", afterId }),
    addRestBetween: (beforeId: string) =>
      dispatch({ type: "addRestBetween", beforeId }),
    deleteInterval: (id: string) =>
      dispatch({ type: "deleteInterval", id }),
    moveInterval: (id: string, newIndex: number) =>
      dispatch({ type: "moveInterval", id, newIndex }),
    updateInterval: (id: string, patch: Partial<Interval>) =>
      dispatch({ type: "updateInterval", id, patch }),
    updateMeta: (name?: string, description?: string, sets?: number) =>
      dispatch({ type: "updateMeta", name, description, sets }),
  };

  return { ...ctx, ...actions };
}

