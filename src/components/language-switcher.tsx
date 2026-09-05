"use client";

import { useSyncExternalStore } from "react";

import { useDismissable } from "./use-dismissable";

/**
 * Masthead language selector. The three languages below are the ones the
 * programme is scoped to serve.
 *
 * SIMULATED_FOR_DEMO: the selection is real and persists (it is stored per
 * browser and applied to `<html lang>` so assistive technology announces the
 * chosen language), but the interface copy itself is not yet translated. No
 * translation catalogue exists in this repository. Do not present this control
 * as working localisation.
 */
export const languages = [
  { value: "en", label: "English", nativeLabel: "English" },
  { value: "mr", label: "Marathi", nativeLabel: "मराठी" },
  { value: "hi", label: "Hindi", nativeLabel: "हिंदी" },
] as const;

export type LanguageCode = (typeof languages)[number]["value"];

const storageKey = "mahasetu.language";
const defaultLanguage: LanguageCode = "en";

function isLanguageCode(value: unknown): value is LanguageCode {
  return languages.some((language) => language.value === value);
}

/*
 * Module-level store rather than component state: the preference lives in the
 * browser, not in React, and `useSyncExternalStore` lets the server render the
 * default while the client picks the stored value up without a hydration
 * mismatch.
 */
let currentLanguage: LanguageCode = defaultLanguage;
let hasReadStorage = false;
const listeners = new Set<() => void>();

function applyDocumentLanguage(value: LanguageCode) {
  document.documentElement.lang = value;
}

function readStoredLanguage(): LanguageCode {
  try {
    const stored = window.localStorage.getItem(storageKey);
    return isLanguageCode(stored) ? stored : defaultLanguage;
  } catch {
    // Storage can be unavailable (private windows, blocked site data). The
    // default language is still correct, so there is nothing to recover.
    return defaultLanguage;
  }
}

function subscribe(listener: () => void) {
  if (!hasReadStorage) {
    hasReadStorage = true;
    currentLanguage = readStoredLanguage();
    applyDocumentLanguage(currentLanguage);
  }

  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): LanguageCode {
  return currentLanguage;
}

function getServerSnapshot(): LanguageCode {
  return defaultLanguage;
}

function setLanguage(value: LanguageCode) {
  currentLanguage = value;
  applyDocumentLanguage(value);

  try {
    window.localStorage.setItem(storageKey, value);
  } catch {
    // Persisting the preference is a convenience, not a requirement.
  }

  for (const listener of listeners) listener();
}

export function LanguageSwitcher() {
  const { containerRef, triggerRef, isOpen, setIsOpen } = useDismissable<HTMLDivElement>();
  const active = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function selectLanguage(value: LanguageCode) {
    setLanguage(value);
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  const current = languages.find((language) => language.value === active) ?? languages[0];

  return (
    <div className="gov-lang" ref={containerRef}>
      <button
        className="gov-lang__trigger"
        type="button"
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Language: ${current.label}. Change language`}
      >
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          <path
            d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18"
            stroke="currentColor"
            strokeWidth="1.7"
          />
        </svg>
        <span className="gov-lang__current">{current.nativeLabel}</span>
        <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" fill="none">
          <path
            d="m6 9 6 6 6-6"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen ? (
        <div className="gov-menu gov-menu--lang" role="menu" aria-label="Select language">
          {languages.map((language) => (
            <button
              key={language.value}
              className={
                language.value === active
                  ? "gov-menu__item gov-menu__item--active"
                  : "gov-menu__item"
              }
              type="button"
              role="menuitemradio"
              aria-checked={language.value === active}
              onClick={() => selectLanguage(language.value)}
            >
              <span className="gov-menu__native" lang={language.value}>
                {language.nativeLabel}
              </span>
              <small>{language.label}</small>
            </button>
          ))}
          <p className="gov-menu__note">
            Interface copy is not translated yet — <b>SIMULATED_FOR_DEMO</b>.
          </p>
        </div>
      ) : null}
    </div>
  );
}
