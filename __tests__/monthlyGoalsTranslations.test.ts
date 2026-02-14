import { monthlyGoalsTranslations } from "../content/monthlyGoalsTranslations";

describe("monthlyGoalsTranslations", () => {
  it("includes cascade delete warnings for weekly tasks in confirmation messages", () => {
    const jaWarning = "削除される月間タスクに紐づく週間タスクは全て削除されます";
    const enSingleWarning =
      "All weekly tasks linked to the monthly task being deleted will also be removed.";
    const enBulkWarning =
      "All weekly tasks linked to the monthly tasks being deleted will also be removed.";
    const frWarning =
      "Toutes les tâches hebdomadaires liées aux tâches mensuelles supprimées seront également supprimées.";

    expect(monthlyGoalsTranslations.ja.deleteConfirmBody).toContain(jaWarning);
    expect(monthlyGoalsTranslations.ja.bulkDelete.message).toContain(jaWarning);

    expect(monthlyGoalsTranslations.en.deleteConfirmBody).toContain(enSingleWarning);
    expect(monthlyGoalsTranslations.en.bulkDelete.message).toContain(enBulkWarning);

    expect(monthlyGoalsTranslations.fr.deleteConfirmBody).toContain(frWarning);
    expect(monthlyGoalsTranslations.fr.bulkDelete.message).toContain(frWarning);
  });
});
