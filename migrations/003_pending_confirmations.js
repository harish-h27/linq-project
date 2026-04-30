export const up = (pgm) => {
  pgm.createTable("pending_confirmations", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    user_id: { type: "text", notNull: true },
    chat_id: { type: "text", notNull: true },
    kind: { type: "text", notNull: true },
    payload: { type: "jsonb", notNull: true },
    expires_at: { type: "timestamptz", notNull: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
};

export const down = (pgm) => {
  pgm.dropTable("pending_confirmations");
};