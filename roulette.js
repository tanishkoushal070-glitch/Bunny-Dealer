const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getOrCreateUser, addCurrency, removeCurrency, formatCurrency } = require("../../utils/economy");
const { COLORS, baseEmbed, errorEmbed } = require("../../utils/embed");
const { updateQuestProgress } = require("../../utils/questHelper");

const activeLobbies = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("roulette")
    .setDescription("🔫 Russian Roulette — last one standing wins!")
    .addIntegerOption((o) => o.setName("bet").setDescription("Amount of grass to bet").setRequired(true).setMinValue(1)),

  async execute(interaction) {
    await interaction.deferReply();
    const bet = interaction.options.getInteger("bet");
    const guildId = interaction.guildId;

    if (activeLobbies.has(guildId)) {
      const lobby = activeLobbies.get(guildId);
      if (lobby.players.some((p) => p.id === interaction.user.id)) {
        return interaction.editReply({ embeds: [errorEmbed("Already Joined", "You're already in the roulette lobby!")] });
      }
      if (lobby.players.length >= 6) {
        return interaction.editReply({ embeds: [errorEmbed("Lobby Full", "The roulette lobby is full (6/6)!")] });
      }
      const user = await getOrCreateUser(interaction.user.id, interaction.user.username);
      if (user.grass < bet) {
        return interaction.editReply({ embeds: [errorEmbed("Insufficient Funds", `You need ${formatCurrency(bet, "grass")} to join!`)] });
      }
      await removeCurrency(interaction.user.id, "grass", lobby.bet, interaction.guildId, "roulette bet");
      lobby.players.push({ id: interaction.user.id, username: interaction.user.username, alive: true });
      lobby.totalPot += lobby.bet;
      await updateLobbyMessage(lobby);
      return interaction.editReply({ embeds: [baseEmbed(COLORS.info).setTitle("🔫 Joined Roulette!").setDescription(`You joined the lobby! Bet: ${formatCurrency(lobby.bet, "grass")}`)] });
    }

    const user = await getOrCreateUser(interaction.user.id, interaction.user.username);
    if (user.grass < bet) {
      return interaction.editReply({ embeds: [errorEmbed("Insufficient Funds", `You only have 🌿 **${user.grass.toLocaleString()}** Grass!`)] });
    }
    await removeCurrency(interaction.user.id, "grass", bet, interaction.guildId, "roulette bet");

    const lobby = {
      hostId: interaction.user.id,
      bet,
      totalPot: bet,
      players: [{ id: interaction.user.id, username: interaction.user.username, alive: true }],
      started: false,
      channel: interaction.channel,
      messageId: null,
    };
    activeLobbies.set(guildId, lobby);

    const embed = buildLobbyEmbed(lobby);
    const row = buildLobbyRow(false);
    const msg = await interaction.editReply({ embeds: [embed], components: [row] });
    lobby.messageId = msg.id;

    const collector = msg.createMessageComponentCollector({ time: 120000 });

    collector.on("collect", async (btn) => {
      if (btn.customId === "rou_start") {
        if (btn.user.id !== lobby.hostId) return btn.reply({ content: "Only the host can start!", ephemeral: true });
        if (lobby.players.length < 2) return btn.reply({ content: "Need at least 2 players!", ephemeral: true });
        lobby.started = true;
        collector.stop();
        await btn.update({ embeds: [buildLobbyEmbed(lobby, "Starting...")], components: [] });
        await runGame(interaction, lobby, guildId);
      } else if (btn.customId === "rou_leave") {
        const idx = lobby.players.findIndex((p) => p.id === btn.user.id);
        if (idx === -1) return btn.reply({ content: "You're not in this lobby!", ephemeral: true });
        await addCurrency(btn.user.id, "grass", lobby.bet, guildId, "roulette leave refund");
        lobby.players.splice(idx, 1);
        lobby.totalPot -= lobby.bet;
        if (lobby.players.length === 0) { activeLobbies.delete(guildId); collector.stop(); return; }
        await btn.update({ embeds: [buildLobbyEmbed(lobby)], components: [buildLobbyRow(false)] });
      }
    });

    collector.on("end", (_, reason) => {
      if (reason === "time" && !lobby.started) {
        activeLobbies.delete(guildId);
        lobby.players.forEach((p) => addCurrency(p.id, "grass", lobby.bet, guildId, "roulette timeout refund"));
        interaction.editReply({ embeds: [errorEmbed("Lobby Expired", "Not enough players joined in time. Bets refunded.")], components: [] }).catch(() => {});
      }
    });

    async function updateLobbyMessage(lobby) {
      try {
        const ch = await interaction.client.channels.fetch(interaction.channelId);
        const m = await ch.messages.fetch(lobby.messageId);
        await m.edit({ embeds: [buildLobbyEmbed(lobby)], components: [buildLobbyRow(false)] });
      } catch {}
    }
  },
};

function buildLobbyEmbed(lobby, status = "Waiting") {
  return baseEmbed(COLORS.error)
    .setTitle("🔫 Russian Roulette Lobby")
    .setDescription(`**Status:** ${status}\n**Bet:** ${formatCurrency(lobby.bet, "grass")} per player\n**Pot:** ${formatCurrency(lobby.totalPot, "grass")}\n\n**Players (${lobby.players.length}/6):**\n${lobby.players.map((p) => `• ${p.username}`).join("\n") || "None"}`)
    .setFooter({ text: "Use /roulette to join! Host can start with 2+ players." });
}

function buildLobbyRow(disabled) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("rou_start").setLabel("🔫 Start Game").setStyle(ButtonStyle.Danger).setDisabled(disabled),
    new ButtonBuilder().setCustomId("rou_leave").setLabel("🚪 Leave").setStyle(ButtonStyle.Secondary).setDisabled(disabled)
  );
}

async function runGame(interaction, lobby, guildId) {
  const channel = lobby.channel;
  let alive = [...lobby.players];
  let round = 1;

  while (alive.length > 1) {
    const chambers = alive.length;
    const liveRound = Math.floor(Math.random() * chambers);
    let victim = null;

    const roundEmbed = baseEmbed(COLORS.error)
      .setTitle(`🔫 Roulette — Round ${round}`)
      .setDescription(`**Alive:** ${alive.map((p) => p.username).join(", ")}\n\nThe cylinder spins... 🎰`);
    await channel.send({ embeds: [roundEmbed] });

    await new Promise((r) => setTimeout(r, 2000));

    victim = alive[liveRound];
    alive = alive.filter((p) => p.id !== victim.id);

    await channel.send({
      embeds: [baseEmbed(COLORS.error).setTitle(`💀 ${victim.username} is eliminated!`).setDescription(`${victim.username} pulled the trigger and... 💥\n\n**Remaining:** ${alive.map((p) => p.username).join(", ") || "None"}`)]
    });

    await new Promise((r) => setTimeout(r, 1500));
    round++;
  }

  if (alive.length === 1) {
    const winner = alive[0];
    await addCurrency(winner.id, "grass", lobby.totalPot, guildId, "roulette win");
    const wUser = await getOrCreateUser(winner.id, winner.username);
    wUser.stats.gamblingWins = (wUser.stats.gamblingWins || 0) + 1;
    await wUser.save();
    await updateQuestProgress(winner.id, "gamblingWins");

    await channel.send({
      embeds: [baseEmbed(COLORS.success).setTitle(`🏆 ${winner.username} Survives!`).setDescription(`**${winner.username}** is the last one standing!\n\nThey won the pot of ${formatCurrency(lobby.totalPot, "grass")}! 🎉`)]
    });
  }

  activeLobbies.delete(guildId);
}
