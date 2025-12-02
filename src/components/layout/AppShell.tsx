"use client";

import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

interface AppShellProps {
  children: ReactNode;
}

/**
 * AppShell wraps all pages with a consistent header and main content area.
 * This is a good place to later add global providers (theme, auth, etc.).
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-4">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}