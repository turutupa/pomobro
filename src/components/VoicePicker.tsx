"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "@/state/settings-context";
import { generateAvatarSvg, getCuteName } from "@/voice/voice-avatars";

interface VoiceOption {
  voice: SpeechSynthesisVoice;
  cuteName: string;
  avatarUri: string;
}

function getEnglishVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window))
    return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.startsWith("en"));
}

/** Preferred voices shown first, in this order. */
const PREFERRED_VOICES = [
  "Google UK English Female",  // Luna
  "Google UK English Male",   // Atlas
  "Google US English",        // Nova
];

/** Default voice name when the user hasn't picked one yet. */
const DEFAULT_VOICE = "Google UK English Female"; // Luna

export function VoicePicker() {
  const { voiceName, setVoiceName } = useSettings();
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const voiceNameRef = useRef(voiceName);
  voiceNameRef.current = voiceName;

  // Load voices (they may arrive async)
  useEffect(() => {
    function loadVoices() {
      const raw = getEnglishVoices();
      if (raw.length === 0) return;

      // Deduplicate by name (some browsers list duplicates)
      const seen = new Set<string>();
      const unique = raw.filter((v) => {
        if (seen.has(v.name)) return false;
        seen.add(v.name);
        return true;
      });

      // Sort: preferred voices first, then the rest alphabetically
      unique.sort((a, b) => {
        const aIdx = PREFERRED_VOICES.indexOf(a.name);
        const bIdx = PREFERRED_VOICES.indexOf(b.name);
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
        return a.name.localeCompare(b.name);
      });

      const options = unique.map((voice) => ({
        voice,
        cuteName: getCuteName(voice.name),
        avatarUri: generateAvatarSvg(voice.name),
      }));

      setVoices(options);

      // Auto-select default voice if user hasn't picked one
      if (!voiceNameRef.current) {
        const defaultV = unique.find((v) => v.name === DEFAULT_VOICE);
        if (defaultV) {
          setVoiceName(defaultV.name);
        } else if (unique.length > 0) {
          setVoiceName(unique[0].name);
        }
      }
    }

    loadVoices();

    // Chrome loads voices asynchronously
    if ("speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Preview a voice with a short phrase
  const preview = useCallback((voice: SpeechSynthesisVoice) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const phrases = [
      "Let's go! Time to crush it!",
      "You've got this, keep pushing!",
      "Ready, set, go!",
      "Almost there, don't stop!",
      "Three, two, one, rest!",
    ];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.voice = voice;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    setPreviewingVoice(voice.name);
    utterance.onend = () => setPreviewingVoice(null);
    utterance.onerror = () => setPreviewingVoice(null);
    window.speechSynthesis.speak(utterance);
  }, []);

  // The currently selected voice option
  const selectedOption = useMemo(
    () => voices.find((v) => v.voice.name === voiceName),
    [voices, voiceName],
  );

  if (voices.length === 0) {
    return (
      <div className="text-xs text-zinc-500 dark:text-zinc-400">
        No voices available on this device.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Voice coach
      </div>
      <div className="rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-3 dark:border-zinc-700 dark:bg-zinc-800/80">
        <div className="scrollbar-sleek max-h-44 overflow-y-auto overflow-x-hidden">
          <div className="grid grid-cols-3 gap-2 p-1">
          {voices.map(({ voice, cuteName, avatarUri }) => {
          const isSelected = voice.name === voiceName;
          const isPreviewing = previewingVoice === voice.name;

          return (
            <button
              key={voice.name}
              type="button"
              onClick={() => {
                setVoiceName(voice.name);
                preview(voice);
              }}
              className={`group relative flex cursor-pointer flex-col items-center gap-1.5 rounded-xl px-1.5 py-2.5 transition-all ${
                isSelected
                  ? "bg-primary-500/20 dark:bg-primary-500/25"
                  : "bg-zinc-200/70 hover:bg-zinc-200 dark:bg-zinc-700/50 dark:hover:bg-zinc-700/80"
              }`}
              title={voice.name}
            >
              {/* Avatar */}
              <div
                className={`relative h-10 w-10 overflow-hidden rounded-full ring-1.5 transition-all ${
                  isSelected
                    ? "ring-primary-500"
                    : "ring-transparent group-hover:ring-zinc-400/50 dark:group-hover:ring-zinc-500/50"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUri}
                  alt={cuteName}
                  width={40}
                  height={40}
                  className="h-full w-full"
                />
                {isPreviewing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                    <div className="flex gap-0.5">
                      <span className="h-3 w-0.5 animate-pulse rounded-full bg-white" style={{ animationDelay: "0ms" }} />
                      <span className="h-4 w-0.5 animate-pulse rounded-full bg-white" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-0.5 animate-pulse rounded-full bg-white" style={{ animationDelay: "300ms" }} />
                      <span className="h-4 w-0.5 animate-pulse rounded-full bg-white" style={{ animationDelay: "100ms" }} />
                      <span className="h-3 w-0.5 animate-pulse rounded-full bg-white" style={{ animationDelay: "250ms" }} />
                    </div>
                  </div>
                )}
              </div>
              {/* Name */}
              <span
                className={`text-[11px] font-semibold leading-tight ${
                  isSelected
                    ? "text-primary-700 dark:text-primary-400"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {cuteName}
              </span>
              {/* Selected checkmark */}
              {isSelected && (
                <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-500">
                  <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
        </div>
        </div>
      </div>
    </div>
  );
}
