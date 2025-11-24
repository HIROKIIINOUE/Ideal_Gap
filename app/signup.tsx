import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";

export default function Signup() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.label}>Sign Up</Text>
          <Link href="/" style={styles.link}>
            ホームへ戻る
          </Link>
        </View>

        <View style={[styles.card, shadows.card]}>
          <Text style={styles.title}>無料で始める</Text>
          <Text style={styles.body}>
            初月無料・次月以降 8.5 CAD/月 (30日)。登録日から自動更新。再サインアップ時は無料プランが適用されません。
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>ユーザ名</Text>
            <TextInput
              placeholder="Your name"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              keyboardAppearance="dark"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>メールアドレス</Text>
            <TextInput
              placeholder="you@example.com"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              keyboardAppearance="dark"
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>パスワード</Text>
            <TextInput
              placeholder="8文字以上"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              secureTextEntry
              keyboardAppearance="dark"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>支払い方法</Text>
            <Pressable style={styles.placeholderButton}>
              <Text style={styles.placeholderText}>決済連携は後続ステップで設定</Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.ctaButton,
              styles.primaryButton,
              styles.buttonShadow,
              pressed && styles.buttonPressed,
            ]}
          >
            <LinearGradient
              colors={["rgba(255,255,255,0.14)", "rgba(255,255,255,0.04)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGlass}
            />
            <Text style={styles.primaryLabel}>サインアップを続ける</Text>
          </Pressable>

          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              使用中の言語設定とタイムゾーンをサインアップ完了時に自動検出します（手動変更も対応予定）。
            </Text>
          </View>
        </View>

        <View style={[styles.card, shadows.card]}>
          <Text style={styles.cardHeading}>プランとステータス</Text>
          <Text style={styles.body}>
            支払いステータスは「有効 / 支払い失敗 / キャンセル予約」で表示。初回無料は一度のみ適用され、解約後の再登録は有料プランから開始します。
          </Text>
          <Text style={styles.caption}>実際の課金処理とステータス更新は今後の実装で追加予定。</Text>
        </View>

        <View style={[styles.card, shadows.card]}>
          <Text style={styles.cardHeading}>すでにアカウントをお持ちですか？</Text>
          <Link href="/login" asChild>
            <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.ctaButton,
              styles.secondaryButton,
              styles.buttonShadow,
              pressed && styles.buttonPressed,
            ]}
          >
            <LinearGradient
              colors={["rgba(255,255,255,0.12)", "rgba(255,255,255,0.03)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGlass}
            />
            <Text style={styles.secondaryLabel}>ログインへ</Text>
          </Pressable>
        </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    color: colors.accentSubtle,
    letterSpacing: 0.6,
    fontSize: typography.sm,
    textTransform: "uppercase",
  },
  link: {
    color: colors.accentPrimary,
    fontSize: typography.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(110,168,255,0.18)",
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "700",
  },
  cardHeading: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
  },
  body: {
    color: colors.textSecondary,
    fontSize: typography.md,
    lineHeight: typography.md * 1.5,
  },
  caption: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.textPrimary,
    fontSize: typography.sm,
    fontWeight: "600",
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  placeholderButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.background,
    alignItems: "center",
  },
  placeholderText: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  ctaButton: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl * 1.35,
    borderRadius: radius.lg,
    alignItems: "center",
    borderWidth: 1,
    justifyContent: "center",
    gap: spacing.sm,
    position: "relative",
  },
  primaryButton: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(155,193,255,0.9)",
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.28)",
  },
  primaryLabel: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: typography.md,
  },
  secondaryLabel: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: typography.md,
  },
  buttonShadow: {
    ...shadows.button,
  },
  buttonPressed: {
    transform: [{ translateY: 1 }],
    opacity: 0.9,
  },
  buttonGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
  },
  noteBox: {
    backgroundColor: colors.overlay,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  noteText: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.4,
  },
});
