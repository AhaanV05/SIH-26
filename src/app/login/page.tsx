"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { roles, type DemoRole } from "@/components/role-switcher";

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<DemoRole>("problem-owner");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demoRole: selectedRole }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Login failed");
      }

      // Login succeeded - redirect to overview
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setIsLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-panel__content">
          <span className="eyebrow">Secure demo access</span>
          <h1>MahaSetu Demo</h1>
          <p>Select your demo role to continue</p>
        </div>
        <div className="hero-panel__signal" aria-label="Access notice">
          <span>Access notice</span>
          <strong>SIMULATED_FOR_DEMO</strong>
          <p>
            No real authentication is performed. Seeded demo accounts are used to
            demonstrate server-derived route authorization.
          </p>
          <small>Synthetic demonstration data</small>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel__heading">
            <div>
              <span className="eyebrow">Step 1 of 1</span>
              <h2>Select a role</h2>
            </div>
          </div>

          <p className="mt-4 text-sm text-ink-muted">
            Choose which persona you&apos;d like to demonstrate:
          </p>

          <div className="mt-4 grid gap-3" role="radiogroup" aria-label="Demo role">
            {roles.map((role) => {
              const isSelected = selectedRole === role.value;

              return (
                <label
                  key={role.value}
                  className="flex min-h-11 cursor-pointer items-center gap-4 p-4"
                  style={{
                    border: `1px solid ${isSelected ? "var(--saffron)" : "var(--line)"}`,
                    borderLeft: `4px solid ${isSelected ? "var(--saffron)" : "var(--line)"}`,
                    borderRadius: "var(--radius-md)",
                    backgroundColor: isSelected
                      ? "var(--color-accent-bg)"
                      : "var(--paper)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role.value}
                    checked={isSelected}
                    onChange={(e) => setSelectedRole(e.target.value as DemoRole)}
                    className="size-4 cursor-pointer accent-emerald-800"
                  />
                  <span>
                    <span className="block text-sm font-bold text-emerald-950">
                      {role.label}
                    </span>
                    <span className="block text-xs text-ink-muted">
                      {role.personName}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          {error && (
            <div
              className="mt-4 p-4 text-sm"
              role="alert"
              style={{
                backgroundColor: "var(--color-error-bg)",
                borderLeft: "4px solid var(--color-error)",
                borderRadius: "var(--radius-sm)",
                color: "var(--color-error)",
              }}
            >
              {error}
            </div>
          )}

          <div className="button-row mt-6">
            <button
              type="button"
              className="primary-button"
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </article>

        <article className="panel action-panel">
          <span className="eyebrow">Demo credentials</span>
          <h2>Seeded accounts only</h2>
          <p>
            This is a hackathon demonstration using seeded demo accounts. No real
            authentication is performed.
          </p>
        </article>
      </section>
    </div>
  );
}
