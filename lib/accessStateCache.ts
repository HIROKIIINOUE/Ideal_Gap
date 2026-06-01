import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";
import type { AccessMode } from "./subscription";

const entitledAccessModeSchema = z.union([
  z.literal("paid"),
  z.literal("friend_free"),
]);

const LastKnownAccessStateSchema = z.object({
  accessMode: entitledAccessModeSchema,
  updatedAt: z.string().min(1),
});

type LastKnownAccessState = z.infer<typeof LastKnownAccessStateSchema>;

export const buildLastKnownAccessStateKey = (userId: string) =>
  `access-state:last-known:${userId}`;

export const readLastKnownAccessState = async (
  userId: string,
): Promise<LastKnownAccessState | null> => {
  const raw = await AsyncStorage.getItem(buildLastKnownAccessStateKey(userId));
  if (!raw) return null;

  try {
    const parsed = LastKnownAccessStateSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

export const writeLastKnownAccessState = async (
  userId: string,
  accessMode: Extract<AccessMode, "paid" | "friend_free">,
): Promise<void> => {
  const payload = {
    accessMode,
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(
    buildLastKnownAccessStateKey(userId),
    JSON.stringify(payload),
  );
};

export const clearLastKnownAccessState = async (
  userId: string,
): Promise<void> => {
  await AsyncStorage.removeItem(buildLastKnownAccessStateKey(userId));
};
