"use client";

import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";

interface AppShellProps {
  children: ReactNode;
}

/**
 * AppShell wraps all pages with a consistent header and main content area.
 * This is a good place to later add global providers (theme, auth, etc.).
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto flex max-w-4xl flex-1 flex-col px-4 py-6">
        {children}
      </main>
    </div>
  );
}