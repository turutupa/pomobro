"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { WorkoutEditorScreen } from "@/components/WorkoutEditorScreen";
import { useWorkouts } from "@/state/workouts-context";

export default function WorkoutPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : null;
  const { workouts, setCurrentId, currentWorkout } = useWorkouts();

  useEffect(() => {
    if (id) {
      setCurrentId(id);
    }
  }, [id, setCurrentId]);

  useEffect(() => {
    if (id && workouts.length > 0 && !workouts.some((w) => w.id === id)) {
      router.replace("/");
    }
  }, [id, workouts, router]);

  if (!id || !currentWorkout) {
    return null;
  }

  return <WorkoutEditorScreen />;
}
