import { describe, it, expect } from "vitest";
import {
  type Workout,
  type WorkInterval,
  type RestInterval,
  type LooperInterval,
  type PrepInterval,
  createEmptyWorkout,
  normalizeWorkout,
  totalDurationSeconds,
  addWorkIntervalAfter,
  addRestAfter,
  addPrepAfter,
  addLooperAfter,
  addRestBetween,
  deleteInterval,
  moveInterval,
  getLooperBlock,
  getPrevLooperIndex,
  getLooperExtendableIds,
  updateLooperBlock,
  getLooperBelowExtendableIds,
  updateLooperBlockBelow,
  getLooperBlockBelow,
  getLooperForInterval,
  getLooperIfTopOfBlock,
  expandIntervals,
  getStartIntervalIdForPlayback,
  getLooperProgressAtExpandedIndex,
  findCurrentIntervalAtTime,
} from "./workout";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULTS: Workout["defaults"] = {
  workDurationSeconds: 50,
  restDurationSeconds: 15,
  preCountdownSeconds: 5,
  announceHalfwayByDefault: true,
  finalCountdownSeconds: 10,
};

function mkWorkout(
  intervals: Workout["intervals"],
  overrides?: Partial<Workout>,
): Workout {
  return normalizeWorkout({
    id: overrides?.id ?? "w1",
    name: overrides?.name ?? "Test",
    intervals,
    defaults: { ...DEFAULTS, ...overrides?.defaults },
    ...overrides,
  });
}

function work(id: string, duration = 10, title?: string): WorkInterval {
  return { id, type: "work", durationSeconds: duration, title: title ?? id };
}

function rest(id: string, duration = 5): RestInterval {
  return { id, type: "rest", durationSeconds: duration };
}

function prep(id: string, duration = 5): PrepInterval {
  return { id, type: "prep", durationSeconds: duration };
}

function looper(
  id: string,
  repeatCount: number,
  wrapIntervalIds: string[],
  wrapBelowIntervalIds?: string[],
): LooperInterval {
  return {
    id,
    type: "looper",
    repeatCount,
    wrapIntervalIds,
    ...(wrapBelowIntervalIds ? { wrapBelowIntervalIds } : {}),
  };
}

// Legacy helper for backwards-compat tests
function makeWorkout(intervalTypes: ("work" | "rest")[]): Workout {
  return normalizeWorkout({
    id: "w1",
    name: "Test",
    intervals: intervalTypes.map((t, idx) => ({
      id: `i${idx}`,
      type: t,
      durationSeconds: 10,
      ...(t === "work" ? { title: `w${idx}` } : {}),
    })) as any,
    defaults: DEFAULTS,
  });
}

describe("workout invariants", () => {
  it("allows consecutive rests via normalize", () => {
    const workout = makeWorkout(["work", "rest", "rest", "work"]);
    expect(workout.intervals.map((i) => i.type)).toEqual([
      "work",
      "rest",
      "rest",
      "work",
    ]);
  });

  it("allows leading and trailing rests", () => {
    const workout = makeWorkout(["rest", "work", "rest"]);
    expect(workout.intervals.map((i) => i.type)).toEqual([
      "rest",
      "work",
      "rest",
    ]);
  });

  it("addWorkIntervalAfter inserts work correctly", () => {
    const base = makeWorkout(["work", "rest", "work"]);
    const next = addWorkIntervalAfter(base, base.intervals[0].id);
    const types = next.intervals.map((i) => i.type);
    expect(types).toEqual(["work", "work", "rest", "work"]);
  });

  it("addRestBetween inserts rest before given card", () => {
    const base = makeWorkout(["work", "work"]);
    const next = addRestBetween(base, base.intervals[1].id);
    expect(next.intervals.map((i) => i.type)).toEqual(["work", "rest", "work"]);
  });

  it("deleteInterval removes interval without collapsing", () => {
    const base = makeWorkout(["work", "rest", "work"]);
    const secondWorkId = base.intervals[2].id;
    const afterDelete = deleteInterval(base, secondWorkId);
    expect(afterDelete.intervals.map((i) => i.type)).toEqual(["work", "rest"]);
  });
});

