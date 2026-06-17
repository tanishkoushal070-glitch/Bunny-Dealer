const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Settings = require("../../models/Settings");
const { COLORS, baseEmbed, successEmbed } = require("../../utils/embed");

async function getOrCreateSettings(guildId) {
  let s = await Settings.findOne({ guildId });
  if (!s) s = await Settings.create({ guildId });
  return s;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("settings")
    .setDescription("⚙️ Server settings (Admin only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) => sub.setName("view").setDescription("View current server settings"))
    .addSubcommand((sub) =>
      sub.setName("economy-log").setDescription("Set the economy log channel")
        .addChannelOption((o) => o.setName("channel").setDescription("Log channel").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName("role").setDescription("Add or remove an admin role")
        .addStringOption((o) => o.setName("action").setDescription("Add or remove").setRequired(true).addChoices({ name: "Add", value: "add" }, { name: "Remove", value: "remove" }))
        .addRoleOption((o) => o.setName("role").setDescription("Role to configure").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName("job").setDescription("Add a custom job")
        .addStringOption((o) => o.setName("name").setDescription("Job name").setRequired(true))
        .addStringOption((o) => o.setName("emoji").setDescription("Job emoji").setRequired(true))
        .addIntegerOption((o) => o.setName("min_pay").setDescription("Minimum pay").setRequired(true))
        .addIntegerOption((o) => o.setName("max_pay").setDescription("Maximum pay").setRequired(true))
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const sub = interaction.options.getSubcommand();
    const settings = await getOrCreateSettings(interaction.guildId);

    if (sub === "view") {
      const embed = baseEmbed(COLORS.info)
        .setTitle("⚙️ Server Settings")
        .addFields(
          { name: "📢 Economy Log Channel", value: settings.economyLogChannel ? `<#${settings.economyLogChannel}>` : "Not set", inline: true },
          { name: "🛡️ Admin Roles", value: settings.adminRoles.length ? settings.adminRoles.map((r) => `<@&${r}>`).join(", ") : "None", inline: true },
          { name: "💼 Custom Jobs", value: settings.customJobs.length ? settings.customJobs.map((j) => `${j.emoji} ${j.name}`).join(", ") : "None", inline: true },
          { name: "🤖 Bot Active", value: settings.botActive ? "✅ Yes" : "❌ No", inline: true }
        );
      return interaction.editReply({ embeds: [embed] });
    }

    if (sub === "economy-log") {
      const channel = interaction.options.getChannel("channel");
      settings.economyLogChannel = channel.id;
      await settings.save();
      return interaction.editReply({ embeds: [successEmbed("Log Channel Set", `Economy logs will be sent to ${channel}.`)] });
    }

    if (sub === "role") {
      const action = interaction.options.getString("action");
      const role = interaction.options.getRole("role");
      if (action === "add") {
        if (!settings.adminRoles.includes(role.id)) settings.adminRoles.push(role.id);
      } else {
        settings.adminRoles = settings.adminRoles.filter((r) => r !== role.id);
      }
      await settings.save();
      return interaction.editReply({ embeds: [successEmbed("Role Updated", `${action === "add" ? "Added" : "Removed"} admin role ${role}.`)] });
    }

    if (sub === "job") {
      const name = interaction.options.getString("name");
      const emoji = interaction.options.getString("emoji");
      const minPay = interaction.options.getInteger("min_pay");
      const maxPay = interaction.options.getInteger("max_pay");
      settings.customJobs.push({ name, emoji, minPay, maxPay, rarity: "Custom" });
      await settings.save();
      return interaction.editReply({ embeds: [successEmbed("Job Added", `Added custom job **${emoji} ${name}**.`)] });
    }
  },
};
