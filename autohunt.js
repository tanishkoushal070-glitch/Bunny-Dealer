const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getOrCreateUser, addCurrency, formatCurrency } = require("../../utils/economy");
const Inventory = require("../../models/Inventory");
const { COLORS, baseEmbed, errorEmbed } = require("../../utils/embed");

const BUNNY_TABLE = [
  { name: "Common Bunny", rarity: "Common", emoji: "🐰", weight: 40, grassReward: 20 },
  { name: "Brown Bunny", rarity: "Common", emoji: "🐇", weight: 25, grassReward: 40 },
  { name: "Snow Bunny", rarity: "Uncommon", emoji: "🤍🐰", weight: 18, grassReward: 80 },
  { name: "Golden Bunny", rarity: "Rare", emoji: "✨🐰", weight: 10, grassReward: 200 },
  { name: "Crystal Bunny", rarity: "Epic", emoji: "💎🐰", weight: 5, grassReward: 500 },
  { name: "Mythical Bunny", rarity: "Mythical", emoji: "🌟🐰", weight: 2, grassReward: 1500 },
];

function huntBunny() {
  const total = BUNNY_TABLE.reduce((s, b) => s + b.weight, 0);
  let rand = Math.random() * total;
  for (const b of BUNNY_TABLE) { rand -= b.weight; if (rand <= 0) return b; }
  return BUNNY_TABLE[0];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("autohunt")
    .setDescription("🐰 Start/stop auto-hunting with your bunny pets!"),

  async execute(interaction) {
    await interaction.deferReply();
    const user = await getOrCreateUser(interaction.user.id, interaction.user.username);
    const inv = await Inventory.findOne({ userId: interaction.user.id });

    const petCount = inv?.bunnies?.reduce((s, b) => s + b.quantity, 0) || 0;

    if (petCount === 0) {
      return interaction.editReply({ embeds: [errorEmbed("No Pets!", "You need to hunt and collect bunnies first! Use **/hunt** to get started. 🏹")] });
    }

    if (user.autohuntActive) {
      // Collect loot since last autohunt
      const lastTime = user.lastAutohunt ? new Date(user.lastAutohunt).getTime() : Date.now();
      const elapsed = Math.floor((Date.now() - lastTime) / 1000 / 60);
      const loopCount = Math.floor(elapsed / 30);

      let totalGrass = 0;
      const catches = [];

      for (let i = 0; i < Math.min(loopCount, 20); i++) {
        const bunny = huntBunny();
        totalGrass += bunny.grassReward;
        catches.push(bunny);

        if (inv) {
          const existing = inv.bunnies.find((b) => b.name === bunny.name);
          if (existing) { existing.quantity++; }
          else { inv.bunnies.push({ name: bunny.name, rarity: bunny.rarity, emoji: bunny.emoji, quantity: 1 }); }
          inv.markModified("bunnies");
        }
      }

      if (totalGrass > 0 && inv) await inv.save();
      if (totalGrass > 0) await addCurrency(interaction.user.id, "grass", totalGrass, interaction.guildId, "autohunt");

      user.autohuntActive = false;
      await user.save();

      const topCatches = catches.slice(-5).map((c) => `${c.emoji} ${c.name}`).join(", ");
      return interaction.editReply({
        embeds: [baseEmbed(COLORS.success)
          .setTitle("🐰 Auto-Hunt Stopped!")
          .setDescription(`Your bunnies came home!\n\n**Time Active:** ${elapsed} minutes\n**Hunts Completed:** ${loopCount}\n**Grass Earned:** ${formatCurrency(totalGrass, "grass")}\n**Recent Catches:** ${topCatches || "None"}`)]
      });
    }

    user.autohuntActive = true;
    user.lastAutohunt = new Date();
    await user.save();

    return interaction.editReply({
      embeds: [baseEmbed(COLORS.primary)
        .setTitle("🐰 Auto-Hunt Started!")
        .setDescription(`Your **${petCount}** bunny pet(s) are now hunting automatically!\n\nRun **/autohunt** again to collect your loot. Loot accumulates every 30 minutes.`)
        .addFields({ name: "🐰 Active Pets", value: `${petCount}`, inline: true }, { name: "⏰ Collect Anytime", value: "Run /autohunt to stop & collect", inline: true })]
    });
  },
};
