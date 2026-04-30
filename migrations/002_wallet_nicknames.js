export const up = (pgm) => {
  pgm.createTable("wallet_nicknames", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    user_id: { type: "text", notNull: true },
    nickname: { type: "text", notNull: true },
    address: { type: "text", notNull: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.addConstraint("wallet_nicknames", "uniq_user_nickname", {
    unique: ["user_id", "nickname"],
  });
};

export const down = (pgm) => {
  pgm.dropTable("wallet_nicknames");
};