import "dotenv/config";
import express from "express";
import { handleWebhook } from "./linq/webhook.js";
import pool from "./db/client.js";
import { startChainWatcher, stopChainWatcher } from "./chain/watcher.js";
import { startScheduler, stopScheduler } from "./scheduler/index.js";
import { startOutboxWorker } from "./outbox/worker.js";

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use("/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", instance: process.env.INSTANCE_ID ?? "node-1" });
});

app.post("/webhook", handleWebhook);

pool.query("SELECT 1").then(() => {
  console.log("[db] connected");
}).catch((err) => {
  console.error("[db] connection failed:", err);
});

const server = app.listen(PORT, async () => {
  console.log(`server running on port ${PORT}`);
  await startChainWatcher();
  await startScheduler();
  startOutboxWorker();
});

process.on("SIGTERM", async () => {
  console.log("shutting down...");
  await stopScheduler();
  await stopChainWatcher();
  server.close();
});