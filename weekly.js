const { SlashCommandBuilder } = require("discord.js");
const { getOrCreateUser, addCurrency, randomBetween, formatCurrency } = require("../../utils/economy");
const { checkCooldown, COOLDOWNS } = require("../../utils/cooldown");
const { economyEmbed, errorEmbed } = require("../../utils/embed");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("weekly")
    .setDescription("🌿 Claim your weekly grass reward!"),

  async execute(interaction) {
    await interaction.deferReply();
    const user = await getOrCreateUser(interaction.user.id, interaction.user.username);
    const cd = checkCooldown(user.lastWeekly, COOLDOWNS.WEEKLY);

    if (cd.onCooldown) {
      return interaction.editReply({
        embeds: [errorEmbed("On Cooldown!", `You already claimed your weekly reward.\nCome back in **${cd.readableTime}**. 🐰`)],
      });
    }

    const reward = randomBetween(1000, 10000);
    user.lastWeekly = new Date();
    await user.save();
    await addCurrency(interaction.user.id, "grass", reward, interaction.guildId, "weekly reward");

    const embed = economyEmbed("Weekly Reward!", `${interaction.user} claimed their weekly reward!`)
      .addFields(
        { name: "💰 Reward", value: formatCurrency(reward, "grass"), inline: true },
        { name: "💼 New Balance", value: formatCurrency(user.grass + reward, "grass"), inline: true },
        { name: "⏰ Next Weekly", value: "In 7 days", inline: true }
      )
      .setThumbnail(interaction.user.displayAvatarURL());

    interaction.editReply({ embeds: [embed] });
  },
};
