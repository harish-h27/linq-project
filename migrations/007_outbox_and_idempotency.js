export const up = (pgm) => {
  pgm.createTable("outbox", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    user_id: { type: "text", notNull: true },
    chat_id: { type: "text" },
    message: { type: "text", notNull: true },
    status: { type: "text", notNull: true, default: "pending" },
    retry_count: { type: "integer", notNull: true, default: 0 },
    last_error: { type: "text" },
    process_after: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    sent_at: { type: "timestamptz" },
  });
  pgm.createIndex("outbox", ["status", "process_after"], {
    where: "status = 'pending'",
    name: "idx_outbox_pending",
  });

  pgm.createTable("processed_events", {
    event_id: { type: "text", primaryKey: true },
    processed_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });

  pgm.createTable("rate_limit_buckets", {
    user_id: { type: "text", notNull: true },
    window_start: { type: "timestamptz", notNull: true },
    count: { type: "integer", notNull: true, default: 0 },
  });
  pgm.addConstraint("rate_limit_buckets", "uniq_user_window", {
    unique: ["user_id", "window_start"],
  });
};

export const down = (pgm) => {
  pgm.dropTable("rate_limit_buckets");
  pgm.dropTable("processed_events");
  pgm.dropTable("outbox");
};