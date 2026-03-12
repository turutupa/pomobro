"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { Workout } from "@/domain/workout";
import { usePrepEnabled } from "@/state/prep-enabled-context";

interface PlayerState {
  isRunning: boolean;
  currentIndex: number;
  /** 0-based set index. When sets is 1, always 0. */
  currentSetIndex: number;
  secondsRemainingInInterval: number;
  /** 5–1 countdown before first interval; 0 when running. */
  preparationRemaining: number;
  startedAt: number | null;
}

type Action =
  | { type: "reset"; workout: Workout }
  | { type: "play"; workout: Workout; startIndex?: number; prepEnabled?: boolean }
  | { type: "pause" }
  | { type: "tick"; workout: Workout }
  | { type: "jumpTo"; index: number; workout: Workout };

const PlayerContext = createContext<
  | {
      state: PlayerState;
      dispatch: React.Dispatch<Action>;
      prepEnabled: boolean;
    }
  | undefined
>(undefined);

function initialState(workout: Workout): PlayerState {
  return {
    isRunning: false,
    currentIndex: workout.intervals.length > 0 ? 0 : -1,
    currentSetIndex: 0,
    secondsRemainingInInterval:
      workout.intervals[0]?.durationSeconds ?? 0,
    preparationRemaining: 0,
    startedAt: null,
  };
}

function reducer(state: PlayerState, action: Action): PlayerState {
  switch (action.type) {
    case "reset":
      return initialState(action.workout);
    case "play": {
      const intervals = action.workout.intervals;
      if (intervals.length === 0) return state;
      const idx = action.startIndex ?? state.currentIndex;
      const safeIdx = Math.max(0, Math.min(idx, intervals.length - 1));
      const target = intervals[safeIdx];
      const atFullDuration =
        (action.startIndex !== undefined ||
          (state.currentIndex === safeIdx &&
            state.secondsRemainingInInterval === target.durationSeconds)) &&
        state.preparationRemaining === 0;
      const prepCount = action.prepEnabled !== false ? 7 : 0;
      return {
        ...state,
        currentIndex: safeIdx,
        currentSetIndex: action.startIndex !== undefined ? 0 : state.currentSetIndex,
        secondsRemainingInInterval: target.durationSeconds,
        preparationRemaining: atFullDuration ? prepCount : state.preparationRemaining,
        isRunning: true,
        startedAt: Date.now(),
      };
    }
    case "pause":
      return {
        ...state,
        isRunning: false,
        startedAt: null,
        // Keep preparationRemaining so we can resume countdown
      };
    case "jumpTo":
      if (
        action.index < 0 ||
        action.index >= action.workout.intervals.length
      ) {
        return state;
      }
      return {
        ...state,
        currentIndex: action.index,
        currentSetIndex: 0,
        secondsRemainingInInterval:
          action.workout.intervals[action.index].durationSeconds,
        preparationRemaining: 0,
        startedAt: null,
        isRunning: false,
      };
    case "tick": {
      if (!state.isRunning) return state;
      // During preparation countdown, don't decrement interval time
      if (state.preparationRemaining > 0) {
        return {
          ...state,
          preparationRemaining: state.preparationRemaining - 1,
        };
      }
      const remaining = state.secondsRemainingInInterval - 1;
      if (remaining > 0) {
        return {
          ...state,
          secondsRemainingInInterval: remaining,
        };
      }
      // interval finished - advance to next
      const nextIndex = state.currentIndex + 1;
      const intervals = action.workout.intervals;
      const sets = Math.max(1, action.workout.sets ?? 1);
      if (nextIndex < intervals.length) {
        const next = intervals[nextIndex];
        return {
          ...state,
          currentIndex: nextIndex,
          secondsRemainingInInterval: next.durationSeconds,
        };
      }
      // finished one set - repeat or complete
      const nextSetIndex = state.currentSetIndex + 1;
      if (nextSetIndex < sets) {
        const first = intervals[0];
        return {
          ...state,
          currentIndex: 0,
          currentSetIndex: nextSetIndex,
          secondsRemainingInInterval: first.durationSeconds,
        };
      }
      // workout complete (all sets done)
      return {
        ...state,
        isRunning: false,
        startedAt: null,
      };
    }
    default:
      return state;
  }
}

export function PlayerProvider({
  workout,
  children,
}: {
  workout: Workout;
  children: React.ReactNode;
}) {
  const { prepEnabled } = usePrepEnabled();
  const [state, dispatch] = useReducer(reducer, workout, initialState);
  const workoutRef = useRef(workout);
  workoutRef.current = workout;

  useEffect(() => {
    if (!state.isRunning) return;
    const id = setInterval(() => {
      dispatch({ type: "tick", workout: workoutRef.current });
    }, 1000);
    return () => clearInterval(id);
  }, [state.isRunning]);

  // Reset only when interval structure changes (add/remove), not on title/duration edits
  const intervalIds = workout.intervals.map((i) => i.id).join(",");
  useEffect(() => {
    dispatch({ type: "reset", workout });
  }, [intervalIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo(() => ({ state, dispatch, prepEnabled }), [state, prepEnabled]);

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }

  const { state, dispatch } = ctx;
  const prepEnabled = ctx.prepEnabled ?? true;

  const controls = {
    play: (workout: Workout, startIndex?: number) =>
      dispatch({ type: "play", workout, startIndex, prepEnabled }),
    pause: () => dispatch({ type: "pause" }),
    reset: (workout: Workout) => dispatch({ type: "reset", workout }),
    jumpTo: (index: number, workout: Workout) =>
      dispatch({ type: "jumpTo", index, workout }),
  };

  return { ...ctx, ...controls };
}

