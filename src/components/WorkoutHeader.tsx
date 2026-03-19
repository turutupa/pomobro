"use client";

import { useState, useEffect } from "react";
import { encodeWorkout } from "@/domain/share";
import { useWorkout } from "@/state/workout-context";

export function WorkoutHeader() {
  const { state, updateMeta } = useWorkout();
  const [localName, setLocalName] = useState(state.workout.name);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLocalName(state.workout.name);
  }, [state.workout.name]);
  const [shareOpen, setShareOpen] = useState(false);

  const shareUrl =
    typeof window === "undefined"
      ? ""
      : (() => {
          const encoded = encodeWorkout(state.workout);
          const url = new URL("/", window.location.origin);
          url.searchParams.set("data", encoded);
          return url.toString();
        })();

  async function copyUrl() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      setShareOpen(false);
    } catch {
      setCopied(false);
    }
  }

  if (typeof window === "undefined") return null;

  return (
    <>
      <div className="flex flex-1 items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <input
            type="text"
            autoComplete="off"
            autoCorrect="on"
            autoCapitalize="words"
            data-lpignore="true"
            data-form-type="other"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onBlur={() => updateMeta(localName)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="font-display min-w-0 flex-1 rounded-lg border-0 bg-transparent px-3 py-1.5 text-lg font-semibold text-zinc-950 outline-none focus:ring-2 focus:ring-primary-500/50 dark:text-zinc-200"
            placeholder="Workout name"
          />
          <div className="relative">
            <button
              type="button"
              onClick={() => setShareOpen((o) => !o)}
              className="cursor-pointer rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              aria-label="Share"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
            </button>
            {shareOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShareOpen(false)}
                  aria-hidden
                />
                <div className="absolute right-0 top-full z-20 mt-2 flex min-w-[160px] flex-col gap-0.5 rounded-xl border border-zinc-300 bg-zinc-100 py-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                  <button
                    type="button"
                    onClick={copyUrl}
                    className="cursor-pointer px-5 py-3 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    {copied ? "Copied!" : "Copy link"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
