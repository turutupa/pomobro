"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface PreviewModeContextValue {
  previewMode: boolean;
  setPreviewMode: (v: boolean) => void;
  togglePreviewMode: () => void;
}

const PreviewModeContext = createContext<PreviewModeContextValue | undefined>(
  undefined,
);

export function PreviewModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [previewMode, setPreviewMode] = useState(false);

  const togglePreviewMode = useCallback(() => {
    setPreviewMode((prev) => !prev);
  }, []);

  return (
    <PreviewModeContext.Provider
      value={{ previewMode, setPreviewMode, togglePreviewMode }}
    >
      {children}
    </PreviewModeContext.Provider>
  );
}

export function usePreviewMode() {
  const ctx = useContext(PreviewModeContext);
  if (!ctx) {
    throw new Error("usePreviewMode must be used within PreviewModeProvider");
  }
  return ctx;
}
