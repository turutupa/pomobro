"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useWorkout } from "@/state/workout-context";
import { usePlayer } from "@/state/player-context";
import { usePreviewMode } from "@/state/preview-mode-context";
import { useTutorial } from "@/state/tutorial-context";
import {
  Interval,
  WorkInterval,
  RestInterval,
  LooperInterval,
  PrepInterval,
  expandIntervals,
  getLooperProgressAtExpandedIndex,
  getStartIntervalIdForPlayback,
  getLooperForInterval,
  getLooperIfTopOfBlock,
  getLooperExtendableIds,
  getLooperBelowExtendableIds,
  getLooperBlock,
  type BeepSoundType,
} from "@/domain/workout";
import { resumeAudioContext } from "@/voice/BeepEngine";
import { DurationInput } from "./DurationInput";

const PRESET_COLORS = [
  "#0d9488", // teal
  "#00BD7C", // primary
  "#0891b2", // cyan-600
  "#6366f1", // indigo-500
  "#7c3aed", // violet-600
  "#64748b", // slate
  "#475569", // slate-600
  "#f59e0b", // amber
  "#ea580c", // orange
  "#dc2626", // red-600
  "#e85d4c", // coral
  "#db2777", // pink-600
] as const;

const DEFAULT_WORK_COLOR = "#0ea5e9";
const DEFAULT_REST_COLOR = "#475569";

const LOOPER_COLORS = [
  "#d97706", // amber-600
  "#6366f1", // indigo-500
  "#059669", // emerald-600
  "#dc2626", // red-600
  "#2563eb", // blue-600
  "#7c3aed", // violet-600
] as const;

/** Returns the assigned color for a looper (by order: 1st=amber, 2nd=indigo, etc.). */
function getLooperColor(looperId: string, intervals: Interval[]): string {
  const loopers = intervals.filter(
    (x): x is LooperInterval => x.type === "looper",
  );
  const idx = loopers.findIndex((l) => l.id === looperId);
  return LOOPER_COLORS[Math.max(0, idx) % LOOPER_COLORS.length];
}

/** Returns the 1px border color for a looper card (to show which block it controls). */
function getLooperBorderColor(
  intervalId: string,
  intervals: Interval[],
): string | undefined {
  // Only show the looper border when this card is actually inside that looper's block.
  const looper = getLooperForInterval(intervals, intervalId);
  return looper ? getLooperColor(looper.id, intervals) : undefined;
}

function getLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function isWork(interval: Interval): interval is WorkInterval {
  return interval.type === "work";
}

function isLooper(interval: Interval): interval is LooperInterval {
  return interval.type === "looper";
}

function isPrep(interval: Interval): interval is PrepInterval {
  return interval.type === "prep";
}

const PREP_BG_COLOR = "#0d9488"; // teal - distinct from amber pause/looper

interface PrepIntervalCardProps {
  interval: PrepInterval;
  isSelected: boolean;
  isCurrent: boolean;
  isPlaying: boolean;
  onSelect: () => void;
  onPlayFromHere: () => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<PrepInterval>) => void;
}

function PrepIntervalCard({
  interval,
  isSelected,
  isCurrent,
  isPlaying,
  onSelect,
  onPlayFromHere,
  onDelete,
  onUpdate,
}: PrepIntervalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { state, selectInterval, clearLastAddedIntervalId } = useWorkout();
  const { state: player } = usePlayer();
  const color = PREP_BG_COLOR;
  const inPlaybackMode = player.isRunning || player.isPaused;

  useEffect(() => {
    if (state.lastAddedIntervalId === interval.id) {
      selectInterval(interval.id);
      clearLastAddedIntervalId();
      const el = document.getElementById(`interval-${interval.id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [
    state.lastAddedIntervalId,
    interval.id,
    selectInterval,
    clearLastAddedIntervalId,
  ]);
  const textClass = "text-white";
  const mutedClass = "text-white/80";

  if (isPlaying) {
    return (
      <div
        role="button"
        tabIndex={0}
        data-interactive
        onClick={onSelect}
        onKeyDown={(e) => e.key === "Enter" && onSelect()}
        className={`flex w-full cursor-pointer items-center justify-between gap-3 overflow-hidden rounded-xl border-2 px-4 transition-opacity ${
          isCurrent
            ? "border-zinc-400 py-5 md:ring-2 md:ring-zinc-400 md:ring-offset-2 dark:border-zinc-500 dark:md:ring-zinc-500 dark:md:ring-offset-zinc-950"
            : `border-transparent py-3 ${inPlaybackMode ? "opacity-70" : "opacity-100"}`
        }`}
        style={{ backgroundColor: color }}
      >
        <span
          className={`font-display ${isCurrent ? "text-xl font-bold md:text-2xl" : "text-base font-semibold"} ${textClass}`}
        >
          Get ready
        </span>
        <span
          className={`shrink-0 min-w-[2.5rem] max-w-[3.25rem] px-3 text-center font-medium ${isCurrent ? "text-base md:text-lg text-white" : "text-sm text-white/80"}`}
        >
          {interval.durationSeconds}s
        </span>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      data-interactive
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={`group flex w-full cursor-pointer flex-col overflow-hidden rounded-2xl border-2 shadow-md transition-all duration-200 ${
        isSelected || isCurrent
          ? "border-zinc-400 md:ring-2 md:ring-zinc-400 md:ring-offset-2 dark:border-zinc-500 dark:md:ring-zinc-500 dark:md:ring-offset-zinc-950"
          : "border-transparent"
      }`}
      style={{ backgroundColor: color }}
    >
      <div className="flex flex-col gap-1 px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-display px-3 py-1 text-lg font-bold text-white">
              Get ready
            </div>
            {!expanded && (
              <div className="mt-2 flex w-full flex-wrap items-center gap-1.5 px-3">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdate({
                        voice: {
                          ...interval.voice,
                          mute: !interval.voice?.mute,
                        },
                      });
                    }}
                    className={`cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors whitespace-nowrap ${
                      interval.voice?.mute
                        ? "bg-black/20 text-white/50 opacity-80 hover:bg-black/25"
                        : "bg-black/35 text-white hover:bg-black/45"
                    }`}
                  >
                    Voice {interval.voice?.mute ? "Off" : "On"}
                  </button>
                  {!interval.voice?.mute && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdate({
                          voice: {
                            ...interval.voice,
                            announceStart: !(
                              interval.voice?.announceStart ?? true
                            ),
                          },
                        });
                      }}
                      className={`cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors whitespace-nowrap ${
                        (interval.voice?.announceStart ?? true)
                          ? "bg-black/35 text-white hover:bg-black/45"
                          : "bg-black/20 text-white/50 opacity-80 hover:bg-black/25"
                      }`}
                    >
                      Start{" "}
                      {(interval.voice?.announceStart ?? true) ? "On" : "Off"}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdate({ beep: !interval.beep });
                    }}
                    className={`cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors whitespace-nowrap ${
                      interval.beep
                        ? "bg-black/35 text-white hover:bg-black/45"
                        : "bg-black/20 text-white/50 opacity-80 hover:bg-black/25"
                    }`}
                  >
                    Beep {interval.beep ? "On" : "Off"}
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((x) => !x);
              }}
              className="cursor-pointer rounded-lg p-2 transition-colors hover:bg-white/20 text-white/80"
              aria-label={expanded ? "Collapse options" : "Expand options"}
            >
              <svg
                className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlayFromHere();
              }}
              className="cursor-pointer rounded-lg p-2 transition-colors hover:bg-white/20 text-white/90"
              aria-label="Start from this interval"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="cursor-pointer rounded-lg p-2 transition-colors hover:bg-white/20 text-white/80"
              aria-label="Delete"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
        {expanded && (
          <div
            className="mt-3 flex flex-col gap-3 rounded-xl p-3 backdrop-blur-sm bg-white/15"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-white/80">Voice</span>
              <button
                type="button"
                onClick={() =>
                  onUpdate({
                    voice: {
                      ...interval.voice,
                      mute: !interval.voice?.mute,
                    },
                  })
                }
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  interval.voice?.mute
                    ? "bg-black/20 text-white/50"
                    : "bg-black/35 text-white"
                }`}
              >
                {interval.voice?.mute ? "Off" : "On"}
              </button>
            </div>
            {!interval.voice?.mute && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-white/80">
                  Voice at start
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdate({
                      voice: {
                        ...interval.voice,
                        announceStart: !(interval.voice?.announceStart ?? true),
                      },
                    })
                  }
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    (interval.voice?.announceStart ?? true)
                      ? "bg-black/35 text-white"
                      : "bg-black/20 text-white/50"
                  }`}
                >
                  {(interval.voice?.announceStart ?? true) ? "On" : "Off"}
                </button>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-white/80">Beep</span>
              <button
                type="button"
                onClick={() => onUpdate({ beep: !interval.beep })}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  interval.beep
                    ? "bg-black/35 text-white"
                    : "bg-black/20 text-white/50"
                }`}
              >
                {interval.beep ? "On" : "Off"}
              </button>
            </div>
          </div>
        )}
        <div className="flex w-full items-center justify-center py-1 rounded-lg text-white/80">
          <DurationInput
            value={interval.durationSeconds}
            onChange={(v) => onUpdate({ durationSeconds: v })}
            min={3}
            max={30}
            containerClassName="bg-white/20 min-h-[2.75rem] md:min-h-[3rem]"
            inputClassName="text-white"
            suffixClassName="text-white"
          />
        </div>
      </div>
    </div>
  );
}

