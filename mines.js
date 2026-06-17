const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getOrCreateUser, addCurrency, removeCurrency, formatCurrency } = require("../../utils/economy");
const { gamblingEmbed, errorEmbed, COLORS, baseEmbed } = require("../../utils/embed");
const { updateQuestProgress } = require("../../utils/questHelper");

const GRID_SIZE = 9;

function createGrid(bombCount) {
  const grid = Array(GRID_SIZE).fill("safe");
  const positions = [...Array(GRID_SIZE).keys()].sort(() => Math.random() - 0.5).slice(0, bombCount);
  positions.forEach((p) => (grid[p] = "bomb"));
  return grid;
}

function calcMultiplier(revealed, bombs) {
  const safe = GRID_SIZE - bombs;
  let mult = 1;
  for (let i = 0; i < revealed; i++) {
    mult *= (safe - i) / (GRID_SIZE - i);
  }
  return (1 / mult).toFixed(2);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mines")
    .setDescription("💣 Play Mines — reveal tiles and cash out before hitting a bomb!")
    .addIntegerOption((o) => o.setName("bet").setDescription("Amount of grass to bet").setRequired(true).setMinValue(1))
    .addIntegerOption((o) => o.setName("bombs").setDescription("Number of bombs (1-8)").setRequired(true).setMinValue(1).setMaxValue(8)),

  async execute(interaction) {
    await interaction.deferReply();
    const bet = interaction.options.getInteger("bet");
    const bombs = interaction.options.getInteger("bombs");
    const player = await getOrCreateUser(interaction.user.id, interaction.user.username);

    if (player.grass < bet) {
      return interaction.editReply({ embeds: [errorEmbed("Insufficient Funds", `You only have 🌿 **${player.grass.toLocaleString()}** Grass!`)] });
    }

    await removeCurrency(interaction.user.id, "grass", bet, interaction.guildId, "mines bet");

    const grid = createGrid(bombs);
    const revealed = new Array(GRID_SIZE).fill(false);
    let revealedCount = 0;
    let gameOver = false;

    function buildRows(disabled = false) {
      const rows = [];
      for (let r = 0; r < 3; r++) {
        const row = new ActionRowBuilder();
        for (let c = 0; c < 3; c++) {
          const idx = r * 3 + c;
          const btn = new ButtonBuilder()
            .setCustomId(`mine_${idx}`)
            .setStyle(revealed[idx] ? (grid[idx] === "bomb" ? ButtonStyle.Danger : ButtonStyle.Success) : ButtonStyle.Secondary)
            .setLabel(revealed[idx] ? (grid[idx] === "bomb" ? "💣" : "💎") : "?")
            .setDisabled(disabled || revealed[idx]);
          row.addComponents(btn);
        }
        rows.push(row);
      }
      const cashRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("mines_cashout").setLabel(`💰 Cash Out (${calcMultiplier(revealedCount, bombs)}x)`).setStyle(ButtonStyle.Primary).setDisabled(disabled || revealedCount === 0)
      );
      rows.push(cashRow);
      return rows;
    }

    function buildEmbed(status = "playing") {
      const mult = calcMultiplier(revealedCount, bombs);
      const potWin = Math.floor(bet * parseFloat(mult));
      return baseEmbed(status === "win" ? COLORS.success : status === "loss" ? COLORS.error : COLORS.gambling)
        .setTitle("💣 Mines")
        .setDescription(`Reveal safe tiles to increase your multiplier!\n\n**Bombs:** ${bombs} | **Revealed:** ${revealedCount}/${GRID_SIZE - bombs}\n**Current Multiplier:** ${mult}x\n**Potential Win:** ${formatCurrency(potWin, "grass")}`);
    }

    const msg = await interaction.editReply({ embeds: [buildEmbed()], components: buildRows() });

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 120000,
    });

    collector.on("collect", async (btn) => {
      if (btn.customId === "mines_cashout") {
        const mult = parseFloat(calcMultiplier(revealedCount, bombs));
        const winAmt = Math.floor(bet * mult);
        await addCurrency(interaction.user.id, "grass", winAmt, interaction.guildId, "mines cashout");
        player.stats.gamblingWins = (player.stats.gamblingWins || 0) + 1;
        await player.save();
        await updateQuestProgress(interaction.user.id, "gamblingWins");
        await btn.update({ embeds: [baseEmbed(COLORS.success).setTitle("💣 Mines — Cashed Out!").setDescription(`You cashed out for ${formatCurrency(winAmt, "grass")}! (${mult}x)`)], components: buildRows(true) });
        return collector.stop();
      }

      const idx = parseInt(btn.customId.split("_")[1]);
      revealed[idx] = true;
      revealedCount++;

      if (grid[idx] === "bomb") {
        grid.forEach((_, i) => (revealed[i] = true));
        player.stats.gamblingLosses = (player.stats.gamblingLosses || 0) + 1;
        await player.save();
        await btn.update({ embeds: [baseEmbed(COLORS.error).setTitle("💥 BOOM! You hit a bomb!").setDescription(`You lost ${formatCurrency(bet, "grass")}! Better luck next time...`)], components: buildRows(true) });
        return collector.stop();
      }

      if (revealedCount === GRID_SIZE - bombs) {
        const mult = parseFloat(calcMultiplier(revealedCount, bombs));
        const winAmt = Math.floor(bet * mult);
        await addCurrency(interaction.user.id, "grass", winAmt, interaction.guildId, "mines perfect");
        player.stats.gamblingWins = (player.stats.gamblingWins || 0) + 1;
        await player.save();
        await updateQuestProgress(interaction.user.id, "gamblingWins");
        await btn.update({ embeds: [baseEmbed(COLORS.success).setTitle("💎 Perfect Game!").setDescription(`You revealed all safe tiles and won ${formatCurrency(winAmt, "grass")}!`)], components: buildRows(true) });
        return collector.stop();
      }

      await btn.update({ embeds: [buildEmbed()], components: buildRows() });
    });

    collector.on("end", (_, reason) => {
      if (reason === "time") interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};
