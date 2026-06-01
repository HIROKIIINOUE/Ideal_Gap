import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import { useKeyboardDismissAccessory } from "../../hooks/useKeyboardDismissAccessory";
import { useOfflineActionGuard } from "../../hooks/useOfflineActionGuard";
import { buildOfflineCacheKey, readOfflineCache, writeOfflineCache } from "../../lib/offline/cache";
import { supabase } from "../../lib/supabaseClient";
import { getKeyboardAvoidingBehavior, shouldUseAndroidJapaneseTypography } from "../../lib/ui/platform";
import { useOffline } from "../../providers/OfflineProvider";
import { Database } from "../../types/database";
import KeyboardDismissButton from "../KeyboardDismissButton";
import Loading from "../Loading";
import OfflineRequiredScreen from "../OfflineRequiredScreen";
import { compactFeatureSpacing } from "./compactFeatureSpacing";

type FunPlanCard = {
  id: string;
  description: string;
  eventDate: string | null;
  updatedAt: string | null;
  order: number;
};

type FunPlanRow = Database["public"]["Tables"]["fun_plans"]["Row"];

const planSchema = z.object({
  description: z.string().trim().min(1),
});
const offlineFunPlanSchema = z.array(
  z.object({
    id: z.string(),
    description: z.string(),
    eventDate: z.string().nullable(),
    order: z.number(),
    updatedAt: z.string().nullable(),
  }),
);

const HEADER_CARD_GRADIENT = ["rgba(110,168,255,0.32)", "rgba(20,34,60,0.95)"] as const;
const LIST_CARD_GRADIENT = ["rgba(104,195,255,0.26)", "rgba(17,38,70,0.96)"] as const;
// 楽しい予定の制限数を指定
const MAX_PLANS = 5;

// 編集インプットモーダルに表示する更新日の表示フォーマット
const formatUpdated = (iso?: string | null, updatedLabel?: string) => {
  if (!iso) return "";
  try {
    const date = new Date(iso);
    return `${date.toLocaleDateString()} ${updatedLabel ?? ""}`.trim();
  } catch {
    return updatedLabel ?? "";
  }
};

// データベースから取得した「次回の楽しい予定データ」からUIに必要なデータにのみ抽出
const toPlanCard = (row: {
  id: string;
  description: string;
  event_date?: string | null;
  order: number | null;
  updated_at?: string | null;
}): FunPlanCard => ({
  id: row.id,
  description: row.description,
  eventDate: row.event_date ?? null,
  order: row.order ?? 0,
  updatedAt: row.updated_at ?? null,
});

const localeFromLanguage = (language: string) => {
  switch (language) {
    case "ja":
      return "ja-JP";
    case "fr":
      return "fr-FR";
    case "en":
    default:
      return "en-CA";
  }
};