function SetsRow() {
  const { state, updateMeta } = useWorkout();
  const sets = Math.max(1, state.workout.sets ?? 1);
  const min = 1;
  const max = 20;

  const setSets = (v: number) => {
    updateMeta(undefined, undefined, Math.max(min, Math.min(max, v)));
  };

  return (
    <div className="mt-4 flex items-center justify-between rounded-xl border border-zinc-300 bg-zinc-200 px-4 py-3 dark:border-zinc-700/80 dark:bg-zinc-800/40">
      <div className="min-w-0">
        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-400">
          Repeat circuit
        </span>
        <p className="mt-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-400">
          Runs the full routine this many times
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setSets(sets - 1)}
          disabled={sets <= min}
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-zinc-300 text-zinc-800 font-semibold transition-colors hover:bg-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-500"
          aria-label="Decrease repeat count"
        >
          −
        </button>
        <span className="min-w-[2rem] text-center text-sm font-bold text-zinc-900 dark:text-zinc-300">
          {sets}×
        </span>
        <button
          type="button"
          onClick={() => setSets(sets + 1)}
          disabled={sets >= max}
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-zinc-300 text-zinc-800 font-semibold transition-colors hover:bg-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-500"
          aria-label="Increase repeat count"
        >
          +
        </button>
      </div>
    </div>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 8, left: rect.left });
    }
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open) {
      updatePosition();
    }
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (open && typeof window !== "undefined") {
      updatePosition();
      const onScroll = () => updatePosition();
      window.addEventListener("scroll", onScroll, true);
      return () => window.removeEventListener("scroll", onScroll, true);
    }
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        className="cursor-pointer h-8 w-8 shrink-0 rounded-full border-2 border-white/40 shadow-md ring-2 ring-black/10 transition-transform hover:scale-105"
        style={{ backgroundColor: value }}
        aria-label="Change color"
      />
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[100]"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <div
              className="fixed z-[101] flex flex-wrap gap-2 rounded-xl border border-zinc-300 bg-zinc-100 p-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
              style={{ top: position.top, left: position.left }}
              onClick={(e) => e.stopPropagation()}
            >
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                  }}
                  className="cursor-pointer h-8 w-8 rounded-full border-2 border-transparent transition-all hover:scale-110 hover:border-white hover:shadow-md"
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}

interface WorkIntervalCardProps {
  interval: WorkInterval;
  isSelected: boolean;
  isCurrent: boolean;
  isPlaying: boolean;
  looperBorderColor?: string;
  onSelect: () => void;
  onPlayFromHere: () => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<WorkInterval>) => void;
}

