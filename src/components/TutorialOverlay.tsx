"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTutorial, type TutorialStep } from "@/state/tutorial-context";
import { useWorkout } from "@/state/workout-context";
import { usePhonePlaybackView, useIsMobile } from "@/state/phone-playback-view-context";

function Popover({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onSkip,
}: {
  step: TutorialStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [arrowPos, setArrowPos] = useState<"top" | "bottom" | "left" | "right">(
    "top",
  );
  const popoverRef = useRef<HTMLDivElement>(null);
  const isLast = stepIndex === totalSteps - 1;

  useEffect(() => {
    const updatePosition = () => {
      if (!popoverRef.current) return;
      const target = document.querySelector(step.target);
      const popRect = popoverRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // If target is missing or hidden, center the popover as a modal
      if (!target) {
        setPos({ top: vh / 2 - popRect.height / 2, left: vw / 2 - popRect.width / 2 });
        setArrowPos("top");
        return;
      }
      const targetRect = target.getBoundingClientRect();
      const isHidden = targetRect.width === 0 && targetRect.height === 0;
      if (isHidden) {
        setPos({ top: vh / 2 - popRect.height / 2, left: vw / 2 - popRect.width / 2 });
        setArrowPos("top");
        return;
      }

      const gap = 12;
      let top = 0;
      let left = 0;
      let arrow: "top" | "bottom" | "left" | "right" = "top";

      // Try preferred placement, then fall back
      const place = step.placement;
      if (place === "bottom" && targetRect.bottom + gap + popRect.height < vh) {
        top = targetRect.bottom + gap;
        left = targetRect.left + targetRect.width / 2 - popRect.width / 2;
        arrow = "top";
      } else if (
        place === "top" &&
        targetRect.top - gap - popRect.height > 0
      ) {
        top = targetRect.top - gap - popRect.height;
        left = targetRect.left + targetRect.width / 2 - popRect.width / 2;
        arrow = "bottom";
      } else if (
        place === "left" &&
        targetRect.left - gap - popRect.width > 0
      ) {
        top = targetRect.top + targetRect.height / 2 - popRect.height / 2;
        left = targetRect.left - gap - popRect.width;
        arrow = "right";
      } else if (place === "right" && targetRect.right + gap + popRect.width < vw) {
        top = targetRect.top + targetRect.height / 2 - popRect.height / 2;
        left = targetRect.right + gap;
        arrow = "left";
      } else {
        // Fallback: below
        top = targetRect.bottom + gap;
        left = targetRect.left + targetRect.width / 2 - popRect.width / 2;
        arrow = "top";
      }

      // Keep within viewport with padding
      const pad = 12;
      left = Math.max(pad, Math.min(left, vw - popRect.width - pad));
      top = Math.max(pad, Math.min(top, vh - popRect.height - pad));

      setPos({ top, left });
      setArrowPos(arrow);
    };

    updatePosition();
    // Re-position on scroll/resize
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    const raf = requestAnimationFrame(updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
      cancelAnimationFrame(raf);
    };
  }, [step.target, step.placement]);

  // Highlight target element: elevate it above the backdrop overlay
  useEffect(() => {
    const target = document.querySelector(step.target);
    if (!target) return;
    const el = target as HTMLElement;
    const prev = {
      position: el.style.position,
      zIndex: el.style.zIndex,
      borderRadius: el.style.borderRadius,
    };
    el.style.position = "relative";
    el.style.zIndex = "1001";
    el.style.borderRadius = "12px";

    // If the target is inside a fixed/absolute positioned ancestor,
    // elevate that ancestor too so the z-index actually escapes to the root stacking context.
    const saved: { el: HTMLElement; zIndex: string }[] = [];
    let parent = el.parentElement;
    while (parent && parent !== document.body) {
      const pos = getComputedStyle(parent).position;
      if (pos === "fixed" || pos === "absolute") {
        saved.push({ el: parent, zIndex: parent.style.zIndex });
        parent.style.zIndex = "1001";
      }
      parent = parent.parentElement;
    }

    // Scroll target into view
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    return () => {
      el.style.position = prev.position;
      el.style.zIndex = prev.zIndex;
      el.style.borderRadius = prev.borderRadius;
      for (const s of saved) {
        s.el.style.zIndex = s.zIndex;
      }
    };
  }, [step.target]);

  const arrowClass = {
    top: "absolute left-1/2 -top-2 -translate-x-1/2 border-8 border-transparent border-b-white dark:border-b-zinc-800",
    bottom:
      "absolute left-1/2 -bottom-2 -translate-x-1/2 border-8 border-transparent border-t-white dark:border-t-zinc-800",
    left: "absolute top-1/2 -left-2 -translate-y-1/2 border-8 border-transparent border-r-white dark:border-r-zinc-800",
    right:
      "absolute top-1/2 -right-2 -translate-y-1/2 border-8 border-transparent border-l-white dark:border-l-zinc-800",
  };

  return createPortal(
    <>
      {/* Full-screen backdrop — sits below the elevated target (z-1001) and popover (z-1100) */}
      <div className="fixed inset-0 z-[1000] bg-black/50" />
      <div
        ref={popoverRef}
        className="fixed z-[1100] w-[min(340px,calc(100vw-24px))] animate-in fade-in slide-in-from-bottom-2 duration-200"
        style={{ top: pos.top, left: pos.left }}
      >
      <div className="relative rounded-xl bg-white p-5 shadow-2xl dark:bg-zinc-800">
        <div className={arrowClass[arrowPos]} />
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
            {stepIndex + 1}
          </span>
          <h3 className="font-display text-base font-bold text-zinc-900 dark:text-zinc-100">
            {step.title}
          </h3>
        </div>
        <div className="mb-4 text-sm font-medium leading-relaxed text-zinc-700 dark:text-zinc-300">
          {step.description}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
            {stepIndex + 1} of {totalSteps}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSkip}
              className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={onNext}
              className="cursor-pointer rounded-lg bg-primary-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-500 dark:bg-primary-500 dark:hover:bg-primary-400"
            >
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
    </>,
    document.body,
  );
}

