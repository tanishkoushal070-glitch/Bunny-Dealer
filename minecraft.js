const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const { getOrCreateUser, addCurrency, removeCurrency, formatCurrency, randomBetween } = require("../../utils/economy");
const { checkCooldown } = require("../../utils/cooldown");
const { baseEmbed, errorEmbed, COLORS } = require("../../utils/embed");
const { updateQuestProgress } = require("../../utils/questHelper");

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

const BLOCKS = [
  { name: "Dirt",        emoji: "🟫", value: 0,    weight: 30, rarity: "Common"   },
  { name: "Stone",       emoji: "🪨", value: 5,    weight: 25, rarity: "Common"   },
  { name: "Coal",        emoji: "🖤", value: 20,   weight: 20, rarity: "Common"   },
  { name: "Iron",        emoji: "🔩", value: 50,   weight: 12, rarity: "Uncommon" },
  { name: "Gold",        emoji: "⭐", value: 120,  weight: 7,  rarity: "Rare"     },
  { name: "Redstone",    emoji: "🔴", value: 150,  weight: 4,  rarity: "Rare"     },
  { name: "Lapis",       emoji: "🔵", value: 200,  weight: 3,  rarity: "Rare"     },
  { name: "Emerald",     emoji: "💚", value: 400,  weight: 2,  rarity: "Epic"     },
  { name: "Diamond",     emoji: "💎", value: 800,  weight: 1,  rarity: "Epic"     },
  { name: "Netherite",   emoji: "🟥", value: 2000, weight: 0.5,rarity: "Legendary"},
];

const ENTRY_COST = 50;
const GRID_SIZE = 9; // 3x3 grid
const MAX_DIGS = 4;

function weightedBlock() {
  const total = BLOCKS.reduce((s, b) => s + b.weight, 0);
  let rand = Math.random() * total;
  for (const b of BLOCKS) { rand -= b.weight; if (rand <= 0) return b; }
  return BLOCKS[0];
}

function generateMine() {
  return Array.from({ length: GRID_SIZE }, () => weightedBlock());
}

function renderGrid(blocks, revealed, digsLeft) {
  let grid = "";
  for (let i = 0; i < GRID_SIZE; i++) {
    grid += revealed[i] ? blocks[i].emoji : "⬛";
    if ((i + 1) % 3 === 0) grid += "\n";
  }
  return grid;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("minecraft")
    .setDescription("⛏️ Mine blocks and find valuable ores! Costs 50 🌿"),

  async execute(interaction) {
    await interaction.deferReply();
    const user = await getOrCreateUser(interaction.user.id, interaction.user.username);

    const now = Date.now();
    const lastMine = user.lastMine ? new Date(user.lastMine).getTime() : 0;
    if (now - lastMine < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (now - lastMine)) / 1000);
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      return interaction.editReply({
        embeds: [errorEmbed("Still Mining!", `Your pickaxe needs a rest!\nTry again in **${mins}m ${secs}s**. ⛏️`)],
      });
    }

    if (user.grass < ENTRY_COST) {
      return interaction.editReply({
        embeds: [errorEmbed("Not Enough Grass!", `You need 🌿 **${ENTRY_COST}** to enter the mine.`)],
      });
    }

    await removeCurrency(interaction.user.id, "grass", ENTRY_COST, interaction.guildId, "minecraft entry");
    user.lastMine = new Date();
    await user.save();

    const blocks = generateMine();
    const revealed = Array(GRID_SIZE).fill(false);
    let digsLeft = MAX_DIGS;
    let totalEarned = 0;

    const buildEmbed = (finished = false) => {
      const grid = renderGrid(blocks, revealed, digsLeft);
      const revealedBlocks = blocks.filter((_, i) => revealed[i]);
      const finds = revealedBlocks.length
        ? revealedBlocks.map((b) => `${b.emoji} ${b.name}: +🌿 ${b.value}`).join("\n")
        : "Nothing yet...";

      return baseEmbed(COLORS.info)
        .setTitle("⛏️ Minecraft Mine")
        .setDescription(`${grid}\n**Digs Left:** ${digsLeft} ${!finished ? "⛏️" : ""}`)
        .addFields(
          { name: "💰 Haul So Far", value: finds, inline: true },
          { name: "🌿 Total", value: formatCurrency(totalEarned, "grass"), inline: true },
        )
        .setFooter({ text: finished ? "🐰 Mining complete! Come back in 5 minutes." : "🐰 Click a spot to dig!" });
    };

    const buildButtons = () => {
      const rows = [];
      for (let row = 0; row < 3; row++) {
        const rowButtons = new ActionRowBuilder();
        for (let col = 0; col < 3; col++) {
          const idx = row * 3 + col;
          rowButtons.addComponents(
            new ButtonBuilder()
              .setCustomId(`mine_${idx}`)
              .setLabel(revealed[idx] ? blocks[idx].name : "⬛")
              .setStyle(revealed[idx] ? ButtonStyle.Secondary : ButtonStyle.Primary)
              .setDisabled(revealed[idx])
          );
        }
        rows.push(rowButtons);
      }
      return rows;
    };

    const reply = await interaction.editReply({
      embeds: [buildEmbed()],
      components: buildButtons(),
    });

    const collector = reply.createMessageComponentCollector({
      filter: (i) => {
        if (i.user.id !== interaction.user.id) {
          i.reply({ content: "❌ This mine isn't yours!", ephemeral: true }).catch(() => {});
          return false;
        }
        return i.customId.startsWith("mine_");
      },
      time: 90000,
    });

    collector.on("collect", async (i) => {
      try {
        const idx = parseInt(i.customId.split("_")[1]);
        if (revealed[idx] || digsLeft <= 0) {
          await i.deferUpdate();
          return;
        }

        revealed[idx] = true;
        const block = blocks[idx];
        totalEarned += block.value;
        digsLeft--;

        if (block.value > 0) {
          await addCurrency(interaction.user.id, "grass", block.value, interaction.guildId, `mine: ${block.name}`);
        }

        const finished = digsLeft <= 0;
        await i.update({
          embeds: [buildEmbed(finished)],
          components: finished ? [] : buildButtons(),
        });

        if (finished) {
          user.stats.minesCompleted = (user.stats.minesCompleted || 0) + 1;
          await user.save();
          await updateQuestProgress(interaction.user.id, "mine");
          if (totalEarned > 0) await updateQuestProgress(interaction.user.id, "earned", totalEarned);
          collector.stop("done");
        }
      } catch (err) {
        console.error("minecraft collector error:", err);
      }
    });

    collector.on("end", async (_, reason) => {
      if (reason !== "done") {
        // Time ran out — reveal remaining and pay out
        blocks.forEach((_, i) => { revealed[i] = true; });
        user.stats.minesCompleted = (user.stats.minesCompleted || 0) + 1;
        await user.save();
        await updateQuestProgress(interaction.user.id, "mine");
        interaction.editReply({ embeds: [buildEmbed(true)], components: [] }).catch(() => {});
      }
    });
  },
};
