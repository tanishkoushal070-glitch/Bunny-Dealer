const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getOrCreateUser, addCurrency, removeCurrency, formatCurrency } = require("../../utils/economy");
const { gamblingEmbed, errorEmbed, COLORS, baseEmbed } = require("../../utils/embed");
const { updateQuestProgress } = require("../../utils/questHelper");
const Log = require("../../models/Log");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("🪙 Flip a coin and bet on the outcome!")
    .addIntegerOption((o) => o.setName("bet").setDescription("Amount of grass to bet").setRequired(true).setMinValue(1))
    .addStringOption((o) =>
      o.setName("side").setDescription("Heads or Tails (optional)").setRequired(false)
        .addChoices({ name: "🦅 Heads", value: "heads" }, { name: "🦁 Tails", value: "tails" })
    )
    .addUserOption((o) => o.setName("opponent").setDescription("Challenge another user (optional)").setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply();
    const bet = interaction.options.getInteger("bet");
    const chosenSide = interaction.options.getString("side") || (Math.random() < 0.5 ? "heads" : "tails");
    const opponent = interaction.options.getUser("opponent");

    const player = await getOrCreateUser(interaction.user.id, interaction.user.username);
    if (player.grass < bet) {
      return interaction.editReply({ embeds: [errorEmbed("Insufficient Funds", `You only have 🌿 **${player.grass.toLocaleString()}** Grass!`)] });
    }

    if (opponent && !opponent.bot && opponent.id !== interaction.user.id) {
      const oppUser = await getOrCreateUser(opponent.id, opponent.username);
      if (oppUser.grass < bet) {
        return interaction.editReply({ embeds: [errorEmbed("Opponent Can't Afford It", `${opponent.username} doesn't have enough Grass!`)] });
      }

      const embed = gamblingEmbed("Coinflip Challenge!", `${opponent} has been challenged to a coinflip by ${interaction.user}!\n\n**Bet:** ${formatCurrency(bet, "grass")}\n\nDo you accept?`);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("cf_accept").setLabel("✅ Accept").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("cf_decline").setLabel("❌ Decline").setStyle(ButtonStyle.Danger)
      );

      const msg = await interaction.editReply({ embeds: [embed], components: [row] });
      const collector = msg.createMessageComponentCollector({ filter: (i) => i.user.id === opponent.id, time: 30000 });

      collector.on("collect", async (btn) => {
        if (btn.customId === "cf_decline") {
          await btn.update({ embeds: [errorEmbed("Challenge Declined", `${opponent.username} declined the coinflip.`)], components: [] });
          return collector.stop();
        }

        const result = Math.random() < 0.5 ? "heads" : "tails";
        const p1Side = chosenSide;
        const p2Side = p1Side === "heads" ? "tails" : "heads";
        const winner = result === p1Side ? interaction.user : opponent;
        const loser = result === p1Side ? opponent : interaction.user;

        await removeCurrency(loser.id, "grass", bet, interaction.guildId, "coinflip loss");
        await addCurrency(winner.id, "grass", bet, interaction.guildId, "coinflip win");

        const winUser = await getOrCreateUser(winner.id, winner.username);
        winUser.stats.gamblingWins = (winUser.stats.gamblingWins || 0) + 1;
        await winUser.save();
        await updateQuestProgress(winner.id, "gamblingWins");

        const resultEmbed = baseEmbed(winner.id === interaction.user.id ? COLORS.success : COLORS.error)
          .setTitle(`🪙 Coinflip Result — ${result === "heads" ? "🦅 HEADS" : "🦁 TAILS"}!`)
          .setDescription(`🏆 **${winner.username}** wins ${formatCurrency(bet, "grass")}!\n\n${interaction.user}: **${p1Side}** | ${opponent}: **${p2Side}**`);

        await btn.update({ embeds: [resultEmbed], components: [] });
        collector.stop();
      });

      collector.on("end", (_, reason) => {
        if (reason === "time") interaction.editReply({ embeds: [errorEmbed("Timed Out", "Challenge expired.")], components: [] }).catch(() => {});
      });
      return;
    }

    // vs Bot
    await removeCurrency(interaction.user.id, "grass", bet, interaction.guildId, "coinflip bet");
    const result = Math.random() < 0.5 ? "heads" : "tails";
    const won = result === chosenSide;

    if (won) {
      await addCurrency(interaction.user.id, "grass", bet * 2, interaction.guildId, "coinflip win");
      player.stats.gamblingWins = (player.stats.gamblingWins || 0) + 1;
      await player.save();
      await updateQuestProgress(interaction.user.id, "gamblingWins");
    } else {
      player.stats.gamblingLosses = (player.stats.gamblingLosses || 0) + 1;
      await player.save();
    }

    const emoji = result === "heads" ? "🦅" : "🦁";
    const embed = baseEmbed(won ? COLORS.success : COLORS.error)
      .setTitle(`🪙 Coinflip — ${emoji} ${result.toUpperCase()}!`)
      .setDescription(won
        ? `✅ You chose **${chosenSide}** and won ${formatCurrency(bet, "grass")}!`
        : `❌ You chose **${chosenSide}** but it landed **${result}**. You lost ${formatCurrency(bet, "grass")}!`
      );

    interaction.editReply({ embeds: [embed] });
  },
};