const parseStoredEventDate = (value: string | null) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const toEventDateString = (date: Date | null) => {
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function FunPlanScreen() {
  const { t, i18n } = useTranslation("funPlan");
  const { keyboardVisible, keyboardHeight, dismissKeyboard } = useKeyboardDismissAccessory();
  const [plans, setPlans] = useState<FunPlanCard[]>([]);
  const [deleteMode, setDeleteMode] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDraft, setModalDraft] = useState("");
  const [modalEventDate, setModalEventDate] = useState<Date | null>(null);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingMeta, setEditingMeta] = useState<{ updatedAt: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasOfflineCache, setHasOfflineCache] = useState(false);
  const { offlineBlocked } = useOffline();
  const guardOfflineAction = useOfflineActionGuard();
  const updatedLabel = t("updatedSuffix");
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const pickerLocale = localeFromLanguage(currentLanguage);
  const isFrench = currentLanguage.startsWith("fr");
  const isAndroidJapanese = shouldUseAndroidJapaneseTypography(currentLanguage);
  const isAndroid = Platform.OS === "android";
  const limitReached = plans.length >= MAX_PLANS;

  const getUserId = useMemo(
    () => async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.user?.id ?? null;
    },
    [],
  );

  // 次回の楽しい予定データ取得 → データをきれいに整える → 状態関数にセット
  useEffect(() => {
    let active = true;
    const fetchPlans = async () => {
      setLoading(true);
      setErrorMessage(null);
      const uid = await getUserId();
      if (!uid) {
        if (active) setErrorMessage(t("errors.loginMissing"));
        setLoading(false);
        return;
      }

      // ローカルキャッシュのキー名を生成
      const cacheKey = buildOfflineCacheKey("fun-plan", uid);
      // オフラインの場合、生成したキー名を使ってローカルキャッシュデータを取りに行く(キャッシュデータがなければ後ほどオフラインページ表示へ遷移される)
      if (offlineBlocked) {
        const cached = await readOfflineCache(cacheKey, offlineFunPlanSchema);
        if (active) {
          if (cached) {
            setPlans(cached);
            setHasOfflineCache(true);
          } else {
            setHasOfflineCache(false);
          }
          setLoading(false);
        }
        return;// オフラインの場合はここでデータフェッチ処理終了
      }
      const { data, error } = await supabase
        .from("fun_plans")
        .select("id, description, event_date, order, updated_at")
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
            event_date: row.event_date,
            order: row.order,
            updated_at: row.updated_at,
          }),
        );
        setPlans(mapped);
        // データが空配列ではない場合、ローカルキャッシュに保存
        setHasOfflineCache(mapped.length > 0);
        await writeOfflineCache(cacheKey, offlineFunPlanSchema, mapped);
      }
      setLoading(false);
    };
    fetchPlans();
    return () => {
      active = false;
    };
  }, [getUserId, offlineBlocked, t]);

  // 追加ボタン押下時の処理、インプットに必要な全ての状態変数がリセットされる
  const handleAddPress = () => {
    if (guardOfflineAction()) return;
    if (limitReached) return;
    setEditingId(null);
    setModalDraft("");
    setModalEventDate(null);
    setIsDatePickerVisible(false);
    setModalError(null);
    setModalVisible(true);
    setEditingMeta(null);
  };

  // 削除ボタン・編集ボタン押下時の処理
  const handleButtonPress = (item: FunPlanCard) => {
    if (guardOfflineAction()) return;
    if (deleteMode) {
      Alert.alert(t("deleteConfirmTitle"), t("deleteConfirmBody"), [
        { text: t("deleteConfirmNo"), style: "cancel" },
        {
          text: t("deleteConfirmYes"),
          style: "destructive",
          onPress: () => {
            supabase
              .from("fun_plans")
              .delete()
              .eq("id", item.id)
              .then(({ error }) => {
                if (error) {
                  Alert.alert(t("errors.deleteFailed"), error.message);
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
    setModalEventDate(parseStoredEventDate(item.eventDate));
    setIsDatePickerVisible(false);
    setModalError(null);
    setEditingMeta({ updatedAt: item.updatedAt });
    setModalVisible(true);
  };

  const handleOpenAndroidDatePicker = () => {
    DateTimePickerAndroid.open({
      value: modalEventDate ?? new Date(),
      mode: "date",
      display: "calendar",
      onChange: (event, selectedDate) => {
        if (event?.type === "dismissed" || !selectedDate) return;
        const normalized = new Date(selectedDate);
        normalized.setHours(0, 0, 0, 0);
        setModalEventDate(normalized);
      },
    });
  };

  const handleSave = async () => {
    if (guardOfflineAction()) return;
    const parsed = planSchema.safeParse({ description: modalDraft });
    if (!parsed.success) {
      setModalError(t("modal.errorRequired"));
      return;
    }
    if (!editingId && limitReached) {
      setModalError(t("limitReached"));
      return;
    }

    try {
      setSaving(true);
      setModalError(null);
      const uid = await getUserId();
      if (!uid) {
        setModalError(t("errors.loginMissing"));
        setSaving(false);
        return;
      }
      if (editingId) {
        // 編集モーダルの保存処理
        const { data, error } = await supabase
          .from("fun_plans")
          .update({
            description: parsed.data.description,
            event_date: toEventDateString(modalEventDate),
          })
          .eq("id", editingId)
          .select("id, description, event_date, order, updated_at")
          .single();
        if (error) {
          setModalError(error.message);
          setSaving(false);
          return;
        }
        const row = data as unknown as FunPlanRow;
        setPlans((prev) => prev.map((plan) => (plan.id === editingId ? toPlanCard(row) : plan)));
      } else {
        // 追加モーダルの保存処理
        const { data, error } = await supabase
          .from("fun_plans")
          .insert({
            user_id: uid,
            description: parsed.data.description,
            event_date: toEventDateString(modalEventDate),
            order: 0,
          })
          .select("id, description, event_date, order, updated_at")
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
          event_date: plan.eventDate,
          order: idx + 1,
          user_id: uid,
        }));
        const { error: upsertError } = await supabase
          .from("fun_plans")
          .upsert(
            [
              ...shiftedExisting,
              {
                id: row.id,
                description: row.description,
                event_date: row.event_date,
                order: 0,
                user_id: uid,
              },
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
      setModalEventDate(null);
      setIsDatePickerVisible(false);
      setEditingMeta(null);
      setSaving(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("errors.saveFailed");
      setModalError(message);
      setSaving(false);
    }
  };

  const toggleDeleteMode = () => {
    if (guardOfflineAction()) return;
    setDeleteMode((prev) => !prev);
  };


  // カード長押しドラッグで順番を入れ替えたあとの表示データ・DBデータのorderの更新
  const handleDragEnd = async ({ data }: { data: FunPlanCard[] }) => {
    if (guardOfflineAction()) return;
    setPlans(data);
    const uid = await getUserId();
    if (!uid) {
      Alert.alert(t("errors.reorderSaveFailed"), t("errors.loginMissing"));
      return;
    }

    const updates = data.map((item, idx) => ({
      id: item.id,
      description: item.description,
      event_date: item.eventDate,
      order: idx,
      user_id: uid,
    }));

    const { error } = await supabase.from("fun_plans").upsert(updates, { onConflict: "id" });
    if (error) {
      Alert.alert(t("errors.reorderSaveFailed"), error.message);
    }
  };

  // 特定のPressable要素の長押しドラッグを可能にするロジック
  const renderPlanCard = ({ item, drag, isActive }: RenderItemParams<FunPlanCard>) => {
    const onEditPress = () => handleButtonPress(item);

    return (
      <View
        style={[
          styles.planCard,
          shadows.card,
          isActive && styles.planCardDragging,
          deleteMode && styles.planCardDeleteMode,
        ]}
      >
        <LinearGradient
          colors={LIST_CARD_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.planCardRow}>
          <Text style={styles.planTitle}>{item.description}</Text>

          <View style={styles.planActions} testID={`fun-plan-card-actions-${item.id}`}>
            {deleteMode ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("delete")}
                onPress={() => handleButtonPress(item)}
                style={[styles.iconButton, styles.dangerButton]}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.error} />
              </Pressable>
            ) : (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("modal.editTitle")}
                  onPress={onEditPress}
                  style={[styles.iconButton, styles.editButton]}
                  testID={`fun-plan-card-edit-${item.id}`}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.textPrimary} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("reorderHandle", { defaultValue: "Drag to reorder" })}
                  style={[styles.iconButton, styles.dragHandleButton, isActive && styles.dragHandleButtonActive]}
                  onLongPress={drag}
                  delayLongPress={200}
                  hitSlop={14}
                  testID={`fun-plan-card-reorder-${item.id}`}
                >
                  <MaterialCommunityIcons name="swap-vertical-bold" size={18} color={colors.textSecondary} />
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    );
  };

  const modalTitle = editingId ? t("modal.editTitle") : t("modal.addTitle");
  const modalUpdatedText = editingMeta?.updatedAt ? formatUpdated(editingMeta.updatedAt, updatedLabel) : null;
  const modalDateLabel = modalEventDate
    ? modalEventDate.toLocaleDateString(pickerLocale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;
  const modalSelectedDateText = modalDateLabel ? t("modal.selectedDate", { date: modalDateLabel }) : null;

  if (loading) {
    return (
      <GestureHandlerRootView style={styles.ghRoot}>
        <Loading />
      </GestureHandlerRootView>
    );
  }
  // オフラインかつキャッシュデータがない場合は専用のオフラインページを表示する
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
        data={plans}
        keyExtractor={(item) => item.id}
        renderItem={renderPlanCard}
        onDragEnd={handleDragEnd}
        activationDistance={8}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.planGrid}
        ListHeaderComponent={(
          <View style={[styles.card, styles.titleCardCompact, shadows.card]}>
            <LinearGradient
              colors={HEADER_CARD_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.headerRow}>
              <View style={styles.headerText}>
                <Text style={[styles.heading, isFrench && styles.headingFrench, isAndroidJapanese && styles.headingAndroidJa]}>{t("pageTitle")}</Text>
                <Text style={styles.titleNote}>{t("titleCardNote")}</Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: limitReached }}
                style={[styles.primaryButton, limitReached && styles.buttonDisabled]}
                onPress={handleAddPress}
                disabled={limitReached || offlineBlocked}
              >
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
            {limitReached && <Text style={styles.limitText}>{t("limitHelper")}</Text>}
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

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={dismissKeyboard}
          testID="fun-plan-modal-overlay"
        >
          <KeyboardAvoidingView
            behavior={getKeyboardAvoidingBehavior()}
            style={styles.modalContainer}
            testID="fun-plan-modal-kav"
          >
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              testID="fun-plan-modal-scroll"
            >
              <Pressable
                style={[styles.modalCard, shadows.card]}
                onPress={(event) => event.stopPropagation()}
              >
                <Text style={styles.modalTitle}>{modalTitle}</Text>
                {editingMeta && (
                  <View style={styles.modalMeta}>
                    {!!modalUpdatedText && <Text style={styles.modalMetaText}>{modalUpdatedText}</Text>}
                  </View>
                )}
                <TextInput
                  multiline
                  placeholder={t("modal.placeholder")}
                  placeholderTextColor={colors.textSecondary}
                  style={styles.modalInput}
                  value={modalDraft}
                  onChangeText={(text) => {
                    setModalDraft(text);
                    setModalError(null);
                  }}
                />
                <View style={styles.modalDateSection}>
                  <Text style={styles.modalDateLabel}>{t("modal.optionalDateLabel")}</Text>
                  {isAndroid ? (
                    <View style={styles.modalDateInfoBlock}>
                      <View style={styles.modalDateActions}>
                        <Pressable
                          accessibilityRole="button"
                          style={styles.datePickerButton}
                          onPress={handleOpenAndroidDatePicker}
                        >
                          <MaterialCommunityIcons
                            name="calendar-month-outline"
                            size={18}
                            color={colors.textPrimary}
                          />
                          <Text style={styles.datePickerButtonText}>{t("modal.pickDate")}</Text>
                        </Pressable>
                        {modalDateLabel ? (
                          <Pressable
                            accessibilityRole="button"
                            style={styles.ghostButton}
                            onPress={() => setModalEventDate(null)}
                          >
                            <Text style={styles.ghostButtonText}>{t("modal.clearDate")}</Text>
                          </Pressable>
                        ) : null}
                      </View>
                      {modalSelectedDateText ? (
                        <Text style={styles.modalSelectedDateText}>{modalSelectedDateText}</Text>
                      ) : null}
                    </View>
                  ) : (
                    <View style={styles.iosDatePickerSection}>
                      <View style={styles.modalDateActions}>
                        <Pressable
                          accessibilityRole="button"
                          style={({ pressed }) => [
                            styles.datePickerButton,
                            pressed && styles.buttonPressed,
                          ]}
                          onPress={() => setIsDatePickerVisible(true)}
                        >
                          <MaterialCommunityIcons
                            name="calendar-month-outline"
                            size={18}
                            color={colors.textPrimary}
                          />
                          <Text style={styles.datePickerButtonText}>{t("modal.pickDate")}</Text>
                        </Pressable>
                        {modalDateLabel ? (
                          <Pressable
                            accessibilityRole="button"
                            style={styles.ghostButton}
                            onPress={() => {
                              setModalEventDate(null);
                              setIsDatePickerVisible(false);
                            }}
                          >
                            <Text style={styles.ghostButtonText}>{t("modal.clearDate")}</Text>
                          </Pressable>
                        ) : null}
                      </View>
                      {modalSelectedDateText ? (
                        <Text style={styles.modalSelectedDateText}>{modalSelectedDateText}</Text>
                      ) : null}
                      {isDatePickerVisible ? (
                        <DateTimePicker
                          testID="fun-plan-event-date-picker"
                          value={modalEventDate ?? new Date()}
                          mode="date"
                          display="spinner"
                          locale={pickerLocale}
                          textColor={colors.textPrimary}
                          style={styles.picker}
                          onChange={(_event, selectedDate) => {
                            if (!selectedDate) return;
                            const normalized = new Date(selectedDate);
                            normalized.setHours(0, 0, 0, 0);
                            setModalEventDate(normalized);
                          }}
                        />
                      ) : null}
                    </View>
                  )}
                </View>
                {!!modalError && <Text style={styles.modalError}>{modalError}</Text>}
                <View style={styles.modalFooterRow}>
                  <View style={[styles.modalActions, styles.modalActionsRight]}>
                    <Pressable
                      accessibilityRole="button"
                      style={styles.secondaryButton}
                      onPress={() => {
                        setModalVisible(false);
                        setModalEventDate(null);
                        setIsDatePickerVisible(false);
                      }}
                    >
                      <Text style={styles.secondaryButtonText}>{t("modal.cancel")}</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      style={[styles.primaryButton, saving && styles.buttonDisabled]}
                      onPress={handleSave}
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
    backgroundColor: "#132742",
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(110,168,255,0.3)",
    overflow: "hidden",
  },
  titleCardCompact: {
    padding: compactFeatureSpacing.titleCardPadding,
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
  headingFrench: {
    fontSize: 24,
    lineHeight: 31,
  },
  headingAndroidJa: {
    fontSize: 24,
    lineHeight: 31,
  },
  titleNote: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.5,
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
  headerButtonTextFrench: {
    fontSize: 14,
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
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  planCard: {
    backgroundColor: "#1c3358",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(110,168,255,0.25)",
    padding: compactFeatureSpacing.itemCardPadding,
    gap: compactFeatureSpacing.itemContentGap,
    overflow: "hidden",
  },
  planCardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  planCardDragging: {
    borderColor: "rgba(110,168,255,0.65)",
    backgroundColor: "rgba(30,94,255,0.1)",
  },
  planCardDeleteMode: {
    borderColor: "rgba(242,95,92,0.5)",
  },
  planTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "800",
    lineHeight: typography.md * 1.4,
    textAlign: "left",
  },
  planActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  editButton: {
    borderColor: colors.accentPrimary,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  dangerButton: {
    borderColor: "rgba(242,95,92,0.4)",
    backgroundColor: "rgba(242,95,92,0.08)",
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
  },
  dragHandleButton: {
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
    backgroundColor: "rgba(12,18,32,0.82)",
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
  modalDateSection: {
    gap: spacing.sm,
  },
  modalDateLabel: {
    color: colors.textPrimary,
    fontSize: typography.sm,
    fontWeight: "700",
  },
  modalDateActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  modalDateInfoBlock: {
    gap: spacing.sm,
  },
  modalSelectedDateText: {
    color: colors.accentSubtle,
    fontSize: typography.sm,
    fontWeight: "600",
    lineHeight: typography.sm * 1.4,
  },
  iosDatePickerSection: {
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 50,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(110,168,255,0.45)",
    backgroundColor: "rgba(110,168,255,0.14)",
  },
  buttonPressed: {
    opacity: 0.82,
  },
  datePickerButtonText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: typography.md,
    flexShrink: 1,
  },
  ghostButton: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(242,95,92,0.3)",
    backgroundColor: "rgba(242,95,92,0.08)",
  },
  ghostButtonText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: typography.md,
  },
  picker: {
    alignSelf: "flex-start",
    marginLeft: -28,
    transform: [{ scale: 0.92 }],
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
    opacity: 0.6,
  },
});
