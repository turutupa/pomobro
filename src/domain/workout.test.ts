import { describe, it, expect } from "vitest";
import {
  Workout,
  addRestBetween,
  addWorkIntervalAfter,
  deleteInterval,
  normalizeWorkout,
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
  it("prevents consecutive rests via normalize", () => {
    const workout = makeWorkout(["work", "rest", "rest", "work"]);
    expect(workout.intervals.map((i) => i.type)).toEqual([
      "work",
      "rest",
      "work",
    ]);
  });

  it("removes leading and trailing rests", () => {
    const workout = makeWorkout(["rest", "work", "rest"]);
    expect(workout.intervals.map((i) => i.type)).toEqual([
      "work",
    ]);
  });

  it("addWorkIntervalAfter maintains invariants", () => {
    const base = makeWorkout(["work", "rest", "work"]);
    const next = addWorkIntervalAfter(base, base.intervals[0].id);
    const types = next.intervals.map((i) => i.type);
    expect(types).toEqual(["work", "work", "rest", "work"]);
  });

  it("addRestBetween inserts rest only between works", () => {
    const base = makeWorkout(["work", "work"]);
    const next = addRestBetween(base, base.intervals[1].id);
    expect(next.intervals.map((i) => i.type)).toEqual([
      "work",
      "rest",
      "work",
    ]);
  });

  it("deleteInterval collapses rests correctly", () => {
    const base = makeWorkout(["work", "rest", "work"]);
    const secondWorkId = base.intervals[2].id;
    const afterDelete = deleteInterval(base, secondWorkId);
    expect(afterDelete.intervals.map((i) => i.type)).toEqual(["work"]);
  });
});

