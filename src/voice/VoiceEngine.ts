export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface VoiceEngine {
  speak(text: string, options?: SpeakOptions): void;
  cancel(): void;
}

function selectNaturalVoice(): SpeechSynthesisVoice | undefined {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return undefined;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return undefined;
  // Prefer en-US voices that sound natural (Samantha, Karen, Daniel, etc.)
  const preferred = voices.find(
    (v) =>
      v.lang.startsWith("en") &&
      (v.name.includes("Samantha") ||
        v.name.includes("Karen") ||
        v.name.includes("Daniel") ||
        v.name.includes("Alex") ||
        v.name.includes("Victoria") ||
        v.name.includes("Google") ||
        v.name.includes("Microsoft"))
  );
  return preferred ?? voices.find((v) => v.lang.startsWith("en")) ?? voices[0];
}

class BrowserSpeechEngine implements VoiceEngine {
  speak(text: string, options?: SpeakOptions): void {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate ?? 0.9;
    utterance.pitch = options?.pitch ?? 1;
    if (options?.volume !== undefined) utterance.volume = options.volume;
    const voice = selectNaturalVoice();
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  }

  cancel(): void {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    window.speechSynthesis.cancel();
  }
}

let engine: VoiceEngine | null = null;

export function getVoiceEngine(): VoiceEngine {
  if (!engine) {
    engine = new BrowserSpeechEngine();
  }
  return engine;
}

