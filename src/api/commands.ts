import { sendMessage } from "../linq/client.js";
import { getOrCreateWallet, getBalance, importWallet, sendETH } from "../wallet/index.js";
import { saveNickname, findNickname, findNicknameByAddress, listNicknames, deleteNickname, saveNicknameAuto } from "../db/nicknames.js";
import { savePendingConfirmation, getPendingConfirmation, deletePendingConfirmation } from "../db/confirmations.js";
import { ethers } from "ethers";
import { query } from "../db/client.js";
import { saveReminder, listReminders } from "../db/reminders.js";

export async function handleCommand(fromHandle: string, chatId: string, text: string) {
  const t = text.trim().toLowerCase();
  const raw = text.trim();

  if (t === "yes" || t === "confirm" || t === "y") {
    const pending = await getPendingConfirmation(fromHandle);
    if (!pending) {
      await sendMessage(fromHandle, chatId, "no pending confirmation found or it expired.");
      return;
    }
    await deletePendingConfirmation(fromHandle);
    const p = pending.payload as any;
    if (pending.kind === "send_eth") {
      await sendMessage(fromHandle, chatId, `sending ${p.amount} ETH to ${p.target}...`);
      try {
        const hash = await sendETH(fromHandle, p.to, p.amount);
        await sendMessage(fromHandle, chatId,
          `sent.\n\ntx: ${hash}\nhttps://sepolia.etherscan.io/tx/${hash}`
        );
      } catch (err: any) {
        let msg = "transaction failed.";
        if (err.message.includes("insufficient funds")) {
          msg = "insufficient funds.\n\nget testnet ETH at https://sepoliafaucet.com";
        } else if (err.message.includes("invalid address")) {
          msg = "invalid wallet address.";
        } else if (err.message.includes("network")) {
          msg = "network error. try again.";
        }
        await sendMessage(fromHandle, chatId, msg);
      }
    }
    return;
  }

  if (t === "no" || t === "cancel" || t === "n") {
    await deletePendingConfirmation(fromHandle);
    await sendMessage(fromHandle, chatId, "cancelled.");
    return;
  }

if (t === "help" || t === "commands" || t === "?") {
    await sendMessage(fromHandle, chatId, [
      "available commands:\n",
      "wallet",
      "  create wallet",
      "  import <privatekey>",
      "  export",
      "  balance",
      "  address",
      "",
      "send",
      "  send <amount> ETH to <name or 0x...>",
      "",
      "address book",
      "  add wallet <name> <address>",
      "  add wallet <address>",
      "  remove wallet <name>",
      "  wallets",
      "",
      "reminders",
      "  remind me in 30s to <message>",
      "  remind me in 5m to <message>",
      "  remind me in 1h to <message>",
      "  reminders",
      "",
      "confirm",
      "  yes / no",
    ].join("\n"));
    return;
  }

  if (t === "balance") {
    const wallet = await getOrCreateWallet(fromHandle);
    const balance = await getBalance(wallet.address);
    await sendMessage(fromHandle, chatId, `balance: ${balance} ETH\naddress: ${wallet.address}`);
    return;
  }

  if (t === "address") {
    const wallet = await getOrCreateWallet(fromHandle);
    await sendMessage(fromHandle, chatId, `address: ${wallet.address}`);
    return;
  }

  if (t === "create wallet") {
    const wallet = await getOrCreateWallet(fromHandle);
    const nick = await findNicknameByAddress(fromHandle, wallet.address);
    await sendMessage(fromHandle, chatId,
      `wallet ready.\n\nnickname: ${nick?.nickname ?? "-"}\naddress: ${wallet.address}\n\nfund it at https://sepoliafaucet.com`
    );
    return;
  }

  if (t.startsWith("import ")) {
    const key = raw.split(" ")[1] ?? "";
    try {
      const { address, nickname } = await importWallet(fromHandle, key);
      await sendMessage(fromHandle, chatId,
        `wallet imported.\n\nnickname: ${nickname}\naddress: ${address}`
      );
    } catch {
      await sendMessage(fromHandle, chatId, "invalid private key.");
    }
    return;
  }

  if (t === "export") {
    const wallet = await getOrCreateWallet(fromHandle);
    const { decryptPrivateKey } = await import("../wallet/crypto.js");
    const privateKey = decryptPrivateKey(wallet.encrypted_key);
    await sendMessage(fromHandle, chatId,
      `private key: ${privateKey}\n\nimport this into metamask to access your wallet.`
    );
    return;
  }

  const addMatch = raw.match(/^add wallet (\w+) (0x[a-fA-F0-9]{40})$/i);
  if (addMatch) {
    const [, name, address] = addMatch;
    await saveNickname(fromHandle, name!, address!);
    await sendMessage(fromHandle, chatId, `saved.\n\n${name} -> ${address}`);
    return;
  }

  const addMatchNoName = raw.match(/^add wallet (0x[a-fA-F0-9]{40})$/i);
  if (addMatchNoName) {
    const address = addMatchNoName[1]!;
    const nickname = await saveNicknameAuto(fromHandle, address);
    await sendMessage(fromHandle, chatId, `saved.\n\n${nickname} -> ${address}`);
    return;
  }

  const removeMatch = raw.match(/^remove wallet (\w+)$/i);
  if (removeMatch) {
    await deleteNickname(fromHandle, removeMatch[1]!);
    await sendMessage(fromHandle, chatId, `removed "${removeMatch[1]}".`);
    return;
  }

  if (t === "wallets") {
    const nicknames = await listNicknames(fromHandle);
    if (!nicknames.length) {
      await sendMessage(fromHandle, chatId,
        "no saved wallets.\n\nadd one:\nadd wallet <name> <address>"
      );
      return;
    }
    const list = nicknames.map((n: any) => `${n.nickname} -> ${n.address}`).join("\n");
    await sendMessage(fromHandle, chatId, `saved wallets:\n\n${list}`);
    return;
  }

  const sendMatch = raw.match(/^send ([\d.]+) eth to (\S+)$/i);
  if (sendMatch) {
    const [, amount, target] = sendMatch;
    let toAddress = target!;

    if (!toAddress.startsWith("0x")) {
      const nick = await findNickname(fromHandle, toAddress);
      if (!nick) {
        await sendMessage(fromHandle, chatId,
          `nickname "${toAddress}" not found.\n\nadd it:\nadd wallet ${toAddress} <address>`
        );
        return;
      }
      toAddress = (nick as any).address;
    }

    if (!ethers.isAddress(toAddress)) {
      await sendMessage(fromHandle, chatId, "invalid address.");
      return;
    }

    await savePendingConfirmation(fromHandle, chatId, "send_eth", {
      to: toAddress,
      amount,
      target,
    });

    await sendMessage(fromHandle, chatId,
      `confirm transaction\n\namount: ${amount} ETH\nto: ${target}\naddress: ${toAddress}\n\nreply yes to confirm or no to cancel.\nexpires in 2 minutes.`
    );
    return;
  }
  const remindMatch = raw.match(/^remind me in (\d+)\s*(s|sec|seconds?|m|min|minutes?|h|hr|hours?)\s+(?:to\s+)?(.+)$/i);
  if (remindMatch) {
    const amount = parseInt(remindMatch[1]!, 10);
    const unit = remindMatch[2]!.toLowerCase();
    const message = remindMatch[3]!.trim();

    let ms = 0;
    if (unit.startsWith("s")) ms = amount * 1000;
    else if (unit.startsWith("m")) ms = amount * 60 * 1000;
    else if (unit.startsWith("h")) ms = amount * 3600 * 1000;

    const fireAt = new Date(Date.now() + ms);
    await saveReminder(fromHandle, chatId, message, fireAt);

    await sendMessage(fromHandle, chatId,
      `reminder set.\n\n"${message}" at ${fireAt.toLocaleTimeString()}`
    );
    return;
  }

  if (t === "reminders") {
    const reminders = await listReminders(fromHandle);
    if (!reminders.length) {
      await sendMessage(fromHandle, chatId, "no active reminders.");
      return;
    }
    const list = (reminders as any[])
      .map((r) => `${r.message} at ${new Date(r.fire_at).toLocaleTimeString()}`)
      .join("\n");
    await sendMessage(fromHandle, chatId, `active reminders:\n\n${list}`);
    return;
  }

  await sendMessage(fromHandle, chatId,
    `unknown command: "${raw}"\n\ntype "help" to see available commands.`
  );
}

