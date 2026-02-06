import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  colors,
  radius,
  shadows,
  spacing,
  typography,
} from "../../constants/theme";
import { FOCUS_MUSIC_MAX_INSTALLED } from "../../lib/focus-music/constants";
import { createFocusMusicSignedUrl } from "../../lib/focus-music/signedUrl";
import { useFocusMusic } from "../../providers/FocusMusicProvider";

const HEADER_CARD_GRADIENT = [
  "rgba(30,94,255,0.22)",
  "rgba(12,18,32,0.9)",
] as const;
const LIST_CARD_GRADIENT = [
  "rgba(20,46,86,0.9)",
  "rgba(10,16,28,0.95)",
] as const;

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
    } catch {
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
                    <Text style={styles.selectedLabel}>
                      {t("selectedLabel")}
                    </Text>
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
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalList}
              showsVerticalScrollIndicator={false}
            >
              {catalog.map((track) => {
                const installed = isInstalled(track.id);
                const isPreviewing = previewTrackId === track.id;
                const isPreviewLoading = previewLoadingId === track.id;
                return (
                  <View
                    key={track.id}
                    style={[
                      styles.catalogRow,
                      installed && styles.catalogRowInstalled,
                    ]}
                  >
                    <View style={styles.trackInfo}>
                      <Text style={styles.trackTitle}>{track.title}</Text>
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
                          (installed || isInstalling(track.id)) &&
                          styles.installButtonDisabled,
                          isDownloadInProgress &&
                          !isInstalling(track.id) &&
                          styles.installButtonDisabled,
                        ]}
                        disabled={
                          installed ||
                          isInstalling(track.id) ||
                          (isDownloadInProgress && !isInstalling(track.id))
                        }
                        testID={`focus-music-install-${track.id}`}
                      >
                        <Text style={styles.installButtonText}>
                          {installed
                            ? t("installedLabel")
                            : isInstalling(track.id)
                              ? t("downloadingLabel")
                              : t("installLabel")}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
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
  },
  trackActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  selectedLabel: {
    color: colors.accentSubtle,
    fontSize: typography.sm,
    fontWeight: "600",
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
  modalList: {
    gap: spacing.sm,
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
