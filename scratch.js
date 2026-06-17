const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getOrCreateUser, addCurrency, formatCurrency } = require("../../utils/economy");
const Inventory = require("../../models/Inventory");
const { COLORS, baseEmbed, errorEmbed } = require("../../utils/embed");
const { updateQuestProgress } = require("../../utils/questHelper");

const SCRATCH_OUTCOMES = [
  { name: "Lose", emoji: "❌", multiplier: 0, weight: 50 },
  { name: "Small Win", emoji: "🌿", multiplier: 2, weight: 25 },
  { name: "Medium Win", emoji: "⭐", multiplier: 5, weight: 15 },
  { name: "Big Win", emoji: "💎", multiplier: 15, weight: 8 },
  { name: "Jackpot", emoji: "🥕", multiplier: 50, weight: 2 },
];

const CARD_PRICE = 100;

function weightedOutcome() {
  const total = SCRATCH_OUTCOMES.reduce((s, o) => s + o.weight, 0);
  let rand = Math.random() * total;
  for (const o of SCRATCH_OUTCOMES) { rand -= o.weight; if (rand <= 0) return o; }
  return SCRATCH_OUTCOMES[0];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("scratch")
    .setDescription("🎟️ Use a scratch card from your inventory!"),

  async execute(interaction) {
    await interaction.deferReply();
    const user = await getOrCreateUser(interaction.user.id, interaction.user.username);
    let inv = await Inventory.findOne({ userId: interaction.user.id });

    if (!inv || inv.scratchCards < 1) {
      return interaction.editReply({ embeds: [errorEmbed("No Scratch Cards!", `You don't have any scratch cards!\nBuy them in the **/shop** for ${formatCurrency(CARD_PRICE, "grass")} each. 🎟️`)] });
    }

    inv.scratchCards -= 1;
    await inv.save();

    const tiles = [weightedOutcome(), weightedOutcome(), weightedOutcome()];
    const results = tiles.map((t) => t.emoji).join("  ");

    const best = tiles.reduce((max, t) => t.multiplier > max.multiplier ? t : max, tiles[0]);
    const winAmount = Math.floor(CARD_PRICE * best.multiplier);
    const won = best.multiplier > 0;

    if (won) {
      await addCurrency(interaction.user.id, "grass", winAmount, interaction.guildId, "scratch win");
      user.stats.gamblingWins = (user.stats.gamblingWins || 0) + 1;
      await user.save();
      await updateQuestProgress(interaction.user.id, "gamblingWins");
    } else {
      user.stats.gamblingLosses = (user.stats.gamblingLosses || 0) + 1;
      await user.save();
    }

    const embed = baseEmbed(won ? COLORS.success : COLORS.error)
      .setTitle("🎟️ Scratch Card Result!")
      .setDescription(`╔══════════════╗\n║  ${results}  ║\n╚══════════════╝\n\n**${best.name}** ${best.emoji}`)
      .addFields(
        { name: won ? "💰 Won" : "❌ Result", value: won ? formatCurrency(winAmount, "grass") : "Better luck next time!", inline: true },
        { name: "🎟️ Cards Left", value: `${inv.scratchCards}`, inline: true }
      );

    interaction.editReply({ embeds: [embed] });
  },
};