export function TutorialOverlay() {
  const { isActive, currentStep, steps, nextStep, skipTutorial } =
    useTutorial();
  const { state: workoutState, addWorkAfter } = useWorkout();
  const { view, setView } = usePhonePlaybackView();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const savedViewRef = useRef<"cards" | "player" | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-flip phone view to "player" on Timer/Start steps (indices 3, 4)
  useEffect(() => {
    if (!isMobile || !isActive) return;
    const needsPlayerView = currentStep === 3 || currentStep === 4;
    if (needsPlayerView && view !== "player") {
      savedViewRef.current = view;
      setView("player");
    } else if (!needsPlayerView && savedViewRef.current !== null && view === "player") {
      setView(savedViewRef.current);
      savedViewRef.current = null;
    }
  }, [isMobile, isActive, currentStep, view, setView]);

  // Restore view when tutorial ends or is skipped
  useEffect(() => {
    if (!isMobile) return;
    if (!isActive && savedViewRef.current !== null) {
      setView(savedViewRef.current);
      savedViewRef.current = null;
    }
  }, [isMobile, isActive, setView]);

  if (!mounted || !isActive || currentStep < 0 || currentStep >= steps.length)
    return null;

  const step = steps[currentStep];

  // On step 1: clicking Next should also create a workout interval if none exist
  const handleNext = () => {
    if (currentStep === 0 && workoutState.workout.intervals.length === 0) {
      addWorkAfter(null);
    }
    nextStep();
  };

  return (
    <Popover
      key={currentStep}
      step={step}
      stepIndex={currentStep}
      totalSteps={steps.length}
      onNext={handleNext}
      onSkip={skipTutorial}
    />
  );
}
