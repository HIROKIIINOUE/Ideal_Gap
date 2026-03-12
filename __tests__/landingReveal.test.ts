import {
  LANDING_SECTION_REVEAL_OFFSET,
  LANDING_SECTION_MIN_SCROLL_Y,
  shouldRevealLandingSection,
} from "../lib/ui/landingReveal";

describe("landing reveal helpers", () => {
  test("does not reveal a section without a measured layout", () => {
    expect(
      shouldRevealLandingSection({
        sectionTop: null,
        scrollOffsetY: 0,
        viewportHeight: 844,
      }),
    ).toBe(false);
  });

  test("does not reveal a section before scrolling starts", () => {
    expect(
      shouldRevealLandingSection({
        sectionTop: 700,
        scrollOffsetY: 0,
        viewportHeight: 844,
      }),
    ).toBe(false);
    expect(
      shouldRevealLandingSection({
        sectionTop: 700,
        scrollOffsetY: LANDING_SECTION_MIN_SCROLL_Y,
        viewportHeight: 844,
      }),
    ).toBe(true);
  });

  test("reveals a section once it reaches the viewport threshold", () => {
    expect(
      shouldRevealLandingSection({
        sectionTop: 900,
        scrollOffsetY: 200,
        viewportHeight: 844,
      }),
    ).toBe(true);
  });

  test("keeps a section hidden until the threshold is crossed", () => {
    expect(
      shouldRevealLandingSection({
        sectionTop: 1200,
        scrollOffsetY: 100,
        viewportHeight: 844,
      }),
    ).toBe(false);
  });

  test("allows a custom preload offset for larger screens", () => {
    expect(
      shouldRevealLandingSection({
        sectionTop: 1200,
        scrollOffsetY: 200,
        viewportHeight: 1000,
        preloadOffset: LANDING_SECTION_REVEAL_OFFSET + 40,
      }),
    ).toBe(false);
    expect(
      shouldRevealLandingSection({
        sectionTop: 1200,
        scrollOffsetY: 360,
        viewportHeight: 1000,
        preloadOffset: LANDING_SECTION_REVEAL_OFFSET + 40,
      }),
    ).toBe(true);
  });
});
