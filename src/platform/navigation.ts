export type NavigationItem = {
  label: string;
  href: string;
  shortLabel: string;
};

export const governmentNavigation: NavigationItem[] = [
  { label: "Overview", shortLabel: "01", href: "/" },
  { label: "Problem radar", shortLabel: "02", href: "/pulse" },
  { label: "Challenge forge", shortLabel: "03", href: "/challenges" },
  { label: "Startup passport", shortLabel: "04", href: "/passport" },
  { label: "Startup matches", shortLabel: "05", href: "/matches" },
  { label: "Proposals", shortLabel: "06", href: "/proposals" },
  { label: "Evaluations", shortLabel: "07", href: "/evaluations" },
  { label: "Pilot lab", shortLabel: "08", href: "/pilots" },
  { label: "Evidence & pay", shortLabel: "09", href: "/evidence" },
  { label: "Scale graph", shortLabel: "10", href: "/solutions" },
  { label: "Audit thread", shortLabel: "11", href: "/audit" },
];
