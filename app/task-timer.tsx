import { Stack } from "expo-router";
import TaskTimerScreen from "../components/feature/TaskTimerScreen";
import { useTranslation } from "react-i18next";

export default function TaskTimerPage() {
  const { t: tCommonNav } = useTranslation("common", { keyPrefix: "navigation" });
  return (
    <>
      <Stack.Screen options={{ title: "Ideal Gap", headerBackTitle: tCommonNav("back") }} />
      <TaskTimerScreen />
    </>
  );
}
