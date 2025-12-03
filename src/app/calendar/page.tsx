import type { Metadata } from "next";
import CalendarClient from "./CalendarClient";

export const metadata: Metadata = {
  title: "nsreddit calendar",
  description:
    "Community calendar for the Network State community, powered by Mantine UI.",
};

export default function CalendarPage() {
  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Community calendar
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Browse upcoming events from the Network State ecosystem. This view
          uses Mantine&apos;s calendar components. Later, it can be wired up to
          external sources like Luma or other shared calendars.
        </p>
      </div>

      <CalendarClient />
    </section>
  );
}