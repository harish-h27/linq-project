import { Request, Response } from "express";
import { sendTypingIndicator } from "./client.js";
import { handleCommand } from "../api/commands.js";

export async function handleWebhook(req: Request, res: Response): Promise<void> {
  const raw = req.body instanceof Buffer ? req.body.toString("utf8") : "";
  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    res.status(400).send("invalid json");
    return;
  }
  const eventType = event?.event_type ?? "";
  if (eventType !== "message.received") {
    res.status(200).send("ok");
    return;
  }
  const data = event?.data ?? {};
  const parts = data?.parts ?? [];
  const text = parts.filter((p: any) => p.type === "text").map((p: any) => p.value).join(" ").trim();
  const fromHandle = data?.sender_handle?.handle ?? "";
  const chatId = data?.chat?.id ?? "";
  console.log(`[webhook] message from ${fromHandle}: "${text}"`);
  res.status(200).send("ok");
  await sendTypingIndicator(chatId);
  await new Promise(r => setTimeout(r, 1500));
  await handleCommand(fromHandle, chatId, text);
}