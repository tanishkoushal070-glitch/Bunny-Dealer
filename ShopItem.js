const mongoose = require("mongoose");

const shopItemSchema = new mongoose.Schema(
  {
    itemId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ["Jobs", "Roles", "Tools", "Consumables", "Pets", "ScratchCards", "Cosmetics"],
      required: true,
    },
    price: { type: Number, required: true },
    currency: { type: String, enum: ["grass", "carrots"], default: "grass" },
    emoji: { type: String, default: "📦" },
    roleId: { type: String, default: null },
    jobName: { type: String, default: null },
    titleId: { type: String, default: null },
    stock: { type: Number, default: -1 },
    enabled: { type: Boolean, default: true },
    guildId: { type: String, default: "global" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ShopItem", shopItemSchema);
