"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Selectors that receive the scroll-reveal treatment.
 *
 * Targeting shared structural classes keeps the animation purely presentational:
 * no page file has to be edited, so no existing markup, label, option, or value
 * changes when a page is added or altered.
 */
const REVEAL_SELECTORS = [
  ".page-stack > section",
  ".page-stack > article",
  ".empty-state",
  ".metrics-grid > *",
  ".content-grid > .panel",
  ".lifecycle-step",
  ".activity-list > li",
].join(", ");

const SHELL_SELECTOR = ".app-shell";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Progressive-enhancement scroll behaviour for the government portal shell:
 * a reading-progress rule, a compacting sticky masthead, staggered section
 * reveals, and a back-to-top control. Everything degrades to plain, fully
 * visible content when JavaScript or motion is unavailable.
 */
export function ScrollEffects() {
  const pathname = usePathname();
  const [showTop, setShowTop] = useState(false);
  const [progress, setProgress] = useState(0);

  // Reading progress + sticky compaction + back-to-top visibility.
  useEffect(() => {
    const shell = document.querySelector(SHELL_SELECTOR);
    let frame = 0;

    function onScroll() {
      if (frame) return;

      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const scrolled = window.scrollY;
        const scrollable =
          document.documentElement.scrollHeight - window.innerHeight;

        setProgress(scrollable > 0 ? Math.min(scrolled / scrollable, 1) : 0);
        setShowTop(scrolled > 420);
        shell?.classList.toggle("is-scrolled", scrolled > 40);
      });
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Staggered reveal of content blocks, re-scanned on every route change.
  useEffect(() => {
    const shell = document.querySelector(SHELL_SELECTOR);
    if (!shell) return;

    const targets = Array.from(
      document.querySelectorAll<HTMLElement>(REVEAL_SELECTORS),
    );

    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      targets.forEach((element) => element.classList.add("is-revealed"));
      return;
    }

    targets.forEach((element, index) => {
      element.dataset.reveal = "";
      element.dataset.revealDelay = String((index % 5) + 1);
    });

    // Applied only after the targets are marked, so content is never hidden
    // by CSS before the observer exists.
    shell.classList.add("reveal-ready");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 },
    );

    targets.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
      shell.classList.remove("reveal-ready");
      targets.forEach((element) => {
        element.classList.remove("is-revealed");
        delete element.dataset.reveal;
        delete element.dataset.revealDelay;
      });
    };
  }, [pathname]);

  return (
    <>
      <div
        className="scroll-progress"
        style={{ transform: `scaleX(${progress})`, opacity: progress > 0.005 ? 1 : 0 }}
        aria-hidden="true"
      />
      <button
        type="button"
        className={showTop ? "scroll-top is-visible" : "scroll-top"}
        onClick={() =>
          window.scrollTo({
            top: 0,
            behavior: prefersReducedMotion() ? "auto" : "smooth",
          })
        }
        aria-label="Back to top of page"
        tabIndex={showTop ? 0 : -1}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none">
          <path
            d="M12 19V5M5 12l7-7 7 7"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </>
  );
}