function WorkIntervalCard({
  interval,
  isSelected,
  isCurrent,
  isPlaying,
  looperBorderColor,
  onSelect,
  onPlayFromHere,
  onDelete,
  onUpdate,
}: WorkIntervalCardProps) {
  const { state, clearLastAddedIntervalId } = useWorkout();
  const { state: player } = usePlayer();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const color = interval.color ?? DEFAULT_WORK_COLOR;
  const isLight = getLuminance(color) > 0.6;
  const inPlaybackMode = player.isRunning || player.isPaused;
  const textClass = isLight ? "text-zinc-950" : "text-white";
  const mutedClass = isLight ? "text-zinc-700" : "text-white/80";

  useEffect(() => {
    if (state.lastAddedIntervalId === interval.id) {
      titleInputRef.current?.focus();
      clearLastAddedIntervalId();
    }
  }, [state.lastAddedIntervalId, interval.id, clearLastAddedIntervalId]);

  if (isPlaying) {
    return (
      <div
        role="button"
        tabIndex={0}
        data-interactive
        onClick={onSelect}
        onKeyDown={(e) => e.key === "Enter" && onSelect()}
        className={`flex w-full cursor-pointer items-center justify-between gap-3 overflow-hidden rounded-xl border-2 px-4 transition-opacity ${
          isCurrent
            ? "border-zinc-400 py-5 md:ring-2 md:ring-zinc-400 md:ring-offset-2 dark:border-zinc-500 dark:md:ring-zinc-500 dark:md:ring-offset-zinc-950"
            : `border-transparent py-3 ${inPlaybackMode ? "opacity-70" : "opacity-100"}`
        }`}
        style={{
          backgroundColor: color,
          ...(looperBorderColor && {
            outline: `1px solid ${looperBorderColor}`,
            outlineOffset: 2,
          }),
        }}
      >
        <span
          className={`font-display truncate ${isCurrent ? "text-xl font-bold md:text-2xl" : "text-base font-semibold"} ${textClass}`}
        >
          {interval.title || "Work"}
        </span>
        <span
          className={`shrink-0 min-w-[2.5rem] max-w-[3.25rem] px-3 text-center font-medium ${isCurrent ? "text-base md:text-lg" : "text-sm"} ${isCurrent ? (isLight ? "text-zinc-950" : "text-white") : mutedClass}`}
        >
          {interval.durationSeconds}s
        </span>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      data-interactive
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={`group flex w-full cursor-pointer flex-col overflow-hidden rounded-2xl border-2 shadow-md transition-all duration-200 ${
        isSelected || isCurrent
          ? "border-zinc-400 md:ring-2 md:ring-zinc-400 md:ring-offset-2 dark:border-zinc-500 dark:md:ring-zinc-500 dark:md:ring-offset-zinc-950"
          : "border-transparent"
      }`}
      style={{
        backgroundColor: color,
        ...(looperBorderColor && {
          outline: `1px solid ${looperBorderColor}`,
          outlineOffset: 2,
        }),
      }}
    >
      <div className="flex flex-col gap-1 px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <input
              ref={titleInputRef}
              type="text"
              autoComplete="off"
              autoCorrect="on"
              autoCapitalize="words"
              data-lpignore="true"
              data-form-type="other"
              className={`font-display w-full rounded-md border-0 bg-transparent px-3 py-1 text-lg font-bold placeholder:opacity-70 focus:outline-none focus:ring-2 focus:ring-white/50 ${textClass}`}
              value={interval.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              onKeyDown={(e) =>
                e.key === "Enter" && (e.target as HTMLInputElement).blur()
              }
              placeholder="Exercise name"
              onClick={(e) => e.stopPropagation()}
            />
            {!expanded && (
              <div className="mt-2 flex w-full flex-wrap items-center gap-1.5 px-3">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdate({
                        voice: {
                          ...interval.voice,
                          mute: !interval.voice?.mute,
                        },
                      });
                    }}
                    className={`cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors whitespace-nowrap ${
                      isLight
                        ? interval.voice?.mute
                          ? "bg-zinc-400/30 text-zinc-500 opacity-70 hover:bg-zinc-400/40"
                          : "bg-zinc-900/50 text-zinc-950 hover:bg-zinc-900/60"
                        : interval.voice?.mute
                          ? "bg-black/20 text-white/50 opacity-80 hover:bg-black/25"
                          : "bg-black/35 text-white hover:bg-black/45"
                    }`}
                  >
                    Voice {interval.voice?.mute ? "Off" : "On"}
                  </button>
                  {!interval.voice?.mute && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdate({
                            voice: {
                              ...interval.voice,
                              announceStart: !(
                                interval.voice?.announceStart ?? true
                              ),
                            },
                          });
                        }}
                        className={`cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors whitespace-nowrap ${
                          isLight
                            ? (interval.voice?.announceStart ?? true)
                              ? "bg-zinc-900/50 text-zinc-950 hover:bg-zinc-900/60"
                              : "bg-zinc-400/30 text-zinc-500 opacity-70 hover:bg-zinc-400/40"
                            : (interval.voice?.announceStart ?? true)
                              ? "bg-black/35 text-white hover:bg-black/45"
                              : "bg-black/20 text-white/50 opacity-80 hover:bg-black/25"
                        }`}
                      >
                        Start{" "}
                        {(interval.voice?.announceStart ?? true) ? "On" : "Off"}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdate({
                            voice: {
                              ...interval.voice,
                              announceHalfway: !(
                                interval.voice?.announceHalfway ?? false
                              ),
                            },
                          });
                        }}
                        className={`cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors whitespace-nowrap ${
                          isLight
                            ? (interval.voice?.announceHalfway ?? false)
                              ? "bg-zinc-900/50 text-zinc-950 hover:bg-zinc-900/60"
                              : "bg-zinc-400/30 text-zinc-500 opacity-70 hover:bg-zinc-400/40"
                            : (interval.voice?.announceHalfway ?? false)
                              ? "bg-black/35 text-white hover:bg-black/45"
                              : "bg-black/20 text-white/50 opacity-80 hover:bg-black/25"
                        }`}
                      >
                        Halfway{" "}
                        {(interval.voice?.announceHalfway ?? false)
                          ? "On"
                          : "Off"}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdate({
                            voice: {
                              ...interval.voice,
                              finalCountdownSeconds:
                                (interval.voice?.finalCountdownSeconds ?? 3) > 0
                                  ? 0
                                  : 3,
                            },
                          });
                        }}
                        className={`cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors whitespace-nowrap ${
                          isLight
                            ? (interval.voice?.finalCountdownSeconds ?? 3) > 0
                              ? "bg-zinc-900/50 text-zinc-950 hover:bg-zinc-900/60"
                              : "bg-zinc-400/30 text-zinc-500 opacity-70 hover:bg-zinc-400/40"
                            : (interval.voice?.finalCountdownSeconds ?? 3) > 0
                              ? "bg-black/35 text-white hover:bg-black/45"
                              : "bg-black/20 text-white/50 opacity-80 hover:bg-black/25"
                        }`}
                      >
                        End{" "}
                        {(interval.voice?.finalCountdownSeconds ?? 3) > 0
                          ? "On"
                          : "Off"}
                      </button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdate({
                        voice: {
                          ...interval.voice,
                          beep: !interval.voice?.beep,
                        },
                      });
                    }}
                    className={`cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors whitespace-nowrap ${
                      isLight
                        ? interval.voice?.beep
                          ? "bg-zinc-900/50 text-zinc-950 hover:bg-zinc-900/60"
                          : "bg-zinc-400/30 text-zinc-500 opacity-70 hover:bg-zinc-400/40"
                        : interval.voice?.beep
                          ? "bg-black/35 text-white hover:bg-black/45"
                          : "bg-black/20 text-white/50 opacity-80 hover:bg-black/25"
                    }`}
                  >
                    Beep{" "}
                    {interval.voice?.beep
                      ? (interval.voice.beepSound ?? "beep")
                      : "Off"}
                  </button>
                </div>
                {interval.description && (
                  <span
                    className={`max-w-[120px] truncate rounded-full px-2.5 py-1 text-[10px] font-medium ${isLight ? "bg-zinc-600/40 text-zinc-800" : "bg-black/40 text-white/95"}`}
                    title={interval.description}
                  >
                    {interval.description}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((x) => !x);
              }}
              className={`cursor-pointer rounded-lg p-2 transition-colors hover:bg-white/20 ${mutedClass}`}
              aria-label={expanded ? "Collapse options" : "Expand options"}
            >
              <svg
                className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlayFromHere();
              }}
              className={`cursor-pointer rounded-lg p-2 transition-colors hover:bg-white/20 ${mutedClass}`}
              aria-label="Start from this interval"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className={`cursor-pointer rounded-lg p-2 transition-colors hover:bg-white/20 ${mutedClass}`}
              aria-label="Delete"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {expanded && (
          <div
            className={`mt-3 flex flex-col gap-3 rounded-xl p-3 backdrop-blur-sm ${isLight ? "bg-zinc-900/10" : "bg-white/15"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-medium ${mutedClass}`}>Color</span>
              <ColorPicker
                value={color}
                onChange={(c) => onUpdate({ color: c })}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-medium ${mutedClass}`}>Voice</span>
              <button
                type="button"
                onClick={() =>
                  onUpdate({
                    voice: {
                      ...interval.voice,
                      mute: !interval.voice?.mute,
                    },
                  })
                }
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isLight
                    ? interval.voice?.mute
                      ? "bg-zinc-400/30 text-zinc-500 opacity-70 hover:bg-zinc-400/40"
                      : "bg-zinc-900/50 text-zinc-950 hover:bg-zinc-900/60"
                    : interval.voice?.mute
                      ? "bg-black/20 text-white/50 opacity-80 hover:bg-black/25"
                      : "bg-black/35 text-white hover:bg-black/45"
                }`}
              >
                {interval.voice?.mute ? "Off" : "On"}
              </button>
            </div>
            {!interval.voice?.mute && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-medium ${mutedClass}`}>
                    Voice at start
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdate({
                        voice: {
                          ...interval.voice,
                          announceStart: !(
                            interval.voice?.announceStart ?? true
                          ),
                        },
                      })
                    }
                    className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      (interval.voice?.announceStart ?? true)
                        ? isLight
                          ? "bg-zinc-900/50 text-zinc-950"
                          : "bg-black/35 text-white"
                        : isLight
                          ? "bg-zinc-400/30 text-zinc-500"
                          : "bg-black/20 text-white/50"
                    }`}
                  >
                    {(interval.voice?.announceStart ?? true) ? "On" : "Off"}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-medium ${mutedClass}`}>
                    Voice halfway
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdate({
                        voice: {
                          ...interval.voice,
                          announceHalfway: !(
                            interval.voice?.announceHalfway ?? true
                          ),
                        },
                      })
                    }
                    className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      (interval.voice?.announceHalfway ?? true)
                        ? isLight
                          ? "bg-zinc-900/50 text-zinc-950"
                          : "bg-black/35 text-white"
                        : isLight
                          ? "bg-zinc-400/30 text-zinc-500"
                          : "bg-black/20 text-white/50"
                    }`}
                  >
                    {(interval.voice?.announceHalfway ?? true) ? "On" : "Off"}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-medium ${mutedClass}`}>
                    Voice at end (3-2-1)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdate({
                        voice: {
                          ...interval.voice,
                          finalCountdownSeconds:
                            (interval.voice?.finalCountdownSeconds ?? 3) > 0
                              ? 0
                              : 3,
                        },
                      })
                    }
                    className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      (interval.voice?.finalCountdownSeconds ?? 3) > 0
                        ? isLight
                          ? "bg-zinc-900/50 text-zinc-950"
                          : "bg-black/35 text-white"
                        : isLight
                          ? "bg-zinc-400/30 text-zinc-500"
                          : "bg-black/20 text-white/50"
                    }`}
                  >
                    {(interval.voice?.finalCountdownSeconds ?? 3) > 0
                      ? "On"
                      : "Off"}
                  </button>
                </div>
              </>
            )}
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-medium ${mutedClass}`}>Beep</span>
              <div className="flex items-center gap-1">
                <select
                  value={interval.voice?.beepSound ?? "beep"}
                  onChange={(e) =>
                    onUpdate({
                      voice: {
                        ...interval.voice,
                        beepSound: e.target.value as BeepSoundType,
                      },
                    })
                  }
                  className={`cursor-pointer rounded-lg border-0 px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-white/50 ${isLight ? "bg-zinc-700/35 text-zinc-900" : "bg-black/35 text-white"}`}
                >
                  <option value="beep">Beep</option>
                  <option value="chime">Chime</option>
                  <option value="bell">Bell</option>
                </select>
                <button
                  type="button"
                  onClick={() =>
                    onUpdate({
                      voice: {
                        ...interval.voice,
                        beep: !interval.voice?.beep,
                      },
                    })
                  }
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isLight
                      ? interval.voice?.beep
                        ? "bg-zinc-900/50 text-zinc-950 hover:bg-zinc-900/60"
                        : "bg-zinc-400/30 text-zinc-500 opacity-70 hover:bg-zinc-400/40"
                      : interval.voice?.beep
                        ? "bg-black/35 text-white hover:bg-black/45"
                        : "bg-black/20 text-white/50 opacity-80 hover:bg-black/25"
                  }`}
                >
                  {interval.voice?.beep ? "On" : "Off"}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className={`text-xs font-medium ${mutedClass}`}>
                Description
              </span>
              <textarea
                className="w-full resize-none rounded-lg border-0 bg-white/20 px-3 py-2 text-sm placeholder:opacity-60 focus:outline-none focus:ring-2 focus:ring-white/50"
                rows={2}
                value={interval.description ?? ""}
                onChange={(e) => onUpdate({ description: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    (e.target as HTMLTextAreaElement).blur();
                  }
                }}
                placeholder="Tips, form cues..."
              />
            </div>
          </div>
        )}
        <div
          className={`flex w-full items-center justify-center py-1 rounded-lg ${mutedClass}`}
        >
          <DurationInput
            value={interval.durationSeconds}
            onChange={(v) => onUpdate({ durationSeconds: v })}
            containerClassName="bg-white/20 min-h-[2.75rem] md:min-h-[3rem]"
            inputClassName={textClass}
            suffixClassName={mutedClass}
          />
        </div>
      </div>
    </div>
  );
}