describe("expandIntervals and looper", () => {
  it("looper with 2 cards and repeat 2 produces correct sequence", () => {
    const workout = normalizeWorkout({
      id: "w1",
      name: "Test",
      intervals: [
        { id: "a", type: "work", durationSeconds: 10, title: "A" },
        { id: "b", type: "rest", durationSeconds: 5 },
        {
          id: "looper",
          type: "looper",
          repeatCount: 2,
          wrapIntervalIds: ["a", "b"],
        },
      ] as any,
      defaults: {
        workDurationSeconds: 50,
        restDurationSeconds: 15,
        preCountdownSeconds: 5,
        announceHalfwayByDefault: true,
        finalCountdownSeconds: 10,
      },
    });
    const expanded = expandIntervals(workout.intervals);
    expect(expanded.length).toBe(4); // A, B, A, B (2 iterations)
    expect(expanded.map((i) => i.id)).toEqual(["a", "b", "a", "b"]);
  });

  it("looper progress shows iteration 1 on first pass, iteration 2 on second pass", () => {
    const workout = normalizeWorkout({
      id: "w1",
      name: "Test",
      intervals: [
        { id: "a", type: "work", durationSeconds: 10, title: "A" },
        { id: "b", type: "rest", durationSeconds: 5 },
        {
          id: "looper",
          type: "looper",
          repeatCount: 2,
          wrapIntervalIds: ["a", "b"],
        },
      ] as any,
      defaults: {
        workDurationSeconds: 50,
        restDurationSeconds: 15,
        preCountdownSeconds: 5,
        announceHalfwayByDefault: true,
        finalCountdownSeconds: 10,
      },
    });
    const map0 = getLooperProgressAtExpandedIndex(workout.intervals, 0);
    const map1 = getLooperProgressAtExpandedIndex(workout.intervals, 1);
    const map2 = getLooperProgressAtExpandedIndex(workout.intervals, 2);
    const map3 = getLooperProgressAtExpandedIndex(workout.intervals, 3);
    expect(map0.get("looper")).toEqual({
      iteration: 1,
      total: 2,
      remaining: 2,
    });
    expect(map1.get("looper")).toEqual({
      iteration: 1,
      total: 2,
      remaining: 2,
    });
    expect(map2.get("looper")).toEqual({
      iteration: 2,
      total: 2,
      remaining: 1,
    });
    expect(map3.get("looper")).toEqual({
      iteration: 2,
      total: 2,
      remaining: 1,
    });
  });

  it("total duration matches expanded sequence", () => {
    const workout = normalizeWorkout({
      id: "w1",
      name: "Test",
      intervals: [
        { id: "a", type: "work", durationSeconds: 10, title: "A" },
        { id: "b", type: "rest", durationSeconds: 5 },
        {
          id: "looper",
          type: "looper",
          repeatCount: 2,
          wrapIntervalIds: ["a", "b"],
        },
      ] as any,
      defaults: {
        workDurationSeconds: 50,
        restDurationSeconds: 15,
        preCountdownSeconds: 5,
        announceHalfwayByDefault: true,
        finalCountdownSeconds: 10,
      },
    });
    const total = totalDurationSeconds(workout);
    expect(total).toBe(30); // 10+5+10+5 = 30
  });

  it("prep before looper expands correctly", () => {
    const workout = normalizeWorkout({
      id: "w1",
      name: "Test",
      intervals: [
        { id: "prep", type: "prep", durationSeconds: 5 },
        { id: "a", type: "work", durationSeconds: 10, title: "A" },
        { id: "b", type: "rest", durationSeconds: 5 },
        {
          id: "looper",
          type: "looper",
          repeatCount: 2,
          wrapIntervalIds: ["a", "b"],
        },
      ] as any,
      defaults: {
        workDurationSeconds: 50,
        restDurationSeconds: 15,
        preCountdownSeconds: 5,
        announceHalfwayByDefault: true,
        finalCountdownSeconds: 10,
      },
    });
    const expanded = expandIntervals(workout.intervals);
    expect(expanded.map((i) => i.id)).toEqual(["prep", "a", "b", "a", "b"]);
    expect(totalDurationSeconds(workout)).toBe(35); // 5+10+5+10+5
  });
});

// ===========================================================================
// NEW COMPREHENSIVE TESTS
// ===========================================================================

// ---------------------------------------------------------------------------
// createEmptyWorkout
// ---------------------------------------------------------------------------

