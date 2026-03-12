"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useWorkout } from "@/state/workout-context";
import { usePlayer } from "@/state/player-context";
import { usePrepEnabled } from "@/state/prep-enabled-context";
import { Interval, WorkInterval, RestInterval, type BeepSoundType } from "@/domain/workout";
import { DurationInput } from "./DurationInput";

const PRESET_COLORS = [
  "#0d9488", // teal
  "#14b8a6", // teal-500
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

function getLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function isWork(interval: Interval): interval is WorkInterval {
  return interval.type === "work";
}

function PrepEnabledRow() {
  const { prepEnabled, setPrepEnabled } = usePrepEnabled();
  return (
    <div className="mb-3 flex items-center justify-between rounded-xl border border-zinc-200/80 bg-zinc-50/60 px-4 py-3 dark:border-zinc-700/80 dark:bg-zinc-800/40">
      <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
        Get ready countdown
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={prepEnabled}
        onClick={() => setPrepEnabled(!prepEnabled)}
        className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
          prepEnabled ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            prepEnabled ? "left-6 translate-x-[-100%]" : "left-1"
          }`}
        />
      </button>
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
              className="fixed z-[101] flex flex-wrap gap-2 rounded-xl border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
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
          document.body
        )}
    </div>
  );
}

interface WorkIntervalCardProps {
  interval: WorkInterval;
  isSelected: boolean;
  isCurrent: boolean;
  isPlaying: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<WorkInterval>) => void;
}

function WorkIntervalCard({
  interval,
  isSelected,
  isCurrent,
  isPlaying,
  onSelect,
  onDelete,
  onUpdate,
}: WorkIntervalCardProps) {
  const { state, clearLastAddedIntervalId } = useWorkout();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const color = interval.color ?? DEFAULT_WORK_COLOR;
  const isLight = getLuminance(color) > 0.6;
  const textClass = isLight ? "text-zinc-900" : "text-white";
  const mutedClass = isLight ? "text-zinc-600" : "text-white/80";

  useEffect(() => {
    if (state.lastAddedIntervalId === interval.id) {
      titleInputRef.current?.focus();
      clearLastAddedIntervalId();
    }
  }, [state.lastAddedIntervalId, interval.id, clearLastAddedIntervalId]);

  if (isPlaying) {
    return (
      <div
        className={`flex w-full items-center justify-between gap-3 overflow-hidden rounded-xl border-2 px-4 ${
          isCurrent
            ? "border-teal-400 py-5 md:ring-2 md:ring-teal-400 md:ring-offset-2 dark:border-teal-400 dark:md:ring-offset-zinc-950"
            : "border-transparent py-3"
        }`}
        style={{ backgroundColor: color }}
      >
        <span
          className={`font-display truncate ${isCurrent ? "text-xl font-bold md:text-2xl" : "text-base font-semibold"} ${textClass}`}
        >
          {interval.title || "Work"}
        </span>
        <span
          className={`shrink-0 font-medium ${isCurrent ? "text-base md:text-lg" : "text-sm"} ${mutedClass}`}
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
          ? "border-teal-400 md:ring-2 md:ring-teal-400 md:ring-offset-2 dark:border-teal-400 dark:md:ring-offset-zinc-950"
          : "border-transparent"
      }`}
      style={{
        backgroundColor: color,
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
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              placeholder="Exercise name"
              onClick={(e) => e.stopPropagation()}
            />
            <div className={`mt-1 flex w-full items-center justify-center py-1 rounded-lg ${mutedClass}`}>
              <DurationInput
                value={interval.durationSeconds}
                onChange={(v) => onUpdate({ durationSeconds: v })}
                containerClassName="bg-white/20 min-h-[2.75rem] md:min-h-[3rem]"
                inputClassName={textClass}
                suffixClassName={mutedClass}
              />
            </div>
            {!expanded && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 px-3">
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
                  className={`cursor-pointer rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors hover:bg-white/30 ${interval.voice?.mute ? "bg-white/15 text-white/60" : "bg-white/25 text-white"}`}
                >
                  Voice {interval.voice?.mute ? "Off" : "On"}
                </button>
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
                  className={`cursor-pointer rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors hover:bg-white/30 ${interval.voice?.beep ? "bg-white/25 text-white" : "bg-white/15 text-white/60"}`}
                >
                  Beep {interval.voice?.beep ? interval.voice.beepSound ?? "beep" : "Off"}
                </button>
                {interval.description && (
                  <span className="max-w-[120px] truncate rounded-full px-2 py-0.5 text-[10px] text-white/80" title={interval.description}>
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className={`cursor-pointer rounded-lg p-2 transition-colors hover:bg-red-500/30 ${mutedClass}`}
              aria-label="Delete"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {expanded && (
          <div
            className="mt-3 flex flex-col gap-3 rounded-xl bg-white/15 p-3 backdrop-blur-sm"
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
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  interval.voice?.mute
                    ? "bg-white/20 text-white/70"
                    : "bg-white/30 text-white"
                }`}
              >
                {interval.voice?.mute ? "Off" : "On"}
              </button>
            </div>
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
                  className="cursor-pointer rounded-lg border-0 bg-white/20 px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-white/50"
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
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    interval.voice?.beep
                      ? "bg-white/30 text-white"
                      : "bg-white/20 text-white/70"
                  }`}
                >
                  {interval.voice?.beep ? "On" : "Off"}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className={`text-xs font-medium ${mutedClass}`}>Description</span>
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
      </div>
    </div>
  );
}

interface RestIntervalCardProps {
  interval: RestInterval;
  isSelected: boolean;
  isCurrent: boolean;
  isPlaying: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<RestInterval>) => void;
}

function RestIntervalCard({
  interval,
  isSelected,
  isCurrent,
  isPlaying,
  onSelect,
  onDelete,
  onUpdate,
}: RestIntervalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const color = interval.color ?? DEFAULT_REST_COLOR;
  const isLight = getLuminance(color) > 0.6;
  const textClass = isLight ? "text-zinc-900" : "text-white";
  const mutedClass = isLight ? "text-zinc-600" : "text-white/80";

  if (isPlaying) {
    return (
      <div
        className={`flex w-full items-center justify-between gap-3 overflow-hidden rounded-xl border-2 px-4 ${
          isCurrent
            ? "border-teal-400 py-5 md:ring-2 md:ring-teal-400 md:ring-offset-2 dark:border-teal-400 dark:md:ring-offset-zinc-950"
            : "border-transparent py-3"
        }`}
        style={{ backgroundColor: color }}
      >
        <span
          className={`font-display ${isCurrent ? "text-xl font-bold md:text-2xl" : "text-base font-semibold"} ${textClass}`}
        >
          Rest
        </span>
        <span
          className={`shrink-0 font-medium ${isCurrent ? "text-base md:text-lg" : "text-sm"} ${mutedClass}`}
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
          ? "border-teal-400 md:ring-2 md:ring-teal-400 md:ring-offset-2 dark:border-teal-400 dark:md:ring-offset-zinc-950"
          : "border-transparent"
      }`}
      style={{
        backgroundColor: color,
      }}
    >
      <div className="flex flex-col gap-1 px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className={`font-display px-3 py-1 text-lg font-bold ${textClass}`}>Rest</div>
            <div className={`mt-1 flex w-full items-center justify-center py-1 rounded-lg ${mutedClass}`}>
              <DurationInput
                value={interval.durationSeconds}
                onChange={(v) => onUpdate({ durationSeconds: v })}
                containerClassName="bg-white/20 min-h-[2.75rem] md:min-h-[3rem]"
                inputClassName={textClass}
                suffixClassName={mutedClass}
              />
            </div>
            {!expanded && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 px-3">
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
                  className={`cursor-pointer rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors hover:bg-white/30 ${interval.voice?.mute ? "bg-white/15 text-white/60" : "bg-white/25 text-white"}`}
                >
                  Voice {interval.voice?.mute ? "Off" : "On"}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate({ beep: !interval.beep });
                  }}
                  className={`cursor-pointer rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors hover:bg-white/30 ${interval.beep ? "bg-white/25 text-white" : "bg-white/15 text-white/60"}`}
                >
                  Beep {interval.beep ? interval.beepSound ?? "beep" : "Off"}
                </button>
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className={`cursor-pointer rounded-lg p-2 transition-colors hover:bg-red-500/30 ${mutedClass}`}
              aria-label="Delete"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {expanded && (
          <div
            className="mt-3 flex flex-col gap-3 rounded-xl bg-white/15 p-3 backdrop-blur-sm"
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
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  interval.voice?.mute
                    ? "bg-white/20 text-white/70"
                    : "bg-white/30 text-white"
                }`}
              >
                {interval.voice?.mute ? "Off" : "On"}
              </button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-medium ${mutedClass}`}>Beep</span>
              <div className="flex items-center gap-1">
                <select
                  value={interval.beepSound ?? "beep"}
                  onChange={(e) =>
                    onUpdate({ beepSound: e.target.value as BeepSoundType })
                  }
                  className="cursor-pointer rounded-lg border-0 bg-white/20 px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-white/50"
                >
                  <option value="beep">Beep</option>
                  <option value="chime">Chime</option>
                  <option value="bell">Bell</option>
                </select>
                <button
                  type="button"
                  onClick={() => onUpdate({ beep: !interval.beep })}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    interval.beep
                      ? "bg-white/30 text-white"
                      : "bg-white/20 text-white/70"
                  }`}
                >
                  {interval.beep ? "On" : "Off"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Connector({
  aboveId,
  belowId,
}: {
  aboveId: string;
  belowId?: string | null;
}) {
  const { state, addWorkAfter, addRestAfter, addRestBetween } = useWorkout();
  const above = state.workout.intervals.find((i) => i.id === aboveId);
  const below = belowId ? state.workout.intervals.find((i) => i.id === belowId) : null;
  const canAddRest = above && isWork(above) && (!below || isWork(below));

  return (
    <div className="flex justify-center py-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => addWorkAfter(aboveId)}
          className="cursor-pointer flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600 shadow-sm transition-all hover:scale-105 hover:bg-sky-100 hover:shadow-md dark:bg-sky-950/50 dark:text-sky-400 dark:hover:bg-sky-900/50"
          aria-label="Add work interval"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          </svg>
        </button>
        {canAddRest && (
          <button
            type="button"
            onClick={() =>
              belowId && below && isWork(below) ? addRestBetween(belowId) : addRestAfter(aboveId)
            }
            className="cursor-pointer flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600 shadow-sm transition-all hover:scale-105 hover:bg-violet-100 hover:shadow-md dark:bg-violet-950/50 dark:text-violet-400 dark:hover:bg-violet-900/50"
            aria-label="Add rest"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          </button>
        )}
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
  } = useWorkout();
  const { state: player } = usePlayer();
  const { intervals } = state.workout;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!player.isRunning) return;
    if (window.innerWidth >= 768) return;
    const current = intervals[player.currentIndex];
    if (!current) return;
    const el = document.getElementById(`interval-${current.id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [player.currentIndex, player.isRunning, intervals]);

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
      <div className="flex flex-col items-center justify-center gap-4 py-8 text-center md:gap-5 md:rounded-2xl md:border-2 md:border-dashed md:border-zinc-300 md:bg-zinc-50/80 md:px-6 md:py-12 dark:md:border-zinc-700 dark:md:bg-zinc-900/50">
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Start your first workout interval
        </p>
        <button
          type="button"
          onClick={() => addWorkAfter(null)}
          className="cursor-pointer rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          + Add work interval
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${player.isRunning ? "gap-2.5" : "gap-1"}`}>
      {!player.isRunning && <PrepEnabledRow />}
      {intervals.map((interval, index) => {
        const isSelected = state.selectedIntervalId === interval.id;
        const isCurrent = player.isRunning && index === player.currentIndex;

        return (
          <div
            key={interval.id}
            id={`interval-${interval.id}`}
            className="flex flex-col"
          >
            {isWork(interval) ? (
              <WorkIntervalCard
                interval={interval}
                isSelected={isSelected}
                isCurrent={isCurrent}
                isPlaying={player.isRunning}
                onSelect={() => selectInterval(interval.id)}
                onDelete={() => deleteInterval(interval.id)}
                onUpdate={(p) => updateInterval(interval.id, p)}
              />
            ) : (
              <RestIntervalCard
                interval={interval}
                isSelected={isSelected}
                isCurrent={isCurrent}
                isPlaying={player.isRunning}
                onSelect={() => selectInterval(interval.id)}
                onDelete={() => deleteInterval(interval.id)}
                onUpdate={(p) => updateInterval(interval.id, p)}
              />
            )}
            {!player.isRunning &&
              (index < intervals.length - 1 ? (
                <Connector
                  aboveId={interval.id}
                  belowId={intervals[index + 1].id}
                />
              ) : (
                <Connector aboveId={interval.id} />
              ))}
          </div>
        );
      })}
    </div>
  );
}
