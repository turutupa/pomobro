"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

const BEEP_VOLUME_KEY = "pomobro:beepVolume";
const VOICE_VOLUME_KEY = "pomobro:voiceVolume";
const VOICE_ENABLED_BY_DEFAULT_KEY = "pomobro:voiceEnabledByDefault";
const BEEP_ENABLED_BY_DEFAULT_KEY = "pomobro:beepEnabledByDefault";

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

function getStoredVoiceEnabledByDefault(): boolean {
  if (typeof window === "undefined") return false;
  const v = localStorage.getItem(VOICE_ENABLED_BY_DEFAULT_KEY);
  return v === "true";
}

function getStoredBeepEnabledByDefault(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(BEEP_ENABLED_BY_DEFAULT_KEY);
  return v === null ? true : v === "true";
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
  voiceEnabledByDefault: boolean;
  beepEnabledByDefault: boolean;
  setBeepVolume: (v: number) => void;
  setVoiceVolume: (v: number) => void;
  setVoiceEnabledByDefault: (v: boolean) => void;
  setBeepEnabledByDefault: (v: boolean) => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(
  undefined,
);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [beepVolume, setBeepVolumeState] = useState(1);
  const [voiceVolume, setVoiceVolumeState] = useState(1);
  const [voiceEnabledByDefault, setVoiceEnabledByDefaultState] =
    useState(false);
  const [beepEnabledByDefault, setBeepEnabledByDefaultState] = useState(true);

  useEffect(() => {
    setBeepVolumeState(getStoredBeepVolume());
    setVoiceVolumeState(getStoredVoiceVolume());
    setVoiceEnabledByDefaultState(getStoredVoiceEnabledByDefault());
    setBeepEnabledByDefaultState(getStoredBeepEnabledByDefault());
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

  const setVoiceEnabledByDefault = (v: boolean) => {
    setVoiceEnabledByDefaultState(v);
    localStorage.setItem(VOICE_ENABLED_BY_DEFAULT_KEY, String(v));
  };

  const setBeepEnabledByDefault = (v: boolean) => {
    setBeepEnabledByDefaultState(v);
    localStorage.setItem(BEEP_ENABLED_BY_DEFAULT_KEY, String(v));
  };

  return (
    <SettingsContext.Provider
      value={{
        beepVolume,
        voiceVolume,
        voiceEnabledByDefault,
        beepEnabledByDefault,
        setBeepVolume,
        setVoiceVolume,
        setVoiceEnabledByDefault,
        setBeepEnabledByDefault,
      }}
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
