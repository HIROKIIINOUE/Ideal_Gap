const normalizeEmail = (email: string) => email.trim().toLowerCase();

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

// アカウント完全削除時にdeleted_accountsテーブルにユーザを記録するためにメールをハッシュ化する処理
export const createAccountEmailHash = async (email: string, secret: string) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error("email is required");
  }
  if (!secret) {
    throw new Error("hash secret is required");
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(normalizedEmail),
  );

  return bytesToHex(new Uint8Array(digest));
};
