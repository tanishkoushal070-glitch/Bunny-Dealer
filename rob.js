const { SlashCommandBuilder } = require("discord.js");
const { getOrCreateUser, addCurrency, removeCurrency, formatCurrency, randomBetween } = require("../../utils/economy");
const { COLORS, baseEmbed, errorEmbed } = require("../../utils/embed");
const { checkCooldown, COOLDOWNS } = require("../../utils/cooldown");
const Log = require("../../models/Log");

const ROB_SUCCESS_CHANCE = 0.45;
const PROTECTION_DURATION = 30 * 60 * 1000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rob")
    .setDescription("🦹 Attempt to rob another user!")
    .addUserOption((o) => o.setName("target").setDescription("Who to rob").setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply();
    const target = interaction.options.getUser("target");

    if (target.id === interaction.user.id) return interaction.editReply({ embeds: [errorEmbed("Can't Rob Yourself", "You can't rob yourself! 🐰")] });
    if (target.bot) return interaction.editReply({ embeds: [errorEmbed("Can't Rob Bots", "Bots have no money!")] });

    const robber = await getOrCreateUser(interaction.user.id, interaction.user.username);
    const victim = await getOrCreateUser(target.id, target.username);

    const cdCheck = checkCooldown(robber.lastRob, COOLDOWNS.ROB);
    if (cdCheck.onCooldown) {
      return interaction.editReply({ embeds: [errorEmbed("On Cooldown!", `You need to wait **${cdCheck.readableTime}** before robbing again!`)] });
    }

    if (victim.robProtection && new Date(victim.robProtection) > new Date()) {
      return interaction.editReply({ embeds: [errorEmbed("Protected!", `${target.username} has rob protection active!`)] });
    }

    if (victim.grass < 50) {
      return interaction.editReply({ embeds: [errorEmbed("Too Poor", `${target.username} doesn't have enough Grass to rob!`)] });
    }

    robber.lastRob = new Date();
    robber.stats.robsAttempted = (robber.stats.robsAttempted || 0) + 1;
    await robber.save();

    const success = Math.random() < ROB_SUCCESS_CHANCE;

    if (success) {
      const maxSteal = Math.floor(victim.grass * 0.3);
      const stolen = randomBetween(Math.floor(victim.grass * 0.05), maxSteal);
      await removeCurrency(target.id, "grass", stolen, interaction.guildId, `robbed by ${interaction.user.username}`);
      await addCurrency(interaction.user.id, "grass", stolen, interaction.guildId, `rob success`);
      robber.stats.robsSucceeded = (robber.stats.robsSucceeded || 0) + 1;
      await robber.save();

      victim.robProtection = new Date(Date.now() + PROTECTION_DURATION);
      await victim.save();

      await Log.create({ guildId: interaction.guildId, type: "rob", userId: interaction.user.id, targetId: target.id, action: "rob_success", amount: stolen, currency: "grass" });

      return interaction.editReply({
        embeds: [baseEmbed(COLORS.success).setTitle("🦹 Successful Heist!").setDescription(`You sneaked up on **${target.username}** and stole ${formatCurrency(stolen, "grass")}!\n\n${target.username} now has rob protection for 30 minutes.`)]
      });
    } else {
      const penalty = randomBetween(50, 200);
      const actualPenalty = Math.min(penalty, robber.grass);
      if (actualPenalty > 0) {
        await removeCurrency(interaction.user.id, "grass", actualPenalty, interaction.guildId, "rob failed penalty");
        await addCurrency(target.id, "grass", actualPenalty, interaction.guildId, "rob failed reward");
      }

      await Log.create({ guildId: interaction.guildId, type: "rob", userId: interaction.user.id, targetId: target.id, action: "rob_fail", amount: actualPenalty, currency: "grass" });

      return interaction.editReply({
        embeds: [baseEmbed(COLORS.error).setTitle("🚨 Caught Red-Handed!").setDescription(`You tried to rob **${target.username}** but got caught!\n\nYou paid a fine of ${formatCurrency(actualPenalty, "grass")} to the victim! 😅`)]
      });
    }
  },
};
