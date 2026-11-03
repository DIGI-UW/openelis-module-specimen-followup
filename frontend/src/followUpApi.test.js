import { describe, expect, it } from "vitest";
import {
  isoToSiteDate,
  localIsoDate,
  siteDateFormat,
  siteDateToIso,
  todayPlusDays,
} from "./followUpApi";

describe("due dates", () => {
  it("follows the site's date locale", () => {
    expect(siteDateFormat({ DEFAULT_DATE_LOCALE: "fr-FR" })).toBe("dd/MM/yyyy");
    expect(siteDateFormat({ DEFAULT_DATE_LOCALE: "en-US" })).toBe("MM/dd/yyyy");
    expect(siteDateFormat(undefined)).toBe("MM/dd/yyyy");
  });

  it("shows an ISO date the way the site's date picker does", () => {
    expect(isoToSiteDate("2026-11-06", "MM/dd/yyyy")).toBe("11/06/2026");
    expect(isoToSiteDate("2026-11-06", "dd/MM/yyyy")).toBe("06/11/2026");
    expect(isoToSiteDate("", "MM/dd/yyyy")).toBe("");
    expect(isoToSiteDate(undefined, "MM/dd/yyyy")).toBe("");
  });

  it("reads a typed or picked date back into ISO, ignoring incomplete entries", () => {
    expect(siteDateToIso("11/06/2026", "MM/dd/yyyy")).toBe("2026-11-06");
    expect(siteDateToIso("06/11/2026", "dd/MM/yyyy")).toBe("2026-11-06");
    expect(siteDateToIso("11/0", "MM/dd/yyyy")).toBe("");
    expect(siteDateToIso("", "MM/dd/yyyy")).toBe("");
  });

  it("builds the default due date in the browser's calendar, never shifted through UTC", () => {
    const date = new Date(2026, 10, 7, 0, 30);
    expect(localIsoDate(date)).toBe("2026-11-07");
    expect(todayPlusDays(0)).toBe(localIsoDate(new Date()));
    expect(todayPlusDays("x")).toBe(localIsoDate(new Date()));
  });
});
