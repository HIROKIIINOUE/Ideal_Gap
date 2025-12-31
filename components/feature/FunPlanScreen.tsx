import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { z } from "zod";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import { supabase } from "../../lib/supabaseClient";
import Loading from "../Loading";

type FunPlanCard = {
  id: string;
  description: string;
  updatedAt: string | null;
  order: number;
};

type FunPlanRow = {
  id: string;
  user_id: string;
  description: string;
  order: number | null;
  updated_at?: string | null;
};

const planSchema = z.object({
  description: z.string().trim().min(1),
});

const HEADER_CARD_GRADIENT = ["rgba(110,168,255,0.32)", "rgba(20,34,60,0.95)"] as const;
const LIST_CARD_GRADIENT = ["rgba(104,195,255,0.26)", "rgba(17,38,70,0.96)"] as const;
const MAX_PLANS = 5;

const formatUpdated = (iso?: string | null, updatedLabel?: string) => {
  if (!iso) return "";
  try {
    const date = new Date(iso);
    return `${date.toLocaleDateString()} ${updatedLabel ?? ""}`.trim();
  } catch {
    return updatedLabel ?? "";
  }
};

const toPlanCard = (row: { id: string; description: string; order: number | null; updated_at?: string | null }): FunPlanCard => ({
  id: row.id,
  description: row.description,
  order: row.order ?? 0,
  updatedAt: row.updated_at ?? null,
});

