export type IntervalType = "work" | "rest" | "looper";

export type BeepSoundType = "beep" | "chime" | "bell";

export interface VoiceSettings {
  /** Announce a pre-countdown before this interval starts (seconds). 0 disables it. */
  preCountdownSeconds?: number;
  /** Announce activity name at interval start. */
  announceStart?: boolean;
  /** Announce halfway point during work intervals. */
  announceHalfway?: boolean;
  /** Announce final countdown (3, 2, 1). 0 disables. */
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

export interface LooperInterval {
  id: string;
  type: "looper";
  /** Number of times to repeat the block (everything after previous looper up to this point). */
  repeatCount: number;
}

export type Interval = WorkInterval | RestInterval | LooperInterval;

export interface Workout {
  id: string;
  name: string;
  description?: string;
  intervals: Interval[];
  /** Number of times to repeat the full circuit. 1 = one run, 2 = repeat once, etc. */
  sets?: number;
  /** Global defaults that intervals can override. */
  defaults: {
    workDurationSeconds: number;
    restDurationSeconds: number;
    preCountdownSeconds: number;
    announceHalfwayByDefault: boolean;
    finalCountdownSeconds: number;
    /** Voice enabled for new intervals. Default false. */
    voiceEnabledByDefault?: boolean;
    /** Beep enabled for new intervals. Default true. */
    beepEnabledByDefault?: boolean;
  };
}

export function createEmptyWorkout(
  partial?: Partial<Omit<Workout, "defaults">> & {
    defaults?: Partial<Workout["defaults"]>;
  },
): Workout {
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
      voiceEnabledByDefault: partial?.defaults?.voiceEnabledByDefault ?? false,
      beepEnabledByDefault: partial?.defaults?.beepEnabledByDefault ?? true,
    },
  });
}

export function totalDurationSeconds(workout: Workout): number {
  const expanded = expandIntervals(workout.intervals);
  return expanded.reduce((sum, interval) => sum + interval.durationSeconds, 0);
}

/**
 * Ensure invariants:
 * - No consecutive rest intervals.
 * - Rest intervals only appear after work (not at start or after another rest).
 * - Rest at end is allowed (user can add more work after it).
 */
