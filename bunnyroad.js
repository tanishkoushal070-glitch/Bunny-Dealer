const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getOrCreateUser, addCurrency, removeCurrency, formatCurrency } = require("../../utils/economy");
const { COLORS, baseEmbed, errorEmbed } = require("../../utils/embed");
const { updateQuestProgress } = require("../../utils/questHelper");

const LANES = ["🌿", "🌸", "🌺", "🍄", "💎", "⭐", "🥕"];
const FAIL_CHANCE_BASE = 0.15;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bunny-road")
    .setDescription("🐰 Help the bunny cross the dangerous road for multiplying rewards!")
    .addIntegerOption((o) => o.setName("bet").setDescription("Amount of grass to bet").setRequired(true).setMinValue(1)),

  async execute(interaction) {
    await interaction.deferReply();
    const bet = interaction.options.getInteger("bet");
    const player = await getOrCreateUser(interaction.user.id, interaction.user.username);

    if (player.grass < bet) {
      return interaction.editReply({ embeds: [errorEmbed("Insufficient Funds", `You only have 🌿 **${player.grass.toLocaleString()}** Grass!`)] });
    }

    await removeCurrency(interaction.user.id, "grass", bet, interaction.guildId, "bunny-road bet");

    let step = 0;
    let multiplier = 1.0;
    const path = ["🏠"];

    function failChance() { return FAIL_CHANCE_BASE + step * 0.08; }
    function buildEmbed() {
      const potWin = Math.floor(bet * multiplier);
      return baseEmbed(COLORS.primary)
        .setTitle("🐰 Bunny Road")
        .setDescription(`Help the bunny cross the road! Each step increases your multiplier but also the danger!\n\n**Path:** ${path.join(" → ")}\n\n**Step:** ${step} | **Multiplier:** ${multiplier.toFixed(2)}x\n**Danger:** ${Math.round(failChance() * 100)}% chance to fall!\n**Potential Win:** ${formatCurrency(potWin, "grass")}`);
    }

    function buildRow(disabled = false) {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("br_forward").setLabel("🐰 Move Forward").setStyle(ButtonStyle.Primary).setDisabled(disabled || step >= LANES.length),
        new ButtonBuilder().setCustomId("br_cashout").setLabel(`💰 Cash Out (${multiplier.toFixed(2)}x)`).setStyle(ButtonStyle.Success).setDisabled(disabled || step === 0)
      );
    }

    const msg = await interaction.editReply({ embeds: [buildEmbed()], components: [buildRow()] });

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 120000,
    });

    collector.on("collect", async (btn) => {
      if (btn.customId === "br_cashout") {
        const win = Math.floor(bet * multiplier);
        await addCurrency(interaction.user.id, "grass", win, interaction.guildId, "bunny-road cashout");
        player.stats.gamblingWins = (player.stats.gamblingWins || 0) + 1;
        await player.save();
        await updateQuestProgress(interaction.user.id, "gamblingWins");
        await btn.update({ embeds: [baseEmbed(COLORS.success).setTitle("🐰 Safe Landing!").setDescription(`The bunny made it safely!\nYou cashed out for ${formatCurrency(win, "grass")} at ${multiplier.toFixed(2)}x!`)], components: [] });
        return collector.stop();
      }

      const failed = Math.random() < failChance();
      if (failed) {
        player.stats.gamblingLosses = (player.stats.gamblingLosses || 0) + 1;
        await player.save();
        path.push("💥");
        await btn.update({ embeds: [baseEmbed(COLORS.error).setTitle("💥 The Bunny Fell!").setDescription(`${path.join(" → ")}\n\nThe bunny tripped and fell! You lost ${formatCurrency(bet, "grass")}! 😢`)], components: [] });
        return collector.stop();
      }

      step++;
      multiplier = parseFloat((1 + step * 0.5).toFixed(2));
      path.push(LANES[step - 1] || "⭐");

      if (step >= LANES.length) {
        const win = Math.floor(bet * multiplier);
        await addCurrency(interaction.user.id, "grass", win, interaction.guildId, "bunny-road complete");
        player.stats.gamblingWins = (player.stats.gamblingWins || 0) + 1;
        await player.save();
        await updateQuestProgress(interaction.user.id, "gamblingWins");
        await btn.update({ embeds: [baseEmbed(COLORS.rare).setTitle("🐰 Bunny Made It Across!").setDescription(`${path.join(" → ")} 🏁\n\n**COMPLETE!** The bunny crossed the road!\nYou win ${formatCurrency(win, "grass")} at ${multiplier.toFixed(2)}x!`)], components: [] });
        return collector.stop();
      }

      await btn.update({ embeds: [buildEmbed()], components: [buildRow()] });
    });

    collector.on("end", (_, reason) => {
      if (reason === "time") interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};
