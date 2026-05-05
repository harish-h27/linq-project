import { ethers } from "ethers";
import { query } from "../db/client.js";
import { saveIncomingTx, markNotified } from "../db/transactions.js";
import { sendMessage } from "../linq/client.js";

let provider: ethers.WebSocketProvider | null = null;
let blockListener: ((blockNumber: number) => void) | null = null;

export async function startChainWatcher() {
  const wsUrl = process.env.ALCHEMY_WSS_URL ?? "";
  if (!wsUrl) {
    console.log("[chain] ALCHEMY_WSS_URL not set, skipping");
    return;
  }

  provider = new ethers.WebSocketProvider(wsUrl);
  console.log("[chain] connected to Sepolia");

  blockListener = async (blockNumber: number) => {
    console.log(`[chain] new block: ${blockNumber}`);
    try {
      await checkAllWallets(blockNumber);
    } catch (err: any) {
      console.error(`[chain] error: ${err.message}`);
    }
  };

  provider.on("block", blockListener);
}
async function checkAllWallets(blockNumber: number) {
  if (!provider) return;

  const wallets = await query(`SELECT user_id, address FROM user_wallets`);
  if (!wallets.length) return;

  const block = await provider.getBlock(blockNumber);
  if (!block || !block.transactions.length) return;

  for (const txHash of block.transactions) {
    try {
      const tx = await provider.getTransaction(txHash);
      if (!tx || !tx.to || !tx.value || tx.value === 0n) continue;

      const match = (wallets as any[]).find(
        (w) => w.address.toLowerCase() === tx.to!.toLowerCase()
      );

      if (!match) continue;

      const amount = ethers.formatEther(tx.value);
      console.log(`[chain] incoming ${amount} ETH to ${match.address}`);

      const saved = await saveIncomingTx(
        match.user_id,
        tx.hash,
        tx.from,
        tx.to!,
        amount,
        blockNumber
      );

      if (!saved) continue;

      await notifyUser(match.user_id, tx.hash, tx.from, amount);
      await markNotified(tx.hash);

    } catch (err: any) {
      console.error(`[chain] tx error: ${err.message}`);
    }
  }
}
async function notifyUser(
  userId: string,
  txHash: string,
  fromAddress: string,
  amount: string
) {
  const message = [
    `incoming transaction`,
    ``,
    `amount: ${amount} ETH`,
    `from: ${fromAddress}`,
    ``,
    `https://sepolia.etherscan.io/tx/${txHash}`,
  ].join("\n");

  await sendMessage(userId, "", message);
}

export async function stopChainWatcher() {
  if (provider) {
    if (blockListener) provider.off("block", blockListener);
    await provider.destroy();
    provider = null;
    console.log("[chain] watcher stopped");
  }
}