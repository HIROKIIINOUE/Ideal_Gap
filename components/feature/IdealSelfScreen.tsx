import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
// ControllerはTextInputとRHFを繋ぐタグ、FieldErrorsはhandleSubmitが失敗したときのエラー型
import { Controller, FieldErrors } from "react-hook-form";
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
import { useAppZodForm } from "../../hooks/useAppZodForm";
import { useDeleteMode } from "../../hooks/useDeleteMode";
import { closedModalState, createAddModalState, createEditModalState, ModalState } from "../../lib/common/modalState";
import { supabase } from "../../lib/supabaseClient";
import Loading from "../Loading";

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

// Zodで定義したidealSchemaを型IdealFormValueとして取り出す
type IdealFormValues = z.infer<typeof idealSchema>;
const HEADER_CARD_GRADIENT = ["rgba(30,94,255,0.22)", "rgba(12,18,32,0.9)"] as const;
const LIST_CARD_GRADIENT = ["rgba(20,46,86,0.9)", "rgba(10,16,28,0.95)"] as const;

// 編集モーダルに表示する更新日の文章生成
const formatUpdated = (iso?: string | null, updatedLabel?: string) => {
  if (!iso) return "";
  try {
    const date = new Date(iso);
    return `${date.toLocaleDateString()} ${updatedLabel ?? ""}`.trim();
  } catch {
    return updatedLabel ?? "";
  }
};

// DBから取得した「理想の自分」データをUI表示用に整形
const toIdealCard = (row: { id: string; description: string; order: number | null; updated_at?: string | null }): IdealCard => ({
  id: row.id,
  description: row.description,
  order: row.order ?? 0,
  updatedAt: row.updated_at ?? null,
});

