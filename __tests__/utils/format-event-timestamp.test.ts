import { describe, expect, it } from "vitest";
import {
  formatClockTime,
  formatEventTimestamp,
  formatRelativeEventTimestamp,
} from "#/utils/format-event-timestamp";

describe("formatEventTimestamp", () => {
  it.each(["en", "zh-CN"])("uses the supplied %s locale", (locale) => {
    const timestamp = "2026-04-16T19:32:29.828Z";

    expect(formatEventTimestamp(timestamp, locale)).toBe(
      new Date(timestamp).toLocaleString(locale, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Shanghai",
      }),
    );
  });
  it("reads an offset-less message timestamp as Beijing time", () => {
    expect(formatEventTimestamp("2026-04-16T19:32:29.828069", "en")).toBe(
      formatEventTimestamp("2026-04-16T19:32:29.828069+08:00", "en"),
    );
  });
});

describe("formatClockTime", () => {
  it.each(["en", "zh-CN"])(
    "formats the exact local clock time for %s",
    (locale) => {
      const timestamp = "2026-04-16T19:32:29.828Z";
      expect(formatClockTime(timestamp, locale)).toBe(
        new Date(timestamp).toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
          timeZone: "Asia/Shanghai",
        }),
      );
    },
  );

  it.each([
    ["2026-11-20T15:57:13.657131", "15:57"],
    ["2026-11-20T07:57:13Z", "15:57"],
    ["2026-11-20T15:57:13+08:00", "15:57"],
    ["2026-11-20T00:00:00+08:00", "00:00"],
  ])(
    "shows %s as the Beijing clock %s regardless of language",
    (timestamp, expected) => {
      expect(formatClockTime(timestamp, "en")).toBe(expected);
      expect(formatClockTime(timestamp, "zh-CN")).toBe(expected);
    },
  );

  it("uses Beijing time for offset-less message timestamps and rejects invalid values", () => {
    expect(formatClockTime("2026-04-16T19:32:29.828069", "en")).toBe(
      formatClockTime("2026-04-16T19:32:29.828069+08:00", "en"),
    );
    expect(formatClockTime("not-a-date", "en")).toBeNull();
  });
});

describe("formatRelativeEventTimestamp", () => {
  const now = new Date(2026, 10, 2, 12).getTime();
  it.each([
    [0, "Just now"],
    [59, "Just now"],
    [60, "1 minute ago"],
    [1800, "30 minutes ago"],
    [3600, "1 hour ago"],
    [18000, "5 hours ago"],
    [86399, "23 hours ago"],
    [86400, "1 day ago"],
    [604799, "6 days ago"],
    [604800, "Oct 26"],
  ])("formats a message %s seconds old", (seconds, expected) => {
    expect(
      formatRelativeEventTimestamp(
        new Date(now - Number(seconds) * 1000).toISOString(),
        "en",
        "Just now",
        now,
      ),
    ).toBe(expected);
  });

  it("localizes relative labels and includes the year for older dates", () => {
    expect(
      formatRelativeEventTimestamp(
        new Date(now - 1800000).toISOString(),
        "fr",
        "À l'instant",
        now,
      ),
    ).toBe("il y a 30 minutes");
    expect(
      formatRelativeEventTimestamp(
        new Date(2025, 9, 22, 12).toISOString(),
        "en",
        "Just now",
        now,
      ),
    ).toBe("Oct 22, 2025");
  });

  it("uses UTC for offset-less timestamps and avoids invalid or future ages", () => {
    const utcNow = Date.parse("2026-11-02T12:30:00Z");
    expect(
      formatRelativeEventTimestamp(
        "2026-11-02T12:00:00",
        "en",
        "Just now",
        utcNow,
      ),
    ).toBe("30 minutes ago");
    expect(
      formatRelativeEventTimestamp(
        "2026-11-02T14:00:00+02:00",
        "en",
        "Just now",
        utcNow,
      ),
    ).toBe("30 minutes ago");
    for (const value of [undefined, "not-a-date"])
      expect(
        formatRelativeEventTimestamp(value, "en", "Just now", now),
      ).toBeNull();
    expect(
      formatRelativeEventTimestamp(
        new Date(now + 1000).toISOString(),
        "en",
        "Just now",
        now,
      ),
    ).toBe("Just now");
  });
});
