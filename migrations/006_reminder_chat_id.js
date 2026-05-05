export const up = (pgm) => {
  pgm.addColumn("reminders", {
    chat_id: { type: "text", notNull: false },
  });
};

export const down = (pgm) => {
  pgm.dropColumn("reminders", "chat_id");
};