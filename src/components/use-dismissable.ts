"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Shared open/close behaviour for the masthead dropdowns: closes on an outside
 * pointer press and on Escape, and returns focus to the trigger when Escape is
 * used so keyboard users are not stranded.
 */
export function useDismissable<T extends HTMLElement>() {
  const containerRef = useRef<T>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return { containerRef, triggerRef, isOpen, setIsOpen };
}
