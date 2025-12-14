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

type IdealCard = {
  id: string;
  description: string;
  updatedAt: string | null;
  order: number;
};

type UserIdealRow = {
  id: string;
  user_id: string;
  description: string;
  order: number | null;
  updated_at?: string | null;
};

const idealSchema = z.object({
  description: z.string().trim().min(1),
});

const HEADER_CARD_GRADIENT = ["rgba(30,94,255,0.22)", "rgba(12,18,32,0.9)"] as const;
const LIST_CARD_GRADIENT = ["rgba(20,46,86,0.9)", "rgba(10,16,28,0.95)"] as const;

const formatUpdated = (iso?: string | null, updatedLabel?: string) => {
  if (!iso) return "";
  try {
    const date = new Date(iso);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ${updatedLabel ?? ""}`.trim();
  } catch {
    return updatedLabel ?? "";
  }
};

const toIdealCard = (row: { id: string; description: string; order: number | null; updated_at?: string | null }): IdealCard => ({
  id: row.id,
  description: row.description,
  order: row.order ?? 0,
  updatedAt: row.updated_at ?? null,
});

export default function IdealSelfScreen() {
  const { t: tIdeal } = useTranslation("idealSelf");
  const [ideals, setIdeals] = useState<IdealCard[]>([]);
  const [deleteMode, setDeleteMode] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDraft, setModalDraft] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingMeta, setEditingMeta] = useState<{ position: number; updatedAt: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const updatedLabel = tIdeal("updatedSuffix");

  const getUserId = useMemo(
    () => async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.user?.id ?? null;
    },
    [],
  );

  // ユーザを取得し「理想の自分リスト」を取得、表示
  useEffect(() => {
    let active = true;
    const fetchIdeals = async () => {
      setLoading(true);
      setErrorMessage(null);
      const uid = await getUserId();
      if (!uid) {
        if (active) setErrorMessage(tIdeal("errors.loginMissing"));
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("user_ideal" as any)
        .select("id, description, order, updated_at")
        .eq("user_id", uid)
        .order("order", { ascending: true });
      if (error) {
        if (active) setErrorMessage(error.message);
      } else if (active) {
        const mapped = ((data as any[]) ?? []).map((row) =>
          toIdealCard({
            id: row.id,
            description: row.description,
            order: row.order,
            updated_at: row.updated_at,
          }),
        );
        setIdeals(mapped);
      }
      if (active) setLoading(false);
    };
    fetchIdeals();
    return () => {
      active = false;
    };
  }, [getUserId, tIdeal]);

  // 追加モーダル表示ボタン
  const handleAddPress = () => {
    setEditingId(null);
    setModalDraft("");
    setModalError(null);
    setModalVisible(true);
    setEditingMeta(null);
  };

  // 更新ボタンと削除ボタンを状況に応じて管理
  const handleButtonPress = (item: IdealCard) => {
    if (deleteMode) {
      Alert.alert(tIdeal("deleteConfirmTitle"), tIdeal("deleteConfirmBody"), [
        { text: tIdeal("deleteConfirmNo"), style: "cancel" },
        {
          text: tIdeal("deleteConfirmYes"),
          style: "destructive",
          onPress: () => {
            supabase
              .from("user_ideal" as any)
              .delete()
              .eq("id", item.id)
              .then(({ error }) => {
                if (error) {
                  Alert.alert(tIdeal("errors.deleteFailed"), error.message);
                  return;
                }
                setIdeals((prev) => prev.filter((ideal) => ideal.id !== item.id));
              });
          },
        },
      ]);
      return;
    }
    setEditingId(item.id);
    setModalDraft(item.description);
    setModalError(null);
    // リストナンバーの表示用
    const position = ideals.findIndex((ideal) => ideal.id === item.id) + 1;
    setEditingMeta({ position: position > 0 ? position : 1, updatedAt: item.updatedAt });
    setModalVisible(true);
  };

  // 保存・更新ボタン両方を管理するロジック
  const handleSave = () => {
    const parsed = idealSchema.safeParse({ description: modalDraft });
    if (!parsed.success) {
      setModalError(tIdeal("modal.errorRequired"));
      return;
    }
    const run = async () => {
      setSaving(true);
      setModalError(null);
      const uid = await getUserId();
      if (!uid) {
        setModalError(tIdeal("errors.loginMissing"));
        setSaving(false);
        return;
      }
      // ↓ 更新ボタンで保存した場合
      if (editingId) {
        const { data, error } = await supabase
          .from("user_ideal" as any)
          .update({ description: parsed.data.description })
          .eq("id", editingId)
          .select("id, description, order, updated_at")
          .single();
        if (error) {
          setModalError(error.message);
          setSaving(false);
          return;
        }
        const row = data as unknown as UserIdealRow;
        setIdeals((prev) => prev.map((ideal) => (ideal.id === editingId ? toIdealCard(row) : ideal)));
      } else {
        // 追加ボタンで保存した場合（最上部に追加）
        const { data, error } = await supabase
          .from("user_ideal" as any)
          .insert({ user_id: uid, description: parsed.data.description, order: 0 })
          .select("id, description, order, updated_at")
          .single();
        if (error) {
          setModalError(error.message);
          setSaving(false);
          return;
        }
        const row = data as unknown as UserIdealRow;
        const shiftedExisting = ideals.map((ideal, idx) => ({
          id: ideal.id,
          description: ideal.description,
          order: idx + 1,
          user_id: uid,
        }));
        const { error: upsertError } = await supabase
          .from("user_ideal" as any)
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
        setIdeals((prev) => [toIdealCard(row), ...prev.map((ideal, idx) => ({ ...ideal, order: idx + 1 }))]);
      }
      setModalVisible(false);
      setEditingId(null);
      setModalDraft("");
      setEditingMeta(null);
      setSaving(false);
    };
    run().catch((err) => {
      setModalError(err.message ?? tIdeal("errors.saveFailed"));
      setSaving(false);
    });
  };

  const toggleDeleteMode = () => {
    setDeleteMode((prev) => !prev);
  };

  // ドラッグ並び替え終了時の配列データをセットする
  const handleDragEnd = async ({ data }: { data: IdealCard[] }) => {
    setIdeals(data);
    const uid = await getUserId();
    if (!uid) {
      Alert.alert(tIdeal("errors.reorderSaveFailed"), tIdeal("errors.loginMissing"));
      return;
    }

    const updates = data.map((item, idx) => ({
      id: item.id,
      description: item.description,
      order: idx,
      user_id: uid,
    }));

    const { error } = await supabase.from("user_ideal" as any).upsert(updates, { onConflict: "id" });
    if (error) {
      Alert.alert(tIdeal("errors.reorderSaveFailed"), error.message);
    }
  };


  // 指定のPressable要素の長押しドラッグを可能にするロジック
  const renderIdealCard = ({ item, drag, isActive }: RenderItemParams<IdealCard>) => {
    const onEditPress = () => handleButtonPress(item);

    return (
      <Pressable
        key={item.id}
        style={[
          styles.idealCard,
          shadows.card,
          isActive && styles.idealCardDragging,
          deleteMode && styles.idealCardDeleteMode,
        ]}
        onLongPress={drag} // ここで長押しタップ発火
        delayLongPress={120}
        disabled={deleteMode && isActive}
      >
        <LinearGradient
          colors={LIST_CARD_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.idealTitle}>{item.description}</Text>

        <View style={styles.idealActions}>
          {deleteMode ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => handleButtonPress(item)}
              style={[styles.dangerButton, styles.iconButtonRow]}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.error} />
              <Text style={styles.dangerButtonText}>{tIdeal("delete")}</Text>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" onPress={onEditPress} style={[styles.editButton, styles.iconButtonRow]}>
              <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.textPrimary} />
              <Text style={styles.editButtonText}>{tIdeal("modal.editTitle")}</Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  };

  const hasIdeals = ideals.length > 0;
  const modalTitle = editingId ? tIdeal("modal.editTitle") : tIdeal("modal.addTitle");
  const modalListLabel = editingMeta ? `${tIdeal("listLabel")} ${editingMeta.position}` : null;
  const modalUpdatedText = editingMeta?.updatedAt ? formatUpdated(editingMeta.updatedAt, updatedLabel) : null;

  return (
    <GestureHandlerRootView style={styles.ghRoot}>
      <View style={[styles.card, shadows.card]}>
        <LinearGradient
          colors={HEADER_CARD_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.heading}>{tIdeal("pageTitle")}</Text>

        <View style={styles.actionRow}>
          <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={handleAddPress} disabled={loading}>
            <MaterialCommunityIcons name="plus" size={20} color={colors.textPrimary} />
            <Text style={styles.primaryButtonText}>{tIdeal("add")}</Text>
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
            <Text style={styles.secondaryButtonText}>{deleteMode ? tIdeal("deleteExit") : tIdeal("delete")}</Text>
          </Pressable>
        </View>

        <View style={styles.reorderHint}>
          <MaterialCommunityIcons name="gesture-tap-hold" size={16} color={colors.textSecondary} />
          <Text style={styles.reorderHintText}>{tIdeal("reorderHint")}</Text>
        </View>
        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
      </View>

      {loading ? (
        <View style={[styles.card, shadows.card, styles.emptyCard, styles.listSpacing]}>
          <Text style={styles.emptyBody}>{tIdeal("loading")}</Text>
        </View>
      ) : hasIdeals ? (
        // DraggableFlatListタグはrenderItemにdragを渡しdragを使って発火のタイミングを操作できる。受け取った先でonLongPress={drag}を付与した要素がトリガーを握る。drag処理が終わるとonDragEndが発火する。
        <View style={styles.listSpacing}>
          <DraggableFlatList
            data={ideals}
            keyExtractor={(item) => item.id}
            renderItem={renderIdealCard}
            onDragEnd={handleDragEnd}
            scrollEnabled={false}
            activationDistance={10}
            contentContainerStyle={styles.idealGrid}
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
          <Text style={styles.emptyTitle}>{tIdeal("emptyTitle")}</Text>
          <Text style={styles.emptyBody}>{tIdeal("emptyBody")}</Text>
          <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={handleAddPress}>
            <MaterialCommunityIcons name="plus" size={18} color={colors.textPrimary} />
            <Text style={styles.primaryButtonText}>{tIdeal("emptyCta")}</Text>
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
                  <Text style={styles.modalMetaText}>{modalListLabel}</Text>
                  {!!modalUpdatedText && <Text style={styles.modalMetaText}>{modalUpdatedText}</Text>}
                </View>
              )}
              <TextInput
                autoFocus
                multiline
                placeholder={tIdeal("modal.placeholder")}
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
                  <Text style={styles.secondaryButtonText}>{tIdeal("modal.cancel")}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  style={[styles.primaryButton, saving && styles.buttonDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <MaterialCommunityIcons name="content-save-outline" size={18} color={colors.textPrimary} />
                  <Text style={styles.primaryButtonText}>{tIdeal("modal.save")}</Text>
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
    backgroundColor: "#1c3358",
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(110,168,255,0.25)",
    overflow: "hidden",
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
    lineHeight: typography.md * 1.5,
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
    backgroundColor: "rgba(30,94,255,0.2)",
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
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  secondaryButtonActive: {
    borderColor: colors.accentSubtle,
    backgroundColor: "rgba(110,168,255,0.08)",
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: typography.md,
  },
  reorderHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  reorderHintText: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.sm,
    fontWeight: "600",
  },
  idealGrid: {
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  idealCard: {
    backgroundColor: "#1c3358",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(110,168,255,0.25)",
    padding: spacing.lg,
    gap: spacing.sm,
    overflow: "hidden",
  },
  idealCardDragging: {
    borderColor: "rgba(110,168,255,0.6)",
    backgroundColor: "rgba(30,94,255,0.08)",
  },
  idealCardDeleteMode: {
    borderColor: "rgba(242,95,92,0.5)",
  },
  idealCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  idealBadge: {
    color: colors.accentSubtle,
    fontSize: typography.sm,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  idealUpdated: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  idealTitle: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "800",
    lineHeight: typography.lg * 1.5,
    textAlign: "left",
  },
  idealActions: {
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
    backgroundColor: "rgba(255,255,255,0.06)",
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
    backgroundColor: "rgba(12,18,32,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  modalContainer: {
    width: "100%",
  },
  modalCard: {
    backgroundColor: "#1f3a63",
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
  modalSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.5,
  },
  modalMeta: {
    gap: spacing.xs,
  },
  modalMetaText: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  modalInput: {
    backgroundColor: "rgba(255,255,255,0.04)",
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
    opacity: 0.7,
  },
});
