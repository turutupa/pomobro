"use client";

import { useEffect, useRef, useState } from "react";
import type { Workout } from "@/domain/workout";
import { decodeWorkoutOrBundle } from "@/domain/share";

interface QRImportModalProps {
  onImport: (workout: Workout) => void;
  onImportWorkouts: (workouts: Workout[]) => void;
  onClose: () => void;
}

function tryDecodeFromScanned(text: string): Workout | Workout[] | null {
  try {
    const url = new URL(text);
    const data = url.searchParams.get("data");
    if (data) return decodeWorkoutOrBundle(data);
    return decodeWorkoutOrBundle(text);
  } catch {
    return decodeWorkoutOrBundle(text);
  }
}

export function QRImportModal({ onImport, onImportWorkouts, onClose }: QRImportModalProps) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);

  useEffect(() => {
    let mounted = true;
    let scanner: InstanceType<typeof import("html5-qrcode").Html5Qrcode> | null = null;

    void (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (!mounted) return;
      scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      if (!mounted) return;

      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            const result = tryDecodeFromScanned(decodedText);
            if (result) {
              void scanner?.stop().catch(() => {});
              if (Array.isArray(result)) {
                onImportWorkouts(result);
              } else {
                onImport(result);
              }
              onClose();
            }
          },
          () => {}
        )
        .catch((err: Error) => {
          if (mounted) setError(err.message || "Could not access camera");
        });
    })();

    return () => {
      mounted = false;
      void scanner?.stop().catch(() => {});
      scannerRef.current = null;
    };
  }, [onImport, onImportWorkouts, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-import-title"
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="qr-import-title" className="font-display border-b border-zinc-200 px-5 py-4 text-lg font-semibold text-zinc-900 dark:border-zinc-700 dark:text-zinc-100">
          Import from QR Code
        </h2>
        <div className="p-4">
          <div
            id="qr-reader"
            className="overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800 [&>div]:!border-0"
          />
          {error && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <p className="mt-3 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Point your camera at a workout or &ldquo;Send to phone&rdquo; QR code
          </p>
        </div>
        <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <button
            type="button"
            onClick={onClose}
            className="w-full cursor-pointer rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
