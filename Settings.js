const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, unique: true },
    economyLogChannel: { type: String, default: null },
    adminRoles: [{ type: String }],
    customJobs: [
      {
        name: String,
        emoji: String,
        minPay: Number,
        maxPay: Number,
        rarity: String,
      },
    ],
    botActive: { type: Boolean, default: true },
    lastActivated: { type: Date, default: null },
    lastDeactivated: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);
