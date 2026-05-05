import { ethers } from "ethers";
import { encryptPrivateKey, decryptPrivateKey } from "./crypto.js";
import { findWallet, createWallet } from "../db/wallet.js";
import { saveNicknameAuto } from "../db/nicknames.js";
import { query } from "../db/client.js";

const provider = new ethers.JsonRpcProvider(
  process.env.ALCHEMY_WSS_URL?.replace("wss://", "https://") ?? ""
);

export async function getOrCreateWallet(userId: string) {
  console.log(`[wallet] getOrCreateWallet called for ${userId}`);
  let wallet = await findWallet(userId);
  console.log(`[wallet] existing wallet:`, wallet);

  if (!wallet) {
    const newWallet = ethers.Wallet.createRandom();
    const encryptedKey = encryptPrivateKey(newWallet.privateKey);
    wallet = await createWallet(userId, newWallet.address, encryptedKey);
    console.log(`[wallet] created:`, wallet);

    const nickname = await saveNicknameAuto(userId, newWallet.address);
    console.log(`[wallet] nickname assigned:`, nickname);
  }

  return wallet;
}

export async function getBalance(address: string) {
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
}

export async function importWallet(userId: string, privateKey: string) {
  const account = new ethers.Wallet(privateKey);
  const encryptedKey = encryptPrivateKey(privateKey);

  const existing = await findWallet(userId);
  if (existing) {
    await query(
      `UPDATE user_wallets SET address = $2, encrypted_key = $3 WHERE user_id = $1`,
      [userId, account.address, encryptedKey]
    );
  } else {
    await createWallet(userId, account.address, encryptedKey);
  }

  const nickname = await saveNicknameAuto(userId, account.address);
  console.log(`[wallet] imported for ${userId}: ${account.address} (${nickname})`);

  return { address: account.address, nickname };
}

export async function sendETH(userId: string, toAddress: string, amount: string) {
  const walletRow = await findWallet(userId);
  if (!walletRow) throw new Error("no wallet found");

  const privateKey = decryptPrivateKey(walletRow.encrypted_key);
  const signer = new ethers.Wallet(privateKey, provider);

  const tx = await signer.sendTransaction({
    to: toAddress,
    value: ethers.parseEther(amount),
  });

  console.log(`[wallet] tx sent: ${tx.hash}`);
  await tx.wait(1);
  return tx.hash;
}

1500
900 + 160