"use client";

import { useEffect, useSyncExternalStore } from "react";

type Choice = "system" | "light" | "dark";
const KEY = "bitebox:theme";

function apply(choice: Choice) {
  const dark = choice === "dark" || (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const root = document.documentElement;
  root.dataset.theme = dark ? "dark" : "light";
  root.style.colorScheme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#15110e" : "#ffffff");
}

function stored(): Choice {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

const OPTIONS: Array<{ value: Choice; label: string; icon: React.ReactNode }> = [
  {
    value: "system",
    label: "Match device",
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4">
        <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M10 3a7 7 0 0 1 0 14z" fill="currentColor" />
      </svg>
    ),
  },
  {
    value: "light",
    label: "Light",
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4">
        <circle cx="10" cy="10" r="3.6" fill="currentColor" />
        <path
          d="M10 1.8v2.4M10 15.8v2.4M1.8 10h2.4M15.8 10h2.4M4.2 4.2l1.7 1.7M14.1 14.1l1.7 1.7M4.2 15.8l1.7-1.7M14.1 5.9l1.7-1.7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    value: "dark",
    label: "Dark",
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4">
        <path d="M15.5 12.6A6.6 6.6 0 0 1 7.4 4.5a6.6 6.6 0 1 0 8.1 8.1z" fill="currentColor" />
      </svg>
    ),
  },
];

const CHANGE_EVENT = "bitebox-theme-change";

function subscribe(callback: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      apply(stored());
      callback();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

export function ThemeToggle() {
  const choice = useSyncExternalStore<Choice>(subscribe, stored, () => "system");

  // Follow the device setting while "Match device" is chosen.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onMedia = () => stored() === "system" && apply("system");
    media.addEventListener("change", onMedia);
    return () => media.removeEventListener("change", onMedia);
  }, []);

  function pick(next: Choice) {
    try {
      if (next === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      /* storage blocked: the choice still applies to this page */
    }
    apply(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  const current = OPTIONS.find((o) => o.value === choice) ?? OPTIONS[0]!;
  const nextChoice = OPTIONS[(OPTIONS.indexOf(current) + 1) % OPTIONS.length]!;

  return (
    <>
      {/* Phones: one button that cycles through the three choices. */}
      <button
        type="button"
        onClick={() => pick(nextChoice.value)}
        className="grid size-9 place-items-center rounded-full border border-line bg-surface text-ink sm:hidden"
        aria-label={`Theme: ${current.label}. Switch to ${nextChoice.label.toLowerCase()}.`}
      >
        {current.icon}
      </button>
      <div
        role="group"
        aria-label="Colour theme"
        className="hidden items-center rounded-full border border-line bg-surface p-0.5 sm:flex"
      >
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={choice === option.value}
            title={option.label}
            onClick={() => pick(option.value)}
            className="grid size-8 place-items-center rounded-full text-muted transition-colors hover:text-ink aria-pressed:bg-ink aria-pressed:text-bg"
          >
            {option.icon}
            <span className="sr-only">{option.label} theme</span>
          </button>
        ))}
      </div>
    </>
  );
}

/** Runs before the page paints so there's no flash of the wrong theme. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${KEY}');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.dataset.theme=d?'dark':'light';r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;
