import { describe, it, expect } from "vitest";
import {
  encodeWorkout,
  decodeWorkout,
  encodeWorkouts,
  decodeWorkoutOrBundle,
} from "./share";
import type { Workout } from "./workout";

function makeWorkout(overrides?: Partial<Workout>): Workout {
  return {
    id: "w1",
    name: "Test Workout",
    intervals: [
      { id: "i1", type: "work", durationSeconds: 30, title: "Push-ups" },
      { id: "i2", type: "rest", durationSeconds: 10 },
    ] as Workout["intervals"],
    defaults: {
      workDurationSeconds: 50,
      restDurationSeconds: 15,
      preCountdownSeconds: 5,
      announceHalfwayByDefault: true,
      finalCountdownSeconds: 10,
    },
    ...overrides,
  };
}

describe("encodeWorkout / decodeWorkout (v1)", () => {
  it("round-trips a workout", () => {
    const workout = makeWorkout();
    const encoded = encodeWorkout(workout);
    const decoded = decodeWorkout(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.id).toBe("w1");
    expect(decoded!.name).toBe("Test Workout");
    expect(decoded!.intervals).toHaveLength(2);
    expect(decoded!.intervals[0].type).toBe("work");
    expect(decoded!.intervals[1].type).toBe("rest");
  });

  it("preserves all interval properties", () => {
    const workout = makeWorkout({
      intervals: [
        {
          id: "i1",
          type: "work",
          durationSeconds: 45,
          title: "Squats",
          color: "#ff0000",
          voice: { mute: false, beep: true },
        },
      ] as Workout["intervals"],
    });
    const decoded = decodeWorkout(encodeWorkout(workout))!;
    const interval = decoded.intervals[0] as any;
    expect(interval.title).toBe("Squats");
    expect(interval.color).toBe("#ff0000");
    expect(interval.durationSeconds).toBe(45);
    expect(interval.voice.beep).toBe(true);
  });

  it("preserves defaults", () => {
    const workout = makeWorkout();
    const decoded = decodeWorkout(encodeWorkout(workout))!;
    expect(decoded.defaults.workDurationSeconds).toBe(50);
    expect(decoded.defaults.restDurationSeconds).toBe(15);
    expect(decoded.defaults.preCountdownSeconds).toBe(5);
    expect(decoded.defaults.announceHalfwayByDefault).toBe(true);
    expect(decoded.defaults.finalCountdownSeconds).toBe(10);
  });

  it("returns null for invalid base64", () => {
    expect(decodeWorkout("not-valid-base64!!!")).toBeNull();
  });

  it("returns null for valid base64 but invalid JSON", () => {
    const b64 = btoa("not json");
    expect(decodeWorkout(b64)).toBeNull();
  });

  it("returns null for valid JSON but wrong version", () => {
    const payload = JSON.stringify({ v: 99, d: "{}" });
    const b64 = btoa(payload).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(decodeWorkout(b64)).toBeNull();
  });

  it("returns null if decoded workout has no intervals array", () => {
    const payload = JSON.stringify({ v: 1, d: JSON.stringify({ id: "x", name: "No intervals" }) });
    const b64 = btoa(payload).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(decodeWorkout(b64)).toBeNull();
  });

  it("handles workouts with empty intervals", () => {
    const workout = makeWorkout({ intervals: [] });
    const encoded = encodeWorkout(workout);
    const decoded = decodeWorkout(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.intervals).toEqual([]);
  });

  it("handles workouts with unicode names", () => {
    const workout = makeWorkout({ name: "Тренировка 🏋️" });
    const decoded = decodeWorkout(encodeWorkout(workout))!;
    expect(decoded.name).toBe("Тренировка 🏋️");
  });
});

describe("encodeWorkouts / decodeWorkoutOrBundle (v3 compressed)", () => {
  it("round-trips an array of workouts", () => {
    const workouts = [makeWorkout({ id: "w1" }), makeWorkout({ id: "w2", name: "Second" })];
    const encoded = encodeWorkouts(workouts);
    const decoded = decodeWorkoutOrBundle(encoded);
    expect(Array.isArray(decoded)).toBe(true);
    const arr = decoded as Workout[];
    expect(arr).toHaveLength(2);
    expect(arr[0].id).toBe("w1");
    expect(arr[1].id).toBe("w2");
    expect(arr[1].name).toBe("Second");
  });

  it("round-trips a single workout array", () => {
    const workouts = [makeWorkout()];
    const encoded = encodeWorkouts(workouts);
    const decoded = decodeWorkoutOrBundle(encoded) as Workout[];
    expect(Array.isArray(decoded)).toBe(true);
    expect(decoded).toHaveLength(1);
    expect(decoded[0].name).toBe("Test Workout");
  });

  it("returns null for empty array", () => {
    const encoded = encodeWorkouts([]);
    const decoded = decodeWorkoutOrBundle(encoded);
    expect(decoded).toBeNull();
  });
});

describe("decodeWorkoutOrBundle version handling", () => {
  it("decodes v1 single workout", () => {
    const workout = makeWorkout();
    const encoded = encodeWorkout(workout);
    const decoded = decodeWorkoutOrBundle(encoded);
    expect(decoded).not.toBeNull();
    expect(!Array.isArray(decoded)).toBe(true);
    expect((decoded as Workout).id).toBe("w1");
  });

  it("decodes v2 uncompressed bundle", () => {
    const workouts = [makeWorkout({ id: "w1" }), makeWorkout({ id: "w2" })];
    const payload = JSON.stringify({ v: 2, d: JSON.stringify(workouts) });
    const b64 = btoa(payload).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const decoded = decodeWorkoutOrBundle(b64) as Workout[];
    expect(Array.isArray(decoded)).toBe(true);
    expect(decoded).toHaveLength(2);
  });

  it("returns null for v2 with non-array data", () => {
    const payload = JSON.stringify({ v: 2, d: JSON.stringify({ not: "array" }) });
    const b64 = btoa(payload).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(decodeWorkoutOrBundle(b64)).toBeNull();
  });

  it("returns null for unknown version", () => {
    const payload = JSON.stringify({ v: 99, d: "test" });
    const b64 = btoa(payload).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(decodeWorkoutOrBundle(b64)).toBeNull();
  });

  it("returns null for garbage input", () => {
    expect(decodeWorkoutOrBundle("")).toBeNull();
    expect(decodeWorkoutOrBundle("🎉🎉🎉")).toBeNull();
  });

  it("filters invalid items in v2 bundle", () => {
    const mixed = [makeWorkout({ id: "valid" }), { not: "a workout" }];
    const payload = JSON.stringify({ v: 2, d: JSON.stringify(mixed) });
    const b64 = btoa(payload).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const decoded = decodeWorkoutOrBundle(b64) as Workout[];
    expect(Array.isArray(decoded)).toBe(true);
    expect(decoded).toHaveLength(1);
    expect(decoded[0].id).toBe("valid");
  });
});
