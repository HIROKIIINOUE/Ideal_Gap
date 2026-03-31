import { weeklyTasksTranslations } from "../content/weeklyTasksTranslations";

describe("weeklyTasksTranslations", () => {
  it("keeps only the yearly goal keys that are still used", () => {
    for (const translation of Object.values(weeklyTasksTranslations)) {
      expect(translation.task.yearlyLink).toBeTruthy();
      expect(translation.modal.yearlyGoalLabel).toBeTruthy();
      expect(translation.modal.noYearlyGoal).toBeTruthy();
      expect(translation.modal.unlinkedYearlyGoal).toBeTruthy();

      expect("monthValue" in translation.modal).toBe(false);
      expect("monthOptionLabel" in translation.modal).toBe(false);
      expect("yearlyLabel" in translation.modal).toBe(false);
      expect("monthlyLink" in translation.task).toBe(false);
      expect("monthLabel" in translation.modal).toBe(false);
      expect("monthlyGoalLabel" in translation.modal).toBe(false);
      expect("noMonthlyGoal" in translation.modal).toBe(false);
    }
  });
});
