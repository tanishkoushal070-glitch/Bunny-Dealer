const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const Giveaway = require("../../models/Giveaway");
const { getOrCreateUser } = require("../../utils/economy");
const { COLORS, baseEmbed, successEmbed, errorEmbed } = require("../../utils/embed");
const Log = require("../../models/Log");
const ms = require("ms");

function buildGiveawayEmbed(giveaway) {
  const timeLeft = Math.max(0, new Date(giveaway.endsAt).getTime() - Date.now());
  const mins = Math.floor(timeLeft / 60000);
  const secs = Math.floor((timeLeft % 60000) / 1000);
  const reqs = [];
  if (giveaway.requirements?.minGrass > 0) reqs.push(`🌿 Min Grass: ${giveaway.requirements.minGrass}`);
  if (giveaway.requirements?.roleId) reqs.push(`🏷️ Required Role: <@&${giveaway.requirements.roleId}>`);

  return baseEmbed(COLORS.warning)
    .setTitle(`🎉 GIVEAWAY — ${giveaway.prize}`)
    .setDescription([
      `🏆 **Prize:** ${giveaway.prize}`,
      `👥 **Winners:** ${giveaway.winnersCount}`,
      `🎫 **Entries:** ${giveaway.entries.length}`,
      ``,
      reqs.length ? `**Requirements:**\n${reqs.join("\n")}` : "",
      ``,
      `⏰ **Ends In:** ${mins}m ${secs}s`,
      ``,
      `Press 🎉 to enter!`,
    ].join("\n").replace(/\n\n\n/g, "\n\n"));
}

