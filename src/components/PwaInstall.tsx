"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Persist across client-side navigations — beforeinstallprompt fires once per session
let storedPrompt: BeforeInstallPromptEvent | null = null;

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(() => storedPrompt);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      const ev = e as BeforeInstallPromptEvent;
      storedPrompt = ev;
      setDeferredPrompt(ev);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Restore from store if we navigated back (event won't fire again)
    if (storedPrompt) setDeferredPrompt(storedPrompt);

    // Check if already installed (standalone mode)
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const inWebView =
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone || inWebView);

    // iOS doesn't fire beforeinstallprompt - detect for Add to Home Screen instructions
    const ua = navigator.userAgent;
    setIsIos(
      /iPad|iPhone|iPod/.test(ua) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    );

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    const prompt = deferredPrompt ?? storedPrompt;
    if (!prompt) return false;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      storedPrompt = null;
      setDeferredPrompt(null);
    }
    return outcome === "accepted";
  };

  const canInstall = !!(deferredPrompt ?? storedPrompt) && !isInstalled;
  const showIosInstructions =
    isIos && !isInstalled && !deferredPrompt && !storedPrompt;

  return { canInstall, showIosInstructions, isInstalled, install };
}
