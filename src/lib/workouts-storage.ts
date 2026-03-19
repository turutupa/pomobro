import type { Workout } from "@/domain/workout";
import { decodeWorkout, encodeWorkout } from "@/domain/share";

const STORAGE_KEY = "pomobro:v1:workouts";
const LEGACY_KEY = "pomobro:v1:workout";

export function loadWorkouts(): Workout[] {
  if (typeof window === "undefined") return [];
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Migrate from legacy single-workout storage
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        const decoded = decodeWorkout(legacy);
        if (decoded && decoded.intervals?.length) {
          const list = [decoded];
          saveWorkouts(list);
          localStorage.removeItem(LEGACY_KEY);
          return list;
        }
      }
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (w): w is Workout =>
        w && typeof w === "object" && Array.isArray((w as Workout).intervals),
    );
  } catch {
    return [];
  }
}

export function saveWorkouts(workouts: Workout[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
  } catch {
    // ignore
  }
}

export function addWorkout(workout: Workout): Workout[] {
  const list = loadWorkouts();
  const filtered = list.filter((w) => w.id !== workout.id);
  const next = [...filtered, workout];
  saveWorkouts(next);
  return next;
}

export function updateWorkout(id: string, patch: Partial<Workout>): Workout[] {
  const list = loadWorkouts();
  const next = list.map((w) => (w.id === id ? { ...w, ...patch } : w));
  saveWorkouts(next);
  return next;
}

export function deleteWorkout(id: string): Workout[] {
  const list = loadWorkouts().filter((w) => w.id !== id);
  saveWorkouts(list);
  return list;
}
