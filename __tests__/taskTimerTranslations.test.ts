import { taskTimerTranslations } from "../content/taskTimerTranslations";

describe("taskTimerTranslations", () => {
  it("uses yearly goal header keys instead of monthly goal keys", () => {
    for (const translation of Object.values(taskTimerTranslations)) {
      expect(translation.header.yearlyLabel).toBeTruthy();
      expect("monthlyLabel" in translation.header).toBe(false);
    }
  });
});
