import "dotenv/config";
import express from "express";
import { handleWebhook } from "./linq/webhook.js";
import pool from "./db/client.js";


const app = express();
const PORT = process.env.PORT;

app.use("/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/webhook", handleWebhook);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});