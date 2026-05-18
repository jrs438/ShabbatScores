"use client";
import { useEffect, useState, useCallback } from "react";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  settingsFromQuery,
  type UserSettings,
} from "@/lib/settings";

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Order: URL params win > localStorage > defaults. URL-applied settings
    // are persisted so a friend who opens a share link "becomes" that config.
    const fromUrl = settingsFromQuery(window.location.search);
    const stored = loadSettings();
    const merged = { ...stored, ...(fromUrl ?? {}) };
    setSettings(merged);
    if (fromUrl) {
      saveSettings(merged);
      // Strip query string so the URL stays clean across reloads
      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState({}, "", url.toString());
    }
    setReady(true);
  }, []);

  const update = useCallback((patch: Partial<UserSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    saveSettings(DEFAULT_SETTINGS);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return { settings, update, reset, ready };
}
