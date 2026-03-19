"use client";

import { useState } from "react";
import { encodeWorkouts } from "@/domain/share";
import type { Workout } from "@/domain/workout";

interface SendToPhoneModalProps {
  workouts: Workout[];
  onClose: () => void;
}

export function SendToPhoneModal({ workouts, onClose }: SendToPhoneModalProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window === "undefined"
      ? ""
      : (() => {
          const encoded = encodeWorkouts(workouts);
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
    } catch {
      setCopied(false);
    }
  }

  if (typeof window === "undefined") return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-to-phone-title"
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-300 bg-zinc-100 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="send-to-phone-title"
          className="font-display border-b border-zinc-200 px-5 py-4 text-lg font-semibold text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
        >
          Send to phone
        </h2>
        <div className="flex flex-col items-center gap-4 p-5">
          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            Copy the URL and open it on your phone to import {workouts.length}{" "}
            workout{workouts.length !== 1 ? "s" : ""}.
          </p>
          <button
            type="button"
            onClick={copyUrl}
            className="w-full cursor-pointer rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-500 dark:bg-primary-500 dark:hover:bg-primary-400"
          >
            {copied ? "Copied!" : "Copy URL"}
          </button>
        </div>
        <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <button
            type="button"
            onClick={onClose}
            className="w-full cursor-pointer rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
