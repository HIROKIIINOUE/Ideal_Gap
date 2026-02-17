import {
  getLandingFadeRange,
  getLandingFadeTriggerY,
  getTaskTimerIpadLayout,
  scaleFontSizeForIpad,
} from "../lib/ui/ipadLayout";

describe("ipadLayout helpers", () => {
  test("keeps iPhone landing trigger unchanged", () => {
    expect(getLandingFadeTriggerY(false)).toBe(1080);
  });

  test("uses earlier landing trigger for iPad", () => {
    expect(getLandingFadeTriggerY(true)).toBe(620);
  });

  test("uses iPad-specific section fade ranges", () => {
    expect(getLandingFadeRange("overview", true)).toEqual({
      start: 140,
      end: 280,
    });
    expect(getLandingFadeRange("membership", true)).toEqual({
      start: 600,
      end: 560,
    });
    expect(getLandingFadeRange("getStarted", true)).toEqual({
      start: 620,
      end: 750,
    });
  });

  test("keeps task timer layout unchanged for iPhone", () => {
    expect(getTaskTimerIpadLayout(false)).toEqual({
      ringSize: 260,
      ringStrokeWidth: 24,
      ringBackgroundStrokeWidth: 20,
      ringMaxWidth: 260,
      presetsMarginTop: -20,
      presetsJustifyContent: "flex-start",
      timerWrapperMarginBottom: 0,
    });
  });

  test("uses iPad-specific task timer layout", () => {
    expect(getTaskTimerIpadLayout(true)).toEqual({
      ringSize: 300,
      ringStrokeWidth: 28,
      ringBackgroundStrokeWidth: 24,
      ringMaxWidth: 300,
      presetsMarginTop: -20,
      presetsJustifyContent: "center",
      timerWrapperMarginBottom: -120,
    });
  });

  test("font scaling is applied only on iPad", () => {
    expect(scaleFontSizeForIpad(16, false)).toBe(16);
    expect(scaleFontSizeForIpad(16, true)).toBe(26);
  });
});
