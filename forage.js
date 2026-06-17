const { SlashCommandBuilder } = require("discord.js");
const { getOrCreateUser, addCurrency, formatCurrency } = require("../../utils/economy");
const { checkCooldown, COOLDOWNS } = require("../../utils/cooldown");
const { economyEmbed, errorEmbed, COLORS, baseEmbed } = require("../../utils/embed");
const { updateQuestProgress } = require("../../utils/questHelper");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("forage")
    .setDescription("🌿 Forage the meadow for resources!"),

  async execute(interaction) {
    await interaction.deferReply();
    const user = await getOrCreateUser(interaction.user.id, interaction.user.username);
    const cd = checkCooldown(user.lastForage, COOLDOWNS.FORAGE);

    if (cd.onCooldown) {
      return interaction.editReply({ embeds: [errorEmbed("Still Foraging!", `Wait **${cd.readableTime}** before foraging again!`)] });
    }

    const roll = Math.random();
    let reward, currency, title, desc;

    if (roll < 0.01) {
      reward = 1;
      currency = "carrots";
      title = "🥕 Rare Find!";
      desc = "You found a rare 🥕 **Carrot** hidden under a bush!";
    } else {
      reward = Math.floor(Math.random() * 50) + 5;
      currency = "grass";
      title = "🌿 Foraging Complete!";
      desc = `You gathered a handful of fresh 🌿 grass from the meadow!`;
    }

    user.lastForage = new Date();
    await user.save();
    await addCurrency(interaction.user.id, currency, reward, interaction.guildId, "forage");
    await updateQuestProgress(interaction.user.id, "forage");

    const color = currency === "carrots" ? COLORS.rare : COLORS.economy;
    const embed = baseEmbed(color)
      .setTitle(title)
      .setDescription(desc)
      .addFields(
        { name: "💰 Found", value: formatCurrency(reward, currency), inline: true },
        { name: "⏰ Next Forage", value: "In 5 minutes", inline: true }
      );

    interaction.editReply({ embeds: [embed] });
  },
};
