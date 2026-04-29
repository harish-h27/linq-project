import { Request, Response } from "express";
import { sendMessage } from "./client.js";

export async function handleWebhook(
  req: Request,
  res: Response,
): Promise<void> {
  const raw = req.body instanceof Buffer ? req.body.toString("utf8") : "";

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    res.status(400).send("invalid json");
    return;
  }

  const eventType = event?.event_type ?? "";
  console.log(`[webhook] received: ${eventType}`);

  if (eventType !== "message.received") {
    res.status(200).send("ok");
    return;
  }

  const data = event?.data ?? {};
  const parts = data?.parts ?? [];
  console.log(28, parts)
  const text = parts
    .filter((p: any) => p.type === "text")
    .map((p: any) => p.value)
    .join(" ")
    .trim();
  const fromHandle = data?.sender_handle?.handle ?? "";
  const chatId = data?.chat?.id ?? "";

  console.log(`[webhook] message from ${fromHandle}: "${text}"`);

  await sendMessage(fromHandle, chatId, `limit reached`);

  res.status(200).send("ok");
}
