// スプラッシュ画面

import { Stack } from "expo-router";
import SplashOverlay from "../components/SplashOverlay";

export default function Splash() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SplashOverlay visible />
    </>
  );
}
