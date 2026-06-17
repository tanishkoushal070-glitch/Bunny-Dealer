const mongoose = require("mongoose");

const giveawaySchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String, default: null },
    prize: { type: String, required: true },
    winnersCount: { type: Number, default: 1 },
    winners: [{ type: String }],
    entries: [{ type: String }],
    requirements: {
      minGrass: { type: Number, default: 0 },
      roleId: { type: String, default: null },
    },
    endsAt: { type: Date, required: true },
    ended: { type: Boolean, default: false },
    cancelled: { type: Boolean, default: false },
    startedBy: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Giveaway", giveawaySchema);
