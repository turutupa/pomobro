"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "pomobro:prepEnabled";

interface PrepEnabledContextValue {
  prepEnabled: boolean;
  setPrepEnabled: (enabled: boolean) => void;
}

const PrepEnabledContext = createContext<PrepEnabledContextValue | undefined>(
  undefined,
);

export function PrepEnabledProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [prepEnabled, setPrepEnabledState] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    setPrepEnabledState(stored !== "false");
  }, []);

  const setPrepEnabled = (enabled: boolean) => {
    setPrepEnabledState(enabled);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    }
  };

  return (
    <PrepEnabledContext.Provider value={{ prepEnabled, setPrepEnabled }}>
      {children}
    </PrepEnabledContext.Provider>
  );
}

export function usePrepEnabled() {
  const ctx = useContext(PrepEnabledContext);
  if (!ctx)
    throw new Error("usePrepEnabled must be used within PrepEnabledProvider");
  return ctx;
}
