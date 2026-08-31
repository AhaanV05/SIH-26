"use client";

export const roles = [
  {
    value: "problem-owner",
    label: "Problem owner",
    personName: "Aditi Kulkarni",
    personLabel: "Problem owner · Demo account",
    initials: "AK",
  },
  {
    value: "procurement",
    label: "Procurement",
    personName: "Neel Shah",
    personLabel: "Procurement · Demo account",
    initials: "NS",
  },
  {
    value: "finance",
    label: "Finance",
    personName: "Meera Nair",
    personLabel: "Finance · Demo account",
    initials: "MN",
  },
  {
    value: "startup",
    label: "Startup",
    personName: "Rohit Sane",
    personLabel: "Startup · Demo account",
    initials: "RS",
  },
  {
    value: "evaluator",
    label: "Evaluator",
    personName: "Sanjana Iyer",
    personLabel: "Evaluator · Demo account",
    initials: "SI",
  },
] as const;

export type DemoRole = (typeof roles)[number]["value"];

export function getRoleProfile(role: DemoRole) {
  return roles.find((item) => item.value === role) ?? roles[0];
}

type RoleSwitcherProps = {
  value: DemoRole;
  onChange: (value: DemoRole) => void;
};

export function RoleSwitcher({ value, onChange }: RoleSwitcherProps) {
  return (
    <label className="role-switcher" aria-label="Switch demo role">
      <span className="role-switcher__label">Demo role</span>
      <select
        className="role-switcher__control"
        value={value}
        onChange={(event) => onChange(event.target.value as DemoRole)}
      >
        {roles.map((role) => (
          <option key={role.value} value={role.value}>
            {role.label}
          </option>
        ))}
      </select>
    </label>
  );
}
