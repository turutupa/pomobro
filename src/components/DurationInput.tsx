"use client";

import { useState, useEffect, useRef } from "react";

interface DurationInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  containerClassName?: string;
  inputClassName?: string;
  suffixClassName?: string;
}

export function DurationInput({
  value,
  onChange,
  min = 1,
  max = 999,
  containerClassName = "",
  inputClassName = "",
  suffixClassName = "",
}: DurationInputProps) {
  const [local, setLocal] = useState(String(value));

  useEffect(() => {
    setLocal(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const n = parseInt(raw, 10);
    if (Number.isNaN(n) || raw === "") {
      onChange(min);
      setLocal(String(min));
    } else {
      const clamped = Math.max(min, Math.min(max, n));
      onChange(clamped);
      setLocal(String(clamped));
    }
  };

  const valueRef = useRef(value);
  const parsed = Number.isNaN(parseInt(local, 10))
    ? value
    : Math.max(min, Math.min(max, parseInt(local, 10)));
  valueRef.current = parsed;

  const decrement = () => {
    const current = valueRef.current;
    const next = Math.max(min, current - 1);
    if (next !== current) {
      valueRef.current = next;
      onChange(next);
      setLocal(String(next));
    }
  };

  const increment = () => {
    const current = valueRef.current;
    const next = Math.min(max, current + 1);
    if (next !== current) {
      valueRef.current = next;
      onChange(next);
      setLocal(String(next));
    }
  };

  const repeatRef = useRef<{
    timeout: ReturnType<typeof setTimeout>;
    interval: ReturnType<typeof setInterval>;
  } | null>(null);

  const clearRepeat = () => {
    if (repeatRef.current) {
      clearTimeout(repeatRef.current.timeout);
      clearInterval(repeatRef.current.interval);
      repeatRef.current = null;
    }
  };

  const startDecrementRepeat = (e: React.PointerEvent) => {
    e.stopPropagation();
    decrement();
    repeatRef.current = {
      timeout: setTimeout(() => {
        repeatRef.current!.interval = setInterval(decrement, 80);
      }, 400),
      interval: 0 as unknown as ReturnType<typeof setInterval>,
    };
  };

  const startIncrementRepeat = (e: React.PointerEvent) => {
    e.stopPropagation();
    increment();
    repeatRef.current = {
      timeout: setTimeout(() => {
        repeatRef.current!.interval = setInterval(increment, 80);
      }, 400),
      interval: 0 as unknown as ReturnType<typeof setInterval>,
    };
  };

  useEffect(() => () => clearRepeat(), []);

  const buttonClass = `flex min-h-[52px] min-w-[52px] shrink-0 cursor-pointer items-center justify-center rounded-xl text-2xl font-semibold transition-colors hover:opacity-90 active:opacity-70 touch-manipulation select-none bg-white/25 ${suffixClassName}`;

  return (
    <div
      className={`flex w-full items-center justify-center gap-3 rounded-lg py-2.5 ${containerClassName}`}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="flex-1 min-w-0" aria-hidden />
      <button
        type="button"
        onPointerDown={startDecrementRepeat}
        onPointerUp={clearRepeat}
        onPointerLeave={clearRepeat}
        onPointerCancel={clearRepeat}
        onContextMenu={(e) => e.preventDefault()}
        className={buttonClass}
        aria-label="Decrease duration"
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        className={`min-h-[52px] min-w-[4rem] max-w-[5rem] w-auto rounded-xl bg-white/25 px-4 text-right text-2xl font-semibold focus:outline-none ${inputClassName}`}
        value={local}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "");
          setLocal(v);
        }}
        onBlur={() => commit(local)}
        onKeyDown={(e) => e.key === "Enter" && commit(local)}
        onClick={(e) => e.stopPropagation()}
        onFocus={(e) => {
          e.target.setSelectionRange(
            e.target.value.length,
            e.target.value.length,
          );
        }}
      />
      <button
        type="button"
        onPointerDown={startIncrementRepeat}
        onPointerUp={clearRepeat}
        onPointerLeave={clearRepeat}
        onPointerCancel={clearRepeat}
        onContextMenu={(e) => e.preventDefault()}
        className={buttonClass}
        aria-label="Increase duration"
      >
        +
      </button>
      <span className="flex-1 min-w-0" aria-hidden />
    </div>
  );
}
