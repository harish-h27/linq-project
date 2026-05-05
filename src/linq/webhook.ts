import { Request, Response } from "express";
import { sendTypingIndicator } from "./client.js";
import { handleCommand } from "../api/commands.js";
import { query } from "../db/client.js";
import { checkRateLimit } from "../ratelimit/index.js";

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
  const eventId = event?.event_id ?? "";

  res.status(200).send("ok");

  if (eventId) {
    const rows = await query(
      `INSERT INTO processed_events (event_id)
       VALUES ($1)
       ON CONFLICT (event_id) DO NOTHING
       RETURNING event_id`,
      [eventId]
    );
    if (!rows.length) {
      console.log(`[webhook] duplicate event ${eventId} — skipping`);
      return;
    }
  }

  if (eventType !== "message.received") return;

  const data = event?.data ?? {};
  const parts = data?.parts ?? [];
  const text = parts
    .filter((p: any) => p.type === "text")
    .map((p: any) => p.value)
    .join(" ")
    .trim();
  const fromHandle = data?.sender_handle?.handle ?? "";
  const chatId = data?.chat?.id ?? "";

  console.log(`[webhook] message from ${fromHandle}: "${text}"`);

  const allowed = await checkRateLimit(fromHandle);
  if (!allowed) {
    const { sendMessage } = await import("./client.js");
    await sendMessage(fromHandle, chatId,
      "too many requests. wait a minute and try again."
    );
    return;
  }

  await sendTypingIndicator(chatId);
  await new Promise(r => setTimeout(r, 1500));
  await handleCommand(fromHandle, chatId, text);
}