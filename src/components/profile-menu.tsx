"use client";

import { getRoleProfile, type DemoRole } from "./role-switcher";
import { useDismissable } from "./use-dismissable";

type ProfileMenuProps = {
  role: DemoRole;
  isSigningOut: boolean;
  onSignOut: () => void;
};

/**
 * Signed-in identity block for the masthead. The identity itself is unchanged
 * demo data from `role-switcher`; this component only moves `Sign out` behind a
 * dropdown so the masthead right column carries one control instead of two.
 */
export function ProfileMenu({ role, isSigningOut, onSignOut }: ProfileMenuProps) {
  const { containerRef, triggerRef, isOpen, setIsOpen } = useDismissable<HTMLDivElement>();
  const profile = getRoleProfile(role);

  return (
    <div className="gov-profile" ref={containerRef}>
      <button
        className="gov-profile__trigger"
        type="button"
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Account menu for ${profile.personName}`}
      >
        <span className="avatar" aria-hidden="true">
          {profile.initials}
        </span>
        <span className="gov-profile__identity">
          <strong>{profile.personName}</strong>
          <small>{profile.personLabel}</small>
        </span>
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
        <div className="gov-menu gov-menu--profile" role="menu" aria-label="Account">
          <div className="gov-menu__header">
            <span className="avatar" aria-hidden="true">
              {profile.initials}
            </span>
            <span>
              <strong>{profile.personName}</strong>
              <small>{profile.personLabel}</small>
            </span>
          </div>

          <button
            className="gov-menu__item gov-menu__item--danger"
            type="button"
            role="menuitem"
            onClick={onSignOut}
            disabled={isSigningOut}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none">
              <path
                d="M15 17v1.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2V7M10 12h10m0 0-3.2-3.2M20 12l-3.2 3.2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {isSigningOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
