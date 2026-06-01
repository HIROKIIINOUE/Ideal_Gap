// ユーザの年間目標や理想の自分データをSupabaseで見れないように暗号化する関数群

import CryptoJS from "crypto-js";

const FIELD_ENCRYPTION_PREFIX = "igenc:v1:";
const FIELD_ENCRYPTION_IV_NAMESPACE = "igenc:v1:iv:";

const getFieldEncryptionKey = () => {
  const key = process.env.EXPO_PUBLIC_FIELD_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error(
      "Missing environment variable: EXPO_PUBLIC_FIELD_ENCRYPTION_KEY",
    );
  }
  return key;
};

// 生データか暗号化されたデータかをジャッジ
export const isEncryptedFieldValue = (value: string | null | undefined) =>
  typeof value === "string" && value.startsWith(FIELD_ENCRYPTION_PREFIX);

const getEncryptionParams = () => {
  const rawKey = getFieldEncryptionKey();
  const key = CryptoJS.SHA256(rawKey);
  const ivHash = CryptoJS.SHA256(`${FIELD_ENCRYPTION_IV_NAMESPACE}${rawKey}`);
  const iv = CryptoJS.lib.WordArray.create(ivHash.words.slice(0, 4), 16);
  return { rawKey, key, iv };
};

// データを暗号化する
export const encryptFieldValue = (value: string) => {
  // すでに暗号化されていればそのまま返す
  if (isEncryptedFieldValue(value)) return value;
  const { key, iv } = getEncryptionParams();
  const encrypted = CryptoJS.AES.encrypt(value, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();
  return `${FIELD_ENCRYPTION_PREFIX}${encrypted}`;
};

export const decryptFieldValue = (value: string) => {
  // 暗号解除する対象のvalueが生データだった場合(暗号化されていない場合)、生データをそのまま返す。
  if (!isEncryptedFieldValue(value)) return value;

  try {
    const ciphertext = value.slice(FIELD_ENCRYPTION_PREFIX.length);
    const { rawKey, key, iv } = getEncryptionParams();
    const bytes = CryptoJS.AES.decrypt(ciphertext, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (decrypted.length > 0) return decrypted;

    const legacyBytes = CryptoJS.AES.decrypt(ciphertext, rawKey);
    const legacyDecrypted = legacyBytes.toString(CryptoJS.enc.Utf8);
    return legacyDecrypted.length > 0 ? legacyDecrypted : value;
  } catch {
    return value;
  }
};

export const encryptNullableFieldValue = <T extends string | null | undefined>(
  value: T,
): T => (typeof value === "string" ? (encryptFieldValue(value) as T) : value);

export const decryptNullableFieldValue = <T extends string | null | undefined>(
  value: T,
): T => (typeof value === "string" ? (decryptFieldValue(value) as T) : value);
