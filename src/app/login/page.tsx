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
          <h1>MahaSetu Demo</h1>
          <p>Select your demo role to continue</p>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel__heading">
            <h2>Select a role</h2>
            <p>Choose which persona you&apos;d like to demonstrate:</p>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              marginBottom: "2rem",
            }}
          >
            {roles.map((role) => (
              <label
                key={role.value}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "1rem",
                  border:
                    selectedRole === role.value
                      ? "2px solid var(--color-accent, #0066cc)"
                      : "2px solid transparent",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  backgroundColor:
                    selectedRole === role.value
                      ? "var(--color-accent-bg, rgba(0, 102, 204, 0.05))"
                      : "transparent",
                  transition: "all 0.2s ease",
                }}
              >
                <input
                  type="radio"
                  name="role"
                  value={role.value}
                  checked={selectedRole === role.value}
                  onChange={(e) => setSelectedRole(e.target.value as DemoRole)}
                  style={{ cursor: "pointer" }}
                />
                <div>
                  <div style={{ fontWeight: "bold" }}>{role.label}</div>
                  <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary, #666)" }}>
                    {role.personName}
                  </div>
                </div>
              </label>
            ))}
          </div>

          {error && (
            <div
              style={{
                padding: "1rem",
                marginBottom: "1rem",
                backgroundColor: "var(--color-error-bg, #ffe5e5)",
                color: "var(--color-error, #d32f2f)",
                borderRadius: "0.5rem",
                fontSize: "0.875rem",
              }}
            >
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={isLoading}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: isLoading ? "#ccc" : "var(--color-accent, #0066cc)",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              cursor: isLoading ? "not-allowed" : "pointer",
              fontSize: "1rem",
              fontWeight: "bold",
              transition: "background-color 0.2s ease",
            }}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>

          <div
            style={{
              marginTop: "2rem",
              padding: "1rem",
              backgroundColor: "var(--color-info-bg, #e3f2fd)",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              color: "var(--color-text-secondary, #666)",
            }}
          >
            <strong>Demo credentials:</strong> This is a hackathon demonstration using seeded demo accounts. No real authentication is performed.
          </div>
        </article>
      </section>
    </div>
  );
}
