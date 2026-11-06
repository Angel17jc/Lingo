"use client";

import { useEffect, useSyncExternalStore } from "react";
import { messages } from "@/lib/messages";
import { Icon } from "./Icon";

let manualTheme: "light" | "dark" | undefined;

function snapshot(): "light" | "dark" {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem("lingo-theme");
  } catch {
    /* Preferencia opcional. */
  }
  if (manualTheme) return manualTheme;
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function subscribe(listener: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", listener);
  window.addEventListener("storage", listener);
  window.addEventListener("lingo-theme", listener);
  return () => {
    media.removeEventListener("change", listener);
    window.removeEventListener("storage", listener);
    window.removeEventListener("lingo-theme", listener);
  };
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => "light");
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const label = theme === "dark" ? messages.theme.light : messages.theme.dark;
  return (
    <button
      type="button"
      className="icon-button theme-toggle"
      aria-label={label}
      title={label}
      onClick={() => {
        manualTheme = theme === "dark" ? "light" : "dark";
        try {
          localStorage.setItem("lingo-theme", manualTheme);
        } catch {
          /* Funciona sin persistencia si el navegador bloquea el almacenamiento. */
        }
        window.dispatchEvent(new Event("lingo-theme"));
      }}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} />
    </button>
  );
}
