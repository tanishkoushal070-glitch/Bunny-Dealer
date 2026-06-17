const { SlashCommandBuilder } = require("discord.js");
const { getOrCreateUser, transferCurrency, formatCurrency } = require("../../utils/economy");
const { successEmbed, errorEmbed } = require("../../utils/embed");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pay")
    .setDescription("💸 Transfer currency to another user")
    .addUserOption((o) => o.setName("user").setDescription("Who to pay").setRequired(true))
    .addStringOption((o) =>
      o.setName("currency").setDescription("Currency type").setRequired(true)
        .addChoices({ name: "🌿 Grass", value: "grass" }, { name: "🥕 Carrots", value: "carrots" })
    )
    .addIntegerOption((o) => o.setName("amount").setDescription("Amount to pay").setRequired(true).setMinValue(1)),

  async execute(interaction) {
    await interaction.deferReply();
    const target = interaction.options.getUser("user");
    const currency = interaction.options.getString("currency");
    const amount = interaction.options.getInteger("amount");

    if (target.id === interaction.user.id) {
      return interaction.editReply({ embeds: [errorEmbed("Can't Pay Yourself", "You cannot send currency to yourself! 🐰")] });
    }
    if (target.bot) {
      return interaction.editReply({ embeds: [errorEmbed("Can't Pay Bots", "Bots don't need money! 🤖")] });
    }

    await getOrCreateUser(target.id, target.username);
    const result = await transferCurrency(interaction.user.id, target.id, currency, amount, interaction.guildId);

    if (!result.success) {
      return interaction.editReply({ embeds: [errorEmbed("Insufficient Funds", `You don't have enough ${currency === "grass" ? "🌿 Grass" : "🥕 Carrots"}!`)] });
    }

    const embed = successEmbed("Payment Sent!", `${interaction.user} paid ${target} ${formatCurrency(amount, currency)}!`)
      .addFields(
        { name: "💸 Sent", value: formatCurrency(amount, currency), inline: true },
        { name: "📤 From", value: `${interaction.user}`, inline: true },
        { name: "📥 To", value: `${target}`, inline: true }
      );

    interaction.editReply({ embeds: [embed] });
  },
};
