export type IntervalType = "work" | "rest";

export type BeepSoundType = "beep" | "chime" | "bell";

export interface VoiceSettings {
  /** Announce a pre-countdown before this interval starts (seconds). 0 disables it. */
  preCountdownSeconds?: number;
  /** Announce halfway point during work intervals. */
  announceHalfway?: boolean;
  /** Announce a final countdown (e.g. last 10 seconds). 0 disables it. */
  finalCountdownSeconds?: number;
  /** Disable voice just for this interval, regardless of global setting. */
  mute?: boolean;
  /** Play beep: one per second in last 3 sec, double beep when interval ends. */
  beep?: boolean;
  /** Sound for beep. */
  beepSound?: BeepSoundType;
}

export interface BaseInterval {
  id: string;
  type: IntervalType;
  durationSeconds: number;
}

export interface WorkInterval extends BaseInterval {
  type: "work";
  title: string;
  description?: string;
  /** Hex color for the card (e.g. #3b82f6). Defaults to sky-500. */
  color?: string;
  voice?: VoiceSettings;
}

export interface RestInterval extends BaseInterval {
  type: "rest";
  /** Hex color for the card (e.g. #10b981). Defaults to emerald-500. */
  color?: string;
  /** Play beep: one per second in last 3 sec, double beep when interval ends. */
  beep?: boolean;
  /** Sound for beep. */
  beepSound?: BeepSoundType;
  /** Voice settings (mute for announcements). */
  voice?: VoiceSettings;
}

export type Interval = WorkInterval | RestInterval;

export interface Workout {
  id: string;
  name: string;
  description?: string;
  intervals: Interval[];
  /** Global defaults that intervals can override. */
  defaults: {
    workDurationSeconds: number;
    restDurationSeconds: number;
    preCountdownSeconds: number;
    announceHalfwayByDefault: boolean;
    finalCountdownSeconds: number;
  };
}

export function createEmptyWorkout(partial?: Partial<Workout>): Workout {
  return normalizeWorkout({
    id: partial?.id ?? crypto.randomUUID(),
    name: partial?.name ?? "New workout",
    description: partial?.description,
    intervals: partial?.intervals ?? [],
    defaults: {
      workDurationSeconds: partial?.defaults?.workDurationSeconds ?? 50,
      restDurationSeconds: partial?.defaults?.restDurationSeconds ?? 15,
      preCountdownSeconds: partial?.defaults?.preCountdownSeconds ?? 5,
      announceHalfwayByDefault:
        partial?.defaults?.announceHalfwayByDefault ?? true,
      finalCountdownSeconds: partial?.defaults?.finalCountdownSeconds ?? 10,
    },
  });
}

export function totalDurationSeconds(workout: Workout): number {
  return workout.intervals.reduce(
    (sum, interval) => sum + interval.durationSeconds,
    0
  );
}

/**
 * Ensure invariants:
 * - No consecutive rest intervals.
 * - Rest intervals only appear after work (not at start or after another rest).
 * - Rest at end is allowed (user can add more work after it).
 */
export function normalizeWorkout(workout: Workout): Workout {
  const normalized: Interval[] = [];

  for (const interval of workout.intervals) {
    if (interval.durationSeconds <= 0) continue;

    if (interval.type === "rest") {
      const last = normalized[normalized.length - 1];
      if (!last || last.type !== "work") {
        // Skip rest at start or after another rest.
        continue;
      }
      normalized.push(interval);
      continue;
    }

    normalized.push(interval);
  }

  return { ...workout, intervals: normalized };
}

export function addWorkIntervalAfter(
  workout: Workout,
  afterId: string | null,
  partial?: Partial<Omit<WorkInterval, "id" | "type">>
): Workout {
  const newInterval: WorkInterval = {
    id: crypto.randomUUID(),
    type: "work",
    durationSeconds:
      partial?.durationSeconds ?? workout.defaults.workDurationSeconds,
    title: partial?.title ?? "",
    description: partial?.description,
    color: partial?.color ?? "#0ea5e9",
    voice: partial?.voice,
  };

  if (!afterId) {
    return normalizeWorkout({
      ...workout,
      intervals: [newInterval, ...workout.intervals],
    });
  }

  const index = workout.intervals.findIndex((i) => i.id === afterId);
  if (index === -1) {
    return normalizeWorkout({
      ...workout,
      intervals: [...workout.intervals, newInterval],
    });
  }

  const next = [...workout.intervals];
  next.splice(index + 1, 0, newInterval);
  return normalizeWorkout({ ...workout, intervals: next });
}

export function addRestAfter(
  workout: Workout,
  afterId: string,
  durationSeconds?: number
): Workout {
  const idx = workout.intervals.findIndex((i) => i.id === afterId);
  if (idx === -1) return workout;
  const after = workout.intervals[idx];
  if (after.type !== "work") return workout;

  const rest: RestInterval = {
    id: crypto.randomUUID(),
    type: "rest",
    durationSeconds: durationSeconds ?? workout.defaults.restDurationSeconds,
  };

  const next = [...workout.intervals];
  next.splice(idx + 1, 0, rest);
  return normalizeWorkout({ ...workout, intervals: next });
}

export function addRestBetween(
  workout: Workout,
  beforeId: string,
  durationSeconds?: number
): Workout {
  const idx = workout.intervals.findIndex((i) => i.id === beforeId);
  if (idx <= 0) return workout; // cannot add before first or if not found

  const prev = workout.intervals[idx - 1];
  const current = workout.intervals[idx];

  if (prev.type !== "work" || current.type !== "work") return workout;

  const existingRest = workout.intervals[idx - 1] as Interval;
  if (existingRest.type === "rest") {
    // There's already a rest here; keep as-is.
    return workout;
  }

  const rest: RestInterval = {
    id: crypto.randomUUID(),
    type: "rest",
    durationSeconds: durationSeconds ?? workout.defaults.restDurationSeconds,
  };

  const next = [...workout.intervals];
  next.splice(idx, 0, rest);
  return normalizeWorkout({ ...workout, intervals: next });
}

export function deleteInterval(workout: Workout, id: string): Workout {
  const next = workout.intervals.filter((i) => i.id !== id);
  return normalizeWorkout({ ...workout, intervals: next });
}

export function moveInterval(
  workout: Workout,
  id: string,
  newIndex: number
): Workout {
  const currentIndex = workout.intervals.findIndex((i) => i.id === id);
  if (currentIndex === -1) return workout;

  const clampedIndex = Math.max(0, Math.min(newIndex, workout.intervals.length - 1));
  const next = [...workout.intervals];
  const [item] = next.splice(currentIndex, 1);
  next.splice(clampedIndex, 0, item);

  return normalizeWorkout({ ...workout, intervals: next });
}

export function findCurrentIntervalAtTime(
  workout: Workout,
  secondsFromStart: number
): { interval: Interval | null; index: number; offsetSeconds: number } {
  let elapsed = 0;
  for (let index = 0; index < workout.intervals.length; index++) {
    const interval = workout.intervals[index];
    const start = elapsed;
    const end = elapsed + interval.durationSeconds;
    if (secondsFromStart >= start && secondsFromStart < end) {
      return {
        interval,
        index,
        offsetSeconds: secondsFromStart - start,
      };
    }
    elapsed = end;
  }

  return { interval: null, index: -1, offsetSeconds: 0 };
}

