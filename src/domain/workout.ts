export type IntervalType = "work" | "rest" | "looper" | "prep";

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
  /** Number of times to repeat the block. */
  repeatCount: number;
  /** IDs of work/rest intervals in the block (in order). When absent, falls back to legacy: everything since previous looper. */
  wrapIntervalIds?: string[];
}

export interface PrepInterval extends BaseInterval {
  type: "prep";
  /** Play beep: one per second in last 3 sec, double beep when interval ends. */
  beep?: boolean;
  /** Sound for beep. */
  beepSound?: BeepSoundType;
  /** Voice settings (mute for announcements). */
  voice?: VoiceSettings;
}

export type Interval = WorkInterval | RestInterval | LooperInterval | PrepInterval;

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
  const oneCircuit = expanded.reduce(
    (sum, interval) => sum + interval.durationSeconds,
    0,
  );
  const sets = Math.max(1, workout.sets ?? 1);
  return oneCircuit * sets;
}

/**
 * Ensure invariants:
 * - Filter out intervals with durationSeconds <= 0.
 * - Allow any ordering of work/rest (consecutive rests, rest at start, etc.).
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
    if (interval.type === "prep" || interval.type === "work" || interval.type === "rest") {
      if (interval.durationSeconds <= 0) continue;
      normalized.push(interval);
    }
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
  afterId: string | null,
  durationSeconds?: number,
): Workout {
  const beepEnabled = workout.defaults.beepEnabledByDefault ?? true;
  const rest: RestInterval = {
    id: crypto.randomUUID(),
    type: "rest",
    durationSeconds: durationSeconds ?? workout.defaults.restDurationSeconds,
    beep: beepEnabled,
  };

  if (!afterId) {
    const next = [rest, ...workout.intervals];
    return normalizeWorkout({ ...workout, intervals: next });
  }

  const idx = workout.intervals.findIndex((i) => i.id === afterId);
  if (idx === -1) return workout;

  const next = [...workout.intervals];
  next.splice(idx + 1, 0, rest);
  return normalizeWorkout({ ...workout, intervals: next });
}

export function addPrepAfter(
  workout: Workout,
  afterId: string | null,
  durationSeconds?: number,
): Workout {
  const beepEnabled = workout.defaults.beepEnabledByDefault ?? true;
  const voiceEnabled = workout.defaults.voiceEnabledByDefault ?? false;
  const prep: PrepInterval = {
    id: crypto.randomUUID(),
    type: "prep",
    durationSeconds:
      durationSeconds ?? workout.defaults.preCountdownSeconds ?? 7,
    beep: beepEnabled,
    voice: { mute: !voiceEnabled },
  };

  if (!afterId) {
    const next = [prep, ...workout.intervals];
    return normalizeWorkout({ ...workout, intervals: next });
  }

  const idx = workout.intervals.findIndex((i) => i.id === afterId);
  if (idx === -1) return workout;

  const next = [...workout.intervals];
  next.splice(idx + 1, 0, prep);
  return normalizeWorkout({ ...workout, intervals: next });
}

export function addLooperAfter(
  workout: Workout,
  afterId: string | null,
  repeatCount?: number,
): Workout {
  const looper: LooperInterval = {
    id: crypto.randomUUID(),
    type: "looper",
    repeatCount: repeatCount ?? 2,
    wrapIntervalIds: [],
  };

  if (!afterId) {
    const next = [looper, ...workout.intervals];
    return normalizeWorkout({ ...workout, intervals: next });
  }

  const idx = workout.intervals.findIndex((i) => i.id === afterId);
  if (idx === -1) return workout;

  const before = workout.intervals[idx];
  looper.wrapIntervalIds =
    before.type === "work" || before.type === "rest" ? [before.id] : [];

  const next = [...workout.intervals];
  next.splice(idx + 1, 0, looper);
  return normalizeWorkout({ ...workout, intervals: next });
}

/** Get the block of work/rest intervals for a looper. Uses wrapIntervalIds when present, else legacy (since previous looper). */
export function getLooperBlock(
  intervals: Interval[],
  looper: LooperInterval,
): (WorkInterval | RestInterval)[] {
  if (looper.wrapIntervalIds && looper.wrapIntervalIds.length > 0) {
    const idSet = new Set(looper.wrapIntervalIds);
    return intervals.filter(
      (x): x is WorkInterval | RestInterval =>
        (x.type === "work" || x.type === "rest") && idSet.has(x.id),
    );
  }
  const idx = intervals.findIndex((i) => i.id === looper.id);
  if (idx <= 0) return [];
  let lastLooperIndex = -1;
  for (let i = 0; i < idx; i++) {
    if (intervals[i].type === "looper") lastLooperIndex = i;
  }
  return intervals
    .slice(lastLooperIndex + 1, idx)
    .filter(
      (x): x is WorkInterval | RestInterval =>
        x.type === "work" || x.type === "rest",
    );
}

