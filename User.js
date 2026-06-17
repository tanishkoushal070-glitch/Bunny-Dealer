const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    username: { type: String },
    grass: { type: Number, default: 0 },
    carrots: { type: Number, default: 0 },
    job: { type: String, default: "Unemployed" },
    jobLevel: { type: Number, default: 1 },
    lastDaily: { type: Date, default: null },
    lastWeekly: { type: Date, default: null },
    lastWork: { type: Date, default: null },
    lastForage: { type: Date, default: null },
    lastFish: { type: Date, default: null },
    lastHunt: { type: Date, default: null },
    lastRob: { type: Date, default: null },
    lastAutohunt: { type: Date, default: null },
    lastMine: { type: Date, default: null },
    robProtection: { type: Date, default: null },
    stats: {
      totalEarned: { type: Number, default: 0 },
      totalSpent: { type: Number, default: 0 },
      gamblingWins: { type: Number, default: 0 },
      gamblingLosses: { type: Number, default: 0 },
      gamblingWinnings: { type: Number, default: 0 },
      huntsCompleted: { type: Number, default: 0 },
      fishCaught: { type: Number, default: 0 },
      questsCompleted: { type: Number, default: 0 },
      workCount: { type: Number, default: 0 },
      robsAttempted: { type: Number, default: 0 },
      robsSucceeded: { type: Number, default: 0 },
      timesScratched: { type: Number, default: 0 },
      minesCompleted: { type: Number, default: 0 },
      duelWins: { type: Number, default: 0 },
    },
    activeQuests: [
      {
        questId: String,
        name: String,
        description: String,
        type: String,
        target: Number,
        progress: { type: Number, default: 0 },
        reward: { grass: Number, carrots: Number, role: String },
        expiresAt: Date,
      },
    ],
    questsRefreshedAt: { type: Date, default: null },
    autohuntActive: { type: Boolean, default: false },
    autohuntPets: [{ type: String }],
    // Cosmetics
    equippedTitle: { type: String, default: null },
    ownedTitles: [{ type: String }],
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("User", userSchema);