describe("createEmptyWorkout", () => {
  it("creates a workout with default values", () => {
    const w = createEmptyWorkout();
    expect(w.name).toBe("New workout");
    expect(w.intervals).toEqual([]);
    expect(w.defaults.workDurationSeconds).toBe(50);
    expect(w.defaults.restDurationSeconds).toBe(15);
    expect(w.defaults.voiceEnabledByDefault).toBe(true);
    expect(w.defaults.beepEnabledByDefault).toBe(true);
    expect(w.id).toBeTruthy();
  });

  it("accepts partial overrides", () => {
    const w = createEmptyWorkout({
      name: "HIIT",
      defaults: { workDurationSeconds: 30, restDurationSeconds: 10 },
    });
    expect(w.name).toBe("HIIT");
    expect(w.defaults.workDurationSeconds).toBe(30);
    expect(w.defaults.restDurationSeconds).toBe(10);
    expect(w.defaults.preCountdownSeconds).toBe(5);
  });

  it("respects voice/beep defaults", () => {
    const w = createEmptyWorkout({
      defaults: { voiceEnabledByDefault: false, beepEnabledByDefault: false },
    });
    expect(w.defaults.voiceEnabledByDefault).toBe(false);
    expect(w.defaults.beepEnabledByDefault).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// normalizeWorkout (extended)
// ---------------------------------------------------------------------------

describe("normalizeWorkout (extended)", () => {
  it("filters out intervals with durationSeconds <= 0", () => {
    const w = mkWorkout([work("a", 10), work("b", 0), rest("c", -1), work("d", 5)]);
    expect(w.intervals.map((i) => i.id)).toEqual(["a", "d"]);
  });

  it("preserves loopers regardless of duration", () => {
    const w = mkWorkout([work("a", 10), looper("L", 2, ["a"])]);
    expect(w.intervals.map((i) => i.type)).toEqual(["work", "looper"]);
  });

  it("migrates legacy loopCount to sets", () => {
    const raw = { id: "w1", name: "Test", intervals: [work("a")], defaults: DEFAULTS, loopCount: 3 } as any;
    const w = normalizeWorkout(raw);
    expect(w.sets).toBe(3);
  });

  it("does not overwrite sets with loopCount if sets exists", () => {
    const raw = { id: "w1", name: "Test", intervals: [], defaults: DEFAULTS, sets: 5, loopCount: 2 } as any;
    const w = normalizeWorkout(raw);
    expect(w.sets).toBe(5);
  });

  it("keeps prep intervals with positive duration", () => {
    const w = mkWorkout([prep("p1", 5), work("a")]);
    expect(w.intervals.map((i) => i.type)).toEqual(["prep", "work"]);
  });
});

// ---------------------------------------------------------------------------
// totalDurationSeconds (extended)
// ---------------------------------------------------------------------------

describe("totalDurationSeconds (extended)", () => {
  it("sums durations for a flat list", () => {
    const w = mkWorkout([work("a", 30), rest("b", 10), work("c", 20)]);
    expect(totalDurationSeconds(w)).toBe(60);
  });

  it("accounts for sets multiplier", () => {
    const w = mkWorkout([work("a", 10)], { sets: 3 });
    expect(totalDurationSeconds(w)).toBe(30);
  });

  it("treats sets < 1 as 1", () => {
    const w = mkWorkout([work("a", 10)], { sets: 0 });
    expect(totalDurationSeconds(w)).toBe(10);
  });

  it("returns 0 for empty workout", () => {
    expect(totalDurationSeconds(mkWorkout([]))).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// addWorkIntervalAfter (extended)
// ---------------------------------------------------------------------------

describe("addWorkIntervalAfter (extended)", () => {
  it("inserts at beginning when afterId is null", () => {
    const base = mkWorkout([work("a")]);
    const next = addWorkIntervalAfter(base, null);
    expect(next.intervals[0].type).toBe("work");
    expect(next.intervals[0].id).not.toBe("a");
    expect(next.intervals).toHaveLength(2);
  });

  it("appends when afterId not found", () => {
    const base = mkWorkout([work("a")]);
    const next = addWorkIntervalAfter(base, "nonexistent");
    expect(next.intervals).toHaveLength(2);
    expect(next.intervals[1].type).toBe("work");
  });

  it("uses workout defaults for duration", () => {
    const base = mkWorkout([work("a")], { defaults: { ...DEFAULTS, workDurationSeconds: 42 } });
    const next = addWorkIntervalAfter(base, null);
    expect(next.intervals[0].durationSeconds).toBe(42);
  });

  it("accepts partial overrides", () => {
    const base = mkWorkout([work("a")]);
    const next = addWorkIntervalAfter(base, "a", { title: "Custom", durationSeconds: 99, color: "#ff0000" });
    const added = next.intervals[1] as WorkInterval;
    expect(added.title).toBe("Custom");
    expect(added.durationSeconds).toBe(99);
    expect(added.color).toBe("#ff0000");
  });

  it("sets voice mute based on voiceEnabledByDefault", () => {
    const base = mkWorkout([work("a")], { defaults: { ...DEFAULTS, voiceEnabledByDefault: false } });
    const next = addWorkIntervalAfter(base, null);
    expect((next.intervals[0] as WorkInterval).voice?.mute).toBe(true);
  });

  it("sets beep based on beepEnabledByDefault", () => {
    const base = mkWorkout([work("a")], { defaults: { ...DEFAULTS, beepEnabledByDefault: false } });
    const next = addWorkIntervalAfter(base, null);
    expect((next.intervals[0] as WorkInterval).voice?.beep).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// addRestAfter
// ---------------------------------------------------------------------------

describe("addRestAfter", () => {
  it("inserts rest at beginning when afterId is null", () => {
    const base = mkWorkout([work("a")]);
    const next = addRestAfter(base, null);
    expect(next.intervals[0].type).toBe("rest");
    expect(next.intervals).toHaveLength(2);
  });

  it("inserts rest after specified interval", () => {
    const base = mkWorkout([work("a"), work("b")]);
    const next = addRestAfter(base, "a");
    expect(next.intervals.map((i) => i.type)).toEqual(["work", "rest", "work"]);
  });

  it("returns unchanged workout when afterId not found", () => {
    const base = mkWorkout([work("a")]);
    const next = addRestAfter(base, "nonexistent");
    expect(next.intervals).toHaveLength(1);
  });

  it("uses default rest duration", () => {
    const base = mkWorkout([work("a")], { defaults: { ...DEFAULTS, restDurationSeconds: 20 } });
    const next = addRestAfter(base, null);
    expect(next.intervals[0].durationSeconds).toBe(20);
  });

  it("accepts custom duration", () => {
    const base = mkWorkout([work("a")]);
    const next = addRestAfter(base, "a", 99);
    expect(next.intervals[1].durationSeconds).toBe(99);
  });
});

// ---------------------------------------------------------------------------
// addPrepAfter
// ---------------------------------------------------------------------------

describe("addPrepAfter", () => {
  it("inserts prep at beginning when afterId is null", () => {
    const base = mkWorkout([work("a")]);
    const next = addPrepAfter(base, null);
    expect(next.intervals[0].type).toBe("prep");
    expect(next.intervals).toHaveLength(2);
  });

  it("inserts prep after specified interval", () => {
    const base = mkWorkout([work("a"), work("b")]);
    const next = addPrepAfter(base, "a");
    expect(next.intervals.map((i) => i.type)).toEqual(["work", "prep", "work"]);
  });

  it("returns unchanged workout when afterId not found", () => {
    const base = mkWorkout([work("a")]);
    const next = addPrepAfter(base, "nonexistent");
    expect(next.intervals).toHaveLength(1);
  });

  it("uses preCountdownSeconds as default duration", () => {
    const base = mkWorkout([work("a")], { defaults: { ...DEFAULTS, preCountdownSeconds: 7 } });
    const next = addPrepAfter(base, null);
    expect(next.intervals[0].durationSeconds).toBe(7);
  });

  it("accepts custom duration", () => {
    const base = mkWorkout([work("a")]);
    const next = addPrepAfter(base, "a", 12);
    expect(next.intervals[1].durationSeconds).toBe(12);
  });

  it("sets voice mute based on voiceEnabledByDefault", () => {
    const base = mkWorkout([work("a")], { defaults: { ...DEFAULTS, voiceEnabledByDefault: true } });
    const next = addPrepAfter(base, null);
    expect((next.intervals[0] as PrepInterval).voice?.mute).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// addLooperAfter
// ---------------------------------------------------------------------------

describe("addLooperAfter", () => {
  it("inserts looper at beginning when afterId is null", () => {
    const base = mkWorkout([work("a")]);
    const next = addLooperAfter(base, null);
    expect(next.intervals[0].type).toBe("looper");
    expect(next.intervals).toHaveLength(2);
  });

  it("inserts looper after specified interval and wraps it", () => {
    const base = mkWorkout([work("a"), work("b")]);
    const next = addLooperAfter(base, "a");
    expect(next.intervals.map((i) => i.type)).toEqual(["work", "looper", "work"]);
    expect((next.intervals[1] as LooperInterval).wrapIntervalIds).toEqual(["a"]);
  });

  it("returns unchanged workout when afterId not found", () => {
    const base = mkWorkout([work("a")]);
    const next = addLooperAfter(base, "nonexistent");
    expect(next.intervals).toHaveLength(1);
  });

  it("uses default repeatCount of 2", () => {
    const base = mkWorkout([work("a")]);
    const next = addLooperAfter(base, "a");
    expect((next.intervals[1] as LooperInterval).repeatCount).toBe(2);
  });

  it("accepts custom repeatCount", () => {
    const base = mkWorkout([work("a")]);
    const next = addLooperAfter(base, "a", 5);
    expect((next.intervals[1] as LooperInterval).repeatCount).toBe(5);
  });

  it("does not wrap when previous interval is a looper", () => {
    const base = mkWorkout([work("a"), looper("L1", 2, ["a"])]);
    const next = addLooperAfter(base, "L1");
    expect((next.intervals[2] as LooperInterval).wrapIntervalIds).toEqual([]);
  });

  it("wraps rest interval when inserted after rest", () => {
    const base = mkWorkout([rest("r1"), work("a")]);
    const next = addLooperAfter(base, "r1");
    expect((next.intervals[1] as LooperInterval).wrapIntervalIds).toEqual(["r1"]);
  });
});

// ---------------------------------------------------------------------------
// addRestBetween (extended)
// ---------------------------------------------------------------------------

describe("addRestBetween (extended)", () => {
  it("returns unchanged workout when id not found", () => {
    const base = mkWorkout([work("a")]);
    const next = addRestBetween(base, "nonexistent");
    expect(next.intervals).toHaveLength(1);
  });

  it("uses default rest duration", () => {
    const base = mkWorkout([work("a"), work("b")], { defaults: { ...DEFAULTS, restDurationSeconds: 20 } });
    const next = addRestBetween(base, "b");
    expect(next.intervals[1].durationSeconds).toBe(20);
  });

  it("accepts custom duration", () => {
    const base = mkWorkout([work("a"), work("b")]);
    const next = addRestBetween(base, "b", 30);
    expect(next.intervals[1].durationSeconds).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// deleteInterval (extended)
// ---------------------------------------------------------------------------

describe("deleteInterval (extended)", () => {
  it("does nothing when id not found", () => {
    const base = mkWorkout([work("a")]);
    expect(deleteInterval(base, "nonexistent").intervals).toHaveLength(1);
  });

  it("can delete a looper", () => {
    const base = mkWorkout([work("a"), looper("L", 2, ["a"])]);
    const next = deleteInterval(base, "L");
    expect(next.intervals).toHaveLength(1);
    expect(next.intervals[0].type).toBe("work");
  });
});

// ---------------------------------------------------------------------------
// moveInterval
// ---------------------------------------------------------------------------

describe("moveInterval", () => {
  it("moves an interval to a new index", () => {
    const base = mkWorkout([work("a"), rest("b"), work("c")]);
    const next = moveInterval(base, "a", 2);
    expect(next.intervals.map((i) => i.id)).toEqual(["b", "c", "a"]);
  });

  it("clamps to beginning if newIndex < 0", () => {
    const base = mkWorkout([work("a"), work("b"), work("c")]);
    const next = moveInterval(base, "c", -5);
    expect(next.intervals[0].id).toBe("c");
  });

  it("clamps to end if newIndex exceeds length", () => {
    const base = mkWorkout([work("a"), work("b"), work("c")]);
    const next = moveInterval(base, "a", 100);
    expect(next.intervals[2].id).toBe("a");
  });

  it("returns unchanged if id not found", () => {
    const base = mkWorkout([work("a")]);
    expect(moveInterval(base, "nonexistent", 0).intervals).toHaveLength(1);
  });

  it("same position returns equivalent workout", () => {
    const base = mkWorkout([work("a"), work("b")]);
    const next = moveInterval(base, "a", 0);
    expect(next.intervals.map((i) => i.id)).toEqual(["a", "b"]);
  });
});

// ---------------------------------------------------------------------------
// getLooperBlock
// ---------------------------------------------------------------------------

describe("getLooperBlock", () => {
  it("returns wrapped intervals by wrapIntervalIds", () => {
    const intervals = [work("a"), work("b"), rest("c"), looper("L", 2, ["a", "b"])];
    const block = getLooperBlock(intervals, intervals[3] as LooperInterval);
    expect(block.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("falls back to legacy when no wrapIntervalIds", () => {
    const intervals = [work("a"), rest("b"), { id: "L", type: "looper", repeatCount: 2 } as LooperInterval];
    const block = getLooperBlock(intervals, intervals[2] as LooperInterval);
    expect(block.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("legacy stops at previous looper", () => {
    const intervals = [
      work("a"), looper("L1", 2, ["a"]),
      work("b"), rest("c"),
      { id: "L2", type: "looper", repeatCount: 3 } as LooperInterval,
    ];
    const block = getLooperBlock(intervals, intervals[4] as LooperInterval);
    expect(block.map((i) => i.id)).toEqual(["b", "c"]);
  });

  it("returns empty for looper at index 0 with no wrapIntervalIds", () => {
    const intervals = [{ id: "L", type: "looper", repeatCount: 2 } as LooperInterval, work("a")];
    expect(getLooperBlock(intervals, intervals[0] as LooperInterval)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getPrevLooperIndex
// ---------------------------------------------------------------------------

describe("getPrevLooperIndex", () => {
  it("returns -1 when no previous looper", () => {
    const intervals = [work("a"), work("b"), looper("L", 2, ["a"])];
    expect(getPrevLooperIndex(intervals, 2)).toBe(-1);
  });

  it("returns index of immediately previous looper", () => {
    const intervals = [work("a"), looper("L1", 2, ["a"]), work("b"), looper("L2", 2, ["b"])];
    expect(getPrevLooperIndex(intervals, 3)).toBe(1);
  });

  it("returns -1 for index 0", () => {
    expect(getPrevLooperIndex([looper("L", 2, [])], 0)).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// getLooperExtendableIds
// ---------------------------------------------------------------------------

describe("getLooperExtendableIds", () => {
  it("returns all work/rest ids before the looper", () => {
    const intervals = [work("a"), rest("b"), work("c"), looper("L", 2, ["c"])];
    expect(getLooperExtendableIds(intervals, "L")).toEqual(["a", "b", "c"]);
  });

  it("stops at previous looper", () => {
    const intervals = [work("a"), looper("L1", 2, ["a"]), work("b"), rest("c"), looper("L2", 2, ["b"])];
    expect(getLooperExtendableIds(intervals, "L2")).toEqual(["b", "c"]);
  });

  it("returns empty for looper at start", () => {
    expect(getLooperExtendableIds([looper("L", 2, [])], "L")).toEqual([]);
  });

  it("returns empty for nonexistent looper", () => {
    expect(getLooperExtendableIds([work("a")], "nonexistent")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// updateLooperBlock
// ---------------------------------------------------------------------------

describe("updateLooperBlock", () => {
  it("updates wrapIntervalIds with valid ids", () => {
    const base = mkWorkout([work("a"), rest("b"), looper("L", 2, ["a"])]);
    const next = updateLooperBlock(base, "L", ["a", "b"]);
    expect((next.intervals[2] as LooperInterval).wrapIntervalIds).toEqual(["a", "b"]);
  });

  it("filters out invalid ids", () => {
    const base = mkWorkout([work("a"), looper("L", 2, ["a"])]);
    const next = updateLooperBlock(base, "L", ["a", "nonexistent"]);
    expect((next.intervals[1] as LooperInterval).wrapIntervalIds).toEqual(["a"]);
  });

  it("returns unchanged if all ids invalid", () => {
    const base = mkWorkout([work("a"), looper("L", 2, ["a"])]);
    const next = updateLooperBlock(base, "L", ["nonexistent"]);
    expect((next.intervals[1] as LooperInterval).wrapIntervalIds).toEqual(["a"]);
  });
});

// ---------------------------------------------------------------------------
// getLooperBelowExtendableIds
// ---------------------------------------------------------------------------

describe("getLooperBelowExtendableIds", () => {
  it("returns work/rest ids after the looper", () => {
    const intervals = [work("a"), looper("L", 2, ["a"]), rest("b"), work("c")];
    expect(getLooperBelowExtendableIds(intervals, "L")).toEqual(["b", "c"]);
  });

  it("stops at next looper", () => {
    const intervals = [work("a"), looper("L1", 2, ["a"]), work("b"), looper("L2", 2, ["b"]), work("c")];
    expect(getLooperBelowExtendableIds(intervals, "L1")).toEqual(["b"]);
  });

  it("returns empty when looper is last", () => {
    expect(getLooperBelowExtendableIds([work("a"), looper("L", 2, ["a"])], "L")).toEqual([]);
  });

  it("returns empty for nonexistent looper", () => {
    expect(getLooperBelowExtendableIds([work("a")], "nonexistent")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// updateLooperBlockBelow
// ---------------------------------------------------------------------------

describe("updateLooperBlockBelow", () => {
  it("updates wrapBelowIntervalIds with valid ids", () => {
    const base = mkWorkout([work("a"), looper("L", 2, ["a"]), rest("b"), work("c")]);
    const next = updateLooperBlockBelow(base, "L", ["b", "c"]);
    expect((next.intervals[1] as LooperInterval).wrapBelowIntervalIds).toEqual(["b", "c"]);
  });

  it("filters out invalid ids", () => {
    const base = mkWorkout([work("a"), looper("L", 2, ["a"]), rest("b")]);
    const next = updateLooperBlockBelow(base, "L", ["b", "nonexistent"]);
    expect((next.intervals[1] as LooperInterval).wrapBelowIntervalIds).toEqual(["b"]);
  });

  it("sets undefined if all ids invalid", () => {
    const base = mkWorkout([work("a"), looper("L", 2, ["a"])]);
    const next = updateLooperBlockBelow(base, "L", ["nonexistent"]);
    expect((next.intervals[1] as LooperInterval).wrapBelowIntervalIds).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getLooperBlockBelow
// ---------------------------------------------------------------------------

describe("getLooperBlockBelow", () => {
  it("returns below-wrapped intervals", () => {
    const intervals = [work("a"), looper("L", 2, ["a"], ["b"]), rest("b"), work("c")];
    const block = getLooperBlockBelow(intervals, intervals[1] as LooperInterval);
    expect(block.map((i) => i.id)).toEqual(["b"]);
  });

  it("returns empty when no wrapBelowIntervalIds", () => {
    const intervals = [work("a"), looper("L", 2, ["a"])];
    expect(getLooperBlockBelow(intervals, intervals[1] as LooperInterval)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getLooperForInterval
// ---------------------------------------------------------------------------

describe("getLooperForInterval", () => {
  it("finds the looper wrapping an interval (above)", () => {
    const intervals = [work("a"), rest("b"), looper("L", 2, ["a", "b"])];
    expect(getLooperForInterval(intervals, "a")!.id).toBe("L");
  });

  it("finds the looper wrapping an interval (below)", () => {
    const intervals = [work("a"), looper("L", 2, ["a"], ["b"]), rest("b")];
    expect(getLooperForInterval(intervals, "b")!.id).toBe("L");
  });

  it("returns null for unwrapped interval", () => {
    const intervals = [work("a"), work("b"), looper("L", 2, ["a"])];
    expect(getLooperForInterval(intervals, "b")).toBeNull();
  });

  it("returns null for nonexistent interval", () => {
    expect(getLooperForInterval([work("a"), looper("L", 2, ["a"])], "nonexistent")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getLooperIfTopOfBlock
// ---------------------------------------------------------------------------

describe("getLooperIfTopOfBlock", () => {
  it("returns looper when interval is top of block", () => {
    const intervals = [work("a"), rest("b"), looper("L", 2, ["a", "b"])];
    expect(getLooperIfTopOfBlock(intervals, "a")!.id).toBe("L");
  });

  it("returns null when interval is not top of block", () => {
    expect(getLooperIfTopOfBlock([work("a"), rest("b"), looper("L", 2, ["a", "b"])], "b")).toBeNull();
  });

  it("returns null for unwrapped interval", () => {
    expect(getLooperIfTopOfBlock([work("a"), work("b"), looper("L", 2, ["b"])], "a")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// expandIntervals (extended)
// ---------------------------------------------------------------------------

describe("expandIntervals (extended)", () => {
  it("returns flat list for no loopers", () => {
    const expanded = expandIntervals([work("a", 10), rest("b", 5), work("c", 10)]);
    expect(expanded.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("enforces minimum repeat count of 2", () => {
    const expanded = expandIntervals([work("a", 10), looper("L", 1, ["a"])]);
    expect(expanded.map((i) => i.id)).toEqual(["a", "a"]);
  });

  it("handles items after looper", () => {
    const expanded = expandIntervals([work("a", 10), looper("L", 2, ["a"]), work("c", 10)]);
    expect(expanded.map((i) => i.id)).toEqual(["a", "a", "c"]);
  });

  it("handles below-wrapped intervals", () => {
    const expanded = expandIntervals([
      work("a", 10),
      looper("L", 2, ["a"], ["b"]),
      rest("b", 5),
      work("c", 10),
    ]);
    expect(expanded.map((i) => i.id)).toEqual(["a", "b", "a", "b", "c"]);
  });

  it("handles multiple loopers", () => {
    const expanded = expandIntervals([
      work("a", 10), looper("L1", 2, ["a"]),
      work("b", 10), looper("L2", 2, ["b"]),
    ]);
    expect(expanded.map((i) => i.id)).toEqual(["a", "a", "b", "b"]);
  });

  it("returns empty for empty intervals", () => {
    expect(expandIntervals([])).toEqual([]);
  });

  it("skips below-wrapped from remaining processing", () => {
    const expanded = expandIntervals([
      work("a", 10), looper("L", 2, ["a"], ["b"]), rest("b", 5),
    ]);
    expect(expanded.map((i) => i.id)).toEqual(["a", "b", "a", "b"]);
  });
});

// ---------------------------------------------------------------------------
// getStartIntervalIdForPlayback
// ---------------------------------------------------------------------------

describe("getStartIntervalIdForPlayback", () => {
  it("returns the id for work/rest/prep", () => {
    const intervals = [work("a"), rest("b"), prep("p")];
    expect(getStartIntervalIdForPlayback(intervals, "a")).toBe("a");
    expect(getStartIntervalIdForPlayback(intervals, "b")).toBe("b");
    expect(getStartIntervalIdForPlayback(intervals, "p")).toBe("p");
  });

  it("returns first block item id for a looper", () => {
    const intervals = [work("a"), rest("b"), looper("L", 2, ["a", "b"])];
    expect(getStartIntervalIdForPlayback(intervals, "L")).toBe("a");
  });

  it("returns undefined for nonexistent id", () => {
    expect(getStartIntervalIdForPlayback([work("a")], "nonexistent")).toBeUndefined();
  });

  it("returns undefined for looper with empty block", () => {
    expect(getStartIntervalIdForPlayback([looper("L", 2, [])], "L")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getLooperProgressAtExpandedIndex (extended)
// ---------------------------------------------------------------------------

describe("getLooperProgressAtExpandedIndex (extended)", () => {
  it("returns correct progress for 3 iterations", () => {
    const intervals = [work("a", 10), rest("b", 5), looper("L", 3, ["a", "b"])];
    expect(getLooperProgressAtExpandedIndex(intervals, 0).get("L")).toEqual({ iteration: 1, total: 3, remaining: 3 });
    expect(getLooperProgressAtExpandedIndex(intervals, 2).get("L")).toEqual({ iteration: 2, total: 3, remaining: 2 });
    expect(getLooperProgressAtExpandedIndex(intervals, 4).get("L")).toEqual({ iteration: 3, total: 3, remaining: 1 });
  });

  it("returns empty map for index outside looper range", () => {
    const intervals = [work("a", 10), looper("L", 2, ["a"]), work("b", 10)];
    expect(getLooperProgressAtExpandedIndex(intervals, 2).size).toBe(0);
  });

  it("handles items before looper not in block", () => {
    const intervals = [prep("p", 5), work("a", 10), looper("L", 2, ["a"])];
    expect(getLooperProgressAtExpandedIndex(intervals, 0).size).toBe(0);
    expect(getLooperProgressAtExpandedIndex(intervals, 1).get("L")).toEqual({ iteration: 1, total: 2, remaining: 2 });
  });
});

// ---------------------------------------------------------------------------
// findCurrentIntervalAtTime
// ---------------------------------------------------------------------------

describe("findCurrentIntervalAtTime", () => {
  it("finds the first interval at time 0", () => {
    const w = mkWorkout([work("a", 10), rest("b", 5), work("c", 10)]);
    const result = findCurrentIntervalAtTime(w, 0);
    expect(result.interval?.id).toBe("a");
    expect(result.index).toBe(0);
    expect(result.offsetSeconds).toBe(0);
  });

  it("finds interval in the middle", () => {
    const w = mkWorkout([work("a", 10), rest("b", 5), work("c", 10)]);
    const result = findCurrentIntervalAtTime(w, 12);
    expect(result.interval?.id).toBe("b");
    expect(result.index).toBe(1);
    expect(result.offsetSeconds).toBe(2);
  });

  it("finds last interval", () => {
    const w = mkWorkout([work("a", 10), work("b", 10)]);
    const result = findCurrentIntervalAtTime(w, 15);
    expect(result.interval?.id).toBe("b");
    expect(result.index).toBe(1);
    expect(result.offsetSeconds).toBe(5);
  });

  it("returns null when time exceeds total duration", () => {
    const w = mkWorkout([work("a", 10)]);
    const result = findCurrentIntervalAtTime(w, 100);
    expect(result.interval).toBeNull();
    expect(result.index).toBe(-1);
  });

  it("returns null for empty workout", () => {
    const w = mkWorkout([]);
    const result = findCurrentIntervalAtTime(w, 0);
    expect(result.interval).toBeNull();
    expect(result.index).toBe(-1);
  });

  it("handles looper expanded intervals", () => {
    const w = mkWorkout([work("a", 10), rest("b", 5), looper("L", 2, ["a", "b"])]);
    // expanded: a(0-9), b(10-14), a(15-24), b(25-29)
    const result = findCurrentIntervalAtTime(w, 16);
    expect(result.interval?.id).toBe("a");
    expect(result.index).toBe(2);
    expect(result.offsetSeconds).toBe(1);
  });
});
