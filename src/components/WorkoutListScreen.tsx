"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useWorkouts } from "@/state/workouts-context";
import { totalDurationSeconds } from "@/domain/workout";
import { decodeWorkoutOrBundle } from "@/domain/share";
import { QRImportModal } from "./QRImportModal";
import { SendToPhoneModal } from "./SendToPhoneModal";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export function WorkoutListScreen() {
  const { workouts, addWorkout, setCurrentId, importWorkout, importWorkouts, deleteWorkout } = useWorkouts();
  const [importUrl, setImportUrl] = useState("");
  const [showImportUrl, setShowImportUrl] = useState(false);
  const [showImportQR, setShowImportQR] = useState(false);
  const [showSendToPhone, setShowSendToPhone] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  function handleImport() {
    if (typeof window === "undefined") return;
    try {
      const url = new URL(importUrl);
      const data = url.searchParams.get("data");
      if (data) {
        const decoded = decodeWorkoutOrBundle(data);
        if (decoded) {
          if (Array.isArray(decoded)) {
            importWorkouts(decoded);
          } else {
            importWorkout(decoded);
          }
          setImportUrl("");
          setShowImportUrl(false);
        }
      }
    } catch {
      // try as raw data
      const decoded = decodeWorkoutOrBundle(importUrl);
      if (decoded) {
        if (Array.isArray(decoded)) {
          importWorkouts(decoded);
        } else {
          importWorkout(decoded);
        }
        setImportUrl("");
        setShowImportUrl(false);
      }
    }
  }

  function handleQRImport(workout: Parameters<typeof importWorkout>[0]) {
    importWorkout(workout);
    setShowImportQR(false);
  }

  function handleQRImportWorkouts(workouts: Parameters<typeof importWorkouts>[0]) {
    importWorkouts(workouts);
    setShowImportQR(false);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-5">
        <h2 className="font-display text-base font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          My workouts
        </h2>

        {workouts.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-zinc-200 bg-white/60 px-8 py-16 text-center shadow-sm backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/40">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:bg-teal-400/15 dark:text-teal-400">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
            </div>
            <p className="font-display mb-2 text-base font-semibold text-zinc-700 dark:text-zinc-300">
              No workouts yet
            </p>
            <p className="mx-auto mb-6 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
              Create your first interval routine or import one from a link.
            </p>
            <button
              type="button"
              onClick={() => addWorkout()}
              className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition-all hover:bg-teal-500 hover:shadow-teal-500/30 dark:bg-teal-500 dark:shadow-teal-500/20 dark:hover:bg-teal-400"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New workout
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {workouts.map((w) => (
              <div
                key={w.id}
                className="group flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-zinc-200/60 transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:ring-zinc-700/60 dark:hover:bg-zinc-800"
              >
                <button
                  type="button"
                  onClick={() => setCurrentId(w.id)}
                  className="min-w-0 flex-1 cursor-pointer py-1 text-left"
                >
                  <div className="font-display font-semibold text-zinc-900 dark:text-zinc-100">
                    {w.name || "Untitled"}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>{w.intervals.length} intervals</span>
                    <span className="text-zinc-300 dark:text-zinc-600">·</span>
                    <span>{formatDuration(totalDurationSeconds(w))}</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget({ id: w.id, name: w.name || "Untitled" });
                  }}
                  className="cursor-pointer shrink-0 rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                  aria-label="Delete workout"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addWorkout()}
              className="cursor-pointer flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-200 py-5 text-sm font-medium text-zinc-500 transition-all hover:border-teal-200 hover:bg-teal-50/50 hover:text-teal-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-teal-800/50 dark:hover:bg-teal-950/20 dark:hover:text-teal-400"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New workout
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200/80 bg-white/60 p-4 backdrop-blur-sm dark:border-zinc-700/80 dark:bg-zinc-900/30">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Import
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowImportUrl((s) => !s)}
            className="cursor-pointer flex items-center justify-between gap-2 rounded-xl border border-zinc-200/80 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Import from URL
            </span>
            <svg className={`h-4 w-4 text-zinc-400 transition-transform ${showImportUrl ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showImportUrl && (
            <div className="flex gap-3 rounded-xl bg-zinc-50/80 p-3 dark:bg-zinc-800/30">
              <input
                type="text"
                placeholder="Paste workout URL..."
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleImport();
                  }
                }}
                className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              />
              <button
                type="button"
                onClick={handleImport}
                className="cursor-pointer rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-500 dark:bg-teal-500 dark:hover:bg-teal-400"
              >
                Import
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowImportQR(true)}
            className="cursor-pointer flex items-center gap-2 rounded-xl border border-zinc-200/80 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Import from QR Code
          </button>
          {workouts.length > 0 && (
            <button
              type="button"
              onClick={() => setShowSendToPhone(true)}
              className="cursor-pointer flex items-center gap-2 rounded-xl border border-zinc-200/80 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Send to phone
            </button>
          )}
        </div>
      </div>

      {showImportQR && typeof document !== "undefined" && createPortal(
        <QRImportModal
          onImport={handleQRImport}
          onImportWorkouts={handleQRImportWorkouts}
          onClose={() => setShowImportQR(false)}
        />,
        document.body
      )}

      {showSendToPhone && typeof document !== "undefined" && createPortal(
        <SendToPhoneModal
          workouts={workouts}
          onClose={() => setShowSendToPhone(false)}
        />,
        document.body
      )}

      {deleteTarget &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setDeleteTarget(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="delete-modal-title" className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Delete workout?
              </h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                &ldquo;{deleteTarget.name}&rdquo; will be permanently deleted. This cannot be undone.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="cursor-pointer flex-1 rounded-xl border-2 border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteWorkout(deleteTarget.id);
                    setDeleteTarget(null);
                  }}
                  className="cursor-pointer flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
