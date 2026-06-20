import { router, type Router } from "expo-router";
import { getAccessStateForUser } from "./subscription";
import { supabase } from "./supabaseClient";

type PaymentRouter = Pick<Router, "push">;

export const resolvePaymentRouteForUser = async (): Promise<
  "/login" | "/purchases" | "/payment-management"
> => {
  const { data, error } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;

  if (error || !userId) {
    return "/login";
  }

  const accessState = await getAccessStateForUser(userId);
  if (
    accessState.accessMode === "paid" ||
    accessState.accessMode === "friend_free"
  ) {
    return "/payment-management";
  }

  return "/purchases";
};

export const navigateToPaymentScreen = async (
  targetRouter: PaymentRouter = router,
) => {
  const route = await resolvePaymentRouteForUser();
  targetRouter.push(route);
  return route;
};