/** Get the index of the previous looper, or -1 if none. */
export function getPrevLooperIndex(
  intervals: Interval[],
  looperIndex: number,
): number {
  for (let i = looperIndex - 1; i >= 0; i--) {
    if (intervals[i].type === "looper") return i;
  }
  return -1;
}

/** Get work/rest IDs that a looper can extend its block to (from previous looper + 1 up to card before this looper). */
export function getLooperExtendableIds(
  intervals: Interval[],
  looperId: string,
): string[] {
  const idx = intervals.findIndex((i) => i.id === looperId);
  if (idx <= 0) return [];
  const prevLooper = getPrevLooperIndex(intervals, idx);
  const start = prevLooper + 1;
  return intervals
    .slice(start, idx)
    .filter(
      (x): x is WorkInterval | RestInterval =>
        x.type === "work" || x.type === "rest",
    )
    .map((x) => x.id);
}

export function updateLooperBlock(
  workout: Workout,
  looperId: string,
  wrapIntervalIds: string[],
): Workout {
  const valid = getLooperExtendableIds(workout.intervals, looperId);
  const validSet = new Set(valid);
  const filtered = wrapIntervalIds.filter((id) => validSet.has(id));
  if (filtered.length === 0) return workout;

  return {
    ...workout,
    intervals: workout.intervals.map((interval) =>
      interval.type === "looper" && interval.id === looperId
        ? { ...interval, wrapIntervalIds: filtered }
        : interval,
    ),
  };
}

/** Return the looper that has this work/rest interval in its block, or null. */
export function getLooperForInterval(
  intervals: Interval[],
  intervalId: string,
): LooperInterval | null {
  for (const item of intervals) {
    if (item.type !== "looper") continue;
    const block = getLooperBlock(intervals, item);
    if (block.some((x) => x.id === intervalId)) return item;
  }
  return null;
}

/** Return the looper if this interval is the topmost in that looper's block. */
export function getLooperIfTopOfBlock(
  intervals: Interval[],
  intervalId: string,
): LooperInterval | null {
  for (const item of intervals) {
    if (item.type !== "looper") continue;
    const block = getLooperBlock(intervals, item);
    if (block[0]?.id === intervalId) return item;
  }
  return null;
}

export function addRestBetween(
  workout: Workout,
  beforeId: string,
  durationSeconds?: number,
): Workout {
  const idx = workout.intervals.findIndex((i) => i.id === beforeId);
  if (idx < 0) return workout; // not found

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

/** Expand loopers into a flat sequence of work/rest/prep intervals for playback. */
export function expandIntervals(
  intervals: Interval[],
): (WorkInterval | RestInterval | PrepInterval)[] {
  const result: (WorkInterval | RestInterval | PrepInterval)[] = [];
  let lastLooperIndex = -1;

  for (let i = 0; i < intervals.length; i++) {
    const item = intervals[i];
    if (item.type === "looper") {
      const block = getLooperBlock(intervals, item);
      const blockIds = new Set(block.map((x) => x.id));
      // Push work/rest/prep before this looper that are NOT in the block (e.g. prep)
      for (let j = lastLooperIndex + 1; j < i; j++) {
        const x = intervals[j];
        if (
          (x.type === "work" || x.type === "rest" || x.type === "prep") &&
          !blockIds.has(x.id)
        ) {
          result.push(x);
        }
      }
      const n = Math.max(2, item.repeatCount);
      for (let r = 0; r < n; r++) {
        result.push(...block);
      }
      lastLooperIndex = i;
    }
  }
  // Push remaining items after the last looper
  for (let j = lastLooperIndex + 1; j < intervals.length; j++) {
    const x = intervals[j];
    if (x.type === "work" || x.type === "rest" || x.type === "prep") {
      result.push(x);
    }
  }
  return result;
}

/** Given a raw interval id (work, rest, prep, or looper), return the expanded interval id to use for starting playback there. */
export function getStartIntervalIdForPlayback(
  intervals: Interval[],
  intervalId: string,
): string | undefined {
  const item = intervals.find((i) => i.id === intervalId);
  if (!item) return undefined;
  if (item.type === "work" || item.type === "rest" || item.type === "prep")
    return item.id;
  if (item.type !== "looper") return undefined;
  const block = getLooperBlock(intervals, item);
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
      const block = getLooperBlock(intervals, item);
      const blockIds = new Set(block.map((x) => x.id));
      const n = Math.max(2, item.repeatCount);
      const blockSize = block.length;

      // Count items before this looper that are NOT in the block (mirrors expandIntervals)
      for (let j = lastLooperIndex + 1; j < i; j++) {
        const x = intervals[j];
        if (
          (x.type === "work" || x.type === "rest" || x.type === "prep") &&
          !blockIds.has(x.id)
        ) {
          expandedCount++;
        }
      }

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
  interval: WorkInterval | RestInterval | PrepInterval | null;
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
