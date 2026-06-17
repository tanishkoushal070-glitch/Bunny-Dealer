const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getOrCreateUser, addCurrency, removeCurrency, formatCurrency } = require("../../utils/economy");
const { COLORS, baseEmbed, errorEmbed } = require("../../utils/embed");
const { updateQuestProgress } = require("../../utils/questHelper");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("high-low")
    .setDescription("🔢 Guess if the next number is higher, lower, or equal!")
    .addIntegerOption((o) => o.setName("bet").setDescription("Amount of grass to bet").setRequired(true).setMinValue(1)),

  async execute(interaction) {
    await interaction.deferReply();
    const bet = interaction.options.getInteger("bet");
    const player = await getOrCreateUser(interaction.user.id, interaction.user.username);

    if (player.grass < bet) {
      return interaction.editReply({ embeds: [errorEmbed("Insufficient Funds", `You only have 🌿 **${player.grass.toLocaleString()}** Grass!`)] });
    }

    await removeCurrency(interaction.user.id, "grass", bet, interaction.guildId, "high-low bet");

    let current = Math.floor(Math.random() * 10) + 1;
    let multiplier = 1.0;
    let round = 1;

    function buildEmbed() {
      return baseEmbed(COLORS.gambling)
        .setTitle("🔢 High-Low")
        .setDescription(`**Current Number:** \`${current}\`\n\nGuess if the next number (1-10) is higher, lower, or equal!\n\n**Round:** ${round} | **Multiplier:** ${multiplier.toFixed(2)}x\n**Potential Win:** ${formatCurrency(Math.floor(bet * multiplier), "grass")}`);
    }

    function buildRow() {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("hl_higher").setLabel("⬆️ Higher").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("hl_equal").setLabel("🟰 Equal").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("hl_lower").setLabel("⬇️ Lower").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("hl_cashout").setLabel(`💰 Cash Out (${multiplier.toFixed(2)}x)`).setStyle(ButtonStyle.Success).setDisabled(round === 1)
      );
    }

    const msg = await interaction.editReply({ embeds: [buildEmbed()], components: [buildRow()] });

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 60000,
    });

    collector.on("collect", async (btn) => {
      if (btn.customId === "hl_cashout") {
        const win = Math.floor(bet * multiplier);
        await addCurrency(interaction.user.id, "grass", win, interaction.guildId, "high-low cashout");
        player.stats.gamblingWins = (player.stats.gamblingWins || 0) + 1;
        await player.save();
        await updateQuestProgress(interaction.user.id, "gamblingWins");
        await btn.update({ embeds: [baseEmbed(COLORS.success).setTitle("✅ Cashed Out!").setDescription(`You cashed out for ${formatCurrency(win, "grass")} at ${multiplier.toFixed(2)}x!`)], components: [] });
        return collector.stop();
      }

      const next = Math.floor(Math.random() * 10) + 1;
      const guess = btn.customId.replace("hl_", "");
      let correct = false;

      if (guess === "higher" && next > current) correct = true;
      else if (guess === "lower" && next < current) correct = true;
      else if (guess === "equal" && next === current) correct = true;

      if (!correct) {
        player.stats.gamblingLosses = (player.stats.gamblingLosses || 0) + 1;
        await player.save();
        await btn.update({ embeds: [baseEmbed(COLORS.error).setTitle("❌ Wrong!").setDescription(`The number was **${next}** (you guessed **${guess}** from **${current}**)\n\nYou lost ${formatCurrency(bet, "grass")}!`)], components: [] });
        return collector.stop();
      }

      const bonus = guess === "equal" ? 5 : 1.5;
      multiplier = parseFloat((multiplier * bonus).toFixed(2));
      current = next;
      round++;

      await btn.update({ embeds: [buildEmbed()], components: [buildRow()] });
    });

    collector.on("end", (_, reason) => {
      if (reason === "time") interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};