export default function FunPlanScreen() {
  const { t: tFun } = useTranslation("funPlan");
  const [plans, setPlans] = useState<FunPlanCard[]>([]);
  const [deleteMode, setDeleteMode] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDraft, setModalDraft] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingMeta, setEditingMeta] = useState<{ updatedAt: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const updatedLabel = tFun("updatedSuffix");
  const limitReached = plans.length >= MAX_PLANS;

  const getUserId = useMemo(
    () => async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.user?.id ?? null;
    },
    [],
  );

  useEffect(() => {
    let active = true;
    const fetchPlans = async () => {
      setLoading(true);
      setErrorMessage(null);
      const uid = await getUserId();
      if (!uid) {
        if (active) setErrorMessage(tFun("errors.loginMissing"));
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("fun_plans" as any)
        .select("id, description, order, updated_at")
        .eq("user_id", uid)
        .order("order", { ascending: true });
      if (!active) return;
      if (error) {
        setErrorMessage(error.message);
      } else {
        const mapped = ((data as any[]) ?? []).map((row) =>
          toPlanCard({
            id: row.id,
            description: row.description,
            order: row.order,
            updated_at: row.updated_at,
          }),
        );
        setPlans(mapped);
      }
      setLoading(false);
    };
    fetchPlans();
    return () => {
      active = false;
    };
  }, [getUserId, tFun]);

  const handleAddPress = () => {
    if (limitReached) return;
    setEditingId(null);
    setModalDraft("");
    setModalError(null);
    setModalVisible(true);
    setEditingMeta(null);
  };

  const handleButtonPress = (item: FunPlanCard) => {
    if (deleteMode) {
      Alert.alert(tFun("deleteConfirmTitle"), tFun("deleteConfirmBody"), [
        { text: tFun("deleteConfirmNo"), style: "cancel" },
        {
          text: tFun("deleteConfirmYes"),
          style: "destructive",
          onPress: () => {
            supabase
              .from("fun_plans" as any)
              .delete()
              .eq("id", item.id)
              .then(({ error }) => {
                if (error) {
                  Alert.alert(tFun("errors.deleteFailed"), error.message);
                  return;
                }
                setPlans((prev) => prev.filter((plan) => plan.id !== item.id));
              });
          },
        },
      ]);
      return;
    }
    setEditingId(item.id);
    setModalDraft(item.description);
    setModalError(null);
    setEditingMeta({ updatedAt: item.updatedAt });
    setModalVisible(true);
  };

  const handleSave = () => {
    const parsed = planSchema.safeParse({ description: modalDraft });
    if (!parsed.success) {
      setModalError(tFun("modal.errorRequired"));
      return;
    }
    if (!editingId && limitReached) {
      setModalError(tFun("limitReached"));
      return;
    }
    const run = async () => {
      setSaving(true);
      setModalError(null);
      const uid = await getUserId();
      if (!uid) {
        setModalError(tFun("errors.loginMissing"));
        setSaving(false);
        return;
      }
      if (editingId) {
        const { data, error } = await supabase
          .from("fun_plans" as any)
          .update({ description: parsed.data.description })
          .eq("id", editingId)
          .select("id, description, order, updated_at")
          .single();
        if (error) {
          setModalError(error.message);
          setSaving(false);
          return;
        }
        const row = data as unknown as FunPlanRow;
        setPlans((prev) => prev.map((plan) => (plan.id === editingId ? toPlanCard(row) : plan)));
      } else {
        const { data, error } = await supabase
          .from("fun_plans" as any)
          .insert({ user_id: uid, description: parsed.data.description, order: 0 })
          .select("id, description, order, updated_at")
          .single();
        if (error) {
          setModalError(error.message);
          setSaving(false);
          return;
        }
        const row = data as unknown as FunPlanRow;
        const shiftedExisting = plans.map((plan, idx) => ({
          id: plan.id,
          description: plan.description,
          order: idx + 1,
          user_id: uid,
        }));
        const { error: upsertError } = await supabase
          .from("fun_plans" as any)
          .upsert(
            [
              ...shiftedExisting,
              { id: row.id, description: row.description, order: 0, user_id: uid },
            ],
            { onConflict: "id" },
          );
        if (upsertError) {
          setModalError(upsertError.message);
          setSaving(false);
          return;
        }
        setPlans((prev) => [toPlanCard(row), ...prev.map((plan, idx) => ({ ...plan, order: idx + 1 }))]);
      }
      setModalVisible(false);
      setEditingId(null);
      setModalDraft("");
      setEditingMeta(null);
      setSaving(false);
    };
    run().catch((err) => {
      setModalError(err.message ?? tFun("errors.saveFailed"));
      setSaving(false);
    });
  };

  const toggleDeleteMode = () => {
    setDeleteMode((prev) => !prev);
  };

  const handleDragEnd = async ({ data }: { data: FunPlanCard[] }) => {
    setPlans(data);
    const uid = await getUserId();
    if (!uid) {
      Alert.alert(tFun("errors.reorderSaveFailed"), tFun("errors.loginMissing"));
      return;
    }

    const updates = data.map((item, idx) => ({
      id: item.id,
      description: item.description,
      order: idx,
      user_id: uid,
    }));

    const { error } = await supabase.from("fun_plans" as any).upsert(updates, { onConflict: "id" });
    if (error) {
      Alert.alert(tFun("errors.reorderSaveFailed"), error.message);
    }
  };

  const renderPlanCard = ({ item, drag, isActive }: RenderItemParams<FunPlanCard>) => {
    const onEditPress = () => handleButtonPress(item);

    return (
      <Pressable
        key={item.id}
        style={[
          styles.planCard,
          shadows.card,
          isActive && styles.planCardDragging,
          deleteMode && styles.planCardDeleteMode,
        ]}
        onLongPress={drag}
        delayLongPress={120}
        disabled={deleteMode && isActive}
      >
        <LinearGradient
          colors={LIST_CARD_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.planTitle}>{item.description}</Text>

        <View style={styles.planActions}>
          {deleteMode ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => handleButtonPress(item)}
              style={[styles.dangerButton, styles.iconButtonRow]}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.error} />
              <Text style={styles.dangerButtonText}>{tFun("delete")}</Text>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" onPress={onEditPress} style={[styles.editButton, styles.iconButtonRow]}>
              <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.textPrimary} />
              <Text style={styles.editButtonText}>{tFun("modal.editTitle")}</Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  };

  const hasPlans = plans.length > 0;
  const modalTitle = editingId ? tFun("modal.editTitle") : tFun("modal.addTitle");
  const modalUpdatedText = editingMeta?.updatedAt ? formatUpdated(editingMeta.updatedAt, updatedLabel) : null;

  if (loading) {
    return (
      <GestureHandlerRootView style={styles.ghRoot}>
        <Loading />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.ghRoot}>
      <View style={[styles.card, shadows.card]}>
        <LinearGradient
          colors={HEADER_CARD_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.heading}>{tFun("pageTitle")}</Text>
            <Text style={styles.body}>{tFun("pageSubtitle")}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: limitReached }}
            style={[styles.primaryButton, limitReached && styles.buttonDisabled]}
            onPress={handleAddPress}
            disabled={limitReached}
          >
            <MaterialCommunityIcons name="plus" size={20} color={colors.textPrimary} />
            <Text style={styles.primaryButtonText}>{tFun("add")}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[styles.secondaryButton, deleteMode && styles.secondaryButtonActive]}
            onPress={toggleDeleteMode}
          >
            <MaterialCommunityIcons
              name={deleteMode ? "close" : "trash-can-outline"}
              size={20}
              color={colors.textPrimary}
            />
            <Text style={styles.secondaryButtonText}>{deleteMode ? tFun("deleteExit") : tFun("delete")}</Text>
          </Pressable>
        </View>
        {limitReached && <Text style={styles.limitText}>{tFun("limitHelper")}</Text>}
        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
      </View>

      {loading ? (
        <View style={[styles.card, shadows.card, styles.emptyCard, styles.listSpacing]}>
          <Text style={styles.emptyBody}>{tFun("loading")}</Text>
        </View>
      ) : hasPlans ? (
        <View style={styles.listSpacing}>
          <DraggableFlatList
            data={plans}
            keyExtractor={(item) => item.id}
            renderItem={renderPlanCard}
            onDragEnd={handleDragEnd}
            scrollEnabled={false}
            activationDistance={10}
            contentContainerStyle={styles.planGrid}
          />
        </View>
      ) : (
        <View style={[styles.card, shadows.card, styles.emptyCard, styles.listSpacing]}>
          <LinearGradient
            colors={LIST_CARD_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.emptyTitle}>{tFun("emptyTitle")}</Text>
          <Text style={styles.emptyBody}>{tFun("emptyBody")}</Text>
          <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={handleAddPress}>
            <MaterialCommunityIcons name="plus" size={18} color={colors.textPrimary} />
            <Text style={styles.primaryButtonText}>{tFun("emptyCta")}</Text>
          </Pressable>
        </View>
      )}

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior="padding" style={styles.modalContainer}>
            <View style={[styles.modalCard, shadows.card]}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              {editingMeta && (
                <View style={styles.modalMeta}>
                  {!!modalUpdatedText && <Text style={styles.modalMetaText}>{modalUpdatedText}</Text>}
                </View>
              )}
              <TextInput
                autoFocus
                multiline
                placeholder={tFun("modal.placeholder")}
                placeholderTextColor={colors.textSecondary}
                style={styles.modalInput}
                value={modalDraft}
                onChangeText={(text) => {
                  setModalDraft(text);
                  setModalError(null);
                }}
              />
              {!!modalError && <Text style={styles.modalError}>{modalError}</Text>}
              <View style={styles.modalActions}>
                <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={() => setModalVisible(false)}>
                  <Text style={styles.secondaryButtonText}>{tFun("modal.cancel")}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  style={[styles.primaryButton, saving && styles.buttonDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <MaterialCommunityIcons name="content-save-outline" size={18} color={colors.textPrimary} />
                  <Text style={styles.primaryButtonText}>{tFun("modal.save")}</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  ghRoot: {
    flex: 1,
  },
  card: {
    backgroundColor: "#132742",
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(110,168,255,0.3)",
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  heading: {
    color: colors.textPrimary,
    fontSize: typography.xl,
    fontWeight: "800",
    lineHeight: typography.xl * 1.3,
  },
  body: {
    color: colors.textSecondary,
    fontSize: typography.md,
    lineHeight: typography.md * 1.4,
  },
  badge: {
    display: "none",
  },
  badgeText: {
    color: colors.accentSubtle,
    fontSize: typography.sm,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accentPrimary,
    backgroundColor: "rgba(30,94,255,0.24)",
  },
  primaryButtonText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: typography.md,
    letterSpacing: 0.2,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  secondaryButtonActive: {
    borderColor: colors.accentSubtle,
    backgroundColor: "rgba(110,168,255,0.1)",
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: typography.md,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.sm,
    fontWeight: "600",
  },
  limitText: {
    color: colors.accentSubtle,
    fontSize: typography.sm,
    fontWeight: "600",
  },
  planGrid: {
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  planCard: {
    backgroundColor: "#123457",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(110,168,255,0.35)",
    padding: spacing.lg,
    gap: spacing.sm,
    overflow: "hidden",
  },
  planCardDragging: {
    borderColor: "rgba(110,168,255,0.65)",
    backgroundColor: "rgba(30,94,255,0.1)",
  },
  planCardDeleteMode: {
    borderColor: "rgba(242,95,92,0.5)",
  },
  planTitle: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "800",
    lineHeight: typography.lg * 1.4,
    textAlign: "left",
  },
  planActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  editButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  editButtonText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: typography.sm,
  },
  dangerButton: {
    borderColor: "rgba(242,95,92,0.4)",
    backgroundColor: "rgba(242,95,92,0.08)",
  },
  dangerButtonText: {
    color: colors.error,
    fontWeight: "700",
    fontSize: typography.sm,
  },
  iconButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  emptyCard: {
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  listSpacing: {
    marginTop: spacing.md,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "800",
  },
  emptyBody: {
    color: colors.textSecondary,
    fontSize: typography.md,
    lineHeight: typography.md * 1.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(12,18,32,0.82)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  modalContainer: {
    width: "100%",
  },
  modalCard: {
    backgroundColor: "#1b355c",
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "800",
  },
  modalMeta: {
    gap: spacing.xs,
  },
  modalMetaText: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  modalInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.md,
    color: colors.textPrimary,
    minHeight: 120,
    textAlignVertical: "top",
    fontSize: typography.md,
    lineHeight: typography.md * 1.4,
  },
  modalError: {
    color: colors.error,
    fontSize: typography.sm,
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
