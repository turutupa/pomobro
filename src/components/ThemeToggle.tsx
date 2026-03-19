"use client";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme, resolved } = useTheme();

  return (
    <div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100/80 p-0.5 dark:border-zinc-700 dark:bg-zinc-800/80">
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
          resolved === "light"
            ? "bg-white text-zinc-900 shadow-sm hover:bg-zinc-50 dark:bg-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-500"
            : "text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
        }`}
        aria-label="Light mode"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
          resolved === "dark"
            ? "bg-zinc-600 text-white shadow-sm hover:bg-zinc-500 dark:bg-zinc-500 dark:text-zinc-100 dark:hover:bg-zinc-400"
            : "text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
        }`}
        aria-label="Dark mode"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      </button>
    </div>
  );
}
