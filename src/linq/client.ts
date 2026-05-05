import axios from "axios";
import { query } from "../db/client.js";

const base = process.env.LINQ_API_BASE_URL ?? "https://api.linqapp.com/api/partner/v3";
const token = process.env.LINQ_API_TOKEN ?? "";
const from = process.env.LINQ_FROM_NUMBER ?? "";

const linq = axios.create({
  baseURL: base,
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
});


export async function sendMessage(to: string, chatId: string, text: string) {
  await query(
    `INSERT INTO outbox (user_id, chat_id, message)
     VALUES ($1, $2, $3)`,
    [to, chatId || null, text]
  );
}

export async function sendMessageDirect(to: string, chatId: string, text: string) {
  try {
    if (chatId) {
      await linq.post(`/chats/${chatId}/messages`, {
        from,
        message: { parts: [{ type: "text", value: text }] },
      });
    } else {
      await linq.post("/chats", {
        from,
        to: [to],
        message: { parts: [{ type: "text", value: text }] },
        preferred_service: "iMessage",
      });
    }
    console.log(`[linq] sent to ${to || chatId}`);
  } catch (err: any) {
    console.error("[linq] send failed:", err.response?.data ?? err.message);
    throw err;
  }
}

export async function sendTypingIndicator(chatId: string) {
  try {
    await linq.post(`/chats/${chatId}/typing-indicators`, { from });
  } catch {
    // ignore
  }
}