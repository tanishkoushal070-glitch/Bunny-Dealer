const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const User = require("../../models/User");
const { baseEmbed, COLORS } = require("../../utils/embed");

const CATEGORIES = [
  { label: "🌿 Richest Grass", value: "grass", field: "grass", title: "Richest by Grass" },
  { label: "🥕 Richest Carrots", value: "carrots", field: "carrots", title: "Richest by Carrots" },
  { label: "💎 Highest Net Worth", value: "networth", field: null, title: "Highest Net Worth" },
  { label: "🎰 Most Gambling Wins", value: "gamblingWins", field: "stats.gamblingWins", title: "Most Gambling Wins" },
  { label: "🏹 Most Hunts", value: "hunts", field: "stats.huntsCompleted", title: "Most Hunts" },
  { label: "🎣 Most Fish Caught", value: "fish", field: "stats.fishCaught", title: "Most Fish Caught" },
  { label: "📋 Most Quests Completed", value: "quests", field: "stats.questsCompleted", title: "Most Quests Completed" },
  { label: "💼 Most Work Earnings", value: "work", field: "stats.totalEarned", title: "Most Work Earnings" },
];

async function buildLeaderboard(category) {
  let users;
  if (category.value === "networth") {
    users = await User.find().sort({ grass: -1 }).limit(10);
    users = users.map((u) => ({ ...u.toObject(), networth: u.grass + u.carrots * 10 })).sort((a, b) => b.networth - a.networth);
  } else {
    users = await User.find().sort({ [category.field]: -1 }).limit(10);
  }

  const medals = ["🥇", "🥈", "🥉"];
  const lines = users.map((u, i) => {
    const medal = medals[i] || `**${i + 1}.**`;
    let value;
    if (category.value === "networth") value = `💎 ${u.networth?.toLocaleString() || 0}`;
    else if (category.value === "grass") value = `🌿 ${u.grass?.toLocaleString() || 0}`;
    else if (category.value === "carrots") value = `🥕 ${u.carrots?.toLocaleString() || 0}`;
    else {
      const keys = category.field.split(".");
      let val = u;
      for (const k of keys) val = val?.[k];
      value = val?.toLocaleString() || "0";
    }
    return `${medal} **${u.username || "Unknown"}** — ${value}`;
  });

  return baseEmbed(COLORS.warning)
    .setTitle(`🏆 Leaderboard — ${category.title}`)
    .setDescription(lines.length > 0 ? lines.join("\n") : "No data yet!");
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("🏆 View the server leaderboards"),

  async execute(interaction) {
    await interaction.deferReply();
    const defaultCat = CATEGORIES[0];
    const embed = await buildLeaderboard(defaultCat);

    const menu = new StringSelectMenuBuilder()
      .setCustomId("lb_select")
      .setPlaceholder("📊 Select a leaderboard...")
      .addOptions(CATEGORIES.map((c) => ({ label: c.label, value: c.value })));

    const row = new ActionRowBuilder().addComponents(menu);
    const reply = await interaction.editReply({ embeds: [embed], components: [row] });

    const collector = reply.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 60000,
    });

    collector.on("collect", async (i) => {
      const cat = CATEGORIES.find((c) => c.value === i.values[0]);
      const newEmbed = await buildLeaderboard(cat);
      await i.update({ embeds: [newEmbed], components: [row] });
    });

    collector.on("end", () => interaction.editReply({ components: [] }).catch(() => {}));
  },
};
