const User = require("../models/User");
const Log = require("../models/Log");

async function getOrCreateUser(userId, username) {
  let user = await User.findOne({ userId });
  if (!user) {
    user = await User.create({ userId, username: username || "Unknown" });
  }
  return user;
}

async function addCurrency(userId, currency, amount, guildId, reason) {
  const user = await User.findOneAndUpdate(
    { userId },
    {
      $inc: {
        [currency]: amount,
        "stats.totalEarned": amount > 0 ? amount : 0,
      },
    },
    { new: true, upsert: true }
  );
  if (guildId) {
    await Log.create({
      guildId,
      type: "economy",
      userId,
      action: `add_${currency}`,
      amount,
      details: { reason },
    });
  }
  return user;
}

async function removeCurrency(userId, currency, amount, guildId, reason) {
  const user = await User.findOne({ userId });
  if (!user || user[currency] < amount) return null;
  user[currency] -= amount;
  user.stats.totalSpent += amount;
  await user.save();
  if (guildId) {
    await Log.create({
      guildId,
      type: "economy",
      userId,
      action: `remove_${currency}`,
      amount,
      details: { reason },
    });
  }
  return user;
}

async function transferCurrency(fromId, toId, currency, amount, guildId) {
  const from = await User.findOne({ userId: fromId });
  if (!from || from[currency] < amount) return { success: false, reason: "Insufficient funds" };
  from[currency] -= amount;
  await from.save();
  const to = await User.findOneAndUpdate(
    { userId: toId },
    { $inc: { [currency]: amount } },
    { new: true, upsert: true }
  );
  if (guildId) {
    await Log.create({
      guildId,
      type: "transfer",
      userId: fromId,
      targetId: toId,
      action: "transfer",
      amount,
      currency,
    });
  }
  return { success: true, from, to };
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatCurrency(amount, currency) {
  const emoji = currency === "grass" ? "🌿" : "🥕";
  return `${emoji} **${amount.toLocaleString()}**`;
}

module.exports = {
  getOrCreateUser,
  addCurrency,
  removeCurrency,
  transferCurrency,
  randomBetween,
  formatCurrency,
};
