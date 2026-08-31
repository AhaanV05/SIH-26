export type NavigationItem = {
  label: string;
  href: string;
  shortLabel: string;
};

export const governmentNavigation: NavigationItem[] = [
  { label: "Overview", shortLabel: "01", href: "/" },
  { label: "Problem radar", shortLabel: "02", href: "/pulse" },
  { label: "Challenge forge", shortLabel: "03", href: "/challenges" },
  { label: "Startup matches", shortLabel: "04", href: "/matches" },
  { label: "Pilot lab", shortLabel: "05", href: "/pilots" },
  { label: "Evidence & pay", shortLabel: "06", href: "/evidence" },
  { label: "Scale graph", shortLabel: "07", href: "/solutions" },
  { label: "Audit thread", shortLabel: "08", href: "/audit" },
];
