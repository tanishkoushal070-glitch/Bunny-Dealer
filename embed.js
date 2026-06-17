const { EmbedBuilder } = require("discord.js");

const COLORS = {
  primary: 0xf4a7c3,
  success: 0x90ee90,
  error: 0xff6b6b,
  warning: 0xffd700,
  info: 0x87ceeb,
  economy: 0x98fb98,
  gambling: 0xff69b4,
  rare: 0x9b59b6,
};

function baseEmbed(color = COLORS.primary) {
  return new EmbedBuilder()
    .setColor(color)
    .setTimestamp()
    .setFooter({ text: "🐰 Bunny Dealer" });
}

function successEmbed(title, description) {
  return baseEmbed(COLORS.success).setTitle(`✅ ${title}`).setDescription(description);
}

function errorEmbed(title, description) {
  return baseEmbed(COLORS.error).setTitle(`❌ ${title}`).setDescription(description);
}

function warningEmbed(title, description) {
  return baseEmbed(COLORS.warning).setTitle(`⚠️ ${title}`).setDescription(description);
}

function economyEmbed(title, description) {
  return baseEmbed(COLORS.economy).setTitle(`🌿 ${title}`).setDescription(description);
}

function gamblingEmbed(title, description) {
  return baseEmbed(COLORS.gambling).setTitle(`🎰 ${title}`).setDescription(description);
}

module.exports = {
  COLORS,
  baseEmbed,
  successEmbed,
  errorEmbed,
  warningEmbed,
  economyEmbed,
  gamblingEmbed,
};
