import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "./globals.css";
import { MantineProvider } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { SolanaProvider } from "@/components/solana/SolanaProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { ConfirmProvider } from "@/components/ui/ConfirmProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "nsreddit dev",
  description: "Anonymous forum MVP for the Network State community",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <MantineProvider defaultColorScheme="auto">
          <DatesProvider settings={{ firstDayOfWeek: 1 }}>
            <AuthProvider>
              <SolanaProvider>
                <ToastProvider>
                  <ConfirmProvider>
                    <AppShell>{children}</AppShell>
                  </ConfirmProvider>
                </ToastProvider>
              </SolanaProvider>
            </AuthProvider>
          </DatesProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
