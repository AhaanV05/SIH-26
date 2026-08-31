import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MahaSetu · Innovation Procurement Exchange",
    template: "%s · MahaSetu",
  },
  description:
    "An evidence-led public innovation procurement demonstrator for Maharashtra.",
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#0b3b32",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en-IN">
      <body className="min-w-80 bg-canvas text-ink antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
