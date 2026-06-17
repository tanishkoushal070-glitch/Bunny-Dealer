const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const Auction = require("../../models/Auction");
const { getOrCreateUser, removeCurrency, addCurrency, formatCurrency } = require("../../utils/economy");
const { COLORS, baseEmbed, successEmbed, errorEmbed } = require("../../utils/embed");
const Log = require("../../models/Log");
const ms = require("ms");

function buildAuctionEmbed(auction) {
  const timeLeft = Math.max(0, new Date(auction.endsAt).getTime() - Date.now());
  const mins = Math.floor(timeLeft / 60000);
  const secs = Math.floor((timeLeft % 60000) / 1000);
  return baseEmbed(COLORS.warning)
    .setTitle(`🔨 Auction — ${auction.itemName}`)
    .setDescription([
      `**Type:** ${auction.type === "role" ? "🏷️ Role" : "🥕 Carrots"}`,
      auction.type === "carrots" ? `**Prize:** ${formatCurrency(auction.carrotAmount, "carrots")}` : `**Prize:** <@&${auction.roleId}>`,
      ``,
      `**Starting Bid:** ${formatCurrency(auction.startingBid, "grass")}`,
      `**Current Bid:** ${auction.currentBid > 0 ? `${formatCurrency(auction.currentBid, "grass")} by <@${auction.currentBidder}>` : "No bids yet"}`,
      `**Total Bids:** ${auction.bids.length}`,
      ``,
      `**Ends In:** ${mins}m ${secs}s`,
      ``,
      `Press the button below to place a bid!`,
    ].join("\n"));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("auction")
    .setDescription("🔨 Auction system (Admin only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub.setName("start").setDescription("Start an auction")
        .addStringOption((o) => o.setName("name").setDescription("Auction item name").setRequired(true))
        .addStringOption((o) => o.setName("type").setDescription("Auction type").setRequired(true).addChoices({ name: "🏷️ Role", value: "role" }, { name: "🥕 Carrots", value: "carrots" }))
        .addIntegerOption((o) => o.setName("starting_bid").setDescription("Starting bid in grass").setRequired(true).setMinValue(1))
        .addStringOption((o) => o.setName("duration").setDescription("Duration (e.g. 1h, 30m)").setRequired(true))
        .addStringOption((o) => o.setName("role").setDescription("Role ID (if type is role)").setRequired(false))
        .addIntegerOption((o) => o.setName("carrots").setDescription("Carrot amount (if type is carrots)").setRequired(false))
    )
    .addSubcommand((sub) => sub.setName("end").setDescription("End an active auction early").addStringOption((o) => o.setName("id").setDescription("Auction ID").setRequired(true)))
    .addSubcommand((sub) => sub.setName("list").setDescription("List active auctions"))
    .addSubcommand((sub) => sub.setName("bid").setDescription("Place a bid").addStringOption((o) => o.setName("id").setDescription("Auction ID").setRequired(true)).addIntegerOption((o) => o.setName("amount").setDescription("Bid amount in grass").setRequired(true).setMinValue(1))),

  async execute(interaction) {
    await interaction.deferReply();
    const sub = interaction.options.getSubcommand();

    if (sub === "start") {
      const name = interaction.options.getString("name");
      const type = interaction.options.getString("type");
      const startingBid = interaction.options.getInteger("starting_bid");
      const durStr = interaction.options.getString("duration");
      const roleId = interaction.options.getString("role");
      const carrotAmount = interaction.options.getInteger("carrots") || 0;

      const duration = ms(durStr);
      if (!duration) return interaction.editReply({ embeds: [errorEmbed("Invalid Duration", `Use formats like \`1h\`, \`30m\`, \`2h30m\`!`)] });

      const endsAt = new Date(Date.now() + duration);
      const auction = await Auction.create({
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        type,
        itemName: name,
        roleId: roleId || null,
        carrotAmount,
        startingBid,
        currentBid: 0,
        endsAt,
        startedBy: interaction.user.id,
      });

      const embed = buildAuctionEmbed(auction);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bid_${auction._id}`).setLabel("💰 Place Bid").setStyle(ButtonStyle.Primary)
      );

      const msg = await interaction.editReply({ embeds: [embed], components: [row] });
      auction.messageId = msg.id;
      await auction.save();

      await Log.create({ guildId: interaction.guildId, type: "auction", userId: interaction.user.id, action: "auction_start", details: { auctionId: auction._id.toString(), name } });

      // Auto-end timer
      setTimeout(async () => {
        await endAuction(auction._id, interaction.channel, interaction.client);
      }, duration);
    }

    if (sub === "bid") {
      const auctionId = interaction.options.getString("id");
      const amount = interaction.options.getInteger("amount");
      await placeBid(interaction, auctionId, amount);
    }

    if (sub === "end") {
      const auctionId = interaction.options.getString("id");
      const auction = await Auction.findById(auctionId);
      if (!auction || auction.ended) return interaction.editReply({ embeds: [errorEmbed("Not Found", "Auction not found or already ended.")] });
      await endAuction(auctionId, interaction.channel, interaction.client);
      interaction.editReply({ embeds: [successEmbed("Auction Ended", "The auction has been ended early.")] });
    }

    if (sub === "list") {
      const auctions = await Auction.find({ guildId: interaction.guildId, ended: false });
      if (!auctions.length) return interaction.editReply({ embeds: [baseEmbed(COLORS.info).setTitle("🔨 Active Auctions").setDescription("No active auctions.")] });
      const lines = auctions.map((a) => `**${a.itemName}** (ID: \`${a._id}\`) — Bid: ${a.currentBid || a.startingBid} grass`).join("\n");
      interaction.editReply({ embeds: [baseEmbed(COLORS.warning).setTitle("🔨 Active Auctions").setDescription(lines)] });
    }
  },
};

