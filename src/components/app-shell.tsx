"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { governmentNavigation } from "@/platform/navigation";

import { getRoleProfile, RoleSwitcher, type DemoRole } from "./role-switcher";
import { SimulationBanner } from "./simulation-banner";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [activeRole, setActiveRole] = useState<DemoRole>("problem-owner");
  const profile = getRoleProfile(activeRole);

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
            <button className="quiet-button" type="button">
              English · EN
            </button>
            <RoleSwitcher value={activeRole} onChange={setActiveRole} />
          </div>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
