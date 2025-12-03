"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Card,
  Group,
  ScrollArea,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { DatePicker } from "@mantine/dates";

type CalendarEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  description?: string;
  source?: string;
};

// Demo data for now – later you can replace this with events from Luma, Google
// Calendar, or any other external source.
const demoEvents: CalendarEvent[] = [
  {
    id: "1",
    date: "2025-01-08",
    title: "Weekly community call",
    description:
      "Example event. In the future this could be pulled from Luma or other calendars.",
    source: "Demo",
  },
  {
    id: "2",
    date: "2025-01-15",
    title: "Town hall",
    description: "Long-form discussion and Q&A.",
    source: "Demo",
  },
  {
    id: "3",
    date: "2025-01-15",
    title: "Cohort meetup",
    description: "Small-group meetup focused on projects.",
    source: "Demo",
  },
];

function getTodayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatHumanDate(dateString: string | null): string {
  if (!dateString) return "No date selected";

  const [yearStr, monthStr, dayStr] = dateString.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return "Invalid date";
  }

  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CalendarClient() {
  const [selectedDate, setSelectedDate] = useState<string | null>(getTodayIso());

  const eventsForSelectedDate = useMemo(
    () =>
      demoEvents.filter((event) => event.date === selectedDate),
    [selectedDate]
  );

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.7fr)]">
      <Card withBorder radius="md" shadow="sm">
        <Stack gap="sm">
          <Group justify="space-between" align="baseline">
            <div>
              <Text size="xs" c="dimmed" fw={500}>
                Community calendar
              </Text>
              <Title order={3} fz="lg">
                Pick a day
              </Title>
            </div>
          </Group>

          <DatePicker
            value={selectedDate}
            onChange={setSelectedDate}
            highlightToday
            fullWidth
            size="sm"
          />
        </Stack>
      </Card>

      <Card withBorder radius="md" shadow="sm">
        <Stack gap="sm" className="h-full">
          <div>
            <Text size="xs" c="dimmed" fw={500}>
              Selected day
            </Text>
            <Text fw={600}>{formatHumanDate(selectedDate)}</Text>
          </div>

          <ScrollArea.Autosize mah={320}>
            <Stack gap="xs">
              {eventsForSelectedDate.length === 0 && (
                <Text size="sm" c="dimmed">
                  No events yet for this day. Later, this panel can show events
                  pulled from Luma and other calendars you care about.
                </Text>
              )}

              {eventsForSelectedDate.map((event) => (
                <Card key={event.id} withBorder radius="md" padding="sm">
                  <Group justify="space-between" align="flex-start">
                    <div>
                      <Text fw={500} size="sm">
                        {event.title}
                      </Text>
                      {event.description && (
                        <Text size="xs" c="dimmed" mt={4}>
                          {event.description}
                        </Text>
                      )}
                    </div>
                    {event.source && (
                      <Badge size="xs" variant="light">
                        {event.source}
                      </Badge>
                    )}
                  </Group>
                </Card>
              ))}
            </Stack>
          </ScrollArea.Autosize>
        </Stack>
      </Card>
    </div>
  );
}