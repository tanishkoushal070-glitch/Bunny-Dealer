const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const ShopItem = require("../../models/ShopItem");
const Log = require("../../models/Log");
const { successEmbed, errorEmbed, baseEmbed, COLORS } = require("../../utils/embed");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shopadmin")
    .setDescription("🛒 Manage shop items (Admin only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub.setName("add").setDescription("Add a shop item")
        .addStringOption((o) => o.setName("id").setDescription("Unique item ID").setRequired(true))
        .addStringOption((o) => o.setName("name").setDescription("Item name").setRequired(true))
        .addStringOption((o) => o.setName("description").setDescription("Item description").setRequired(true))
        .addStringOption((o) => o.setName("category").setDescription("Category").setRequired(true)
          .addChoices(
            { name: "Jobs", value: "Jobs" }, { name: "Roles", value: "Roles" },
            { name: "Tools", value: "Tools" }, { name: "Consumables", value: "Consumables" },
            { name: "Pets", value: "Pets" }, { name: "ScratchCards", value: "ScratchCards" },
            { name: "Cosmetics", value: "Cosmetics" }
          ))
        .addIntegerOption((o) => o.setName("price").setDescription("Price").setRequired(true).setMinValue(1))
        .addStringOption((o) => o.setName("currency").setDescription("Currency").setRequired(true).addChoices({ name: "Grass", value: "grass" }, { name: "Carrots", value: "carrots" }))
        .addStringOption((o) => o.setName("emoji").setDescription("Item emoji").setRequired(false))
    )
    .addSubcommand((sub) =>
      sub.setName("remove").setDescription("Remove a shop item")
        .addStringOption((o) => o.setName("id").setDescription("Item ID to remove").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName("edit").setDescription("Edit a shop item's price")
        .addStringOption((o) => o.setName("id").setDescription("Item ID to edit").setRequired(true))
        .addIntegerOption((o) => o.setName("price").setDescription("New price").setRequired(true).setMinValue(1))
    )
    .addSubcommand((sub) => sub.setName("list").setDescription("List all shop items"))
    .addSubcommand((sub) => sub.setName("log").setDescription("View recent shop purchase logs")),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const sub = interaction.options.getSubcommand();

    if (sub === "add") {
      const itemId = interaction.options.getString("id");
      const existing = await ShopItem.findOne({ itemId });
      if (existing) return interaction.editReply({ embeds: [errorEmbed("Already Exists", `Item \`${itemId}\` already exists!`)] });

      await ShopItem.create({
        itemId,
        name: interaction.options.getString("name"),
        description: interaction.options.getString("description"),
        category: interaction.options.getString("category"),
        price: interaction.options.getInteger("price"),
        currency: interaction.options.getString("currency"),
        emoji: interaction.options.getString("emoji") || "📦",
        guildId: interaction.guildId,
      });

      await Log.create({ guildId: interaction.guildId, type: "admin", userId: interaction.user.id, action: "shop_add", details: { itemId } });
      return interaction.editReply({ embeds: [successEmbed("Item Added", `Added **${interaction.options.getString("name")}** to the shop!`)] });
    }

    if (sub === "remove") {
      const itemId = interaction.options.getString("id");
      const item = await ShopItem.findOneAndDelete({ itemId });
      if (!item) return interaction.editReply({ embeds: [errorEmbed("Not Found", `Item \`${itemId}\` not found!`)] });
      await Log.create({ guildId: interaction.guildId, type: "admin", userId: interaction.user.id, action: "shop_remove", details: { itemId } });
      return interaction.editReply({ embeds: [successEmbed("Item Removed", `Removed **${item.name}** from the shop.`)] });
    }

    if (sub === "edit") {
      const itemId = interaction.options.getString("id");
      const price = interaction.options.getInteger("price");
      const item = await ShopItem.findOneAndUpdate({ itemId }, { price }, { new: true });
      if (!item) return interaction.editReply({ embeds: [errorEmbed("Not Found", `Item \`${itemId}\` not found!`)] });
      await Log.create({ guildId: interaction.guildId, type: "admin", userId: interaction.user.id, action: "shop_edit", details: { itemId, price } });
      return interaction.editReply({ embeds: [successEmbed("Item Updated", `Updated **${item.name}** price to ${price}.`)] });
    }

    if (sub === "list") {
      const items = await ShopItem.find();
      const lines = items.map((i) => `${i.emoji} **${i.name}** (\`${i.itemId}\`) — ${i.price} ${i.currency} [${i.category}]`).join("\n");
      return interaction.editReply({ embeds: [baseEmbed(COLORS.info).setTitle("🛒 All Shop Items").setDescription(lines || "No items.")] });
    }

    if (sub === "log") {
      const logs = await Log.find({ guildId: interaction.guildId, type: "shop" }).sort({ timestamp: -1 }).limit(10);
      const lines = logs.map((l) => `<@${l.userId}> bought ${l.details?.name} x${l.details?.qty || 1} — ${l.amount} ${l.currency}`).join("\n");
      return interaction.editReply({ embeds: [baseEmbed(COLORS.info).setTitle("🛒 Shop Logs").setDescription(lines || "No logs.")] });
    }
  },
};
