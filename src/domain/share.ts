import LZString from "lz-string";
import type { Workout } from "./workout";

export interface EncodedWorkout {
  v: 1;
  d: string;
}

export interface EncodedWorkoutBundle {
  v: 2;
  d: string; // JSON.stringify(Workout[])
}

/** Compressed bundle (v3) - keeps URL short for QR codes */
export interface EncodedWorkoutBundleCompressed {
  v: 3;
  d: string; // LZString.compressToEncodedURIComponent(JSON.stringify(Workout[]))
}

function encodeBase64Url(data: string): string {
  if (typeof window === "undefined") {
    // Node / Edge runtime
    return Buffer.from(data, "utf8").toString("base64url");
  }

  const b64 = btoa(unescape(encodeURIComponent(data)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");

  if (typeof window === "undefined") {
    return Buffer.from(normalized, "base64").toString("utf8");
  }

  const padded =
    normalized + "===".slice((normalized.length + 3) % 4); // restore padding if needed
  const decoded = atob(padded);
  return decodeURIComponent(escape(decoded));
}

export function encodeWorkout(workout: Workout): string {
  const payload: EncodedWorkout = {
    v: 1,
    d: JSON.stringify(workout),
  };
  return encodeBase64Url(JSON.stringify(payload));
}

export function decodeWorkout(encoded: string): Workout | null {
  try {
    const json = decodeBase64Url(encoded);
    const parsed = JSON.parse(json) as EncodedWorkout;
    if (parsed.v !== 1 || typeof parsed.d !== "string") {
      return null;
    }
    const workout = JSON.parse(parsed.d) as Workout;
    if (!workout || !Array.isArray(workout.intervals)) {
      return null;
    }
    return workout;
  } catch {
    return null;
  }
}

export function encodeWorkouts(workouts: Workout[]): string {
  const json = JSON.stringify(workouts);
  const compressed = LZString.compressToEncodedURIComponent(json);
  const payload: EncodedWorkoutBundleCompressed = {
    v: 3,
    d: compressed,
  };
  return encodeBase64Url(JSON.stringify(payload));
}

/** Returns single workout or array of workouts. */
export function decodeWorkoutOrBundle(encoded: string): Workout | Workout[] | null {
  try {
    const json = decodeBase64Url(encoded);
    const parsed = JSON.parse(json) as
      | EncodedWorkout
      | EncodedWorkoutBundle
      | EncodedWorkoutBundleCompressed;
    if (parsed.v === 1 && typeof parsed.d === "string") {
      const workout = JSON.parse(parsed.d) as Workout;
      if (!workout || !Array.isArray(workout.intervals)) return null;
      return workout;
    }
    if (parsed.v === 2 && typeof parsed.d === "string") {
      const arr = JSON.parse(parsed.d) as unknown;
      if (!Array.isArray(arr)) return null;
      const valid = arr.filter((w): w is Workout => w && typeof w === "object" && Array.isArray((w as Workout).intervals));
      return valid.length > 0 ? valid : null;
    }
    if (parsed.v === 3 && typeof parsed.d === "string") {
      const decompressed = LZString.decompressFromEncodedURIComponent(parsed.d);
      if (!decompressed) return null;
      const arr = JSON.parse(decompressed) as unknown;
      if (!Array.isArray(arr)) return null;
      const valid = arr.filter((w): w is Workout => w && typeof w === "object" && Array.isArray((w as Workout).intervals));
      return valid.length > 0 ? valid : null;
    }
    return null;
  } catch {
    return null;
  }
}

