import { Stack } from "expo-router";
import TaskTimerScreen from "../components/feature/TaskTimerScreen";
import { useTranslation } from "react-i18next";

export default function TaskTimerPage() {
  const { t } = useTranslation("taskTimer");
  return (
    <>
      <Stack.Screen options={{ title: t("pageTitle") }} />
      <TaskTimerScreen />
    </>
  );
}
