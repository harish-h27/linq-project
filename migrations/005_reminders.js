export const up = (pgm) => {
  pgm.createTable("reminders", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    user_id: { type: "text", notNull: true },
    message: { type: "text", notNull: true },
    fire_at: { type: "timestamptz", notNull: true },
    fired: { type: "boolean", notNull: true, default: false },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });

  pgm.createIndex("reminders", ["fire_at"], {
    where: "fired = false",
    name: "idx_reminders_due",
  });
};

export const down = (pgm) => {
  pgm.dropTable("reminders");
};