interface RestIntervalCardProps {
  interval: RestInterval;
  isSelected: boolean;
  isCurrent: boolean;
  isPlaying: boolean;
  looperBorderColor?: string;
  onSelect: () => void;
  onPlayFromHere: () => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<RestInterval>) => void;
}

function RestIntervalCard({
  interval,
  isSelected,
  isCurrent,
  isPlaying,
  looperBorderColor,
  onSelect,
  onPlayFromHere,
  onDelete,
  onUpdate,
}: RestIntervalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { state: player } = usePlayer();
  const color = interval.color ?? DEFAULT_REST_COLOR;
  const isLight = getLuminance(color) > 0.6;
  const inPlaybackMode = player.isRunning || player.isPaused;
  const textClass = isLight ? "text-zinc-950" : "text-white";
  const mutedClass = isLight ? "text-zinc-700" : "text-white/80";

  if (isPlaying) {
    return (
      <div
        role="button"
        tabIndex={0}
        data-interactive
        onClick={onSelect}
        onKeyDown={(e) => e.key === "Enter" && onSelect()}
        className={`flex w-full cursor-pointer items-center justify-between gap-3 overflow-hidden rounded-xl border-2 px-4 transition-opacity ${
          isCurrent
            ? "border-zinc-400 py-5 md:ring-2 md:ring-zinc-400 md:ring-offset-2 dark:border-zinc-500 dark:md:ring-zinc-500 dark:md:ring-offset-zinc-950"
            : `border-transparent py-3 ${inPlaybackMode ? "opacity-70" : "opacity-100"}`
        }`}
        style={{
          backgroundColor: color,
          ...(looperBorderColor && {
            outline: `1px solid ${looperBorderColor}`,
            outlineOffset: 2,
          }),
        }}
      >
        <span
          className={`font-display ${isCurrent ? "text-xl font-bold md:text-2xl" : "text-base font-semibold"} ${textClass}`}
        >
          Rest
        </span>
        <span
          className={`shrink-0 min-w-[2.5rem] max-w-[3.25rem] px-3 text-center font-medium ${isCurrent ? "text-base md:text-lg" : "text-sm"} ${isCurrent ? (isLight ? "text-zinc-950" : "text-white") : mutedClass}`}
        >
          {interval.durationSeconds}s
        </span>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      data-interactive
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={`group flex w-full cursor-pointer flex-col overflow-hidden rounded-2xl border-2 shadow-md transition-all duration-200 ${
        isSelected || isCurrent
          ? "border-zinc-400 md:ring-2 md:ring-zinc-400 md:ring-offset-2 dark:border-zinc-500 dark:md:ring-zinc-500 dark:md:ring-offset-zinc-950"
          : "border-transparent"
      }`}
      style={{
        backgroundColor: color,
        ...(looperBorderColor && {
          outline: `1px solid ${looperBorderColor}`,
          outlineOffset: 2,
        }),
      }}
    >
      <div className="flex flex-col gap-1 px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div
              className={`font-display px-3 py-1 text-lg font-bold ${textClass}`}
            >
              Rest
            </div>
            {!expanded && (
              <div className="mt-2 flex w-full flex-wrap items-center gap-1.5 px-3">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdate({
                        voice: {
                          ...interval.voice,
                          mute: !interval.voice?.mute,
                        },
                      });
                    }}
                    className={`cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors whitespace-nowrap ${
                      isLight
                        ? interval.voice?.mute
                          ? "bg-zinc-400/30 text-zinc-500 opacity-70 hover:bg-zinc-400/40"
                          : "bg-zinc-900/50 text-zinc-950 hover:bg-zinc-900/60"
                        : interval.voice?.mute
                          ? "bg-black/20 text-white/50 opacity-80 hover:bg-black/25"
                          : "bg-black/35 text-white hover:bg-black/45"
                    }`}
                  >
                    Voice {interval.voice?.mute ? "Off" : "On"}
                  </button>
                  {!interval.voice?.mute && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdate({
                            voice: {
                              ...interval.voice,
                              announceStart: !(
                                interval.voice?.announceStart ?? true
                              ),
                            },
                          });
                        }}
                        className={`cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors whitespace-nowrap ${
                          isLight
                            ? (interval.voice?.announceStart ?? true)
                              ? "bg-zinc-900/50 text-zinc-950 hover:bg-zinc-900/60"
                              : "bg-zinc-400/30 text-zinc-500 opacity-70 hover:bg-zinc-400/40"
                            : (interval.voice?.announceStart ?? true)
                              ? "bg-black/35 text-white hover:bg-black/45"
                              : "bg-black/20 text-white/50 opacity-80 hover:bg-black/25"
                        }`}
                      >
                        Start{" "}
                        {(interval.voice?.announceStart ?? true) ? "On" : "Off"}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdate({
                            voice: {
                              ...interval.voice,
                              announceHalfway: !(
                                interval.voice?.announceHalfway ?? false
                              ),
                            },
                          });
                        }}
                        className={`cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors whitespace-nowrap ${
                          isLight
                            ? (interval.voice?.announceHalfway ?? false)
                              ? "bg-zinc-900/50 text-zinc-950 hover:bg-zinc-900/60"
                              : "bg-zinc-400/30 text-zinc-500 opacity-70 hover:bg-zinc-400/40"
                            : (interval.voice?.announceHalfway ?? false)
                              ? "bg-black/35 text-white hover:bg-black/45"
                              : "bg-black/20 text-white/50 opacity-80 hover:bg-black/25"
                        }`}
                      >
                        Halfway{" "}
                        {(interval.voice?.announceHalfway ?? false)
                          ? "On"
                          : "Off"}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdate({
                            voice: {
                              ...interval.voice,
                              finalCountdownSeconds:
                                (interval.voice?.finalCountdownSeconds ?? 3) > 0
                                  ? 0
                                  : 3,
                            },
                          });
                        }}
                        className={`cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors whitespace-nowrap ${
                          isLight
                            ? (interval.voice?.finalCountdownSeconds ?? 3) > 0
                              ? "bg-zinc-900/50 text-zinc-950 hover:bg-zinc-900/60"
                              : "bg-zinc-400/30 text-zinc-500 opacity-70 hover:bg-zinc-400/40"
                            : (interval.voice?.finalCountdownSeconds ?? 3) > 0
                              ? "bg-black/35 text-white hover:bg-black/45"
                              : "bg-black/20 text-white/50 opacity-80 hover:bg-black/25"
                        }`}
                      >
                        End{" "}
                        {(interval.voice?.finalCountdownSeconds ?? 3) > 0
                          ? "On"
                          : "Off"}
                      </button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdate({ beep: !interval.beep });
                    }}
                    className={`cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors whitespace-nowrap ${
                      isLight
                        ? interval.beep
                          ? "bg-zinc-900/50 text-zinc-950 hover:bg-zinc-900/60"
                          : "bg-zinc-400/30 text-zinc-500 opacity-70 hover:bg-zinc-400/40"
                        : interval.beep
                          ? "bg-black/35 text-white hover:bg-black/45"
                          : "bg-black/20 text-white/50 opacity-80 hover:bg-black/25"
                    }`}
                  >
                    Beep{" "}
                    {interval.beep ? (interval.beepSound ?? "beep") : "Off"}
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((x) => !x);
              }}
              className={`cursor-pointer rounded-lg p-2 transition-colors hover:bg-white/20 ${mutedClass}`}
              aria-label={expanded ? "Collapse options" : "Expand options"}
            >
              <svg
                className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlayFromHere();
              }}
              className={`cursor-pointer rounded-lg p-2 transition-colors hover:bg-white/20 ${mutedClass}`}
              aria-label="Start from this interval"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className={`cursor-pointer rounded-lg p-2 transition-colors hover:bg-white/20 ${mutedClass}`}
              aria-label="Delete"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {expanded && (
          <div
            className={`mt-3 flex flex-col gap-3 rounded-xl p-3 backdrop-blur-sm ${isLight ? "bg-zinc-900/10" : "bg-white/15"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-medium ${mutedClass}`}>Color</span>
              <ColorPicker
                value={color}
                onChange={(c) => onUpdate({ color: c })}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-medium ${mutedClass}`}>Voice</span>
              <button
                type="button"
                onClick={() =>
                  onUpdate({
                    voice: {
                      ...interval.voice,
                      mute: !interval.voice?.mute,
                    },
                  })
                }
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isLight
                    ? interval.voice?.mute
                      ? "bg-zinc-400/30 text-zinc-500 opacity-70 hover:bg-zinc-400/40"
                      : "bg-zinc-900/50 text-zinc-950 hover:bg-zinc-900/60"
                    : interval.voice?.mute
                      ? "bg-black/20 text-white/50 opacity-80 hover:bg-black/25"
                      : "bg-black/35 text-white hover:bg-black/45"
                }`}
              >
                {interval.voice?.mute ? "Off" : "On"}
              </button>
            </div>
            {!interval.voice?.mute && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-medium ${mutedClass}`}>
                    Voice at start
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdate({
                        voice: {
                          ...interval.voice,
                          announceStart: !(
                            interval.voice?.announceStart ?? true
                          ),
                        },
                      })
                    }
                    className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      (interval.voice?.announceStart ?? true)
                        ? isLight
                          ? "bg-zinc-900/50 text-zinc-950"
                          : "bg-black/35 text-white"
                        : isLight
                          ? "bg-zinc-400/30 text-zinc-500"
                          : "bg-black/20 text-white/50"
                    }`}
                  >
                    {(interval.voice?.announceStart ?? true) ? "On" : "Off"}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-medium ${mutedClass}`}>
                    Voice halfway
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdate({
                        voice: {
                          ...interval.voice,
                          announceHalfway: !(
                            interval.voice?.announceHalfway ?? false
                          ),
                        },
                      })
                    }
                    className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      (interval.voice?.announceHalfway ?? false)
                        ? isLight
                          ? "bg-zinc-900/50 text-zinc-950"
                          : "bg-black/35 text-white"
                        : isLight
                          ? "bg-zinc-400/30 text-zinc-500"
                          : "bg-black/20 text-white/50"
                    }`}
                  >
                    {(interval.voice?.announceHalfway ?? false) ? "On" : "Off"}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-medium ${mutedClass}`}>
                    Voice at end (3-2-1)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdate({
                        voice: {
                          ...interval.voice,
                          finalCountdownSeconds:
                            (interval.voice?.finalCountdownSeconds ?? 3) > 0
                              ? 0
                              : 3,
                        },
                      })
                    }
                    className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      (interval.voice?.finalCountdownSeconds ?? 3) > 0
                        ? isLight
                          ? "bg-zinc-900/50 text-zinc-950"
                          : "bg-black/35 text-white"
                        : isLight
                          ? "bg-zinc-400/30 text-zinc-500"
                          : "bg-black/20 text-white/50"
                    }`}
                  >
                    {(interval.voice?.finalCountdownSeconds ?? 3) > 0
                      ? "On"
                      : "Off"}
                  </button>
                </div>
              </>
            )}
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-medium ${mutedClass}`}>Beep</span>
              <div className="flex items-center gap-1">
                <select
                  value={interval.beepSound ?? "beep"}
                  onChange={(e) =>
                    onUpdate({ beepSound: e.target.value as BeepSoundType })
                  }
                  className={`cursor-pointer rounded-lg border-0 px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-white/50 ${isLight ? "bg-zinc-700/35 text-zinc-900" : "bg-black/35 text-white"}`}
                >
                  <option value="beep">Beep</option>
                  <option value="chime">Chime</option>
                  <option value="bell">Bell</option>
                </select>
                <button
                  type="button"
                  onClick={() => onUpdate({ beep: !interval.beep })}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isLight
                      ? interval.beep
                        ? "bg-zinc-900/50 text-zinc-950 hover:bg-zinc-900/60"
                        : "bg-zinc-400/30 text-zinc-500 opacity-70 hover:bg-zinc-400/40"
                      : interval.beep
                        ? "bg-black/35 text-white hover:bg-black/45"
                        : "bg-black/20 text-white/50 opacity-80 hover:bg-black/25"
                  }`}
                >
                  {interval.beep ? "On" : "Off"}
                </button>
              </div>
            </div>
          </div>
        )}
        <div
          className={`flex w-full items-center justify-center py-1 rounded-lg ${mutedClass}`}
        >
          <DurationInput
            value={interval.durationSeconds}
            onChange={(v) => onUpdate({ durationSeconds: v })}
            containerClassName="bg-white/20 min-h-[2.75rem] md:min-h-[3rem]"
            inputClassName={textClass}
            suffixClassName={mutedClass}
          />
        </div>
      </div>
    </div>
  );
}

