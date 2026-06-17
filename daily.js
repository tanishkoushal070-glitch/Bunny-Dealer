const { SlashCommandBuilder } = require("discord.js");
const { getOrCreateUser, addCurrency, randomBetween, formatCurrency } = require("../../utils/economy");
const { checkCooldown, COOLDOWNS } = require("../../utils/cooldown");
const { economyEmbed, errorEmbed } = require("../../utils/embed");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("🌿 Claim your daily grass reward!"),

  async execute(interaction) {
    await interaction.deferReply();
    const user = await getOrCreateUser(interaction.user.id, interaction.user.username);
    const cd = checkCooldown(user.lastDaily, COOLDOWNS.DAILY);

    if (cd.onCooldown) {
      return interaction.editReply({
        embeds: [errorEmbed("On Cooldown!", `You already claimed your daily reward.\nCome back in **${cd.readableTime}**. 🐰`)],
      });
    }

    const reward = randomBetween(10, 1000);
    user.lastDaily = new Date();
    await user.save();
    await addCurrency(interaction.user.id, "grass", reward, interaction.guildId, "daily reward");

    const embed = economyEmbed("Daily Reward!", `${interaction.user} claimed their daily reward!`)
      .addFields(
        { name: "💰 Reward", value: formatCurrency(reward, "grass"), inline: true },
        { name: "💼 New Balance", value: formatCurrency(user.grass + reward, "grass"), inline: true },
        { name: "⏰ Next Daily", value: "In 24 hours", inline: true }
      )
      .setThumbnail(interaction.user.displayAvatarURL());

    interaction.editReply({ embeds: [embed] });
  },
};
