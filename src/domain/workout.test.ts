import { describe, it, expect } from "vitest";
import {
  Workout,
  addRestBetween,
  addWorkIntervalAfter,
  deleteInterval,
  normalizeWorkout,
  expandIntervals,
  getLooperProgressAtExpandedIndex,
  totalDurationSeconds,
} from "./workout";

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
    defaults: {
      workDurationSeconds: 50,
      restDurationSeconds: 15,
      preCountdownSeconds: 5,
      announceHalfwayByDefault: true,
      finalCountdownSeconds: 10,
    },
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
