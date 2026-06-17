const mongoose = require("mongoose");

const auctionSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String, default: null },
    type: { type: String, enum: ["role", "carrots"], required: true },
    itemName: { type: String, required: true },
    roleId: { type: String, default: null },
    carrotAmount: { type: Number, default: 0 },
    startingBid: { type: Number, required: true },
    currentBid: { type: Number, default: 0 },
    currentBidder: { type: String, default: null },
    currentBidderTag: { type: String, default: null },
    bids: [
      {
        userId: String,
        username: String,
        amount: Number,
        time: { type: Date, default: Date.now },
      },
    ],
    endsAt: { type: Date, required: true },
    ended: { type: Boolean, default: false },
    startedBy: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Auction", auctionSchema);