function pickWinners(entries, count) {
  const shuffled = [...entries].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("🎉 Giveaway system (Admin only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub.setName("start").setDescription("Start a giveaway")
        .addStringOption((o) => o.setName("prize").setDescription("What to give away").setRequired(true))
        .addStringOption((o) => o.setName("duration").setDescription("Duration (e.g. 1h, 30m)").setRequired(true))
        .addIntegerOption((o) => o.setName("winners").setDescription("Number of winners").setRequired(false).setMinValue(1).setMaxValue(20))
        .addIntegerOption((o) => o.setName("min_grass").setDescription("Minimum grass requirement").setRequired(false))
        .addStringOption((o) => o.setName("required_role").setDescription("Required role ID").setRequired(false))
    )
    .addSubcommand((sub) => sub.setName("end").setDescription("End a giveaway early").addStringOption((o) => o.setName("id").setDescription("Giveaway ID").setRequired(true)))
    .addSubcommand((sub) => sub.setName("reroll").setDescription("Reroll giveaway winners").addStringOption((o) => o.setName("id").setDescription("Giveaway ID").setRequired(true)))
    .addSubcommand((sub) => sub.setName("cancel").setDescription("Cancel a giveaway").addStringOption((o) => o.setName("id").setDescription("Giveaway ID").setRequired(true)))
    .addSubcommand((sub) => sub.setName("list").setDescription("List active giveaways")),

  async execute(interaction) {
    await interaction.deferReply();
    const sub = interaction.options.getSubcommand();

    if (sub === "start") {
      const prize = interaction.options.getString("prize");
      const durStr = interaction.options.getString("duration");
      const winnersCount = interaction.options.getInteger("winners") || 1;
      const minGrass = interaction.options.getInteger("min_grass") || 0;
      const roleId = interaction.options.getString("required_role") || null;

      const duration = ms(durStr);
      if (!duration) return interaction.editReply({ embeds: [errorEmbed("Invalid Duration", "Use formats like `1h`, `30m`!")] });

      const endsAt = new Date(Date.now() + duration);
      const giveaway = await Giveaway.create({
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        prize,
        winnersCount,
        endsAt,
        startedBy: interaction.user.id,
        requirements: { minGrass, roleId },
      });

      const embed = buildGiveawayEmbed(giveaway);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`gw_enter_${giveaway._id}`).setLabel("🎉 Enter Giveaway").setStyle(ButtonStyle.Primary)
      );

      const msg = await interaction.editReply({ embeds: [embed], components: [row] });
      giveaway.messageId = msg.id;
      await giveaway.save();

      await Log.create({ guildId: interaction.guildId, type: "giveaway", userId: interaction.user.id, action: "giveaway_start", details: { giveawayId: giveaway._id.toString(), prize } });

      // Register handler for entries
      const collector = msg.createMessageComponentCollector({ time: duration });
      collector.on("collect", async (btn) => {
        if (!btn.customId.startsWith("gw_enter_")) return;
        await btn.deferUpdate();
        const gw = await Giveaway.findById(giveaway._id);
        if (!gw || gw.ended || gw.cancelled) return;

        if (gw.entries.includes(btn.user.id)) {
          return btn.followUp({ content: "You're already entered! 🎉", ephemeral: true });
        }

        if (gw.requirements.minGrass > 0) {
          const u = await getOrCreateUser(btn.user.id, btn.user.username);
          if (u.grass < gw.requirements.minGrass) {
            return btn.followUp({ content: `You need at least 🌿 **${gw.requirements.minGrass}** Grass to enter!`, ephemeral: true });
          }
        }

        if (gw.requirements.roleId) {
          const member = await interaction.guild.members.fetch(btn.user.id).catch(() => null);
          if (!member?.roles.cache.has(gw.requirements.roleId)) {
            return btn.followUp({ content: `You need the required role to enter!`, ephemeral: true });
          }
        }

        gw.entries.push(btn.user.id);
        await gw.save();
        await btn.update({ embeds: [buildGiveawayEmbed(gw)], components: [row] });
        await btn.followUp({ content: "✅ You've been entered in the giveaway!", ephemeral: true });
      });

      collector.on("end", async () => {
        await endGiveaway(giveaway._id, interaction.channel, interaction.guild);
      });
    }

    if (sub === "end") {
      const id = interaction.options.getString("id");
      const gw = await Giveaway.findById(id);
      if (!gw || gw.ended) return interaction.editReply({ embeds: [errorEmbed("Not Found", "Giveaway not found or already ended.")] });
      await endGiveaway(id, interaction.channel, interaction.guild);
      interaction.editReply({ embeds: [successEmbed("Giveaway Ended", "The giveaway has been ended.")] });
    }

    if (sub === "reroll") {
      const id = interaction.options.getString("id");
      const gw = await Giveaway.findById(id);
      if (!gw || !gw.ended) return interaction.editReply({ embeds: [errorEmbed("Not Found", "Giveaway not found or not yet ended.")] });
      const newWinners = pickWinners(gw.entries, gw.winnersCount);
      gw.winners = newWinners;
      await gw.save();
      const mentions = newWinners.map((id) => `<@${id}>`).join(", ");
      interaction.editReply({ embeds: [successEmbed("Giveaway Rerolled!", `New winners: ${mentions || "None"}`)] });
    }

    if (sub === "cancel") {
      const id = interaction.options.getString("id");
      const gw = await Giveaway.findByIdAndUpdate(id, { cancelled: true, ended: true });
      if (!gw) return interaction.editReply({ embeds: [errorEmbed("Not Found", "Giveaway not found.")] });
      interaction.editReply({ embeds: [successEmbed("Giveaway Cancelled", "The giveaway has been cancelled.")] });
    }

    if (sub === "list") {
      const giveaways = await Giveaway.find({ guildId: interaction.guildId, ended: false });
      if (!giveaways.length) return interaction.editReply({ embeds: [baseEmbed(COLORS.info).setTitle("🎉 Active Giveaways").setDescription("No active giveaways.")] });
      const lines = giveaways.map((g) => `**${g.prize}** (ID: \`${g._id}\`) — ${g.entries.length} entries, ${g.winnersCount} winner(s)`).join("\n");
      interaction.editReply({ embeds: [baseEmbed(COLORS.warning).setTitle("🎉 Active Giveaways").setDescription(lines)] });
    }
  },
};

async function endGiveaway(giveawayId, channel, guild) {
  const gw = await Giveaway.findById(giveawayId);
  if (!gw || gw.ended) return;
  gw.ended = true;

  if (!gw.entries.length) {
    gw.winners = [];
    await gw.save();
    channel.send({ embeds: [baseEmbed(0xff6b6b).setTitle(`🎉 Giveaway Ended — ${gw.prize}`).setDescription("No one entered the giveaway!")] }).catch(() => {});
    return;
  }

  const winners = pickWinners(gw.entries, gw.winnersCount);
  gw.winners = winners;
  await gw.save();

  const mentions = winners.map((id) => `<@${id}>`).join(", ");
  channel.send({
    content: mentions,
    embeds: [baseEmbed(0x90ee90)
      .setTitle(`🏆 Giveaway Ended — ${gw.prize}!`)
      .setDescription(`🎊 Congratulations to the winner(s)!\n\n${mentions}\n\nYou won **${gw.prize}**!`)
    ]
  }).catch(() => {});

  await Log.create({ guildId: gw.guildId, type: "giveaway", action: "giveaway_end", details: { prize: gw.prize, winners, entries: gw.entries.length } });
}
