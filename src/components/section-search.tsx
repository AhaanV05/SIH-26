"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { governmentNavigation } from "@/platform/navigation";

/**
 * Masthead search, matching the search affordance of the reference government
 * portal. It is a real, entirely client-side jump across the workspace
 * sections already declared in `governmentNavigation` — no backend call and no
 * new data source, so nothing about the existing feature set changes.
 */
export function SectionSearch() {
  const router = useRouter();
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const trimmed = query.trim().toLowerCase();
  const matches = trimmed
    ? governmentNavigation.filter((item) =>
        item.label.toLowerCase().includes(trimmed),
      )
    : [];

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function goTo(href: string) {
    setQuery("");
    setIsOpen(false);
    router.push(href as Parameters<typeof router.push>[0]);
  }

  return (
    <div className="gov-search" ref={containerRef}>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          if (matches[0]) goTo(matches[0].href);
        }}
      >
        <label className="sr-only" htmlFor={`${listId}-input`}>
          Search workspace sections
        </label>
        <div className="gov-search__field">
          <input
            id={`${listId}-input`}
            className="gov-search__input"
            type="search"
            placeholder="Search here"
            autoComplete="off"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setIsOpen(false);
            }}
            aria-describedby={`${listId}-hint`}
          />
          <button className="gov-search__button" type="submit" aria-label="Search">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.2" />
              <path
                d="m16.5 16.5 4 4"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <p className="sr-only" id={`${listId}-hint`}>
          Jumps to a workspace section. Matching sections are listed below as you
          type.
        </p>
      </form>

      {isOpen && trimmed.length > 0 ? (
        <ul className="gov-search__results" id={listId} aria-live="polite">
          {matches.length ? (
            matches.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={(event) => {
                    event.preventDefault();
                    goTo(item.href);
                  }}
                >
                  <span aria-hidden="true">{item.shortLabel}</span>
                  {item.label}
                </a>
              </li>
            ))
          ) : (
            <li className="gov-search__empty">No matching workspace section.</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
