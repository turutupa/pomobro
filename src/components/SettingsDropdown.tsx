"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "./ThemeProvider";
import { useSettings } from "@/state/settings-context";
import { usePwaInstall } from "./PwaInstall";

const TRACK_COLORS = {
  light: "rgb(228 228 231)",
  dark: "rgb(63 63 70)",
};

function VolumeSlider({
  value,
  onChange,
  label,
  resolved,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  resolved: "light" | "dark";
}) {
  const pct = Math.round(value * 100);
  const trackColor = TRACK_COLORS[resolved];
  const background = `linear-gradient(to right, rgb(20 184 166) 0%, rgb(20 184 166) ${pct}%, ${trackColor} ${pct}%, ${trackColor} 100%)`;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">{pct}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pct}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        style={{ background }}
        className="h-2 w-full cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-teal-500 [&::-webkit-slider-thumb]:shadow-sm"
      />
    </div>
  );
}

export function SettingsDropdown() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme, resolved } = useTheme();
  const { beepVolume, voiceVolume, setBeepVolume, setVoiceVolume } = useSettings();
  const { canInstall, showIosInstructions, isInstalled, install } = usePwaInstall();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 md:h-9 md:min-h-0 md:w-9 md:min-w-0"
        aria-label="Settings"
        aria-expanded={open}
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-zinc-200 bg-white py-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <div className="space-y-4 px-4">
            {/* Theme */}
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Theme
              </div>
              <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50/80 p-0.5 dark:border-zinc-700 dark:bg-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium transition-colors ${
                    theme === "light"
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium transition-colors ${
                    theme === "dark"
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  Dark
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("system")}
                  className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium transition-colors ${
                    theme === "system"
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  }`}
                >
                  System
                </button>
              </div>
            </div>

            {/* Beep volume */}
            <VolumeSlider
              value={beepVolume}
              onChange={setBeepVolume}
              label="Beep volume"
              resolved={resolved}
            />

            {/* Voice volume */}
            <VolumeSlider
              value={voiceVolume}
              onChange={setVoiceVolume}
              label="Voice volume"
              resolved={resolved}
            />

            {/* Install app */}
            {(canInstall || showIosInstructions) && !isInstalled && (
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Install app
                </div>
                {canInstall ? (
                  <button
                    type="button"
                    onClick={() => install()}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download to device
                  </button>
                ) : showIosInstructions ? (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Tap Share <span className="inline-block">□↑</span> then &ldquo;Add to Home Screen&rdquo;
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
