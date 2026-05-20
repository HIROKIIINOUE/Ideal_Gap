export const PRIVACY_POLICY_URL =
  "https://seen-haumea-7e9.notion.site/Privacy-Policy-34821b76bf49804385fcfa12227b31db";

export const APPLE_STANDARD_EULA_URL =
  "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";

export const ANDROID_TERMS_OF_USE_URL =
  "https://seen-haumea-7e9.notion.site/Terms-of-Use-36621b76bf49809f82eee284f51d82e0";

export const getStoreName = (platformOS: string) =>
  platformOS === "ios" ? "App Store" : "Google Play";

export const getTermsOfUseUrl = (platformOS: string) =>
  platformOS === "ios" ? APPLE_STANDARD_EULA_URL : ANDROID_TERMS_OF_USE_URL;
