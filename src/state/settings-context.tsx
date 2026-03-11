"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

const BEEP_VOLUME_KEY = "pomobro:beepVolume";
const VOICE_VOLUME_KEY = "pomobro:voiceVolume";

function getStoredBeepVolume(): number {
  if (typeof window === "undefined") return 1;
  const v = parseFloat(localStorage.getItem(BEEP_VOLUME_KEY) ?? "1");
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1;
}

function getStoredVoiceVolume(): number {
  if (typeof window === "undefined") return 1;
  const v = parseFloat(localStorage.getItem(VOICE_VOLUME_KEY) ?? "1");
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1;
}

export function getBeepVolume(): number {
  return getStoredBeepVolume();
}

export function getVoiceVolume(): number {
  return getStoredVoiceVolume();
}

interface SettingsContextValue {
  beepVolume: number;
  voiceVolume: number;
  setBeepVolume: (v: number) => void;
  setVoiceVolume: (v: number) => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [beepVolume, setBeepVolumeState] = useState(1);
  const [voiceVolume, setVoiceVolumeState] = useState(1);

  useEffect(() => {
    setBeepVolumeState(getStoredBeepVolume());
    setVoiceVolumeState(getStoredVoiceVolume());
  }, []);

  const setBeepVolume = (v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setBeepVolumeState(clamped);
    localStorage.setItem(BEEP_VOLUME_KEY, String(clamped));
  };

  const setVoiceVolume = (v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVoiceVolumeState(clamped);
    localStorage.setItem(VOICE_VOLUME_KEY, String(clamped));
  };

  return (
    <SettingsContext.Provider
      value={{ beepVolume, voiceVolume, setBeepVolume, setVoiceVolume }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
