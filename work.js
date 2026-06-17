const { SlashCommandBuilder } = require("discord.js");
const { getOrCreateUser, addCurrency, randomBetween, formatCurrency } = require("../../utils/economy");
const { checkCooldown, COOLDOWNS } = require("../../utils/cooldown");
const { economyEmbed, errorEmbed } = require("../../utils/embed");
const { updateQuestProgress } = require("../../utils/questHelper");

const JOB_DATA = {
  Unemployed:         { min: 10,  max: 100,  emoji: "😴", msg: "wandered around aimlessly" },
  Farmer:             { min: 50,  max: 300,  emoji: "🌾", msg: "harvested crops in the field" },
  Builder:            { min: 110, max: 550,  emoji: "🔨", msg: "constructed sturdy buildings" },
  Guard:              { min: 120, max: 600,  emoji: "🛡️", msg: "protected the village" },
  Lumberjack:         { min: 100, max: 520,  emoji: "🪓", msg: "chopped down trees in the forest" },
  Beekeeper:          { min: 90,  max: 480,  emoji: "🐝", msg: "tended to the beehives and harvested honey" },
  Herbalist:          { min: 80,  max: 440,  emoji: "🌿", msg: "gathered rare herbs from the meadow" },
  Fisher:             { min: 80,  max: 400,  emoji: "🎣", msg: "caught fish by the river" },
  Hunter:             { min: 100, max: 500,  emoji: "🏹", msg: "tracked prey through the forest" },
  Chef:               { min: 140, max: 680,  emoji: "👨‍🍳", msg: "cooked up delicious meals" },
  Witch:              { min: 130, max: 640,  emoji: "🧙", msg: "brewed potions and cast helpful spells" },
  Blacksmith:         { min: 150, max: 720,  emoji: "⚒️", msg: "forged weapons and armor at the anvil" },
  Pirate:             { min: 140, max: 700,  emoji: "🏴‍☠️", msg: "plundered the high seas" },
  Explorer:           { min: 120, max: 600,  emoji: "🗺️", msg: "discovered new lands" },
  Merchant:           { min: 150, max: 700,  emoji: "💰", msg: "made profitable trades" },
  Miner:              { min: 130, max: 650,  emoji: "⛏️", msg: "dug deep for precious gems" },
  Researcher:         { min: 160, max: 750,  emoji: "🔬", msg: "made important scientific discoveries" },
  Alchemist:          { min: 170, max: 800,  emoji: "⚗️", msg: "transmuted rare materials into gold" },
  "Redstone Engineer":{ min: 180, max: 850,  emoji: "🔴", msg: "built complex redstone contraptions" },
  "Diamond Miner":    { min: 200, max: 950,  emoji: "💎", msg: "mined deep veins of diamond ore" },
  Knight:             { min: 220, max: 1000, emoji: "⚔️", msg: "defended the kingdom with honor" },
  Wizard:             { min: 240, max: 1100, emoji: "🪄", msg: "cast powerful arcane spells" },
  Enchanter:          { min: 260, max: 1200, emoji: "✨", msg: "enchanted weapons with magical properties" },
  "Treasure Hunter":  { min: 280, max: 1300, emoji: "🗝️", msg: "uncovered ancient buried treasure" },
  "Dragon Tamer":     { min: 400, max: 2000, emoji: "🐉", msg: "tamed a wild dragon and earned its hoard" },
  "Carrot King":      { min: 500, max: 2500, emoji: "🥕", msg: "ruled the carrot fields with an iron fist" },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("work")
    .setDescription("💼 Work your job to earn grass!"),

  async execute(interaction) {
    await interaction.deferReply();
    const user = await getOrCreateUser(interaction.user.id, interaction.user.username);
    const cd = checkCooldown(user.lastWork, COOLDOWNS.WORK);

    if (cd.onCooldown) {
      return interaction.editReply({
        embeds: [errorEmbed("Still Working!", `You're still tired from your last shift.\nRest for **${cd.readableTime}** more. 😴`)],
      });
    }

    const job = JOB_DATA[user.job] || JOB_DATA["Unemployed"];
    const reward = randomBetween(job.min, job.max);

    user.lastWork = new Date();
    user.stats.workCount = (user.stats.workCount || 0) + 1;
    user.stats.totalEarned = (user.stats.totalEarned || 0) + reward;
    await user.save();
    await addCurrency(interaction.user.id, "grass", reward, interaction.guildId, `work as ${user.job}`);
    await updateQuestProgress(interaction.user.id, "work");
    await updateQuestProgress(interaction.user.id, "earned", reward);

    const embed = economyEmbed(`${job.emoji} Work Complete!`, `**${interaction.user.username}** ${job.msg}!`)
      .addFields(
        { name: "💰 Earnings", value: formatCurrency(reward, "grass"), inline: true },
        { name: "💼 Job", value: `${job.emoji} ${user.job || "Unemployed"}`, inline: true },
        { name: "⏰ Next Work", value: "In 30 minutes", inline: true }
      );

    await interaction.editReply({ embeds: [embed] });
  },
};
