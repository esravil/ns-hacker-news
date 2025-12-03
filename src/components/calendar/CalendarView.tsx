"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";

/**
 * CalendarView renders a basic FullCalendar month view.
 *
 * For now it shows an empty calendar; you can later pass real events by
 * adding an `events` prop or fetching from your API here.
 *
 * NOTE: Make sure you've installed the React bindings:
 *   npm install @fullcalendar/react @fullcalendar/daygrid
 */
export function CalendarView() {
  return (
    <div className="text-sm text-zinc-900 dark:text-zinc-100">
      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        height="auto"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,dayGridWeek,dayGridDay",
        }}
      />
    </div>
  );
}