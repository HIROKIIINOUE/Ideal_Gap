import { Stack } from "expo-router";
import TaskTimerScreen from "../components/feature/TaskTimerScreen";

export default function TaskTimerPage() {
  return (
    <>
      <Stack.Screen options={{ title: "Task timer" }} />
      <TaskTimerScreen />
    </>
  );
}
