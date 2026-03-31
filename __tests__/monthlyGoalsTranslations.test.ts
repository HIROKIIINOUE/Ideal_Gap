import { monthlyGoalsTranslations } from "../content/monthlyGoalsTranslations";

describe("monthlyGoalsTranslations", () => {
  it("includes cascade delete warnings for weekly tasks in confirmation messages", () => {
    const jaWarning = "紐づく週間タスクも全て削除されます。";
    const enWarning = "All linked weekly tasks will also be deleted.";
    const frSingleWarning =
      "Toutes les tâches hebdomadaires liées aux tâches mensuelles supprimées seront également supprimées.";
    const frBulkWarning = "Toutes les tâches hebdomadaires liées seront également supprimées.";

    expect(monthlyGoalsTranslations.ja.deleteConfirmBody).toContain(jaWarning);
    expect(monthlyGoalsTranslations.ja.bulkDelete.message).toContain(jaWarning);

    expect(monthlyGoalsTranslations.en.deleteConfirmBody).toContain(enWarning);
    expect(monthlyGoalsTranslations.en.bulkDelete.message).toContain(enWarning);

    expect(monthlyGoalsTranslations.fr.deleteConfirmBody).toContain(frSingleWarning);
    expect(monthlyGoalsTranslations.fr.bulkDelete.message).toContain(frBulkWarning);
  });
});