interface LooperIntervalCardProps {
  interval: LooperInterval;
  isSelected: boolean;
  isCurrent: boolean;
  isPlaying: boolean;
  intervals: Interval[];
  /** When playing: iteration progress for this looper (e.g. { iteration: 2, total: 3, remaining: 2 }) */
  looperProgress?: { iteration: number; total: number; remaining: number };
  onSelect: () => void;
  onPlayFromHere: () => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<LooperInterval>) => void;
}

function LooperIntervalCard({
  interval,
  isSelected,
  isCurrent,
  isPlaying,
  intervals,
  looperProgress,
  onSelect,
  onPlayFromHere,
  onDelete,
  onUpdate,
}: LooperIntervalCardProps) {
  const repeatCount = Math.max(2, interval.repeatCount);
  const { state: player } = usePlayer();
  const inPlaybackMode = player.isRunning || player.isPaused;
  const looperColor = getLooperColor(interval.id, intervals);

  if (isPlaying) {
    const strokeWidth = 2;
    const h = 12;
    const w = 20;
    const r = 4;
    const mid = h / 2;
    return (
      <div
        className={`flex w-full flex-col gap-1 py-2 transition-opacity ${
          inPlaybackMode ? (looperProgress ? "" : "opacity-70") : ""
        }`}
        style={{ color: looperColor }}
      >
        <div className="flex w-full items-center gap-2">
          <svg
            width={w}
            height={h}
            viewBox={`0 0 ${w} ${h}`}
            className="shrink-0"
            aria-hidden
          >
            <path
              d={`M ${r} 0 L ${r} ${mid - r} Q ${r} ${mid} ${r + r} ${mid} L ${w} ${mid}`}
              fill="none"
              stroke={looperColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="font-display shrink-0 text-sm font-semibold">
            Repeat
          </span>
          <div
            className="h-0.5 flex-1 shrink self-center"
            style={{ backgroundColor: looperColor, minWidth: 8 }}
          />
          {looperProgress ? (
            <span className="shrink-0 text-sm font-medium">
              {looperProgress.remaining} of {looperProgress.total} left
            </span>
          ) : (
            <span className="shrink-0 text-sm font-medium opacity-70">—</span>
          )}
          <svg
            width={w}
            height={h}
            viewBox={`0 0 ${w} ${h}`}
            className="shrink-0"
            aria-hidden
          >
            <path
              d={`M 0 ${mid} L ${w - r * 2} ${mid} Q ${w - r} ${mid} ${w - r} 0`}
              fill="none"
              stroke={looperColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="text-center text-base font-semibold text-white drop-shadow-sm">
          {looperProgress
            ? `Repeat ${looperProgress.iteration} / ${looperProgress.total}`
            : `Repeat — / ${repeatCount}`}
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      data-interactive
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={`group flex w-full cursor-pointer flex-col overflow-hidden rounded-2xl border-2 shadow-xl transition-all duration-200 ${
        isSelected
          ? "border-amber-400 md:ring-2 md:ring-amber-400 md:ring-offset-2 dark:border-amber-400 dark:md:ring-offset-zinc-950"
          : "border-white/50 shadow-black/20 dark:border-white/40"
      }`}
      style={{ backgroundColor: looperColor }}
    >
      <div className="flex flex-col gap-1 px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-display px-3 py-1 text-lg font-bold text-white">
              Repeat
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlayFromHere();
              }}
              className="cursor-pointer rounded-lg p-2 transition-colors hover:bg-white/20 text-white/90"
              aria-label="Start from this interval"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="cursor-pointer rounded-lg p-2 transition-colors hover:bg-white/20 text-white/80"
              aria-label="Delete"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
        <p className="px-3 text-xs text-white/80">
          Repeats the block above (drag handle to adjust) this many times
        </p>
        <div
          className={`flex w-full items-center justify-center py-1 rounded-lg text-white/80`}
        >
          <DurationInput
            value={repeatCount}
            onChange={(v) => onUpdate({ repeatCount: v })}
            min={2}
            max={20}
            containerClassName="bg-white/20 min-h-[2.75rem] md:min-h-[3rem]"
            inputClassName="text-white"
            suffixClassName="text-white"
          />
        </div>
      </div>
    </div>
  );
}

function AddButtonWithPopover({
  onClick,
  className,
  icon,
  label,
}: {
  onClick: () => void;
  className: string;
  icon: React.ReactNode;
  label: string;
}) {
  const [showPopover, setShowPopover] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    }
  };

  useEffect(() => {
    if (showPopover && typeof window !== "undefined") {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [showPopover]);

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        setShowPopover(true);
        updatePosition();
      }}
      onMouseLeave={() => setShowPopover(false)}
      onFocus={() => {
        setShowPopover(true);
        updatePosition();
      }}
      onBlur={() => setShowPopover(false)}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        className={className}
        aria-label={label}
      >
        {icon}
      </button>
      {showPopover &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed z-[200] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-zinc-700"
            style={{ top: position.top, left: position.left }}
          >
            {label}
            <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-zinc-800 dark:border-t-zinc-700" />
          </div>,
          document.body,
        )}
    </div>
  );
}

