"use client";
import { useEffect, useState } from "react";

const DISMISS_KEY = "shabbatscores:install-hint:dismissed";

type WebkitNavigator = Navigator & { standalone?: boolean };

function isInstalled(): boolean {
  if (typeof window === "undefined") return true;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if ((window.navigator as WebkitNavigator).standalone === true) return true;
  return false;
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPad on iOS 13+ reports as Mac; also check for touch
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
}

export default function InstallHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isInstalled()) return;
    const dismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
    if (dismissed) return;
    setVisible(true);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  if (!visible) return null;

  const ios = isIOS();

  return (
    <div className="border-b border-accent/40 bg-accent/10 px-4 py-2 text-sm">
      <div className="flex items-center gap-3">
        <span className="text-lg">📱</span>
        <div className="flex-1 leading-snug">
          {ios ? (
            <>
              <strong>For best Shabbat use:</strong> tap{" "}
              <span className="inline-block rounded bg-accent/30 px-1.5 py-0.5 text-xs font-mono">
                ⎙ Share
              </span>{" "}
              →{" "}
              <span className="inline-block rounded bg-accent/30 px-1.5 py-0.5 text-xs font-mono">
                Add to Home Screen
              </span>
              . Launch from the home-screen icon for fullscreen, no Safari chrome.
            </>
          ) : (
            <>
              <strong>For best Shabbat use:</strong> add this page to your home screen via your
              browser&apos;s share/install menu, then launch from the icon for fullscreen.
            </>
          )}
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
