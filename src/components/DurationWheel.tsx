"use client";

import { useRef, useEffect, useCallback, useState } from "react";

interface DurationWheelProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  containerClassName?: string;
  valueClassName?: string;
  suffixClassName?: string;
}

const ROW_HEIGHT = 36;
const VISIBLE_ROWS = 5;
const WHEEL_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS;

export function DurationWheel({
  value,
  onChange,
  min = 1,
  max = 999,
  step = 1,
  containerClassName = "",
  valueClassName = "",
  suffixClassName = "",
}: DurationWheelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const options = Array.from(
    { length: Math.floor((max - min) / step) + 1 },
    (_, i) => min + i * step,
  );
  const paddingTop = (WHEEL_HEIGHT - ROW_HEIGHT) / 2;

  const scrollToValue = useCallback(
    (val: number) => {
      const el = scrollRef.current;
      if (!el) return;
      const idx = options.indexOf(val);
      if (idx === -1) return;
      const targetScroll = idx * ROW_HEIGHT;
      el.scrollTo({ top: targetScroll, behavior: "smooth" });
    },
    [options],
  );

  useEffect(() => {
    if (!isOpen) return;
    scrollToValue(value);
  }, [isOpen, value, scrollToValue]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollTop / ROW_HEIGHT);
    const clamped = Math.max(0, Math.min(options.length - 1, index));
    const newValue = options[clamped];
    if (newValue !== value) onChange(newValue);
  }, [value, onChange, options]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop += -e.deltaY;
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => handleScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [handleScroll]);

  return (
    <div className={`flex items-center gap-1 ${containerClassName}`}>
      <div className="relative select-none">
        {!isOpen ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(true);
            }}
            className={`flex cursor-pointer items-baseline gap-0.5 rounded-md px-2 py-1 transition-colors hover:bg-white/20 ${valueClassName}`}
            aria-label={
              isOpen ? "Close duration picker" : "Open duration picker"
            }
            aria-expanded={isOpen}
            aria-haspopup="listbox"
          >
            <span className="tabular-nums text-sm font-semibold">{value}</span>
            <span className={`text-xs ${suffixClassName}`}>s</span>
          </button>
        ) : (
          <div
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="relative overflow-hidden rounded-lg bg-black/20"
              style={{ height: WHEEL_HEIGHT, width: 56 }}
              onWheel={handleWheel}
            >
              {/* Center highlight */}
              <div
                className="pointer-events-none absolute left-0 right-0 z-10 flex items-center justify-center rounded"
                style={{
                  top: (WHEEL_HEIGHT - ROW_HEIGHT) / 2,
                  height: ROW_HEIGHT,
                  background: "rgba(255,255,255,0.15)",
                }}
              />
              {/* Top/bottom fade */}
              <div
                className="pointer-events-none absolute left-0 right-0 z-20"
                style={{
                  top: 0,
                  height: (WHEEL_HEIGHT - ROW_HEIGHT) / 2,
                  background:
                    "linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)",
                }}
              />
              <div
                className="pointer-events-none absolute left-0 right-0 z-20"
                style={{
                  bottom: 0,
                  height: (WHEEL_HEIGHT - ROW_HEIGHT) / 2,
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.4), transparent)",
                }}
              />
              <div
                ref={scrollRef}
                className="absolute inset-0 overflow-x-hidden overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                style={{
                  scrollSnapType: "y mandatory",
                  scrollPaddingTop: paddingTop,
                  paddingTop,
                  paddingBottom: paddingTop,
                }}
              >
                {options.map((option) => (
                  <div
                    key={option}
                    className={`flex shrink-0 items-center justify-center tabular-nums text-sm font-semibold ${valueClassName}`}
                    style={{
                      height: ROW_HEIGHT,
                      scrollSnapAlign: "center",
                    }}
                  >
                    {option}
                  </div>
                ))}
              </div>
            </div>
            <span className={`text-xs ${suffixClassName}`}>s</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="rounded p-1 text-xs font-medium opacity-80 hover:bg-white/20"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
