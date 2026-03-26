"use client";

import React, { createContext, useCallback, useContext, useState, useEffect } from "react";

const TUTORIAL_SEEN_KEY = "pomobro:tutorialSeen";

function hasTutorialBeenSeen(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(TUTORIAL_SEEN_KEY) === "true";
}

function markTutorialSeen() {
  if (typeof window !== "undefined") {
    localStorage.setItem(TUTORIAL_SEEN_KEY, "true");
  }
}

export interface TutorialStep {
  /** CSS selector or data-attribute to anchor the popover to */
  target: string;
  title: string;
  description: React.ReactNode;
  /** Preferred placement of the popover */
  placement: "top" | "bottom" | "left" | "right";
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    target: "[data-tutorial='add-first-interval']",
    title: "Add workout interval",
    description:
      "Tap here to add your first exercise. You can add rest breaks and repeat blocks after.",
    placement: "bottom",
  },
  {
    target: "[data-interval-id]",
    title: "Edit your interval",
    description:
      "Tap the title to rename it. You can also change the duration, color, and sound settings.",
    placement: "bottom",
  },
  {
    target: "[data-tutorial='add-buttons']",
    title: "Add more intervals",
    description: React.createElement("div", { className: "flex flex-col gap-2.5" },
      React.createElement("div", { className: "flex items-center gap-3" },
        React.createElement("span", { className: "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-950/60" },
          React.createElement("svg", { className: "h-3.5 w-3.5 text-teal-600 dark:text-teal-400", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", strokeWidth: 2 },
            React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" })
          )
        ),
        React.createElement("span", null, React.createElement("strong", null, "Get Ready"), " — countdown before start")
      ),
      React.createElement("div", { className: "flex items-center gap-3" },
        React.createElement("span", { className: "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-950/60" },
          React.createElement("svg", { className: "h-3.5 w-3.5 text-sky-600 dark:text-sky-400", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", strokeWidth: 2 },
            React.createElement("line", { x1: "4", y1: "12", x2: "20", y2: "12", strokeLinecap: "round" }),
            React.createElement("rect", { x: "1", y: "9", width: "4", height: "6", rx: "1", strokeLinejoin: "round" }),
            React.createElement("rect", { x: "19", y: "9", width: "4", height: "6", rx: "1", strokeLinejoin: "round" })
          )
        ),
        React.createElement("span", null, React.createElement("strong", null, "Workout"), " — an exercise interval")
      ),
      React.createElement("div", { className: "flex items-center gap-3" },
        React.createElement("span", { className: "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950/60" },
          React.createElement("svg", { className: "h-3.5 w-3.5 text-violet-600 dark:text-violet-400", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", strokeWidth: 2 },
            React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" })
          )
        ),
        React.createElement("span", null, React.createElement("strong", null, "Rest"), " — a break between exercises")
      ),
      React.createElement("div", { className: "flex items-center gap-3" },
        React.createElement("span", { className: "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/60" },
          React.createElement("svg", { className: "h-3.5 w-3.5 text-amber-600 dark:text-amber-400", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", strokeWidth: 2 },
            React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M4 12l1.5 1.5L12 7M20 12l-1.5-1.5L12 17" })
          )
        ),
        React.createElement("span", null, React.createElement("strong", null, "Loop"), " — repeat a group of intervals")
      )
    ),
    placement: "top",
  },
  {
    target: "[data-tutorial='timer-panel']",
    title: "Timer",
    description:
      "Shows your workout progress while running — countdown, current interval, and what's coming next.",
    placement: "left",
  },
  {
    target: "[data-tutorial='play-button']",
    title: "Start",
    description:
      "Hit Start to begin. Voice announces each exercise automatically. Pause or reset anytime.",
    placement: "top",
  },
];

interface TutorialContextValue {
  /** Current step index, -1 if tutorial is not active */
  currentStep: number;
  steps: TutorialStep[];
  isActive: boolean;
  nextStep: () => void;
  skipTutorial: () => void;
  startTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextValue | undefined>(
  undefined,
);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [currentStep, setCurrentStep] = useState(-1);

  const isActive = currentStep >= 0 && currentStep < TUTORIAL_STEPS.length;

  const startTutorial = useCallback(() => {
    setCurrentStep(0);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      const next = prev + 1;
      if (next >= TUTORIAL_STEPS.length) {
        markTutorialSeen();
        return -1;
      }
      return next;
    });
  }, []);

  const skipTutorial = useCallback(() => {
    markTutorialSeen();
    setCurrentStep(-1);
  }, []);

  // Auto-start when provider mounts and tutorial hasn't been seen.
  // Single effect that reads localStorage directly — avoids Strict Mode double-mount issues.
  useEffect(() => {
    if (hasTutorialBeenSeen()) return;
    // Small delay to let the editor render first
    const timer = setTimeout(() => {
      setCurrentStep(0);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <TutorialContext.Provider
      value={{
        currentStep,
        steps: TUTORIAL_STEPS,
        isActive,
        nextStep,
        skipTutorial,
        startTutorial,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx)
    throw new Error("useTutorial must be used within a TutorialProvider");
  return ctx;
}