function LooperBlockHandle({
  looper,
  intervals,
  extendableIds,
  currentBlock,
  onUpdate,
  looperColor,
}: {
  looper: LooperInterval;
  intervals: Interval[];
  extendableIds: string[];
  currentBlock: string[];
  onUpdate: (wrapIntervalIds: string[]) => void;
  looperColor: string;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const handleRef = useRef<HTMLDivElement>(null);

  // Keep stable refs so the effect doesn't re-run on every state change
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const currentBlockRef = useRef(currentBlock);
  currentBlockRef.current = currentBlock;
  const extendableIdsRef = useRef(extendableIds);
  extendableIdsRef.current = extendableIds;

  useEffect(() => {
    if (!isDragging) return;

    const onPointerMove = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const cardEl = el?.closest("[data-interval-id]");
      const id = cardEl?.getAttribute("data-interval-id");
      const ids = extendableIdsRef.current;
      if (id && ids.includes(id)) {
        const idx = ids.indexOf(id);
        const newBlock = ids.slice(idx);
        if (JSON.stringify(newBlock) !== JSON.stringify(currentBlockRef.current)) {
          onUpdateRef.current(newBlock);
        }
      }
    };

    const onPointerUp = () => setIsDragging(false);

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
    document.body.style.touchAction = "none";
    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.body.style.touchAction = "";
    };
  }, [isDragging]); // Only re-run when drag starts/stops

  return (
    <div
      ref={handleRef}
      role="button"
      tabIndex={0}
      data-interactive
      onPointerDown={(e) => {
        e.stopPropagation();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setIsDragging(true);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
        }
      }}
      style={{
        touchAction: "none",
        backgroundColor: looperColor,
      }}
      className={`flex min-h-[44px] cursor-ns-resize items-center justify-center py-3 transition-opacity hover:opacity-100 md:min-h-0 md:py-1.5 ${
        isDragging ? "opacity-100" : "opacity-80"
      }`}
      aria-label="Drag to extend or shrink repeat block"
      title="Drag up to include more intervals, drag down to exclude"
    >
      <svg
        className="h-4 w-4 text-white/90"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <circle cx="12" cy="6" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="12" cy="18" r="1.5" />
      </svg>
    </div>
  );
}

