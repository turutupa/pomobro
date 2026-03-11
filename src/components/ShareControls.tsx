"use client";

import { useState } from "react";
import { encodeWorkout } from "@/domain/share";
import { useWorkout } from "@/state/workout-context";

export function ShareControls() {
  const { state } = useWorkout();
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window === "undefined"
      ? ""
      : (() => {
          const encoded = encodeWorkout(state.workout);
          const url = new URL(window.location.href);
          url.searchParams.set("data", encoded);
          return url.toString();
        })();

  if (typeof window === "undefined") return null;

  async function copy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-5 flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-700 dark:bg-zinc-800/30">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Share workout
        </span>
        <button
          type="button"
          onClick={copy}
          className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:bg-zinc-700"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
        Anyone with the link can load this workout.
      </p>
    </div>
  );
}
