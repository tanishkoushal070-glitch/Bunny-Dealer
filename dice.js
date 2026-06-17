const { SlashCommandBuilder } = require("discord.js");
const { getOrCreateUser, addCurrency, removeCurrency, formatCurrency } = require("../../utils/economy");
const { baseEmbed, errorEmbed, COLORS } = require("../../utils/embed");
const { updateQuestProgress } = require("../../utils/questHelper");

const DICE_EMOJI = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dice")
    .setDescription("🎲 Roll two dice and bet on the outcome!")
    .addIntegerOption((o) => o.setName("bet").setDescription("Amount of grass to bet").setRequired(true).setMinValue(1))
    .addStringOption((o) =>
      o.setName("choice")
        .setDescription("What do you bet on?")
        .setRequired(true)
        .addChoices(
          { name: "🔺 High (8–12) — 1.8x", value: "high" },
          { name: "🔻 Low (2–6) — 1.8x",   value: "low" },
          { name: "7️⃣ Lucky 7 — 4x",         value: "lucky" },
          { name: "🎯 Exact Match (pick a number) — 6x", value: "exact" }
        )
    )
    .addIntegerOption((o) =>
      o.setName("number")
        .setDescription("If betting Exact — pick a number (2-12)")
        .setRequired(false)
        .setMinValue(2)
        .setMaxValue(12)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const bet = interaction.options.getInteger("bet");
    const choice = interaction.options.getString("choice");
    const exactNum = interaction.options.getInteger("number");

    if (choice === "exact" && !exactNum) {
      return interaction.editReply({ embeds: [errorEmbed("Missing Number", "You must pick a number (2–12) when choosing Exact Match!")] });
    }

    const user = await getOrCreateUser(interaction.user.id, interaction.user.username);
    if (user.grass < bet) {
      return interaction.editReply({ embeds: [errorEmbed("Insufficient Funds", `You only have 🌿 **${user.grass.toLocaleString()}**!`)] });
    }

    await removeCurrency(interaction.user.id, "grass", bet, interaction.guildId, "dice bet");

    const d1 = rollDie();
    const d2 = rollDie();
    const total = d1 + d2;

    let won = false;
    let multiplier = 0;
    let label = "";

    switch (choice) {
      case "high":
        won = total >= 8;
        multiplier = 1.8;
        label = "High (8–12)";
        break;
      case "low":
        won = total <= 6;
        multiplier = 1.8;
        label = "Low (2–6)";
        break;
      case "lucky":
        won = total === 7;
        multiplier = 4;
        label = "Lucky 7";
        break;
      case "exact":
        won = total === exactNum;
        multiplier = 6;
        label = `Exact ${exactNum}`;
        break;
    }

    const winAmount = Math.floor(bet * multiplier);

    if (won) {
      await addCurrency(interaction.user.id, "grass", winAmount, interaction.guildId, "dice win");
      await updateQuestProgress(interaction.user.id, "gamblingWins");
      await updateQuestProgress(interaction.user.id, "earned", winAmount - bet);
    }

    const diceDisplay = `${DICE_EMOJI[d1 - 1]}  ${DICE_EMOJI[d2 - 1]}`;
    const color = won ? (multiplier >= 4 ? COLORS.rare : COLORS.success) : COLORS.error;

    const embed = baseEmbed(color)
      .setTitle(`🎲 Dice Roll — Total: **${total}**`)
      .setDescription(`${diceDisplay}\n\n${won ? `✅ **You rolled ${total}!** That's **${label}** — you win!` : `❌ **You rolled ${total}.** Not ${label}.`}`)
      .addFields(
        { name: "🎯 Your Bet", value: label, inline: true },
        { name: "💸 Wagered", value: formatCurrency(bet, "grass"), inline: true },
        { name: won ? "💰 Won" : "💔 Lost", value: won ? formatCurrency(winAmount, "grass") : formatCurrency(bet, "grass"), inline: true }
      );

    await interaction.editReply({ embeds: [embed] });
  },
};