function LooperBlockBottomHandle({
  looper,
  extendableBelowIds,
  currentBelowBlock,
  onUpdate,
  looperColor,
}: {
  looper: LooperInterval;
  extendableBelowIds: string[];
  currentBelowBlock: string[];
  onUpdate: (wrapBelowIntervalIds: string[]) => void;
  looperColor: string;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const handleRef = useRef<HTMLDivElement>(null);
  // Snapshot card positions at drag start so layout shifts don't cause flickering
  const cardRectsRef = useRef<{ id: string; midY: number }[]>([]);
  const handleYRef = useRef(0);

  // Keep stable refs so the effect doesn't re-run (and re-snapshot) on every state change
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const currentBelowBlockRef = useRef(currentBelowBlock);
  currentBelowBlockRef.current = currentBelowBlock;
  const extendableBelowIdsRef = useRef(extendableBelowIds);
  extendableBelowIdsRef.current = extendableBelowIds;

  useEffect(() => {
    if (!isDragging) return;

    // Snapshot the vertical midpoints of all extendable-below cards ONCE at drag start
    const ids = extendableBelowIdsRef.current;
    const rects: { id: string; midY: number }[] = [];
    for (const id of ids) {
      const el = document.querySelector(`[data-interval-id="${id}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        rects.push({ id, midY: r.top + r.height / 2 });
      }
    }
    cardRectsRef.current = rects;
    if (handleRef.current) {
      handleYRef.current = handleRef.current.getBoundingClientRect().bottom;
    }

    const onPointerMove = (e: PointerEvent) => {
      const y = e.clientY;
      // If pointer is above the handle origin, shrink to empty
      if (y < handleYRef.current - 10) {
        if (currentBelowBlockRef.current.length > 0) {
          onUpdateRef.current([]);
        }
        return;
      }
      // Find the furthest card whose midpoint the pointer has passed
      let count = 0;
      for (const rect of cardRectsRef.current) {
        if (y >= rect.midY - 20) {
          count++;
        } else {
          break;
        }
      }
      const newBlock = extendableBelowIdsRef.current.slice(0, count);
      if (JSON.stringify(newBlock) !== JSON.stringify(currentBelowBlockRef.current)) {
        onUpdateRef.current(newBlock);
      }
    };

    const onPointerUp = () => setIsDragging(false);

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
    document.body.style.touchAction = "none";
    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.body.style.touchAction = "";
    };
  }, [isDragging]); // Only re-run when drag starts/stops — snapshot stays stable

  if (extendableBelowIds.length === 0 && currentBelowBlock.length === 0) {
    return null;
  }

  return (
    <div
      ref={handleRef}
      role="button"
      tabIndex={0}
      data-interactive
      onPointerDown={(e) => {
        e.stopPropagation();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setIsDragging(true);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
        }
      }}
      style={{
        touchAction: "none",
        backgroundColor: looperColor,
      }}
      className={`flex min-h-[44px] cursor-ns-resize items-center justify-center py-3 transition-opacity hover:opacity-100 md:min-h-0 md:py-1.5 ${
        isDragging ? "opacity-100" : "opacity-80"
      }`}
      aria-label="Drag to extend or shrink repeat block downward"
      title="Drag down to include more intervals, drag up to exclude"
    >
      <svg
        className="h-4 w-4 text-white/90"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <circle cx="12" cy="6" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="12" cy="18" r="1.5" />
      </svg>
    </div>
  );
}

function Connector({
  aboveId,
  belowId,
  showGetReadyButton,
}: {
  aboveId: string | null;
  belowId?: string | null;
  showGetReadyButton?: boolean;
}) {
  const { state: player } = usePlayer();
  const { previewMode } = usePreviewMode();
  const {
    addWorkAfter,
    addRestAfter,
    addRestBetween,
    addPrepAfter,
    addLooperAfter,
  } = useWorkout();
  const isInPlaybackMode = player.isRunning || player.isPaused;
  if (isInPlaybackMode || previewMode) return null;
  return (
    <div className="flex justify-center py-3">
      <div className="flex gap-2" data-tutorial="add-buttons">
        {showGetReadyButton && (
          <AddButtonWithPopover
            onClick={() => addPrepAfter(null)}
            className="cursor-pointer flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-600 shadow-sm transition-all hover:scale-105 hover:bg-teal-100 hover:shadow-md dark:bg-teal-950/50 dark:text-teal-400 dark:hover:bg-teal-900/50"
            icon={
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            label="Get ready countdown"
          />
        )}
        <AddButtonWithPopover
          onClick={() => addWorkAfter(aboveId ?? null)}
          className="cursor-pointer flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600 shadow-sm transition-all hover:scale-105 hover:bg-sky-100 hover:shadow-md dark:bg-sky-950/50 dark:text-sky-400 dark:hover:bg-sky-900/50"
          icon={
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              {/* Dumbbell icon */}
              <line x1="4" y1="12" x2="20" y2="12" strokeLinecap="round" />
              <rect x="1" y="9" width="4" height="6" rx="1" strokeLinejoin="round" />
              <rect x="19" y="9" width="4" height="6" rx="1" strokeLinejoin="round" />
            </svg>
          }
          label="Workout"
        />
        <AddButtonWithPopover
          onClick={() =>
            belowId && aboveId
              ? addRestBetween(belowId)
              : addRestAfter(aboveId ?? null)
          }
          className="cursor-pointer flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600 shadow-sm transition-all hover:scale-105 hover:bg-violet-100 hover:shadow-md dark:bg-violet-950/50 dark:text-violet-400 dark:hover:bg-violet-900/50"
          icon={
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              {/* Pause / rest icon */}
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          label="Rest / pause"
        />
        <AddButtonWithPopover
          onClick={() => addLooperAfter(aboveId ?? null)}
          className="cursor-pointer flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 shadow-sm transition-all hover:scale-105 hover:bg-amber-100 hover:shadow-md dark:bg-amber-950/50 dark:text-amber-400 dark:hover:bg-amber-900/50"
          icon={
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              {/* Repeat / loop icon — two curved arrows */}
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 1l4 4-4 4"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 11V9a4 4 0 014-4h14"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 23l-4-4 4-4"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 13v2a4 4 0 01-4 4H3"
              />
            </svg>
          }
          label="Repeat block"
        />
      </div>
    </div>
  );
}

export function IntervalEditorList() {
  const {
    state,
    selectInterval,
    deleteInterval,
    addWorkAfter,
    updateInterval,
    updateLooperBlock,
    updateLooperBlockBelow,
  } = useWorkout();
  const { state: player, play } = usePlayer();
  const { previewMode } = usePreviewMode();
  const tutorialCtx = useTutorial();
  const isInPlaybackMode = player.isRunning || player.isPaused;
  const showCompactView = isInPlaybackMode || previewMode;
  const { intervals } = state.workout;
  const sets = Math.max(1, state.workout.sets ?? 1);
  const playbackIntervals = expandIntervals(intervals);
  const currentPlaybackInterval =
    playbackIntervals[player.currentIndex] ?? null;
  const looperProgressMap = isInPlaybackMode
    ? getLooperProgressAtExpandedIndex(intervals, player.currentIndex)
    : new Map<
        string,
        { iteration: number; total: number; remaining: number }
      >();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isInPlaybackMode) return;
    if (window.innerWidth >= 768) return;
    const current = currentPlaybackInterval;
    if (!current) return;
    const el = document.getElementById(`interval-${current.id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [player.currentIndex, player.isRunning, currentPlaybackInterval]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-interactive]")) {
        selectInterval(null);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [selectInterval]);

  if (intervals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8 text-center md:gap-5 md:rounded-2xl md:border-2 md:border-dashed md:border-zinc-300 md:bg-zinc-200 md:px-6 md:py-12 dark:md:border-zinc-700 dark:md:bg-zinc-900/50">
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-400">
          Start your first workout interval
        </p>
        <button
          type="button"
          data-tutorial="add-first-interval"
          onClick={() => {
            addWorkAfter(null);
            // Auto-advance tutorial if on step 1
            if (tutorialCtx.currentStep === 0) tutorialCtx.nextStep();
          }}
          className="cursor-pointer rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-primary-500 dark:bg-primary-500 dark:text-white dark:hover:bg-primary-400"
        >
          + Add workout interval
        </button>
      </div>
    );
  }

  const handleCardSelect = (intervalId: string) => {
    if (isInPlaybackMode) {
      const startId = getStartIntervalIdForPlayback(intervals, intervalId);
      if (startId) play(state.workout, startId);
    } else {
      selectInterval(intervalId);
    }
  };

  const handlePlayFromCard = async (intervalId: string) => {
    await resumeAudioContext();
    const startId = getStartIntervalIdForPlayback(intervals, intervalId);
    if (startId) play(state.workout, startId);
  };

  const renderGroups: Array<
    | {
        type: "looper";
        start: number;
        looperIndex: number;
        end: number;
        looper: LooperInterval;
      }
    | { type: "standalone"; index: number }
  > = [];
  // Collect all below-wrapped IDs for skip detection
  const allBelowWrappedIds = new Set<string>();
  for (const interval of intervals) {
    if (interval.type === "looper" && interval.wrapBelowIntervalIds) {
      for (const id of interval.wrapBelowIntervalIds)
        allBelowWrappedIds.add(id);
    }
  }
  for (let i = 0; i < intervals.length; i++) {
    const interval = intervals[i];
    // If a looper's block is empty (e.g. the only included card was deleted),
    // we still want to render the drag handle so the user can re-expand it.
    if (interval.type === "looper") {
      const block = getLooperBlock(intervals, interval);
      const belowSet = new Set(interval.wrapBelowIntervalIds ?? []);
      if (block.length === 0) {
        // Looper with no above-wrapped items — check for below-wrapped items
        let belowEnd = i;
        if (belowSet.size > 0) {
          for (let j = i + 1; j < intervals.length; j++) {
            if (intervals[j].type === "looper") break;
            if (belowSet.has(intervals[j].id)) belowEnd = j;
            else if (
              intervals[j].type === "work" ||
              intervals[j].type === "rest"
            )
              break;
          }
        }
        renderGroups.push({
          type: "looper",
          start: i,
          looperIndex: i,
          end: belowEnd,
          looper: interval,
        });
        i = belowEnd;
      } else {
        renderGroups.push({ type: "standalone", index: i });
      }
      continue;
    }
    if (
      (interval.type === "work" || interval.type === "rest") &&
      getLooperIfTopOfBlock(intervals, interval.id)
    ) {
      const topLooper = getLooperIfTopOfBlock(intervals, interval.id)!;
      const looperIdx = intervals.findIndex((x) => x.id === topLooper.id);
      // Find below-wrapped items
      const belowSet = new Set(topLooper.wrapBelowIntervalIds ?? []);
      let belowEnd = looperIdx;
      if (belowSet.size > 0) {
        for (let j = looperIdx + 1; j < intervals.length; j++) {
          if (intervals[j].type === "looper") break;
          if (belowSet.has(intervals[j].id)) belowEnd = j;
          else if (
            intervals[j].type === "work" ||
            intervals[j].type === "rest"
          )
            break;
        }
      }
      renderGroups.push({
        type: "looper",
        start: i,
        looperIndex: looperIdx,
        end: belowEnd,
        looper: topLooper,
      });
      i = belowEnd;
    } else if (
      (interval.type === "work" || interval.type === "rest") &&
      (getLooperForInterval(intervals, interval.id) ||
        allBelowWrappedIds.has(interval.id))
    ) {
      continue;
    } else {
      renderGroups.push({ type: "standalone", index: i });
    }
  }

  return (
    <div className={`flex flex-col ${showCompactView ? "gap-2.5" : "gap-1"}`}>
      {!showCompactView &&
        intervals.length > 0 &&
        intervals[0].type !== "prep" && (
          <Connector
            aboveId={null}
            belowId={intervals[0].id}
            showGetReadyButton={!intervals.some((i) => i.type === "prep")}
          />
        )}
      {renderGroups.map((group) => {
        if (group.type === "looper") {
          const looperColor = getLooperColor(group.looper.id, intervals);
          // Build ordered indices: above items, below items, then looper card
          const belowSet = new Set(
            group.looper.wrapBelowIntervalIds ?? [],
          );
          const aboveIndices: number[] = [];
          for (
            let k = group.start;
            k < group.looperIndex;
            k++
          ) {
            aboveIndices.push(k);
          }
          const belowIndices: number[] = [];
          for (
            let k = group.looperIndex + 1;
            k <= group.end;
            k++
          ) {
            if (belowSet.has(intervals[k].id)) belowIndices.push(k);
          }
          const renderItems = [
            ...aboveIndices,
            ...belowIndices,
            group.looperIndex,
          ];
          return (
            <div key={group.looper.id} className="flex flex-col gap-1">
              <div
                data-looper-block
                className="flex flex-col gap-1 rounded-2xl p-2"
                style={{ backgroundColor: looperColor }}
              >
                {!showCompactView && (
                  <LooperBlockHandle
                    looper={group.looper}
                    intervals={intervals}
                    extendableIds={getLooperExtendableIds(
                      intervals,
                      group.looper.id,
                    )}
                    currentBlock={
                      group.looper.wrapIntervalIds ??
                      getLooperBlock(intervals, group.looper).map((x) => x.id)
                    }
                    onUpdate={(ids) => updateLooperBlock(group.looper.id, ids)}
                    looperColor={looperColor}
                  />
                )}
                {renderItems.map((index, ri) => {
                  const interval = intervals[index];
                  const isSelected = state.selectedIntervalId === interval.id;
                  const isCurrent =
                    isInPlaybackMode &&
                    (interval.type === "work" ||
                      interval.type === "rest" ||
                      interval.type === "prep") &&
                    currentPlaybackInterval?.id === interval.id;
                  const isLast = ri === renderItems.length - 1;
                  const nextIdx = !isLast
                    ? renderItems[ri + 1]
                    : undefined;

                  return (
                    <div
                      key={interval.id}
                      id={`interval-${interval.id}`}
                      data-interval-id={interval.id}
                      className="flex flex-col"
                    >
                      {isWork(interval) ? (
                        <WorkIntervalCard
                          interval={interval}
                          isSelected={isSelected}
                          isCurrent={isCurrent}
                          isPlaying={showCompactView}
                          looperBorderColor={getLooperBorderColor(
                            interval.id,
                            intervals,
                          )}
                          onSelect={() => handleCardSelect(interval.id)}
                          onPlayFromHere={() => handlePlayFromCard(interval.id)}
                          onDelete={() => deleteInterval(interval.id)}
                          onUpdate={(p) => updateInterval(interval.id, p)}
                        />
                      ) : isLooper(interval) ? (
                        <LooperIntervalCard
                          interval={interval}
                          isSelected={isSelected}
                          isCurrent={isCurrent}
                          isPlaying={showCompactView}
                          intervals={intervals}
                          looperProgress={looperProgressMap.get(interval.id)}
                          onSelect={() => handleCardSelect(interval.id)}
                          onPlayFromHere={() => handlePlayFromCard(interval.id)}
                          onDelete={() => deleteInterval(interval.id)}
                          onUpdate={(p) => updateInterval(interval.id, p)}
                        />
                      ) : isPrep(interval) ? (
                        <PrepIntervalCard
                          interval={interval}
                          isSelected={isSelected}
                          isCurrent={isCurrent}
                          isPlaying={showCompactView}
                          onSelect={() => handleCardSelect(interval.id)}
                          onPlayFromHere={() => handlePlayFromCard(interval.id)}
                          onDelete={() => deleteInterval(interval.id)}
                          onUpdate={(p) => updateInterval(interval.id, p)}
                        />
                      ) : (
                        <RestIntervalCard
                          interval={interval}
                          isSelected={isSelected}
                          isCurrent={isCurrent}
                          isPlaying={showCompactView}
                          looperBorderColor={getLooperBorderColor(
                            interval.id,
                            intervals,
                          )}
                          onSelect={() => handleCardSelect(interval.id)}
                          onPlayFromHere={() => handlePlayFromCard(interval.id)}
                          onDelete={() => deleteInterval(interval.id)}
                          onUpdate={(p) => updateInterval(interval.id, p)}
                        />
                      )}
                      {!showCompactView &&
                        !isLast &&
                        nextIdx !== undefined && (
                          <Connector
                            aboveId={interval.id}
                            belowId={intervals[nextIdx].id}
                          />
                        )}
                    </div>
                  );
                })}
                {!showCompactView && (
                  <LooperBlockBottomHandle
                    looper={group.looper}
                    extendableBelowIds={getLooperBelowExtendableIds(
                      intervals,
                      group.looper.id,
                    )}
                    currentBelowBlock={
                      group.looper.wrapBelowIntervalIds ?? []
                    }
                    onUpdate={(ids) =>
                      updateLooperBlockBelow(group.looper.id, ids)
                    }
                    looperColor={looperColor}
                  />
                )}
              </div>
              {!showCompactView && (
                <Connector
                  aboveId={intervals[group.end].id}
                  belowId={intervals[group.end + 1]?.id ?? undefined}
                />
              )}
            </div>
          );
        }
        const interval = intervals[group.index];
        const isSelected = state.selectedIntervalId === interval.id;
        const isCurrent =
          isInPlaybackMode &&
          (interval.type === "work" ||
            interval.type === "rest" ||
            interval.type === "prep") &&
          currentPlaybackInterval?.id === interval.id;

        return (
          <div
            key={interval.id}
            id={`interval-${interval.id}`}
            data-interval-id={interval.id}
            className="flex flex-col"
          >
            {isWork(interval) ? (
              <WorkIntervalCard
                interval={interval}
                isSelected={isSelected}
                isCurrent={isCurrent}
                isPlaying={showCompactView}
                looperBorderColor={getLooperBorderColor(interval.id, intervals)}
                onSelect={() => handleCardSelect(interval.id)}
                onPlayFromHere={() => handlePlayFromCard(interval.id)}
                onDelete={() => deleteInterval(interval.id)}
                onUpdate={(p) => updateInterval(interval.id, p)}
              />
            ) : isLooper(interval) ? (
              <LooperIntervalCard
                interval={interval}
                isSelected={isSelected}
                isCurrent={isCurrent}
                isPlaying={showCompactView}
                intervals={intervals}
                looperProgress={looperProgressMap.get(interval.id)}
                onSelect={() => handleCardSelect(interval.id)}
                onPlayFromHere={() => handlePlayFromCard(interval.id)}
                onDelete={() => deleteInterval(interval.id)}
                onUpdate={(p) => updateInterval(interval.id, p)}
              />
            ) : isPrep(interval) ? (
              <PrepIntervalCard
                interval={interval}
                isSelected={isSelected}
                isCurrent={isCurrent}
                isPlaying={showCompactView}
                onSelect={() => handleCardSelect(interval.id)}
                onPlayFromHere={() => handlePlayFromCard(interval.id)}
                onDelete={() => deleteInterval(interval.id)}
                onUpdate={(p) => updateInterval(interval.id, p)}
              />
            ) : (
              <RestIntervalCard
                interval={interval}
                isSelected={isSelected}
                isCurrent={isCurrent}
                isPlaying={showCompactView}
                looperBorderColor={getLooperBorderColor(interval.id, intervals)}
                onSelect={() => handleCardSelect(interval.id)}
                onPlayFromHere={() => handlePlayFromCard(interval.id)}
                onDelete={() => deleteInterval(interval.id)}
                onUpdate={(p) => updateInterval(interval.id, p)}
              />
            )}
            {!showCompactView &&
              (group.index < intervals.length - 1 ? (
                <Connector
                  aboveId={interval.id}
                  belowId={intervals[group.index + 1].id}
                />
              ) : (
                <Connector aboveId={interval.id} />
              ))}
          </div>
        );
      })}
      {showCompactView && sets > 1 && (
        <div className="rounded-xl border border-zinc-300 bg-zinc-200/80 px-4 py-2.5 dark:border-zinc-600 dark:bg-zinc-800/80">
          <div className="flex w-full items-center justify-center">
            <span className="font-display text-sm font-semibold text-zinc-700 dark:text-zinc-400">
              Circuit repeat{" "}
              {(isInPlaybackMode ? player.currentSetIndex : 0) + 1} / {sets}
            </span>
          </div>
        </div>
      )}
      {!showCompactView && <SetsRow />}
    </div>
  );
}
