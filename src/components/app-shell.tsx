import Link from "next/link";
import type { ReactNode } from "react";

import { governmentNavigation } from "@/platform/navigation";

import { SimulationBanner } from "./simulation-banner";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
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
            {governmentNavigation.map((item, index) => (
              <li key={item.href}>
                <Link
                  className={index === 0 ? "nav-link nav-link--active" : "nav-link"}
                  href={item.href}
                >
                  <span aria-hidden="true">{item.shortLabel}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar__footer">
          <span className="avatar" aria-hidden="true">
            AK
          </span>
          <span>
            <strong>Aditi Kulkarni</strong>
            <small>Problem owner · Demo account</small>
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
            <button className="role-button" type="button">
              Switch demo role
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
