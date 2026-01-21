## 技術スタック

- React Native + Expo (ルータ/ディープリンクは Expo Router)
- TypeScript
- React native elements → アイコン。この必要可否は codex に任せる。
- Redux Toolkit → 状態管理
- NativeWind → デザイン部分
- React-hook-form + Zod → 理想の自分/年間/月間/週間の全フォームで使用
- Expo SQLite → ローカルデータベース
- async storage → 軽量のデータベース、ユーザー設定(言語やログイン情報など)
- Supabase → データベース、ユーザ認証周り
- react-native-gifted-charts → アプリ内の円グラフ作成
- day.js
- react-i18next → 多言語対応
- expo-localization → 端末の言語・地域を取得
- expo-audio (今後 react-native-track-player に移行する可能性あり) → BGM をループ再生(ユーザがダウンロードした曲をローカルファイルとして再生する予定)
- expo-file-system → 事前に用意した mp3 を Supabase Storage に置き、アプリから URL 叩いて端末に保存
- NetInfo → 曲 DL 時の「Wi-Fi 優先＋セルラーは確認/許可制」を実装
  →「DL 直前に回線状態チェック →Wi-Fi 即 DL/セルラーなら確認 → 許可なら DL」というフロー
- Jest + React Native Testing Library → テスト
- ESLInt + Prettier → リントとフォーマット
- RevenueCat → 決済周り(開発は無料版で実装)
- Sentry → バグ・クラッシュ・遅延の原因を特定（技術的健全性）
- PostHog → ユーザー行動・CV・継続の改善を特定（プロダクト価値）
  → トライアルから有料化のコンバーションとタイマー利用の習慣化を追う。
- EAS
