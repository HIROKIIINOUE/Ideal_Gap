import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Footer from "../components/Footer";
import LanguageSheet from "../components/LanguageSheet";
import { colors, radius, shadows, spacing, typography } from "../constants/theme";

// 仮置きのダッシュボード画面。今後、認証済みユーザーのみがアクセスできるようにガードを追加予定。
export default function Dashboard() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={[styles.card, shadows.card]}>
          <Text style={styles.title}>Dashboard (仮)</Text>
          <Text style={styles.body}>
            サインアップ後にメールリンクから遷移するダッシュボードの仮ページです。認証ガードは今後実装します。
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Next steps</Text>
            <Text style={styles.body}>・ユーザーデータや進捗をここに表示する予定です。</Text>
            <Text style={styles.body}>・必要に応じてメトリクスカードを追加してください。</Text>
          </View>

          <Link href="/" style={styles.link}>
            ホームへ戻る
          </Link>
        </View>
      </View>
      <Footer isAuthenticated={true} onLanguagePress={() => { }} />
      <LanguageSheet visible={false} onClose={() => { }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(110,168,255,0.18)",
    overflow: "hidden",
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.xl,
    fontWeight: "700",
  },
  body: {
    color: colors.textSecondary,
    fontSize: typography.md,
    lineHeight: typography.md * 1.5,
  },
  section: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: "700",
  },
  link: {
    marginTop: spacing.md,
    color: colors.accentPrimary,
    fontSize: typography.md,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
  },
});