async function placeBid(interaction, auctionId, amount) {
  const auction = await Auction.findById(auctionId);
  if (!auction || auction.ended) return interaction.editReply({ embeds: [errorEmbed("Not Found", "Auction not found or ended!")] });

  const minBid = Math.max(auction.startingBid, auction.currentBid + 1);
  if (amount < minBid) return interaction.editReply({ embeds: [errorEmbed("Bid Too Low", `Minimum bid is ${formatCurrency(minBid, "grass")}!`)] });

  const user = await getOrCreateUser(interaction.user.id, interaction.user.username);
  if (user.grass < amount) return interaction.editReply({ embeds: [errorEmbed("Insufficient Funds", "You don't have enough Grass!")] });

  // Refund previous bidder
  if (auction.currentBidder) {
    await addCurrency(auction.currentBidder, "grass", auction.currentBid, auction.guildId, "auction outbid refund");
  }

  await removeCurrency(interaction.user.id, "grass", amount, interaction.guildId, "auction bid");
  auction.currentBid = amount;
  auction.currentBidder = interaction.user.id;
  auction.currentBidderTag = interaction.user.username;
  auction.bids.push({ userId: interaction.user.id, username: interaction.user.username, amount });
  await auction.save();

  await Log.create({ guildId: interaction.guildId, type: "auction", userId: interaction.user.id, action: "bid", amount, currency: "grass" });
  interaction.editReply({ embeds: [successEmbed("Bid Placed!", `You bid ${formatCurrency(amount, "grass")} on **${auction.itemName}**!`)] });
}

async function endAuction(auctionId, channel, client) {
  const auction = await Auction.findById(auctionId);
  if (!auction || auction.ended) return;

  auction.ended = true;
  await auction.save();

  if (!auction.currentBidder) {
    channel.send({ embeds: [baseEmbed(0xff6b6b).setTitle(`🔨 Auction Ended — ${auction.itemName}`).setDescription("No one bid on this auction!")] }).catch(() => {});
    return;
  }

  if (auction.type === "carrots") {
    await addCurrency(auction.currentBidder, "carrots", auction.carrotAmount, auction.guildId, "auction win");
  }

  channel.send({
    embeds: [baseEmbed(0x90ee90)
      .setTitle(`🏆 Auction Won — ${auction.itemName}!`)
      .setDescription(`<@${auction.currentBidder}> won the auction for ${formatCurrency(auction.currentBid, "grass")}!\n${auction.type === "role" && auction.roleId ? `They receive <@&${auction.roleId}>!` : `They receive ${formatCurrency(auction.carrotAmount, "carrots")}!`}`)
    ]
  }).catch(() => {});

  await Log.create({ guildId: auction.guildId, type: "auction", userId: auction.currentBidder, action: "auction_win", amount: auction.currentBid, currency: "grass" });
}
