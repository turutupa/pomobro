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

  const containerRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  const parsed = Number.isNaN(parseInt(local, 10)) ? value : Math.max(min, Math.min(max, parseInt(local, 10)));
  valueRef.current = parsed;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const current = valueRef.current;
      const delta = e.deltaY < 0 ? 1 : -1;
      const next = Math.max(min, Math.min(max, current + delta));
      if (next !== current) {
        onChange(next);
        setLocal(String(next));
      }
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [min, max, onChange]);

  return (
    <div
      ref={containerRef}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-2.5 ${containerClassName}`}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        className={`min-w-[2.75rem] w-12 rounded bg-transparent text-right text-base font-semibold focus:outline-none md:min-w-[3rem] md:w-14 md:text-lg ${inputClassName}`}
        value={local}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "");
          setLocal(v);
        }}
        onBlur={() => commit(local)}
        onKeyDown={(e) => e.key === "Enter" && commit(local)}
        onClick={(e) => e.stopPropagation()}
        onFocus={(e) => {
          e.target.setSelectionRange(e.target.value.length, e.target.value.length);
        }}
      />
      <span className={`text-sm font-medium md:text-base ${suffixClassName}`}>s</span>
    </div>
  );
}
