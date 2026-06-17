const mongoose = require("mongoose");

const logSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true },
    type: {
      type: String,
      enum: [
        "economy",
        "gambling",
        "shop",
        "auction",
        "giveaway",
        "rob",
        "quest",
        "admin",
        "transfer",
      ],
      required: true,
    },
    userId: { type: String },
    targetId: { type: String },
    action: { type: String, required: true },
    details: { type: Object },
    amount: { type: Number },
    currency: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Log", logSchema);
