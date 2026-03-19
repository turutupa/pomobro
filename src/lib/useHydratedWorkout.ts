"use client";

import { useEffect } from "react";
import { useWorkout } from "@/state/workout-context";
import { decodeWorkout, encodeWorkout } from "@/domain/share";

const STORAGE_KEY = "pomobro:v1:workout";

export function useHydratedWorkout() {
  const { state, setWorkout } = useWorkout();

  // Hydrate from localStorage or URL on first client render
  useEffect(() => {
    if (typeof window === "undefined") return;

    const urlEncoded = new URLSearchParams(window.location.search).get("data");
    if (urlEncoded) {
      const decoded = decodeWorkout(urlEncoded);
      if (decoded) {
        setWorkout(decoded);
        return;
      }
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const decoded = decodeWorkout(stored);
      if (decoded) {
        setWorkout(decoded);
      }
    }
  }, [setWorkout]);

  // Persist whenever workout changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (state.workout.intervals.length === 0) return;
    const encoded = encodeWorkout(state.workout);
    window.localStorage.setItem(STORAGE_KEY, encoded);
  }, [state.workout]);

  return null;
}
