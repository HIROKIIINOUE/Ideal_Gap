import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
// ControllerはTextInputとRHFを繋ぐタグ、FieldErrorsはhandleSubmitが失敗したときのエラー型
import { Controller, FieldErrors } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { z } from "zod";
import KeyboardDismissButton from "../KeyboardDismissButton";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import { useAppZodForm } from "../../hooks/useAppZodForm";
import { useDeleteMode } from "../../hooks/useDeleteMode";
import { useKeyboardDismissAccessory } from "../../hooks/useKeyboardDismissAccessory";
import { useOfflineActionGuard } from "../../hooks/useOfflineActionGuard";
import { getUserId } from "../../lib/api/supabase/common";
import { deleteIdeal, fetchIdealSelf, insertIdeal, updateIdeal, upsertIdeals } from "../../lib/api/supabase/idealSelf";
import { closedModalState, createAddModalState, createEditModalState, ModalState } from "../../lib/common/modalState";
import { buildOfflineCacheKey, readOfflineCache, writeOfflineCache } from "../../lib/offline/cache";
import { getKeyboardAvoidingBehavior, shouldUseAndroidJapaneseTypography } from "../../lib/ui/platform";
import { useOffline } from "../../providers/OfflineProvider";
import Loading from "../Loading";
import OfflineRequiredScreen from "../OfflineRequiredScreen";

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
const offlineIdealSchema = z.array(
  z.object({
    id: z.string(),
    description: z.string(),
    order: z.number(),
    updatedAt: z.string().nullable(),
  }),
);
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
  const { t, i18n } = useTranslation("idealSelf");
  const { keyboardVisible, keyboardHeight, dismissKeyboard } = useKeyboardDismissAccessory();
  const [ideals, setIdeals] = useState<IdealCard[]>([]);
  const { deleteMode, toggleDeleteMode, disableDeleteMode } = useDeleteMode();
  const [modalState, setModalState] = useState<ModalState>(closedModalState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [hasOfflineCache, setHasOfflineCache] = useState(false);
  const { offlineBlocked } = useOffline();
  const guardOfflineAction = useOfflineActionGuard();
  const updatedLabel = t("updatedSuffix");
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const isFrench = currentLanguage.startsWith("fr");
  const isAndroidJapanese = shouldUseAndroidJapaneseTypography(currentLanguage);
  const {
    control, // Controller が使う“フォーム管理本体”
    handleSubmit,
    reset,
    clearErrors,
    formState: { errors }, // バリデーション結果（Zodが作ったメッセージ等）
  } = useAppZodForm({
    schema: idealSchema,
    defaultValues: { description: "" },  //初期表示時や reset() したときの値が " " ではなく "" になる
  });

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

      // ローカルキャッシュのキー名を生成
      const cacheKey = buildOfflineCacheKey("ideal-self", uid);

      // オフラインの場合、生成したキー名を使ってローカルキャッシュデータを取りに行く(キャッシュデータがなければ後ほどオフラインページ表示へ遷移される)
      if (offlineBlocked) {
        const cached = await readOfflineCache(cacheKey, offlineIdealSchema);
        if (active) {
          if (cached) {
            setIdeals(cached);
            setHasOfflineCache(true);
          } else {
            setHasOfflineCache(false);
          }
          setLoading(false);
        }
        return;  //オフラインの場合はここでデータフェッチ処理終了
      }

      const { data, error } = await fetchIdealSelf(uid);
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
        //データが空配列ではない場合、ローカルキャッシュに保存
        setHasOfflineCache(mapped.length > 0);
        await writeOfflineCache(cacheKey, offlineIdealSchema, mapped);
      }
      if (active) setLoading(false);
    };
    fetchIdeals();
    return () => {
      active = false;
    };
  }, [offlineBlocked, t]);

  // 追加インプットモーダル表示ボタン
  const handleAddPress = () => {
    if (guardOfflineAction()) return;
    setModalError(null);
    reset({ description: "" });
    setModalState(createAddModalState());
    clearErrors();
  };

  // 更新ボタンと削除ボタンを状況に応じて管理
  const handleButtonPress = (item: IdealCard) => {
    if (guardOfflineAction()) return;
    if (deleteMode) {
      Alert.alert(t("deleteConfirmTitle"), t("deleteConfirmBody"), [
        { text: t("deleteConfirmNo"), style: "cancel" },
        {
          text: t("deleteConfirmYes"),
          style: "destructive",
          onPress: () => {
            deleteIdeal(item.id).then(({ error }) => {
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
    if (guardOfflineAction()) return;
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
        const { data, error } = await updateIdeal(modalState.editingId, { description });
        if (error) {
          setModalError(error.message);
          setSaving(false);
          return;
        }
        const row = data as unknown as UserIdealRow;
        setIdeals((prev) => prev.map((ideal) => (ideal.id === modalState.editingId ? toIdealCard(row) : ideal)));
      } else {
        // 追加ボタンで保存した場合（最上部に追加）
        const { data, error } = await insertIdeal({ user_id: uid, description, order: 0 });
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
        const { error: upsertError } = await upsertIdeals([
          ...shiftedExisting,
          { id: row.id, description: row.description, order: 0, user_id: uid },
        ]);
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

  const handleInvalidSubmit = (_formErrors: FieldErrors<IdealFormValues>) => {
    setModalError(t("modal.errorRequired"));
  };

  // ドラッグ並び替え終了時の配列データをセットする
  const handleDragEnd = async ({ data }: { data: IdealCard[] }) => {
    if (guardOfflineAction()) return;
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

    const { error } = await upsertIdeals(updates);
    if (error) {
      Alert.alert(t("errors.reorderSaveFailed"), error.message);
    }
  };


  // 指定のPressable要素の長押しドラッグを可能にするロジック
  const renderIdealCard = ({ item, drag, isActive }: RenderItemParams<IdealCard>) => {
    const onEditPress = () => handleButtonPress(item);

    return (
      <View
        style={[
          styles.idealCard,
          shadows.card,
          isActive && styles.idealCardDragging,
          deleteMode && styles.idealCardDeleteMode,
        ]}
      >
        <LinearGradient
          colors={LIST_CARD_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.idealTitle}>{item.description}</Text>

        <View style={styles.idealActions} testID={`ideal-self-card-actions-${item.id}`}>
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
            <>
              <Pressable
                accessibilityRole="button"
                onPress={onEditPress}
                style={[styles.editButton, styles.iconButtonRow]}
                testID={`ideal-self-card-edit-${item.id}`}
              >
                <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.textPrimary} />
                <Text style={styles.editButtonText}>{t("modal.editTitle")}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("reorderHandle", { defaultValue: "Drag to reorder" })}
                style={[styles.dragHandleButton, isActive && styles.dragHandleButtonActive]}
                onLongPress={drag}
                delayLongPress={200}
                hitSlop={14}
                testID={`ideal-self-card-reorder-${item.id}`}
              >
                <MaterialCommunityIcons name="swap-vertical-bold" size={20} color={colors.textSecondary} />
              </Pressable>
            </>
          )}
        </View>
      </View>
    );
  };

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
  //オフラインかつキャッシュデータがない場合は専用のオフラインページを表示する
  if (offlineBlocked && !hasOfflineCache) {
    return (
      <GestureHandlerRootView style={styles.ghRoot}>
        <OfflineRequiredScreen />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.ghRoot}>
      {/* DraggableFlatListは１つのコンポーネントとして記載している */}
      {/* 各属性としてDOMなどを設定する特殊な書き方なので注意 */}
      {/* データが空の時にDOM表示する”ListEmptyComponent”など特殊な属性が使われている */}
      <DraggableFlatList
        data={ideals}
        keyExtractor={(item) => item.id}
        renderItem={renderIdealCard}
        onDragEnd={handleDragEnd}
        activationDistance={8}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.idealGrid}
        ListHeaderComponent={(
          <View style={[styles.card, shadows.card]}>
            <LinearGradient
              colors={HEADER_CARD_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={[styles.heading, isFrench && styles.headingFrench, isAndroidJapanese && styles.headingAndroidJa]}>{t("pageTitle")}</Text>

            <View style={styles.actionRow}>
              <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={handleAddPress} disabled={loading || offlineBlocked}>
                <MaterialCommunityIcons name="plus" size={20} color={colors.textPrimary} />
                <Text style={[styles.primaryButtonText, isFrench && styles.headerButtonTextFrench]}>{t("add")}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={[styles.secondaryButton, deleteMode && styles.secondaryButtonActive]}
                onPress={toggleDeleteMode}
                disabled={offlineBlocked}
              >
                <MaterialCommunityIcons
                  name={deleteMode ? "close" : "trash-can-outline"}
                  size={20}
                  color={colors.textPrimary}
                />
                <Text style={[styles.secondaryButtonText, isFrench && styles.headerButtonTextFrench]}>
                  {deleteMode ? t("deleteExit") : t("delete")}
                </Text>
              </Pressable>
            </View>
            {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
          </View>
        )}
        ListHeaderComponentStyle={styles.listHeader}
        ListEmptyComponent={(
          <View style={[styles.card, shadows.card, styles.emptyCard]}>
            <LinearGradient
              colors={LIST_CARD_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.emptyTitle}>{t("emptyTitle")}</Text>
            <Text style={styles.emptyBody}>{t("emptyBody")}</Text>
            <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={handleAddPress} disabled={offlineBlocked}>
              <MaterialCommunityIcons name="plus" size={18} color={colors.textPrimary} />
              <Text style={styles.primaryButtonText}>{t("emptyCta")}</Text>
            </Pressable>
          </View>
        )}
      />

      <Modal
        visible={modalState.visible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setModalState(closedModalState);
          disableDeleteMode();
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={dismissKeyboard}
          testID="ideal-self-modal-overlay"
        >
          <KeyboardAvoidingView
            behavior={getKeyboardAvoidingBehavior()}
            style={styles.modalContainer}
            testID="ideal-self-modal-kav"
          >
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              testID="ideal-self-modal-scroll"
            >
              <Pressable
                style={[styles.modalCard, shadows.card]}
                onPress={(event) => event.stopPropagation()}
              >
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
                <View style={styles.modalFooterRow}>
                  <View style={[styles.modalActions, styles.modalActionsRight]}>
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
                      <Text style={styles.primaryButtonText}>{t("modal.save")}</Text>
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
          {keyboardVisible ? (
            <KeyboardDismissButton keyboardHeight={keyboardHeight} onPress={dismissKeyboard} />
          ) : null}
        </Pressable>
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
  headingFrench: {
    fontSize: 24,
    lineHeight: 31,
  },
  headingAndroidJa: {
    fontSize: 24,
    lineHeight: 31,
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
  headerButtonTextFrench: {
    fontSize: 14,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.sm,
    fontWeight: "600",
  },
  idealGrid: {
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl * 2,
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
    borderWidth: 1,
    borderColor: colors.accentPrimary,
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
  dragHandleButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  dragHandleButtonActive: {
    borderColor: colors.accentPrimary,
    backgroundColor: "rgba(30,94,255,0.16)",
  },
  emptyCard: {
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  listHeader: {
    marginBottom: spacing.md,
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
    maxHeight: "100%",
  },
  modalScroll: {
    width: "100%",
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
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
  modalActionsRight: {
    marginLeft: "auto",
  },
  modalFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: spacing.md,
  },
  keyboardIconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
