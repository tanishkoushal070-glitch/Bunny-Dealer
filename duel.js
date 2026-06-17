const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getOrCreateUser, addCurrency, removeCurrency, formatCurrency } = require("../../utils/economy");
const { COLORS, baseEmbed, errorEmbed } = require("../../utils/embed");
const { updateQuestProgress } = require("../../utils/questHelper");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("duel")
    .setDescription("⚔️ Challenge another user to a duel!")
    .addUserOption((o) => o.setName("opponent").setDescription("Who to challenge").setRequired(true))
    .addIntegerOption((o) => o.setName("bet").setDescription("Amount of grass to bet").setRequired(true).setMinValue(1)),

  async execute(interaction) {
    await interaction.deferReply();
    const opponent = interaction.options.getUser("opponent");
    const bet = interaction.options.getInteger("bet");

    if (opponent.id === interaction.user.id) return interaction.editReply({ embeds: [errorEmbed("Invalid", "You can't duel yourself!")] });
    if (opponent.bot) return interaction.editReply({ embeds: [errorEmbed("Invalid", "You can't duel a bot!")] });

    const challenger = await getOrCreateUser(interaction.user.id, interaction.user.username);
    if (challenger.grass < bet) return interaction.editReply({ embeds: [errorEmbed("Insufficient Funds", `You need ${formatCurrency(bet, "grass")} to duel!`)] });

    const embed = baseEmbed(COLORS.error)
      .setTitle("⚔️ Duel Challenge!")
      .setDescription(`${interaction.user} has challenged ${opponent} to a duel!\n\n**Bet:** ${formatCurrency(bet, "grass")}\n**Winner takes all!**\n\n${opponent}, do you accept?`);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("duel_accept").setLabel("⚔️ Accept").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("duel_decline").setLabel("🏃 Decline").setStyle(ButtonStyle.Secondary)
    );

    const msg = await interaction.editReply({ embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === opponent.id,
      time: 30000,
    });

    collector.on("collect", async (btn) => {
      if (btn.customId === "duel_decline") {
        await btn.update({ embeds: [errorEmbed("Duel Declined", `${opponent.username} ran away! 🏃`)], components: [] });
        return collector.stop();
      }

      const oppUser = await getOrCreateUser(opponent.id, opponent.username);
      if (oppUser.grass < bet) {
        await btn.update({ embeds: [errorEmbed("Can't Afford It", `${opponent.username} doesn't have enough Grass!`)], components: [] });
        return collector.stop();
      }

      // Remove bets from both
      await removeCurrency(interaction.user.id, "grass", bet, interaction.guildId, "duel bet");
      await removeCurrency(opponent.id, "grass", bet, interaction.guildId, "duel bet");

      const WEAPONS = ["🗡️ Sword", "🏹 Bow", "🔮 Magic", "🛡️ Shield Bash", "💣 Bomb", "🐰 Bunny Kick"];
      const p1move = WEAPONS[Math.floor(Math.random() * WEAPONS.length)];
      const p2move = WEAPONS[Math.floor(Math.random() * WEAPONS.length)];
      const p1hp = Math.floor(Math.random() * 50) + 50;
      const p2hp = Math.floor(Math.random() * 50) + 50;

      const winnerId = p1hp >= p2hp ? interaction.user.id : opponent.id;
      const loserSide = p1hp >= p2hp ? opponent : interaction.user;
      const winnerSide = p1hp >= p2hp ? interaction.user : opponent;
      const prize = bet * 2;

      await addCurrency(winnerId, "grass", prize, interaction.guildId, "duel win");
      const wUser = await getOrCreateUser(winnerId, winnerSide.username);
      wUser.stats.gamblingWins = (wUser.stats.gamblingWins || 0) + 1;
      await wUser.save();
      await updateQuestProgress(winnerId, "gamblingWins");

      const resultEmbed = baseEmbed(COLORS.success)
        .setTitle("⚔️ Duel Result!")
        .setDescription([
          `**${interaction.user.username}** uses ${p1move} (${p1hp} power)`,
          `**${opponent.username}** uses ${p2move} (${p2hp} power)`,
          ``,
          `🏆 **${winnerSide.username}** wins and takes ${formatCurrency(prize, "grass")}!`,
          `💔 **${loserSide.username}** is defeated!`,
        ].join("\n"));

      await btn.update({ embeds: [resultEmbed], components: [] });
      collector.stop();
    });

    collector.on("end", (_, reason) => {
      if (reason === "time") interaction.editReply({ embeds: [errorEmbed("Timed Out", "The duel challenge expired.")], components: [] }).catch(() => {});
    });
  },
};
