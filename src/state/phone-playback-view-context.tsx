"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

const STORAGE_KEY = "pomobro:phonePlaybackView";
const MOBILE_BREAKPOINT = 768;

export type PhonePlaybackView = "cards" | "player";

function getStoredView(): PhonePlaybackView {
  if (typeof window === "undefined") return "cards";
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "player" ? "player" : "cards";
}

interface PhonePlaybackViewContextValue {
  view: PhonePlaybackView;
  setView: (v: PhonePlaybackView) => void;
  toggleView: () => void;
}

const PhonePlaybackViewContext = createContext<
  PhonePlaybackViewContextValue | undefined
>(undefined);

export function PhonePlaybackViewProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [view, setViewState] = useState<PhonePlaybackView>("cards");

  useEffect(() => {
    setViewState(getStoredView());
  }, []);

  const setView = useCallback((v: PhonePlaybackView) => {
    setViewState(v);
    localStorage.setItem(STORAGE_KEY, v);
  }, []);

  const toggleView = useCallback(() => {
    setViewState((prev) => {
      const next = prev === "cards" ? "player" : "cards";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return (
    <PhonePlaybackViewContext.Provider value={{ view, setView, toggleView }}>
      {children}
    </PhonePlaybackViewContext.Provider>
  );
}

export function usePhonePlaybackView() {
  const ctx = useContext(PhonePlaybackViewContext);
  if (!ctx)
    throw new Error(
      "usePhonePlaybackView must be used within PhonePlaybackViewProvider",
    );
  return ctx;
}

/** Returns true when viewport width < 768px (Tailwind md breakpoint). */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    setIsMobile(mq.matches);
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}