export default function IdealSelfScreen() {
  const { t } = useTranslation("idealSelf");
  const [ideals, setIdeals] = useState<IdealCard[]>([]);
  const { deleteMode, toggleDeleteMode, disableDeleteMode } = useDeleteMode();
  const [modalState, setModalState] = useState<ModalState>(closedModalState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const updatedLabel = t("updatedSuffix");
  const {
    control, // Controller が使う“フォーム管理本体”
    handleSubmit,
    reset,
    clearErrors, // Controller が使う“フォーム管理本体”
    formState: { errors }, // バリデーション結果（Zodが作ったメッセージ等）
  } = useAppZodForm({
    schema: idealSchema,
    defaultValues: { description: "" },  //初期表示時や reset() したときの値が " " ではなく "" になる
  });

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
        if (active) setErrorMessage(t("errors.loginMissing"));
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
  }, [getUserId, t]);

  // 追加インプットモーダル表示ボタン
  const handleAddPress = () => {
    setModalError(null);
    reset({ description: "" });
    setModalState(createAddModalState());
    clearErrors();
  };

  // 更新ボタンと削除ボタンを状況に応じて管理
  const handleButtonPress = (item: IdealCard) => {
    if (deleteMode) {
      Alert.alert(t("deleteConfirmTitle"), t("deleteConfirmBody"), [
        { text: t("deleteConfirmNo"), style: "cancel" },
        {
          text: t("deleteConfirmYes"),
          style: "destructive",
          onPress: () => {
            supabase
              .from("user_ideal" as any)
              .delete()
              .eq("id", item.id)
              .then(({ error }) => {
                if (error) {
                  Alert.alert(t("errors.deleteFailed"), error.message);
                  return;
                }
                setIdeals((prev) => prev.filter((ideal) => ideal.id !== item.id));
              });
          },
        },
      ]);
      return;
    }
    reset({ description: item.description }); // モーダルオープン時にデータを表示できるようにセット
    setModalError(null);
    setModalState(createEditModalState(item.id, { updatedAt: item.updatedAt }));
    clearErrors();
  };

  // 保存・更新ボタン両方を管理するロジック
  const onValidSubmit = async ({ description }: IdealFormValues) => {
    setSaving(true);
    setModalError(null);

    try {
      // ユーザ情報取得
      const uid = await getUserId();
      if (!uid) {
        setModalError(t("errors.loginMissing"));
        setSaving(false);
        return;
      }
      // ↓ 更新ボタンで保存した場合
      if (modalState.editingId) {
        const { data, error } = await supabase
          .from("user_ideal" as any)
          .update({ description })
          .eq("id", modalState.editingId)
          .select("id, description, order, updated_at")
          .single();
        if (error) {
          setModalError(error.message);
          setSaving(false);
          return;
        }
        const row = data as unknown as UserIdealRow;
        setIdeals((prev) => prev.map((ideal) => (ideal.id === modalState.editingId ? toIdealCard(row) : ideal)));
      } else {
        // 追加ボタンで保存した場合（最上部に追加）
        const { data, error } = await supabase
          .from("user_ideal" as any)
          .insert({ user_id: uid, description, order: 0 })
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
      setModalState(closedModalState);
      reset({ description: "" });
      setSaving(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("errors.saveFailed");
      setModalError(message);
      setSaving(false);
    }
  };

  const handleInvalidSubmit = (formErrors: FieldErrors<IdealFormValues>) => {
    setModalError(formErrors.description?.message ?? t("modal.errorRequired"));
  };

  // ドラッグ並び替え終了時の配列データをセットする
  const handleDragEnd = async ({ data }: { data: IdealCard[] }) => {
    setIdeals(data);
    const uid = await getUserId();
    if (!uid) {
      Alert.alert(t("errors.reorderSaveFailed"), t("errors.loginMissing"));
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
      Alert.alert(t("errors.reorderSaveFailed"), error.message);
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
              <Text style={styles.dangerButtonText}>{t("delete")}</Text>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" onPress={onEditPress} style={[styles.editButton, styles.iconButtonRow]}>
              <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.textPrimary} />
              <Text style={styles.editButtonText}>{t("modal.editTitle")}</Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  };

  const hasIdeals = ideals.length > 0;
  const modalTitle = modalState.editingId ? t("modal.editTitle") : t("modal.addTitle");
  // list label was removed
  const modalUpdatedText = modalState.meta?.updatedAt ? formatUpdated(modalState.meta.updatedAt, updatedLabel) : null;

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
        <Text style={styles.heading}>{t("pageTitle")}</Text>

        <View style={styles.actionRow}>
          <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={handleAddPress} disabled={loading}>
            <MaterialCommunityIcons name="plus" size={20} color={colors.textPrimary} />
            <Text style={styles.primaryButtonText}>{t("add")}</Text>
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
            <Text style={styles.secondaryButtonText}>{deleteMode ? t("deleteExit") : t("delete")}</Text>
          </Pressable>
        </View>
        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
      </View>

      {loading ? (
        <View style={[styles.card, shadows.card, styles.emptyCard, styles.listSpacing]}>
          <Text style={styles.emptyBody}>{t("loading")}</Text>
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
          <Text style={styles.emptyTitle}>{t("emptyTitle")}</Text>
          <Text style={styles.emptyBody}>{t("emptyBody")}</Text>
          <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={handleAddPress}>
            <MaterialCommunityIcons name="plus" size={18} color={colors.textPrimary} />
            <Text style={styles.primaryButtonText}>{t("emptyCta")}</Text>
          </Pressable>
        </View>
      )}

      <Modal
        visible={modalState.visible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setModalState(closedModalState);
          disableDeleteMode();
        }}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior="padding" style={styles.modalContainer}>
            <View style={[styles.modalCard, shadows.card]}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              {modalState.meta && (
                <View style={styles.modalMeta}>
                  {!!modalUpdatedText && <Text style={styles.modalMetaText}>{modalUpdatedText}</Text>}
                </View>
              )}
              <Controller
                control={control}
                name="description"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    autoFocus
                    multiline
                    placeholder={t("modal.placeholder")}
                    placeholderTextColor={colors.textSecondary}
                    style={styles.modalInput}
                    value={value}
                    onChangeText={(text) => {
                      onChange(text);
                      setModalError(null);
                      clearErrors("description");
                    }}
                    onBlur={onBlur}
                  />
                )}
              />
              {(modalError || errors.description?.message) && (
                <Text style={styles.modalError}>{modalError ?? errors.description?.message}</Text>
              )}
              <View style={styles.modalActions}>
                <Pressable
                  accessibilityRole="button"
                  style={styles.secondaryButton}
                  onPress={() => setModalState(closedModalState)}
                >
                  <Text style={styles.secondaryButtonText}>{t("modal.cancel")}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  style={[styles.primaryButton, saving && styles.buttonDisabled]}
                  // handleSubmitがフォーム全体を検証し、OKならonValidSubmit(values)、NGならhandleInvalidSubmit(error)を発火
                  onPress={handleSubmit(onValidSubmit, handleInvalidSubmit)}
                  disabled={saving}
                >
                  <MaterialCommunityIcons name="content-save-outline" size={18} color={colors.textPrimary} />
                  <Text style={styles.primaryButtonText}>{t("modal.save")}</Text>
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
