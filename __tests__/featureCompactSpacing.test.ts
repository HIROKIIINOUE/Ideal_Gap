import { compactFeatureSpacing } from "../components/feature/compactFeatureSpacing";

describe("compactFeatureSpacing", () => {
  test("uses shared compact spacing tokens for the five target feature pages", () => {
    expect({
      titleCardPadding: 20,
      itemCardPadding: 16,
      itemContentGap: 8,
    }).toEqual({
      titleCardPadding: compactFeatureSpacing.titleCardPadding,
      itemCardPadding: compactFeatureSpacing.itemCardPadding,
      itemContentGap: compactFeatureSpacing.itemContentGap,
    });
  });

  test("keeps values aligned to the 4pt grid from the design system", () => {
    [
      compactFeatureSpacing.titleCardPadding,
      compactFeatureSpacing.itemCardPadding,
      compactFeatureSpacing.itemContentGap,
    ].forEach((value) => {
      expect(value % 4).toBe(0);
    });
  });

  test("uses the weekly-task description typography as the shared baseline", () => {
    expect(compactFeatureSpacing.descriptionFontSizeOffset).toBe(1);
    expect(compactFeatureSpacing.descriptionLineHeightMultiplier).toBe(1.45);
  });
});
