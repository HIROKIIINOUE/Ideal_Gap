import CryptoJS from "crypto-js";
import {
  decryptFieldValue,
  decryptNullableFieldValue,
  encryptFieldValue,
  encryptNullableFieldValue,
  isEncryptedFieldValue,
} from "../lib/security/fieldEncryption";

describe("fieldEncryption", () => {
  test("encrypts and decrypts a field value", () => {
    const encrypted = encryptFieldValue("Private ideal text");

    expect(encrypted).not.toBe("Private ideal text");
    expect(isEncryptedFieldValue(encrypted)).toBe(true);
    expect(decryptFieldValue(encrypted)).toBe("Private ideal text");
  });

  test("does not require native secure random numbers", () => {
    const originalRandom = CryptoJS.lib.WordArray.random;
    CryptoJS.lib.WordArray.random = jest.fn(() => {
      throw new Error("Native crypto module could not be used to get secure random number");
    });

    try {
      const encrypted = encryptFieldValue("Private field text");

      expect(isEncryptedFieldValue(encrypted)).toBe(true);
      expect(decryptFieldValue(encrypted)).toBe("Private field text");
      expect(CryptoJS.lib.WordArray.random).not.toHaveBeenCalled();
    } finally {
      CryptoJS.lib.WordArray.random = originalRandom;
    }
  });

  test("keeps existing plaintext readable", () => {
    expect(decryptFieldValue("Existing plain text")).toBe("Existing plain text");
  });

  test("handles nullable values", () => {
    expect(encryptNullableFieldValue(null)).toBeNull();
    expect(decryptNullableFieldValue(null)).toBeNull();
  });
});
