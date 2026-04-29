import CryptoJS from "crypto-js";

const KEY = process.env.WALLET_ENCRYPTION_KEY;

if (!KEY) {
  console.error("[wallet] WALLET_ENCRYPTION_KEY not set");
  process.exit(1);
}

export function encryptPrivateKey(privateKey: string): string {
  return CryptoJS.AES.encrypt(privateKey, KEY).toString();
}

export function decryptPrivateKey(stored: string): string {
  const bytes = CryptoJS.AES.decrypt(stored, KEY);
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);

  if (!decrypted) {
    throw new Error("decryption failed — wrong key or corrupted data");
  }

  return decrypted;
}