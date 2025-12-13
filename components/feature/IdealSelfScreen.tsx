import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
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

type IdealCard = {
  id: string;
  description: string;
  note: string;
  updated: string;
};

const idealSchema = z.object({
  description: z.string().trim().min(1),
});

const HEADER_CARD_GRADIENT = ["rgba(30,94,255,0.22)", "rgba(12,18,32,0.9)"] as const;
const LIST_CARD_GRADIENT = ["rgba(20,46,86,0.9)", "rgba(10,16,28,0.95)"] as const;

const initialIdeals: IdealCard[] = [
  {
    id: "1",
    description: "朝5時に起きて静かな時間に瞑想と読書をし、1日の軸を整える。",
    note: "朝のリズムを固定して集中力の高い時間を作る。",
    updated: "今日 05:40 更新",
  },
  {
    id: "2",
    description: "毎週のタスクを日曜夜に整理し、月〜金は迷いなく着手する。",
    note: "意思決定を減らし、行動開始までの時間を最短にする。",
    updated: "昨日 21:10 更新",
  },
  {
    id: "3",
    description: "アウトプットを週2本以上作成し、学びを定着させ続ける。",
    note: "短文ブログやメモでも良いので公開する。",
    updated: "2日前 19:05 更新",
  },
  {
    id: "4",
    description: "毎日20分の筋トレで姿勢と体力を維持し、自己効力感を高める。",
    note: "集中が切れそうな時のリセット手段としても活用。",
    updated: "3日前 07:55 更新",
  },
];

export default function IdealSelfScreen() {
  const { t: tIdeal } = useTranslation("idealSelf");
  const [ideals, setIdeals] = useState<IdealCard[]>(initialIdeals);
  const [deleteMode, setDeleteMode] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDraft, setModalDraft] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddPress = () => {
    setEditingId(null);
    setModalDraft("");
    setModalError(null);
    setModalVisible(true);
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
            setIdeals((prev) => prev.filter((ideal) => ideal.id !== item.id));
          },
        },
      ]);
      return;
    }
    setEditingId(item.id);
    setModalDraft(item.description);
    setModalError(null);
    setModalVisible(true);
  };

  const handleSave = () => {
    const parsed = idealSchema.safeParse({ description: modalDraft });
    if (!parsed.success) {
      setModalError(tIdeal("modal.errorRequired"));
      return;
    }
    if (editingId) {
      setIdeals((prev) =>
        prev.map((ideal) =>
          ideal.id === editingId
            ? { ...ideal, description: parsed.data.description, updated: "いま更新" }
            : ideal,
        ),
      );
    } else {
      setIdeals((prev) => [
        {
          id: `${Date.now()}`,
          description: parsed.data.description,
          note: "メモを追加して自分なりの解釈を書き残してください。",
          updated: "いま追加",
        },
        ...prev,
      ]);
    }
    setModalVisible(false);
    setEditingId(null);
    setModalDraft("");
    setModalError(null);
  };

  const toggleDeleteMode = () => {
    setDeleteMode((prev) => !prev);
  };

  // ドラッグ並び替え終了時の配列データをセットする
  const handleDragEnd = ({ data }: { data: IdealCard[] }) => {
    setIdeals(data);
  };


  // 長押しドラッグを可能にするロジック
  const renderIdealCard = ({ item, drag, isActive }: RenderItemParams<IdealCard>) => {
    const position = ideals.findIndex((ideal) => ideal.id === item.id) + 1;
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
        <View style={styles.idealCardHeader}>
          <Text style={styles.idealBadge}>{`${tIdeal("listLabel")} ${position}`}</Text>
          <Text style={styles.idealUpdated}>{item.updated}</Text>
        </View>
        <Text style={styles.idealTitle}>{item.description}</Text>
        <Text style={styles.idealNote}>{item.note}</Text>

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
        <Text style={styles.body}>{tIdeal("pageSubtitle")}</Text>

        <View style={styles.actionRow}>
          <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={handleAddPress}>
            <MaterialCommunityIcons name="plus" size={18} color={colors.textPrimary} />
            <Text style={styles.primaryButtonText}>{tIdeal("add")}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[styles.secondaryButton, deleteMode && styles.secondaryButtonActive]}
            onPress={toggleDeleteMode}
          >
            <MaterialCommunityIcons
              name={deleteMode ? "close" : "trash-can-outline"}
              size={18}
              color={colors.textPrimary}
            />
            <Text style={styles.secondaryButtonText}>{deleteMode ? tIdeal("deleteExit") : tIdeal("delete")}</Text>
          </Pressable>
        </View>

        <View style={styles.reorderHint}>
          <MaterialCommunityIcons name="gesture-tap-hold" size={16} color={colors.textSecondary} />
          <Text style={styles.reorderHintText}>{tIdeal("reorderHint")}</Text>
        </View>
      </View>

      {hasIdeals ? (
        // DraggableFlatListタグはrenderItemにdragを渡しdragを使って発火のタイミングを操作できる。受け取った先でonLongPress={drag}を付与した要素がトリガーを握る。drag処理が終わるとonDragEndが発火する。
        <DraggableFlatList
          data={ideals}
          keyExtractor={(item) => item.id}
          renderItem={renderIdealCard}
          onDragEnd={handleDragEnd}
          scrollEnabled={false}
          activationDistance={10}
          contentContainerStyle={styles.idealGrid}
        />
      ) : (
        <View style={[styles.card, shadows.card, styles.emptyCard]}>
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
              <Text style={styles.modalSubtitle}>{tIdeal("pageSubtitle")}</Text>
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
                <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={handleSave}>
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
    backgroundColor: "#132742",
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
    borderColor: "rgba(110,168,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  primaryButtonText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: typography.sm,
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
    fontSize: typography.sm,
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
  idealGrid: {
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  idealCard: {
    backgroundColor: "#132742",
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
    fontSize: typography.md,
    fontWeight: "700",
    lineHeight: typography.md * 1.5,
  },
  idealNote: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.5,
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
    backgroundColor: colors.surface,
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
});
