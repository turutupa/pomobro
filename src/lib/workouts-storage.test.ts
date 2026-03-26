import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Workout } from "@/domain/workout";

// ---------------------------------------------------------------------------
// localStorage mock — must be set up BEFORE imports that use it
// ---------------------------------------------------------------------------

const store: Record<string, string> = {};

const localStorageMock: Storage = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    for (const k of Object.keys(store)) delete store[k];
  }),
  get length() {
    return Object.keys(store).length;
  },
  key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
};

vi.stubGlobal("localStorage", localStorageMock);
vi.stubGlobal("window", globalThis);

// Import AFTER the mock is set up
const { loadWorkouts, saveWorkouts, addWorkout, updateWorkout, deleteWorkout } =
  await import("./workouts-storage");

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWorkout(overrides?: Partial<Workout>): Workout {
  return {
    id: overrides?.id ?? "w1",
    name: overrides?.name ?? "Test Workout",
    intervals: overrides?.intervals ?? [
      { id: "i1", type: "work", durationSeconds: 30, title: "Push-ups" } as any,
    ],
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

// ---------------------------------------------------------------------------
// loadWorkouts
// ---------------------------------------------------------------------------

describe("loadWorkouts", () => {
  it("returns empty array when no data in storage", () => {
    expect(loadWorkouts()).toEqual([]);
  });

  it("loads workouts from storage", () => {
    const workouts = [makeWorkout({ id: "w1" }), makeWorkout({ id: "w2" })];
    store["pomobro:v1:workouts"] = JSON.stringify(workouts);
    const loaded = loadWorkouts();
    expect(loaded).toHaveLength(2);
    expect(loaded[0].id).toBe("w1");
    expect(loaded[1].id).toBe("w2");
  });

  it("filters invalid items", () => {
    store["pomobro:v1:workouts"] = JSON.stringify([
      makeWorkout({ id: "valid" }),
      { not: "a workout" },
      null,
    ]);
    const loaded = loadWorkouts();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe("valid");
  });

  it("returns empty for non-array JSON", () => {
    store["pomobro:v1:workouts"] = JSON.stringify({ not: "array" });
    expect(loadWorkouts()).toEqual([]);
  });

  it("returns empty for corrupted JSON", () => {
    store["pomobro:v1:workouts"] = "not valid json{{{";
    expect(loadWorkouts()).toEqual([]);
  });

  it("migrates legacy single workout key", () => {
    // Encode a v1 workout using the same encoding the app uses
    const workout = makeWorkout({ id: "legacy" });
    const payload = JSON.stringify({ v: 1, d: JSON.stringify(workout) });
    const b64 = btoa(unescape(encodeURIComponent(payload)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    store["pomobro:v1:workout"] = b64;

    const loaded = loadWorkouts();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe("legacy");
    // Should have migrated and removed legacy key
    expect(store["pomobro:v1:workout"]).toBeUndefined();
    expect(store["pomobro:v1:workouts"]).toBeDefined();
  });

  it("returns empty if legacy key has invalid data", () => {
    store["pomobro:v1:workout"] = "garbage";
    expect(loadWorkouts()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// saveWorkouts
// ---------------------------------------------------------------------------

describe("saveWorkouts", () => {
  it("saves workouts to localStorage", () => {
    const workouts = [makeWorkout({ id: "w1" })];
    saveWorkouts(workouts);
    const raw = store["pomobro:v1:workouts"];
    expect(raw).toBeDefined();
    expect(JSON.parse(raw)).toHaveLength(1);
    expect(JSON.parse(raw)[0].id).toBe("w1");
  });

  it("overwrites existing data", () => {
    saveWorkouts([makeWorkout({ id: "w1" })]);
    saveWorkouts([makeWorkout({ id: "w2" })]);
    const raw = JSON.parse(store["pomobro:v1:workouts"]);
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe("w2");
  });
});

// ---------------------------------------------------------------------------
// addWorkout
// ---------------------------------------------------------------------------

describe("addWorkout", () => {
  it("adds a workout to empty storage", () => {
    const result = addWorkout(makeWorkout({ id: "w1" }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("w1");
  });

  it("adds a workout to existing list", () => {
    saveWorkouts([makeWorkout({ id: "w1" })]);
    const result = addWorkout(makeWorkout({ id: "w2" }));
    expect(result).toHaveLength(2);
  });

  it("replaces existing workout with same id", () => {
    saveWorkouts([makeWorkout({ id: "w1", name: "Old" })]);
    const result = addWorkout(makeWorkout({ id: "w1", name: "New" }));
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("New");
  });

  it("persists to localStorage", () => {
    addWorkout(makeWorkout({ id: "w1" }));
    const raw = JSON.parse(store["pomobro:v1:workouts"]);
    expect(raw).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// updateWorkout
// ---------------------------------------------------------------------------

describe("updateWorkout", () => {
  it("updates an existing workout", () => {
    saveWorkouts([makeWorkout({ id: "w1", name: "Old" })]);
    const result = updateWorkout("w1", { name: "Updated" });
    expect(result[0].name).toBe("Updated");
    expect(result[0].id).toBe("w1");
  });

  it("does not affect other workouts", () => {
    saveWorkouts([makeWorkout({ id: "w1" }), makeWorkout({ id: "w2" })]);
    const result = updateWorkout("w1", { name: "Changed" });
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Changed");
    expect(result[1].id).toBe("w2");
  });

  it("persists update to localStorage", () => {
    saveWorkouts([makeWorkout({ id: "w1", name: "Old" })]);
    updateWorkout("w1", { name: "Persisted" });
    const raw = JSON.parse(store["pomobro:v1:workouts"]);
    expect(raw[0].name).toBe("Persisted");
  });
});

// ---------------------------------------------------------------------------
// deleteWorkout
// ---------------------------------------------------------------------------

describe("deleteWorkout", () => {
  it("removes workout by id", () => {
    saveWorkouts([makeWorkout({ id: "w1" }), makeWorkout({ id: "w2" })]);
    const result = deleteWorkout("w1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("w2");
  });

  it("does nothing if id not found", () => {
    saveWorkouts([makeWorkout({ id: "w1" })]);
    const result = deleteWorkout("nonexistent");
    expect(result).toHaveLength(1);
  });

  it("persists deletion to localStorage", () => {
    saveWorkouts([makeWorkout({ id: "w1" })]);
    deleteWorkout("w1");
    const raw = JSON.parse(store["pomobro:v1:workouts"]);
    expect(raw).toHaveLength(0);
  });
});
