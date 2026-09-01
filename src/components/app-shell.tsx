"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { governmentNavigation } from "@/platform/navigation";

import { getRoleProfile, RoleSwitcher, type DemoRole } from "./role-switcher";
import { SimulationBanner } from "./simulation-banner";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeRole, setActiveRole] = useState<DemoRole>("problem-owner");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const profile = getRoleProfile(activeRole);

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
      <aside className="sidebar" aria-label="Primary navigation">
        <Link className="brand" href="/" aria-label="MahaSetu home">
          <span className="brand__mark" aria-hidden="true">
            म
          </span>
          <span>
            <strong>MahaSetu</strong>
            <small>Innovation Procurement Exchange</small>
          </span>
        </Link>

        <div className="workspace-label">
          <span>Government workspace</span>
          <strong>Urban Services Cell</strong>
        </div>

        <nav>
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
        </nav>

        <div className="sidebar__footer">
          <span className="avatar" aria-hidden="true">
            {profile.initials}
          </span>
          <span>
            <strong>{profile.personName}</strong>
            <small>{profile.personLabel}</small>
          </span>
        </div>
      </aside>

      <div className="workspace">
        <SimulationBanner />
        <header className="topbar">
          <div>
            <span className="eyebrow">Maharashtra innovation mission</span>
            <strong>Signal-to-scale command centre</strong>
          </div>
          <div className="topbar__actions">
            <button className="quiet-button" type="button" aria-label="Language selection">
              English · EN
            </button>
            <RoleSwitcher value={activeRole} onChange={setActiveRole} />
            <button
              className="quiet-button"
              type="button"
              onClick={() => void handleSignOut()}
              disabled={isSigningOut}
              aria-label="Sign out of the demo session"
            >
              {isSigningOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
