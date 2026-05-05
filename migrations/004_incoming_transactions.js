export const up = (pgm) => {
  pgm.createTable("incoming_transactions", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    user_id: { type: "text", notNull: true },
    tx_hash: { type: "text", notNull: true, unique: true },
    from_address: { type: "text", notNull: true },
    to_address: { type: "text", notNull: true },
    amount: { type: "text", notNull: true },
    block_number: { type: "bigint", notNull: true },
    notified: { type: "boolean", notNull: true, default: false },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
};

export const down = (pgm) => {
  pgm.dropTable("incoming_transactions");
};