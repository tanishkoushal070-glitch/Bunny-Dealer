const { SlashCommandBuilder } = require("discord.js");
const { getOrCreateUser } = require("../../utils/economy");
const Inventory = require("../../models/Inventory");
const { baseEmbed, COLORS } = require("../../utils/embed");

const TITLES = {
  bunny_fan:     "🐰 Bunny Fan",
  grass_lover:   "🌿 Grass Lover",
  carrot_fan:    "🥕 Carrot Fan",
  fisher_pro:    "🎣 Fisher Pro",
  hunter_mark:   "🏹 Hunter Mark",
  gambler:       "🎰 Gambler",
  hard_worker:   "💼 Hard Worker",
  diamond_miner: "💎 Diamond Miner",
  grass_baron:   "🌾 Grass Baron",
  night_raider:  "🌙 Night Raider",
  enchanted:     "✨ Enchanted",
  bunny_king:    "👑 Bunny King",
  carrot_king:   "🥕 Carrot King",
  high_roller:   "🎲 High Roller",
  dragon_tamer:  "🐉 Dragon Tamer",
  the_legend:    "⚡ The Legend",
  bunny_god:     "🌟 Bunny God",
  carrot_deity:  "🌈 Carrot Deity",
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("🐰 View your or another user's profile")
    .addUserOption((o) => o.setName("user").setDescription("User to view (leave blank for yourself)")),

  async execute(interaction) {
    await interaction.deferReply();
    const target = interaction.options.getUser("user") || interaction.user;
    const user = await getOrCreateUser(target.id, target.username);
    const inventory = await Inventory.findOne({ userId: target.id });

    const activeQuests = user.activeQuests?.filter((q) => q.progress < q.target) || [];
    const inventoryCount = inventory ? inventory.items.reduce((acc, i) => acc + i.quantity, 0) : 0;
    const bunnyCount = inventory ? inventory.bunnies.reduce((acc, b) => acc + b.quantity, 0) : 0;
    const fishCount = inventory ? inventory.fish.reduce((acc, f) => acc + f.quantity, 0) : 0;

    const equippedTitle = user.equippedTitle ? (TITLES[user.equippedTitle] || null) : null;
    const titleLine = equippedTitle ? `\n🎨 **${equippedTitle}**` : "";

    const embed = baseEmbed(COLORS.primary)
      .setTitle(`🐰 ${target.username}'s Profile${titleLine}`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "💰 Wallet", value: `🌿 **${user.grass.toLocaleString()}** Grass\n🥕 **${user.carrots.toLocaleString()}** Carrots`, inline: true },
        { name: "💼 Job", value: user.job || "Unemployed", inline: true },
        { name: "🎒 Inventory", value: `📦 ${inventoryCount} items\n🐟 ${fishCount} fish\n🐰 ${bunnyCount} bunnies`, inline: true },
        {
          name: "📊 Stats",
          value: `🎰 Wins: **${user.stats?.gamblingWins || 0}**\n🏹 Hunts: **${user.stats?.huntsCompleted || 0}**\n🎣 Fish: **${user.stats?.fishCaught || 0}**\n💼 Works: **${user.stats?.workCount || 0}**\n⛏️ Mines: **${user.stats?.minesCompleted || 0}**`,
          inline: true,
        },
        {
          name: "📋 Active Quests",
          value: activeQuests.length > 0 ? activeQuests.map((q) => `• ${q.name}: ${q.progress}/${q.target}`).join("\n") : "No active quests",
          inline: true,
        },
        {
          name: "💹 Lifetime",
          value: `Earned: 🌿 ${(user.stats?.totalEarned || 0).toLocaleString()}\nSpent: 🌿 ${(user.stats?.totalSpent || 0).toLocaleString()}\n📋 Quests: **${user.stats?.questsCompleted || 0}**`,
          inline: true,
        }
      );

    await interaction.editReply({ embeds: [embed] });
  },
};
