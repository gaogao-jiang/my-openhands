const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
const CHAT_TIME_ZONE = "Asia/Shanghai";
const BEIJING_UTC_OFFSET = "+08:00";

function parseEventTimestamp(
  timestamp?: string,
  assumedOffset = "Z",
): Date | null {
  if (!timestamp) return null;

  // Preserve explicit wire offsets. Message display assumes Beijing time for
  // offset-less local event timestamps; relative server metadata keeps UTC.
  const zoned = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(timestamp)
    ? timestamp
    : `${timestamp}${assumedOffset}`;
  const date = new Date(zoned);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatEventTimestamp(
  timestamp?: string,
  locale?: string,
): string | null {
  return (
    parseEventTimestamp(timestamp, BEIJING_UTC_OFFSET)?.toLocaleString(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: CHAT_TIME_ZONE,
    }) ?? null
  );
}

export function formatClockTime(
  timestamp?: string,
  locale?: string,
): string | null {
  return (
    parseEventTimestamp(timestamp, BEIJING_UTC_OFFSET)?.toLocaleTimeString(
      locale,
      {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: CHAT_TIME_ZONE,
      },
    ) ?? null
  );
}

export function formatRelativeEventTimestamp(
  timestamp: string | undefined,
  locale: string | undefined,
  justNowLabel: string,
  now = Date.now(),
): string | null {
  const date = parseEventTimestamp(timestamp);
  if (!date) return null;
  const elapsed = Math.max(0, now - date.getTime());
  if (elapsed < MINUTE_MS) return justNowLabel;
  if (elapsed >= WEEK_MS) {
    return date.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      ...(date.getFullYear() !== new Date(now).getFullYear()
        ? { year: "numeric" }
        : {}),
    });
  }

  const unit = elapsed < HOUR_MS ? "minute" : elapsed < DAY_MS ? "hour" : "day";
  const divisor =
    unit === "minute" ? MINUTE_MS : unit === "hour" ? HOUR_MS : DAY_MS;
  return new Intl.RelativeTimeFormat(locale, {
    numeric: "always",
    style: "long",
  }).format(-Math.floor(elapsed / divisor), unit);
}
