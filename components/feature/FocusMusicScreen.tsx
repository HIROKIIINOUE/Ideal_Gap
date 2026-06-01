import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useAudioPlayer } from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import {
  colors,
  radius,
  shadows,
  spacing,
  typography,
} from "../../constants/theme";
import { FOCUS_MUSIC_MAX_INSTALLED } from "../../lib/focus-music/constants";
import { createFocusMusicSignedUrl } from "../../lib/focus-music/signedUrl";
import { captureExpoAudioError } from "../../lib/sentry";
import { useFocusMusic } from "../../providers/FocusMusicProvider";
import { FocusMusicCategory } from "../../types/focus-music";

const HEADER_CARD_GRADIENT = [
  "rgba(30,94,255,0.22)",
  "rgba(12,18,32,0.9)",
] as const;
const LIST_CARD_GRADIENT = [
  "rgba(20,46,86,0.9)",
  "rgba(10,16,28,0.95)",
] as const;

const CATEGORY_OPTIONS: FocusMusicCategory[] = [
  "study",
  "chill",
  "nature",
  "music",
  "workout",
];

export default function FocusMusicScreen() {
  const { t } = useTranslation("focusMusic");
  const {
    catalog,
    installedTracks,
    selectedTrackId,
    monthlyDownloadLimit,
    monthlyDownloadRemaining,
    downloadResetAt,
    canInstall,
    isInstalling,
    isDownloadInProgress,
    isLoadingCatalog,
    getInstallProgress,
    refreshCatalog,
    refreshDownloadQuota,
    installTrack,
    removeTrack,
    selectTrack,
    isInstalled,
  } = useFocusMusic();
  const previewPlayer = useAudioPlayer(null);
  const [catalogVisible, setCatalogVisible] = useState(false);
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [limitMessageVisible, setLimitMessageVisible] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<
    FocusMusicCategory[]
  >([]);

  const monthlyDownloadLabel = useMemo(() => {
    if (monthlyDownloadRemaining === null || !downloadResetAt) return null;
    const resetLabel = new Date(downloadResetAt).toLocaleDateString("ja-JP");
    return t("subDescription", {
      count: monthlyDownloadRemaining,
      max: monthlyDownloadLimit,
      resetAt: resetLabel,
    });
  }, [downloadResetAt, monthlyDownloadLimit, monthlyDownloadRemaining, t]);

  const installedTitleLabel = useMemo(
    () =>
      t("installedTitleWithCount", {
        count: installedTracks.length,
        max: FOCUS_MUSIC_MAX_INSTALLED,
      }),
    [installedTracks.length, t],
  );

  useEffect(() => {
    if (canInstall) {
      setLimitMessageVisible(false);
    }
  }, [canInstall]);

  useFocusEffect(
    useCallback(() => {
      void refreshCatalog();
      // 月間ダウンロード枠の状態を読み直して、次のリセット時刻に合わせて自動更新を予約する
      void refreshDownloadQuota();
    }, [refreshCatalog, refreshDownloadQuota]),
  );

  // フィルターされた場合はフィルターされたカタログ、
  // フィルターされなければここでそのままのカタログデータを返す。
  const filteredCatalog = useMemo(() => {
    if (selectedCategories.length === 0) return catalog;
    return catalog.filter((track) =>
      selectedCategories.every((category) =>
        (track.musicCategories ?? []).includes(category),
      ),
    );
  }, [catalog, selectedCategories]);

  // カタログモーダルオープン処理
  const handleOpenCatalog = () => {
    if (!canInstall) {
      setLimitMessageVisible(true);
      return;
    }
    setLimitMessageVisible(false);
    setCatalogVisible(true);
  };

  // タスク集中音楽のインストールロジック
  const handleInstall = async (trackId: string) => {
    if (!canInstall) {
      Alert.alert(t("installLimitTitle"), t("installLimitBody"));
      return;
    }
    const result = await installTrack(trackId); //ここでインストール。これ以降は結果に応じたユーザへのメッセージ出力。
    if (result.ok) {
      setLimitMessageVisible(false);
      return;
    }
    if (result.reason === "cellular") {
      Alert.alert(t("cellularConfirmTitle"), t("cellularConfirmBody"), [
        { text: t("cellularConfirmNo"), style: "cancel" },
        {
          text: t("cellularConfirmYes"),
          style: "default",
          onPress: async () => {
            const retry = await installTrack(trackId, { allowCellular: true });
            if (!retry.ok) {
              Alert.alert(t("downloadFailedTitle"), t("downloadFailedBody"));
            }
          },
        },
      ]);
      return;
    }
    if (result.reason === "offline") {
      Alert.alert(t("offlineTitle"), t("offlineBody"));
      return;
    }
    if (result.reason === "limit") {
      Alert.alert(t("installLimitTitle"), t("installLimitBody"));
      return;
    }
    if (result.reason === "download_failed") {
      Alert.alert(t("downloadFailedTitle"), t("downloadFailedBody"));
      return;
    }
    if (result.reason === "busy") {
      Alert.alert(t("downloadBusyTitle"), t("downloadBusyBody"));
      return;
    }
    if (result.reason === "monthly_limit") {
      Alert.alert(t("monthlyLimitTitle"), t("monthlyLimitBody"));
    }
  };

  // カタログ音楽の再生・停止を操作するトグルボタン。
  // edge functionで発行したsignedURLを元にexpo-audioのpreviewPlayerで再生する。(端末ローカル保存はしない)
  const handlePreview = async (trackId: string) => {
    // 該当音楽が再生中なら音楽を停止する
    if (previewTrackId === trackId) {
      previewPlayer.pause();
      setPreviewTrackId(null);
      return;
    }
    setPreviewLoadingId(trackId);
    try {
      const url = await createFocusMusicSignedUrl(trackId);  //edge function
      previewPlayer.loop = false;
      previewPlayer.replace(url);
      previewPlayer.play();
      setPreviewTrackId(trackId);
    } catch (error) {
      captureExpoAudioError(error, "focus_music_preview");
      Alert.alert(t("previewFailedTitle"), t("previewFailedBody"));
    } finally {
      setPreviewLoadingId(null);
    }
  };

  // インストール済み音楽の削除
  const handleRemove = async (trackId: string) => {
    const result = await removeTrack(trackId);
    if (!result.ok) {
      Alert.alert(t("removeFailedTitle"), t("removeFailedBody"));
    }
  };

  // トラックのカタログモーダルを閉じた場合に試聴再生を強制的にストップ
  useEffect(() => {
    if (!catalogVisible) {
      previewPlayer.pause();
      setPreviewTrackId(null);
    }
  }, [catalogVisible, previewPlayer]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={HEADER_CARD_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, shadows.card]}
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{t("title")}</Text>
        </View>
        <Text style={styles.headerBody}>{t("description")}</Text>
        {monthlyDownloadLabel && (
          <Text style={styles.subDescription}>{monthlyDownloadLabel}</Text>
        )}
      </LinearGradient>

      <View style={[styles.card, shadows.card]}>
        <LinearGradient
          colors={LIST_CARD_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{installedTitleLabel}</Text>
          <Text style={styles.sectionSubtitle}>{t("installedSubtitle")}</Text>
        </View>
        {installedTracks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{t("installedEmptyTitle")}</Text>
            <Text style={styles.emptyBody}>{t("installedEmptyBody")}</Text>
          </View>
        ) : (
          installedTracks.map((track) => {
            const isSelected = track.id === selectedTrackId;
            return (
              <Pressable
                key={track.id}
                onPress={() => selectTrack(track.id)}
                style={({ pressed }) => [
                  styles.trackRow,
                  pressed && styles.trackRowPressed,
                  isSelected && styles.trackRowSelected,
                ]}
                testID={`focus-music-installed-${track.id}`}
              >
                <View style={styles.trackInfo}>
                  <Text style={styles.trackTitle}>{track.title}</Text>
                </View>
                <View style={styles.trackActions}>
                  {isSelected && (
                    <View
                      style={styles.selectedIconBadge}
                      testID={`focus-music-selected-icon-${track.id}`}
                    >
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={18}
                        color={colors.accentSubtle}
                      />
                    </View>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      Alert.alert(
                        t("removeConfirmTitle", { ns: "focusMusic" }),
                        t("removeConfirmBody", { ns: "focusMusic" }),
                        [
                          {
                            text: t("removeConfirmNo", { ns: "focusMusic" }),
                            style: "cancel",
                          },
                          {
                            text: t("removeConfirmYes", { ns: "focusMusic" }),
                            style: "destructive",
                            onPress: () => handleRemove(track.id),
                          },
                        ],
                      )
                    }
                    style={({ pressed }) => [
                      styles.iconButton,
                      pressed && styles.iconButtonPressed,
                    ]}
                    testID={`focus-music-remove-${track.id}`}
                  >
                    <MaterialCommunityIcons
                      name="trash-can-outline"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                </View>
              </Pressable>
            );
          })
        )}
        <Pressable
          accessibilityRole="button"
          onPress={handleOpenCatalog}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
            !canInstall && styles.primaryButtonDisabled,
          ]}
          testID="focus-music-catalog-button"
        >
          <Text style={styles.primaryButtonText}>
            {isLoadingCatalog ? t("loadingCatalog") : t("installButton")}
          </Text>
        </Pressable>
        {limitMessageVisible && (
          <Text style={styles.limitMessage}>{t("limitMessage")}</Text>
        )}
      </View>

      <Modal
        visible={catalogVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCatalogVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalCard, shadows.card]}
            testID="focus-music-catalog-modal"
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("catalogTitle")}</Text>
              <Text style={styles.modalSubtitle}>{t("catalogSubtitle")}</Text>
            </View>
            <View style={styles.filterBlock}>
              <Text style={styles.filterLabel}>{t("categoryFilterTitle")}</Text>
              <View style={styles.filterChips}>
                {CATEGORY_OPTIONS.map((category) => {
                  const isSelected = selectedCategories.includes(category);
                  return (
                    <Pressable
                      key={category}
                      accessibilityRole="button"
                      onPress={() =>
                        setSelectedCategories((prev) =>
                          prev.includes(category)
                            ? prev.filter((item) => item !== category)
                            : [...prev, category],
                        )
                      }
                      style={({ pressed }) => [
                        styles.filterChip,
                        isSelected && styles.filterChipSelected,
                        pressed && styles.filterChipPressed,
                      ]}
                      testID={`focus-music-category-filter-${category}`}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          isSelected && styles.filterChipTextSelected,
                        ]}
                      >
                        {t(`categories.${category}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalList}
              showsVerticalScrollIndicator={false}
            >
              {filteredCatalog.length === 0 ? (
                <View style={styles.filterEmpty}>
                  <Text style={styles.filterEmptyText}>
                    {t("categoryFilterEmpty")}
                  </Text>
                </View>
              ) : (
                filteredCatalog.map((track) => {
                  const installed = isInstalled(track.id);
                  const isPreviewing = previewTrackId === track.id;
                  const isPreviewLoading = previewLoadingId === track.id;
                  const installing = isInstalling(track.id);
                  // 音楽ダウンロードに関する進捗データを取得
                  const installProgress = getInstallProgress(track.id);
                  // 進捗データをもとにパーセントを計算
                  const progressPercent =
                    installProgress?.progress !== null &&
                      installProgress?.progress !== undefined
                      ? Math.round(installProgress.progress * 100)
                      : null;
                  // 進捗データをもとに残りのバイト数(データ容量)を計算
                  const remainingMb =
                    installProgress?.remainingBytes !== null &&
                      installProgress?.remainingBytes !== undefined
                      ? (installProgress.remainingBytes / (1024 * 1024)).toFixed(1)
                      : null;
                  return (
                    <View
                      key={track.id}
                      style={[
                        styles.catalogRow,
                        installed && styles.catalogRowInstalled,
                      ]}
                    >
                      <View style={styles.trackInfo}>
                        <Text
                          style={styles.trackTitle}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {track.title}
                        </Text>
                      </View>
                      <View style={styles.catalogActions}>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => handlePreview(track.id)}
                          style={({ pressed }) => [
                            styles.secondaryButton,
                            pressed && styles.secondaryButtonPressed,
                          ]}
                          disabled={isPreviewLoading}
                        >
                          <MaterialCommunityIcons
                            name={
                              isPreviewing
                                ? "stop-circle-outline"
                                : "play-circle-outline"
                            }
                            size={20}
                            color={colors.textPrimary}
                          />
                          <Text style={styles.secondaryButtonText}>
                            {isPreviewLoading
                              ? t("previewLoading")
                              : isPreviewing
                                ? t("previewStop")
                                : t("preview")}
                          </Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => handleInstall(track.id)}
                          style={({ pressed }) => [
                            styles.installButton,
                            pressed && styles.installButtonPressed,
                            (installed || installing) &&
                            styles.installButtonDisabled,
                            isDownloadInProgress &&
                            !installing &&
                            styles.installButtonDisabled,
                          ]}
                          disabled={
                            installed ||
                            installing ||
                            (isDownloadInProgress && !installing)
                          }
                          testID={`focus-music-install-${track.id}`}
                        >
                          {/* インストール中は進捗リング表示 */}
                          {installed ? (
                            <Text style={styles.installButtonText}>
                              {t("installedLabel")}
                            </Text>
                          ) : installing ? (
                            <View style={styles.progressWrap}>
                              {installProgress && !installProgress.isIndeterminate && progressPercent !== null ? (
                                <View
                                  testID={`focus-music-install-progress-${track.id}`}
                                >
                                  <AnimatedCircularProgress
                                    size={22}
                                    width={3}
                                    fill={progressPercent}
                                    tintColor={colors.accentPrimary}
                                    backgroundColor="rgba(255,255,255,0.2)"
                                    rotation={0}
                                    lineCap="round"
                                  />
                                </View>
                              ) : (
                                <ActivityIndicator
                                  testID={`focus-music-install-progress-indeterminate-${track.id}`}
                                  size="small"
                                  color={colors.accentPrimary}
                                />
                              )}
                              <View style={styles.progressLabelBlock}>
                                <Text style={styles.installButtonText}>
                                  {t("downloadingLabel")}
                                  {progressPercent !== null ? ` ${progressPercent}%` : ""}
                                </Text>
                                {remainingMb ? (
                                  <Text style={styles.installProgressSubtext}>
                                    ~{remainingMb}MB
                                  </Text>
                                ) : null}
                              </View>
                            </View>
                          ) : (
                            <Text style={styles.installButtonText}>
                              {t("installLabel")}
                            </Text>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              onPress={() => setCatalogVisible(false)}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.closeButtonPressed,
              ]}
            >
              <Text style={styles.closeButtonText}>{t("close")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(110,168,255,0.25)",
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: typography.xl,
    fontWeight: "800",
  },
  headerBody: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  subDescription: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    lineHeight: typography.sm,
  },
  sectionHeader: {
    gap: spacing.xs,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
  },
  sectionSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  emptyState: {
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.sm,
    fontWeight: "600",
  },
  emptyBody: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.4,
  },
  trackRow: {
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  trackRowPressed: {
    opacity: 0.9,
  },
  trackRowSelected: {
    borderColor: colors.accentSubtle,
    backgroundColor: "rgba(30,94,255,0.08)",
  },
  trackInfo: {
    gap: spacing.xs,
  },
  trackTitle: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "600",
    flexShrink: 1,
  },
  trackActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  selectedIconBadge: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: "rgba(12,18,32,0.7)",
  },
  iconButtonPressed: {
    opacity: 0.8,
  },
  primaryButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    alignItems: "center",
    backgroundColor: colors.accentPrimary,
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: colors.textPrimary,
    fontSize: typography.sm,
    fontWeight: "700",
  },
  limitMessage: {
    color: colors.warning,
    fontSize: typography.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    maxHeight: "90%",
  },
  modalScroll: {
    flexGrow: 1,
    minHeight: 0,
  },
  modalHeader: {
    gap: spacing.xs,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
  },
  modalSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  filterBlock: {
    gap: spacing.xs,
    marginVertical: spacing.xs,
  },
  filterLabel: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    fontWeight: "600",
  },
  filterChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  filterChipSelected: {
    borderColor: colors.accentPrimary,
    backgroundColor: "rgba(30,94,255,0.24)",
  },
  filterChipPressed: {
    opacity: 0.9,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    fontWeight: "600",
  },
  filterChipTextSelected: {
    color: colors.textPrimary,
  },
  modalList: {
    gap: spacing.sm,
  },
  filterEmpty: {
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  filterEmptyText: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  catalogRow: {
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    gap: spacing.sm,
  },
  catalogRowInstalled: {
    opacity: 0.7,
  },
  catalogActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  secondaryButtonPressed: {
    opacity: 0.9,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: typography.sm,
    fontWeight: "600",
  },
  installButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.accentPrimary,
  },
  installButtonPressed: {
    opacity: 0.9,
  },
  installButtonDisabled: {
    backgroundColor: "rgba(30,94,255,0.35)",
  },
  installButtonText: {
    color: colors.textPrimary,
    fontSize: typography.sm,
    fontWeight: "700",
  },
  progressWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  progressLabelBlock: {
    alignItems: "flex-start",
  },
  installProgressSubtext: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.2,
  },
  closeButton: {
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.accentSubtle,
    backgroundColor: colors.accentPrimary,
  },
  closeButtonPressed: {
    opacity: 0.9,
  },
  closeButtonText: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
  },
});
