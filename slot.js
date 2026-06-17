const { SlashCommandBuilder } = require("discord.js");
const { getOrCreateUser, addCurrency, removeCurrency, formatCurrency } = require("../../utils/economy");
const { gamblingEmbed, errorEmbed, COLORS, baseEmbed } = require("../../utils/embed");
const { updateQuestProgress } = require("../../utils/questHelper");

const SYMBOLS = [
  { emoji: "🍒", weight: 35, name: "Cherry" },
  { emoji: "🍋", weight: 25, name: "Lemon" },
  { emoji: "🍇", weight: 20, name: "Grape" },
  { emoji: "⭐", weight: 12, name: "Star" },
  { emoji: "💎", weight: 5, name: "Diamond" },
  { emoji: "🐰", weight: 2, name: "Bunny" },
  { emoji: "🥕", weight: 1, name: "Carrot" },
];

function weightedRandom() {
  const total = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);
  let rand = Math.random() * total;
  for (const sym of SYMBOLS) {
    rand -= sym.weight;
    if (rand <= 0) return sym;
  }
  return SYMBOLS[0];
}

function spin() {
  return [weightedRandom(), weightedRandom(), weightedRandom()];
}

function calcPayout(reels, bet) {
  const [a, b, c] = reels;
  if (a.emoji === b.emoji && b.emoji === c.emoji) {
    if (a.name === "Carrot") return { multiplier: 100, tier: "🥕 BUNNY JACKPOT! 🥕" };
    if (a.name === "Bunny") return { multiplier: 50, tier: "🐰 MEGA JACKPOT! 🐰" };
    if (a.name === "Diamond") return { multiplier: 20, tier: "💎 JACKPOT! 💎" };
    if (a.name === "Star") return { multiplier: 10, tier: "⭐ Big Win! ⭐" };
    if (a.name === "Grape") return { multiplier: 5, tier: "🍇 Medium Win!" };
    return { multiplier: 2, tier: "🍒 Small Win!" };
  }
  if (a.emoji === b.emoji || b.emoji === c.emoji || a.emoji === c.emoji) {
    return { multiplier: 1.5, tier: "✨ Partial Match!" };
  }
  return { multiplier: 0, tier: "❌ No Match" };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("slot")
    .setDescription("🎰 Spin the slot machine!")
    .addIntegerOption((o) => o.setName("bet").setDescription("Amount of grass to bet").setRequired(true).setMinValue(1)),

  async execute(interaction) {
    await interaction.deferReply();
    const bet = interaction.options.getInteger("bet");
    const player = await getOrCreateUser(interaction.user.id, interaction.user.username);

    if (player.grass < bet) {
      return interaction.editReply({ embeds: [errorEmbed("Insufficient Funds", `You only have 🌿 **${player.grass.toLocaleString()}** Grass!`)] });
    }

    await removeCurrency(interaction.user.id, "grass", bet, interaction.guildId, "slot bet");

    const reels = spin();
    const { multiplier, tier } = calcPayout(reels, bet);
    const winAmount = Math.floor(bet * multiplier);
    const won = multiplier > 0;

    if (won) {
      await addCurrency(interaction.user.id, "grass", winAmount, interaction.guildId, "slot win");
      player.stats.gamblingWins = (player.stats.gamblingWins || 0) + 1;
      await updateQuestProgress(interaction.user.id, "gamblingWins");
    } else {
      player.stats.gamblingLosses = (player.stats.gamblingLosses || 0) + 1;
    }
    await player.save();

    const display = `╔══════════════╗\n║ ${reels.map((r) => r.emoji).join("  ")} ║\n╚══════════════╝`;
    const color = multiplier >= 20 ? COLORS.rare : won ? COLORS.success : COLORS.error;

    const embed = baseEmbed(color)
      .setTitle("🎰 Slot Machine")
      .setDescription(`${display}\n\n**${tier}**`)
      .addFields(
        { name: "💸 Bet", value: formatCurrency(bet, "grass"), inline: true },
        { name: won ? "💰 Won" : "💔 Lost", value: won ? formatCurrency(winAmount, "grass") : formatCurrency(bet, "grass"), inline: true },
        { name: "✖️ Multiplier", value: `${multiplier}x`, inline: true }
      );

    interaction.editReply({ embeds: [embed] });
  },
};
