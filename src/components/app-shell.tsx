"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { governmentNavigation } from "@/platform/navigation";

import { LanguageSwitcher } from "./language-switcher";
import { ProfileMenu } from "./profile-menu";
import { RoleSwitcher, type DemoRole } from "./role-switcher";
import { ScrollEffects } from "./scroll-effects";
import { SectionSearch } from "./section-search";
import { SimulationBanner } from "./simulation-banner";
import { SiteFooter } from "./site-footer";

type AppShellProps = {
  children: ReactNode;
};

/** Announcement ticker copy — drawn from the existing lifecycle vocabulary. */
const tickerItems = [
  "Pulse → Forge → Match → Lab → Proof → PayFlow → ScaleGraph",
  "Every consequential procurement action stays human-authorized",
  "Deterministic rules govern eligibility, state transitions, and payment readiness",
  "Synthetic demonstration data · SIH 2026 software demonstrator",
];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeRole, setActiveRole] = useState<DemoRole>("problem-owner");
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSessionRole() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (!response.ok) return;

        const payload = (await response.json()) as { demoRole?: unknown };
        if (
          typeof payload.demoRole === "string" &&
          (Object.values({
            "problem-owner": "problem-owner",
            procurement: "procurement",
            finance: "finance",
            evaluator: "evaluator",
            startup: "startup",
          }) as string[]).includes(payload.demoRole)
        ) {
          if (active) {
            setActiveRole(payload.demoRole as DemoRole);
          }
        }
      } catch {
        // Ignore session lookup failures; the shell can fall back to the default identity.
      }
    }

    void loadSessionRole();
    return () => {
      active = false;
    };
  }, []);

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Unable to sign out.");
      }
      router.push("/login");
    } catch (error) {
      console.error("Sign-out failed", error);
      setIsSigningOut(false);
    }
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      {/* --- Government utility strip ------------------------------------ */}
      <div className="gov-strip">
        <div className="shell-inner gov-strip__inner">
          <span className="gov-emblem">
            <span className="gov-emblem__mark" aria-hidden="true">
              <span>☸</span>
              <span>सत्यमेव</span>
            </span>
            <span className="gov-emblem__text">
              <b>महाराष्ट्र शासन</b>
              <strong>GOVERNMENT OF MAHARASHTRA</strong>
            </span>
          </span>

          <span className="gov-strip__rule" aria-hidden="true" />

          <span className="gov-strip__ministry">
            Innovation Procurement Exchange
            <small>Urban Services · Public Innovation Mission</small>
          </span>

          <ul className="gov-social" aria-label="Programme channels (inactive in this prototype)">
            <li title="Programme updates channel — inactive in this prototype">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5H16.7V3.6c-.3 0-1.3-.13-2.45-.13-2.42 0-4.08 1.48-4.08 4.2v2.34H7.45V13.1h2.72v8z" />
              </svg>
              <span className="sr-only">Programme updates</span>
            </li>
            <li title="Announcements channel — inactive in this prototype">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.2 3.6h2.7l-5.9 6.75L21 20.4h-5.45l-4.27-5.58-4.88 5.58H3.7l6.31-7.22L3.2 3.6h5.59l3.86 5.1zm-.95 15.2h1.5L7.8 5.11H6.19z" />
              </svg>
              <span className="sr-only">Announcements</span>
            </li>
            <li title="Ecosystem network — inactive in this prototype">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M6.94 5.5a1.94 1.94 0 1 1-3.88 0 1.94 1.94 0 0 1 3.88 0M6.7 8.98H3.3V20h3.4zm5.32 0H8.64V20h3.35v-5.79c0-3.11 4.05-3.36 4.05 0V20h3.36v-6.94c0-5.25-6-5.06-7.41-2.48z" />
              </svg>
              <span className="sr-only">Ecosystem network</span>
            </li>
          </ul>

          <span className="gov-strip__right">
            <span className="gov-chip">Prototype</span>
            <span className="gov-strip__notice">
              <b>Simulated environment</b> · No live government systems
            </span>
          </span>
        </div>
      </div>

      {/* --- Masthead ---------------------------------------------------- */}
      <header className="gov-masthead">
        <div className="shell-inner gov-masthead__inner">
          <Link className="brand" href="/" aria-label="MahaSetu home">
            <span className="brand__mark" aria-hidden="true">
              म
            </span>
            <span>
              <strong>MahaSetu</strong>
              <small>Innovation Procurement Exchange</small>
            </span>
          </Link>

          <span className="gov-masthead__rule" aria-hidden="true" />

          <span className="gov-seal">
            <strong>SIH 2026</strong>
            <span className="gov-seal__flag" aria-hidden="true" />
            <span>Challenge to Scale</span>
          </span>

          {/* Right-hand utility column: search with the language selector at
              the far right, and the signed-in identity directly beneath it. */}
          <div className="gov-masthead__utility">
            <div className="gov-masthead__row">
              <SectionSearch />
              <LanguageSwitcher />
            </div>
            <div className="gov-masthead__row gov-masthead__row--identity">
              <RoleSwitcher value={activeRole} onChange={setActiveRole} />
              <ProfileMenu
                role={activeRole}
                isSigningOut={isSigningOut}
                onSignOut={() => void handleSignOut()}
              />
            </div>
          </div>
        </div>
      </header>

      {/* --- Primary navigation ------------------------------------------ */}
      <nav className="gov-nav" aria-label="Primary navigation">
        <div className="shell-inner gov-nav__inner">
          <ul className="nav-list">
            {governmentNavigation.map((item) => {
              const isActive = pathname === item.href || (item.href === "/" && pathname === "/");

              return (
                <li key={item.href}>
                  <Link
                    className={isActive ? "nav-link nav-link--active" : "nav-link"}
                    href={item.href as Parameters<typeof Link>[0]["href"]}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span aria-hidden="true">{item.shortLabel}</span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* --- Announcement ticker ----------------------------------------- */}
      <div className="gov-ticker">
        <span className="gov-ticker__label">Lifecycle</span>
        <div className="gov-ticker__viewport">
          {[0, 1].map((copy) => (
            <div className="gov-ticker__track" key={copy} aria-hidden={copy === 1}>
              {tickerItems.map((item) => (
                <span key={item}>
                  <b aria-hidden="true">◆</b>
                  {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <SimulationBanner />

      <div className="workspace">
        <header className="topbar">
          <div className="shell-inner topbar__inner">
            <div>
              <span className="eyebrow">Maharashtra innovation mission</span>
              <strong>Signal-to-scale command centre</strong>
            </div>
            <div className="topbar__actions">
              <div className="workspace-label">
                <span>Government workspace</span>
                <strong>Urban Services Cell</strong>
              </div>
            </div>
          </div>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>

      <SiteFooter />
      <ScrollEffects />
    </div>
  );
}
