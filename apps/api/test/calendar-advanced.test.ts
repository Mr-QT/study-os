import { describe, expect, it } from "vitest";

import { expandOccurrences, type RecurringEvent } from "../src/calendar/occurrences";
import {
  isQuietHour,
  localDateKey,
  nextAllowedTime,
  type PreferenceValues,
} from "../src/notifications/preferences";

function event(overrides: Partial<RecurringEvent>): RecurringEvent {
  return {
    id: "event-1",
    title: "复习",
    startsAt: new Date("2026-01-01T09:00:00.000Z"),
    endsAt: new Date("2026-01-01T10:00:00.000Z"),
    timezone: "UTC",
    sourceType: "manual",
    recurrence: "none",
    recurrenceUntil: null,
    ...overrides,
  };
}

const UTC_PREFS: PreferenceValues = {
  timezone: "UTC",
  quietStartHour: 22,
  quietEndHour: 8,
  digestHour: 20,
  digestEnabled: false,
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("calendar occurrences", () => {
  it("expands a daily event inside the range", () => {
    const occurrences = expandOccurrences(
      [event({ recurrence: "daily", recurrenceUntil: new Date("2026-01-05T00:00:00.000Z") })],
      new Date("2026-01-01T00:00:00.000Z"),
      new Date("2026-01-07T00:00:00.000Z"),
    );
    expect(occurrences).toHaveLength(4);
    expect(occurrences[0]?.startsAt).toBe("2026-01-01T09:00:00.000Z");
    expect(occurrences[3]?.startsAt).toBe("2026-01-04T09:00:00.000Z");
  });

  it("expands weekly events and keeps duration", () => {
    const occurrences = expandOccurrences(
      [event({ recurrence: "weekly" })],
      new Date("2026-01-01T00:00:00.000Z"),
      new Date("2026-01-20T00:00:00.000Z"),
    );
    expect(occurrences.map((item) => item.startsAt)).toEqual([
      "2026-01-01T09:00:00.000Z",
      "2026-01-08T09:00:00.000Z",
      "2026-01-15T09:00:00.000Z",
    ]);
    expect(Date.parse(occurrences[0]?.endsAt ?? "") - Date.parse(occurrences[0]?.startsAt ?? "")).toBe(
      60 * 60 * 1000,
    );
  });

  it("skips non-recurring events outside the range", () => {
    const occurrences = expandOccurrences(
      [event({})],
      new Date("2026-02-01T00:00:00.000Z"),
      new Date("2026-02-02T00:00:00.000Z"),
    );
    expect(occurrences).toEqual([]);
  });
});

describe("notification preferences", () => {
  it("detects overnight quiet hours", () => {
    expect(isQuietHour(23, 22, 8)).toBe(true);
    expect(isQuietHour(3, 22, 8)).toBe(true);
    expect(isQuietHour(12, 22, 8)).toBe(false);
    expect(isQuietHour(9, 22, 8)).toBe(false);
  });

  it("shifts a quiet-hour timestamp to the next allowed hour", () => {
    const shifted = nextAllowedTime(new Date("2026-01-01T23:10:00.000Z"), UTC_PREFS);
    expect(shifted.toISOString()).toBe("2026-01-02T08:10:00.000Z");
  });

  it("builds a local date key", () => {
    expect(localDateKey(new Date("2026-01-01T23:30:00.000Z"), "Asia/Shanghai")).toBe("2026-01-02");
  });
});
