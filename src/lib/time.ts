import { formatDistanceToNow } from "date-fns";

/**
 * Safely normalize a string or Date into a valid Date instance.
 * Returns null if the value can't be parsed.
 */
function toDateOrNull(value: string | Date): Date | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

/**
 * Format a timestamp as a human-friendly relative string like:
 * - "just now"
 * - "2 minutes ago"
 * - "3 hours ago"
 * - "5 days ago"
 *
 * For slightly-future timestamps (clock skew, in-flight writes),
 * we clamp very small negative diffs to "just now" as well.
 */
export function formatTimeAgo(input: string | Date): string {
  const date = toDateOrNull(input);
  if (!date) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = diffMs / 1000;

  // Treat anything within ±5 seconds of "now" as just now.
  if (Math.abs(diffSeconds) <= 5) {
    return "just now";
  }

  // For slightly in-the-future timestamps, allow date-fns to say "in X minutes"
  // instead of forcing "ago".
  if (diffSeconds < -5) {
    return formatDistanceToNow(date, { addSuffix: true });
  }

  // Normal past timestamps
  return formatDistanceToNow(date, { addSuffix: true });
}