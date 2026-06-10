import { clearPersistedAuthSession } from "./authStorage";
import { supabase } from "./supabaseClient";

const isAuthSessionMissingError = (message: string) => message === "Auth session missing!";

export const signOutCurrentSession = async () => {
  const { error } = await supabase.auth.signOut({ scope: "local" });

  try {
    await clearPersistedAuthSession();
  } catch (storageError) {
    const message = storageError instanceof Error ? storageError.message : String(storageError);
    console.warn("Failed to clear persisted auth session", message);
  }

  if (error && !isAuthSessionMissingError(error.message)) {
    throw new Error(error.message);
  }
};
