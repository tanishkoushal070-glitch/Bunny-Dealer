const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getOrCreateUser, addCurrency } = require("../../utils/economy");
const { getRandomQuests } = require("../../utils/questHelper");
const { COLORS, baseEmbed, errorEmbed, successEmbed } = require("../../utils/embed");
const User = require("../../models/User");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("quest")
    .setDescription("📋 View and claim your active quests!"),

  async execute(interaction) {
    await interaction.deferReply();
    const user = await getOrCreateUser(interaction.user.id, interaction.user.username);

    const now = new Date();
    const lastRefresh = user.questsRefreshedAt ? new Date(user.questsRefreshedAt) : null;
    const msSinceRefresh = lastRefresh ? now - lastRefresh : Infinity;
    const needsRefresh = !user.activeQuests?.length || msSinceRefresh > 24 * 60 * 60 * 1000;

    if (needsRefresh) {
      // Auto-claim and award any completed quests before refreshing
      const completed = (user.activeQuests || []).filter((q) => q.progress >= q.target);
      let bonusGrass = 0, bonusCarrots = 0;
      for (const q of completed) {
        bonusGrass += q.reward?.grass || 0;
        bonusCarrots += q.reward?.carrots || 0;
        user.stats.questsCompleted = (user.stats.questsCompleted || 0) + 1;
      }
      if (bonusGrass) await addCurrency(interaction.user.id, "grass", bonusGrass, interaction.guildId, "quest rewards");
      if (bonusCarrots) await addCurrency(interaction.user.id, "carrots", bonusCarrots, interaction.guildId, "quest rewards");

      user.activeQuests = getRandomQuests(5);
      user.questsRefreshedAt = now;
      user.markModified("activeQuests");
      await user.save();
    }

    await sendQuestEmbed(interaction, user, now, needsRefresh);
  },
};

async function sendQuestEmbed(interaction, user, now, justRefreshed) {
  const quests = user.activeQuests || [];
  const completedCount = quests.filter((q) => q.progress >= q.target).length;
  const lastRefresh = user.questsRefreshedAt ? new Date(user.questsRefreshedAt) : now;
  const nextRefresh = new Date(lastRefresh.getTime() + 24 * 60 * 60 * 1000);
  const msLeft = Math.max(0, nextRefresh - now);
  const hoursLeft = Math.floor(msLeft / 3600000);
  const minutesLeft = Math.floor((msLeft % 3600000) / 60000);

  const lines = quests.map((q, i) => {
    const done = q.progress >= q.target;
    const bar = buildBar(q.progress, q.target);
    const reward = `🌿 ${q.reward?.grass || 0}${q.reward?.carrots ? ` + 🥕 ${q.reward.carrots}` : ""}`;
    return `**${i + 1}. ${done ? "✅" : "🔸"} ${q.name}**\n${q.description}\n${bar} \`${q.progress}/${q.target}\`\nReward: ${reward}\n`;
  }).join("\n");

  const embed = baseEmbed(COLORS.warning)
    .setTitle("📋 Daily Quests")
    .setDescription(lines || "No quests available.")
    .addFields(
      { name: "✅ Completed", value: `${completedCount}/${quests.length}`, inline: true },
      { name: "⏰ Resets In", value: `${hoursLeft}h ${minutesLeft}m`, inline: true },
    )
    .setFooter({ text: justRefreshed ? "🐰 Quests refreshed! Complete them before the timer runs out." : "🐰 Bunny Dealer — Complete quests for bonus rewards" });

  await interaction.editReply({ embeds: [embed] });
}

function buildBar(current, max) {
  const pct = Math.min(current / max, 1);
  const filled = Math.round(pct * 10);
  const empty = 10 - filled;
  return `[${"█".repeat(filled)}${"░".repeat(empty)}]`;
}
