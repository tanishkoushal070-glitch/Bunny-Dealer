const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const { COLORS, baseEmbed } = require("../../utils/embed");

const HELP_PAGES = {
  economy: {
    title: "💰 Economy Commands",
    description: [
      "`/daily` — Claim 10–1,000 🌿 Grass daily",
      "`/weekly` — Claim 1,000–10,000 🌿 Grass weekly",
      "`/work` — Work your job for grass (30min cooldown)",
      "`/job` — View and switch your job",
      "`/pay` — Transfer grass or carrots to another user",
      "`/profile` — View your stats, wallet, and collection",
      "`/leaderboard` — View global leaderboards",
    ].join("\n"),
  },
  gambling: {
    title: "🎰 Gambling Commands",
    description: [
      "`/coinflip` — Flip a coin, bet grass",
      "`/blackjack` — Play blackjack vs bot or a user",
      "`/slot` — Spin the slot machine",
      "`/roulette` — Multiplayer Russian roulette",
      "`/mines` — Minesweeper with multiplying rewards",
      "`/high-low` — Guess higher, lower, or equal",
      "`/scratch` — Use a scratch card",
      "`/bunny-road` — Help the bunny cross the road!",
    ].join("\n"),
  },
  pvp: {
    title: "⚔️ PvP Commands",
    description: [
      "`/duel` — Challenge a user to a duel for grass",
      "`/rob` — Attempt to rob another user",
      "`/ship` — Check compatibility between two users",
    ].join("\n"),
  },
  resources: {
    title: "🌿 Resource Commands",
    description: [
      "`/forage` — Forage for grass or rare carrots (5min)",
      "`/fish` — Catch fish of varying rarity (10min)",
      "`/hunt` — Hunt bunnies for your collection (15min)",
      "`/autohunt` — Toggle auto-hunting with your pets",
    ].join("\n"),
  },
  quests: {
    title: "📋 Quest System",
    description: [
      "`/quest` — View your 5 daily quests and claim rewards",
      "",
      "Quests rotate every 24 hours.",
      "Complete quests to earn bonus grass and carrots!",
    ].join("\n"),
  },
  shop: {
    title: "🛒 Shop & Inventory",
    description: [
      "`/shop browse` — Browse the shop by category",
      "`/shop inventory` — View your inventory",
      "",
      "Shop categories: Jobs, Roles, Tools, Consumables, Pets, Scratch Cards, Cosmetics",
    ].join("\n"),
  },
  systems: {
    title: "🎉 Systems",
    description: [
      "`/giveaway start/end/reroll/cancel/list` — Giveaway management (Admin)",
      "`/auction start/end/bid/list` — Auction management (Admin)",
      "`/economy add/remove/set/reset/refund` — Economy management (Admin)",
      "`/settings view/economy-log/role/job` — Server settings (Admin)",
      "`/shopadmin add/remove/edit/list/log` — Shop management (Admin)",
      "`/24-7` — View and control bot status (Admin)",
    ].join("\n"),
  },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("🐰 View all Bunny Dealer commands"),

  async execute(interaction) {
    await interaction.deferReply();

    const embed = baseEmbed(COLORS.primary)
      .setTitle("🐰 Bunny Dealer — Help Menu")
      .setDescription("Select a category below to see all commands!\n\n🌿 **Primary Currency:** Grass\n🥕 **Premium Currency:** Carrots")
      .setThumbnail(interaction.client.user.displayAvatarURL());

    const menu = new StringSelectMenuBuilder()
      .setCustomId("help_cat")
      .setPlaceholder("📚 Select a category...")
      .addOptions(
        { label: "💰 Economy", value: "economy" },
        { label: "🎰 Gambling", value: "gambling" },
        { label: "⚔️ PvP", value: "pvp" },
        { label: "🌿 Resources", value: "resources" },
        { label: "📋 Quests", value: "quests" },
        { label: "🛒 Shop", value: "shop" },
        { label: "🎉 Systems & Admin", value: "systems" }
      );

    const row = new ActionRowBuilder().addComponents(menu);
    const msg = await interaction.editReply({ embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 60000,
    });

    collector.on("collect", async (i) => {
      const page = HELP_PAGES[i.values[0]];
      const pageEmbed = baseEmbed(COLORS.primary).setTitle(page.title).setDescription(page.description);
      await i.update({ embeds: [pageEmbed], components: [row] });
    });

    collector.on("end", () => interaction.editReply({ components: [] }).catch(() => {}));
  },
};
