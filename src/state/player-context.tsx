"use client";

import { Workout, expandIntervals } from "@/domain/workout";
import type {
  WorkInterval,
  RestInterval,
  PrepInterval,
} from "@/domain/workout";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";

function getPlaybackIntervals(workout: Workout) {
  return expandIntervals(workout.intervals);
}

/** Number of 1-second ticks to wait for voice announcement before the interval timer starts. */
const VOICE_DELAY_TICKS = 2;

/** Check if an interval should get a voice announcement delay before its timer starts. */
function shouldHaveVoiceDelay(
  interval: WorkInterval | RestInterval | PrepInterval,
): boolean {
  // All interval types get a delay when voice is not muted.
  return !interval.voice?.mute;
}

interface PlayerState {
  isRunning: boolean;
  /** True when paused (timer stopped but stay in playback UI). */
  isPaused: boolean;
  currentIndex: number;
  /** 0-based set index. When sets is 1, always 0. */
  currentSetIndex: number;
  secondsRemainingInInterval: number;
  startedAt: number | null;
  /** When true, the player is in a voice announcement delay before the interval timer starts. */
  isInVoiceDelay: boolean;
  /** Number of 1-second ticks remaining in the voice delay. */
  voiceDelayTicksRemaining?: number;
}

type Action =
  | { type: "reset"; workout: Workout }
  | {
      type: "play";
      workout: Workout;
      startIntervalId?: string;
    }
  | { type: "pause" }
  | { type: "tick"; workout: Workout }
  | { type: "jumpTo"; index: number; workout: Workout };

const PlayerContext = createContext<
  | {
      state: PlayerState;
      dispatch: React.Dispatch<Action>;
    }
  | undefined
>(undefined);

function initialState(workout: Workout): PlayerState {
  const intervals = getPlaybackIntervals(workout);
  const first = intervals[0];
  return {
    isRunning: false,
    isPaused: false,
    currentIndex: intervals.length > 0 ? 0 : -1,
    currentSetIndex: 0,
    secondsRemainingInInterval: first?.durationSeconds ?? 0,
    startedAt: null,
    isInVoiceDelay: false,
  };
}

function reducer(state: PlayerState, action: Action): PlayerState {
  switch (action.type) {
    case "reset":
      return { ...initialState(action.workout), isPaused: false };
    case "play": {
      const intervals = getPlaybackIntervals(action.workout);
      if (intervals.length === 0) return state;
      const isStartingFresh =
        !state.isRunning &&
        !state.isPaused &&
        action.startIntervalId === undefined;
      const idx =
        action.startIntervalId !== undefined
          ? Math.max(
              0,
              intervals.findIndex((i) => i.id === action.startIntervalId),
            )
          : isStartingFresh
            ? 0
            : state.currentIndex;
      const safeIdx = Math.max(0, Math.min(idx, intervals.length - 1));
      const target = intervals[safeIdx];
      // When resuming from pause, keep remaining time; otherwise use current workout's duration
      const secondsRemaining = state.isPaused
        ? state.secondsRemainingInInterval
        : target.durationSeconds;
      // Add voice announcement delay when starting (not resuming from pause)
      const addVoiceDelay =
        !state.isPaused && shouldHaveVoiceDelay(target);
      return {
        ...state,
        currentIndex: safeIdx,
        currentSetIndex:
          action.startIntervalId !== undefined ? 0 : state.currentSetIndex,
        secondsRemainingInInterval: secondsRemaining,
        isRunning: true,
        isPaused: false,
        isInVoiceDelay: addVoiceDelay,
        voiceDelayTicksRemaining: addVoiceDelay ? VOICE_DELAY_TICKS : undefined,
        startedAt: Date.now(),
      };
    }
    case "pause":
      return {
        ...state,
        isRunning: false,
        isPaused: true,
        isInVoiceDelay: false,
        voiceDelayTicksRemaining: undefined,
        startedAt: null,
      };
    case "jumpTo": {
      const intervals = getPlaybackIntervals(action.workout);
      if (action.index < 0 || action.index >= intervals.length) {
        return state;
      }
      return {
        ...state,
        currentIndex: action.index,
        currentSetIndex: 0,
        secondsRemainingInInterval: intervals[action.index].durationSeconds,
        startedAt: null,
        isRunning: false,
        isPaused: false,
        isInVoiceDelay: false,
        voiceDelayTicksRemaining: undefined,
      };
    }
    case "tick": {
      if (!state.isRunning) return state;
      // Voice announcement delay: hold for VOICE_DELAY_TICKS before starting the countdown
      if (state.isInVoiceDelay) {
        const nextDelay = (state.voiceDelayTicksRemaining ?? VOICE_DELAY_TICKS) - 1;
        if (nextDelay > 0) {
          return { ...state, voiceDelayTicksRemaining: nextDelay };
        }
        return { ...state, isInVoiceDelay: false, voiceDelayTicksRemaining: undefined };
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
      const intervals = getPlaybackIntervals(action.workout);
      const sets = Math.max(1, action.workout.sets ?? 1);
      if (nextIndex < intervals.length) {
        const next = intervals[nextIndex];
        return {
          ...state,
          currentIndex: nextIndex,
          secondsRemainingInInterval: next.durationSeconds,
          isInVoiceDelay: shouldHaveVoiceDelay(next),
          voiceDelayTicksRemaining: shouldHaveVoiceDelay(next) ? VOICE_DELAY_TICKS : undefined,
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
          isInVoiceDelay: shouldHaveVoiceDelay(first),
          voiceDelayTicksRemaining: shouldHaveVoiceDelay(first) ? VOICE_DELAY_TICKS : undefined,
        };
      }
      // workout complete (all sets done)
      return {
        ...state,
        isRunning: false,
        isPaused: false,
        isInVoiceDelay: false,
        voiceDelayTicksRemaining: undefined,
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

  // Reset only when interval structure changes (add/remove/looper), not on title/duration edits
  const intervalIds = workout.intervals
    .map((i) => (i.type === "looper" ? `${i.id}:${i.repeatCount}` : i.id))
    .join(",");
  useEffect(() => {
    dispatch({ type: "reset", workout });
  }, [intervalIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }

  const { state, dispatch } = ctx;

  const controls = {
    play: (workout: Workout, startIntervalId?: string) =>
      dispatch({ type: "play", workout, startIntervalId }),
    pause: () => dispatch({ type: "pause" }),
    reset: (workout: Workout) => dispatch({ type: "reset", workout }),
    jumpTo: (index: number, workout: Workout) =>
      dispatch({ type: "jumpTo", index, workout }),
  };

  return { ...ctx, ...controls };
}