export function normalizeWorkout(workout: Workout): Workout {
  // Migrate legacy loopCount to sets
  const raw = workout as Workout & { loopCount?: number };
  const migrated: Workout =
    raw.loopCount !== undefined && raw.sets === undefined
      ? { ...workout, sets: raw.loopCount }
      : workout;

  const normalized: Interval[] = [];

  for (const interval of workout.intervals) {
    if (interval.type === "looper") {
      normalized.push(interval);
      continue;
    }
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

  return { ...migrated, intervals: normalized };
}

export function addWorkIntervalAfter(
  workout: Workout,
  afterId: string | null,
  partial?: Partial<Omit<WorkInterval, "id" | "type">>,
): Workout {
  const voiceEnabled = workout.defaults.voiceEnabledByDefault ?? false;
  const beepEnabled = workout.defaults.beepEnabledByDefault ?? true;
  const newInterval: WorkInterval = {
    id: crypto.randomUUID(),
    type: "work",
    durationSeconds:
      partial?.durationSeconds ?? workout.defaults.workDurationSeconds,
    title: partial?.title ?? "",
    description: partial?.description,
    color: partial?.color ?? "#0ea5e9",
    voice: partial?.voice ?? {
      mute: !voiceEnabled,
      beep: beepEnabled,
    },
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
  durationSeconds?: number,
): Workout {
  const idx = workout.intervals.findIndex((i) => i.id === afterId);
  if (idx === -1) return workout;

  const rest: RestInterval = {
    id: crypto.randomUUID(),
    type: "rest",
    durationSeconds: durationSeconds ?? workout.defaults.restDurationSeconds,
  };

  const next = [...workout.intervals];
  next.splice(idx + 1, 0, rest);
  return normalizeWorkout({ ...workout, intervals: next });
}

export function addLooperAfter(
  workout: Workout,
  afterId: string,
  repeatCount?: number,
): Workout {
  const idx = workout.intervals.findIndex((i) => i.id === afterId);
  if (idx === -1) return workout;

  const looper: LooperInterval = {
    id: crypto.randomUUID(),
    type: "looper",
    repeatCount: repeatCount ?? 2,
  };

  const next = [...workout.intervals];
  next.splice(idx + 1, 0, looper);
  return normalizeWorkout({ ...workout, intervals: next });
}

export function addRestBetween(
  workout: Workout,
  beforeId: string,
  durationSeconds?: number,
): Workout {
  const idx = workout.intervals.findIndex((i) => i.id === beforeId);
  if (idx <= 0) return workout; // cannot add before first or if not found

  const beepEnabled = workout.defaults.beepEnabledByDefault ?? true;
  const rest: RestInterval = {
    id: crypto.randomUUID(),
    type: "rest",
    durationSeconds: durationSeconds ?? workout.defaults.restDurationSeconds,
    beep: beepEnabled,
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
  newIndex: number,
): Workout {
  const currentIndex = workout.intervals.findIndex((i) => i.id === id);
  if (currentIndex === -1) return workout;

  const clampedIndex = Math.max(
    0,
    Math.min(newIndex, workout.intervals.length - 1),
  );
  const next = [...workout.intervals];
  const [item] = next.splice(currentIndex, 1);
  next.splice(clampedIndex, 0, item);

  return normalizeWorkout({ ...workout, intervals: next });
}

/** Expand loopers into a flat sequence of work/rest intervals for playback. */
export function expandIntervals(
  intervals: Interval[],
): (WorkInterval | RestInterval)[] {
  const result: (WorkInterval | RestInterval)[] = [];
  let lastLooperIndex = -1;

  const flushBlock = (endExclusive: number) => {
    for (let j = lastLooperIndex + 1; j < endExclusive; j++) {
      const item = intervals[j];
      if (item.type === "work" || item.type === "rest") {
        result.push(item);
      }
    }
  };

  for (let i = 0; i < intervals.length; i++) {
    const item = intervals[i];
    if (item.type === "looper") {
      const block = intervals
        .slice(lastLooperIndex + 1, i)
        .filter(
          (x): x is WorkInterval | RestInterval =>
            x.type === "work" || x.type === "rest",
        );
      const n = Math.max(2, item.repeatCount);
      for (let r = 0; r < n; r++) {
        result.push(...block);
      }
      lastLooperIndex = i;
    }
  }
  flushBlock(intervals.length);
  return result;
}

/** Given a raw interval id (work, rest, or looper), return the expanded interval id to use for starting playback there. */
export function getStartIntervalIdForPlayback(
  intervals: Interval[],
  intervalId: string,
): string | undefined {
  const item = intervals.find((i) => i.id === intervalId);
  if (!item) return undefined;
  if (item.type === "work" || item.type === "rest") return item.id;
  // Looper: return the first work/rest in the block it repeats
  const idx = intervals.findIndex((i) => i.id === intervalId);
  if (idx <= 0 || intervals[idx].type !== "looper") return undefined;
  let lastLooperIndex = -1;
  for (let i = 0; i < idx; i++) {
    if (intervals[i].type === "looper") lastLooperIndex = i;
  }
  const block = intervals
    .slice(lastLooperIndex + 1, idx)
    .filter(
      (x): x is WorkInterval | RestInterval =>
        x.type === "work" || x.type === "rest",
    );
  return block[0]?.id;
}

/** For a given expanded index, return looper progress: which iteration we're in and how many remain. */
export function getLooperProgressAtExpandedIndex(
  intervals: Interval[],
  expandedIndex: number,
): Map<string, { iteration: number; total: number; remaining: number }> {
  const result = new Map<
    string,
    { iteration: number; total: number; remaining: number }
  >();
  let expandedCount = 0;
  let lastLooperIndex = -1;

  for (let i = 0; i < intervals.length; i++) {
    const item = intervals[i];
    if (item.type === "looper") {
      const block = intervals
        .slice(lastLooperIndex + 1, i)
        .filter(
          (x): x is WorkInterval | RestInterval =>
            x.type === "work" || x.type === "rest",
        );
      const n = Math.max(2, item.repeatCount);
      const blockSize = block.length;

      for (let r = 0; r < n; r++) {
        const start = expandedCount;
        const end = expandedCount + blockSize;
        if (expandedIndex >= start && expandedIndex < end) {
          result.set(item.id, {
            iteration: r + 1,
            total: n,
            remaining: n - r,
          });
          break;
        }
        expandedCount = end;
      }
      lastLooperIndex = i;
    }
  }
  return result;
}

export function findCurrentIntervalAtTime(
  workout: Workout,
  secondsFromStart: number,
): {
  interval: WorkInterval | RestInterval | null;
  index: number;
  offsetSeconds: number;
} {
  const intervals = expandIntervals(workout.intervals);
  let elapsed = 0;
  for (let index = 0; index < intervals.length; index++) {
    const interval = intervals[index];
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
