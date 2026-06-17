const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    items: [
      {
        itemId: String,
        name: String,
        category: String,
        quantity: { type: Number, default: 1 },
        acquiredAt: { type: Date, default: Date.now },
      },
    ],
    fish: [
      {
        name: String,
        rarity: String,
        emoji: String,
        quantity: { type: Number, default: 1 },
      },
    ],
    bunnies: [
      {
        name: String,
        rarity: String,
        emoji: String,
        quantity: { type: Number, default: 1 },
      },
    ],
    scratchCards: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Inventory", inventorySchema);
