const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");
const { getOrCreateUser, removeCurrency, formatCurrency } = require("../../utils/economy");
const ShopItem = require("../../models/ShopItem");
const Inventory = require("../../models/Inventory");
const User = require("../../models/User");
const Log = require("../../models/Log");
const { COLORS, baseEmbed, errorEmbed, successEmbed } = require("../../utils/embed");

const CATEGORIES = ["Consumables", "Tools", "ScratchCards", "Jobs", "Pets", "Cosmetics", "Roles"];
const PAGE_SIZE = 5;

const ALL_TITLES = {
  bunny_fan:     { display: "🐰 Bunny Fan",       rarity: "Common",    description: "A simple bunny fan" },
  grass_lover:   { display: "🌿 Grass Lover",      rarity: "Common",    description: "You love grass" },
  carrot_fan:    { display: "🥕 Carrot Fan",       rarity: "Common",    description: "Carrots are life" },
  fisher_pro:    { display: "🎣 Fisher Pro",       rarity: "Uncommon",  description: "True fishing expert" },
  hunter_mark:   { display: "🏹 Hunter Mark",      rarity: "Uncommon",  description: "Left a mark on the hunt" },
  gambler:       { display: "🎰 Gambler",          rarity: "Uncommon",  description: "You live for the casino" },
  hard_worker:   { display: "💼 Hard Worker",      rarity: "Uncommon",  description: "Never skips a shift" },
  diamond_miner: { display: "💎 Diamond Miner",    rarity: "Rare",      description: "Found diamonds deep below" },
  grass_baron:   { display: "🌾 Grass Baron",      rarity: "Rare",      description: "Rules the grass market" },
  night_raider:  { display: "🌙 Night Raider",     rarity: "Rare",      description: "Strikes in the darkness" },
  enchanted:     { display: "✨ Enchanted",         rarity: "Rare",      description: "Touched by magic" },
  bunny_king:    { display: "👑 Bunny King",       rarity: "Epic",      description: "Ruler of all bunnies" },
  carrot_king:   { display: "🥕 Carrot King",      rarity: "Epic",      description: "Controls the carrot supply" },
  high_roller:   { display: "🎲 High Roller",      rarity: "Epic",      description: "Bets big, wins big" },
  dragon_tamer:  { display: "🐉 Dragon Tamer",     rarity: "Epic",      description: "Tamed a wild dragon" },
  the_legend:    { display: "⚡ The Legend",        rarity: "Legendary", description: "A true server legend" },
  bunny_god:     { display: "🌟 Bunny God",        rarity: "Legendary", description: "Ascended beyond all bunnies" },
  carrot_deity:  { display: "🌈 Carrot Deity",     rarity: "Legendary", description: "The ultimate carrot authority" },
};

const DEFAULT_ITEMS = [
  // Consumables
  { itemId: "rob_shield",      name: "Rob Shield",           description: "Protection from robbery for 2 hours",            category: "Consumables", price: 500,    currency: "grass",   emoji: "🛡️" },
  { itemId: "lucky_charm",     name: "Lucky Charm",          description: "Slightly boosts gambling luck for 1 hour",       category: "Consumables", price: 300,    currency: "grass",   emoji: "🍀" },
  { itemId: "energy_drink",    name: "Energy Drink",         description: "Cut your next work cooldown in half",            category: "Consumables", price: 500,    currency: "grass",   emoji: "⚡" },
  { itemId: "mystery_box",     name: "Mystery Box",          description: "Open for a random reward (500–5000 🌿)!",        category: "Consumables", price: 2000,   currency: "grass",   emoji: "🎁" },
  { itemId: "grass_bomb",      name: "Grass Bomb",           description: "Instantly earn 500–2000 bonus grass",           category: "Consumables", price: 1500,   currency: "grass",   emoji: "💥" },
  { itemId: "double_down",     name: "Double Down Token",    description: "Next gambling win pays 2x (1 use)",             category: "Consumables", price: 3000,   currency: "grass",   emoji: "🃏" },
  { itemId: "carrot_boost",    name: "Carrot Boost",         description: "Earn +1 bonus carrot on next daily",            category: "Consumables", price: 5,      currency: "carrots", emoji: "🥕" },
  { itemId: "revive_token",    name: "Revive Token",         description: "Restore 1000 grass if you go broke",            category: "Consumables", price: 8,      currency: "carrots", emoji: "💊" },
  // Tools
  { itemId: "diamond_pickaxe", name: "Diamond Pickaxe",      description: "+50% mining income (permanent)",                 category: "Tools",       price: 3000,   currency: "grass",   emoji: "⛏️" },
  { itemId: "enchanted_rod",   name: "Enchanted Fishing Rod",description: "Better fish rarity when fishing",               category: "Tools",       price: 2500,   currency: "grass",   emoji: "🎣" },
  { itemId: "hunters_bow",     name: "Hunter's Bow",         description: "+30% hunt income (permanent)",                  category: "Tools",       price: 2000,   currency: "grass",   emoji: "🏹" },
  { itemId: "lucky_dice",      name: "Lucky Dice",           description: "+10% gambling winnings (permanent)",            category: "Tools",       price: 5000,   currency: "grass",   emoji: "🎲" },
  { itemId: "magnifying_glass",name: "Magnifying Glass",     description: "Find rare items when foraging",                 category: "Tools",       price: 1800,   currency: "grass",   emoji: "🔍" },
  { itemId: "treasure_map",    name: "Treasure Map",         description: "One-time use: discover hidden treasure",        category: "Tools",       price: 4000,   currency: "grass",   emoji: "🗺️" },
  // Scratch Cards
  { itemId: "scratch_card",    name: "Scratch Card",         description: "A scratch card for instant prizes!",            category: "ScratchCards",price: 100,    currency: "grass",   emoji: "🎟️" },
  { itemId: "scratch_card_x5", name: "Scratch Bundle (x5)", description: "5 scratch cards at a discount!",               category: "ScratchCards",price: 450,    currency: "grass",   emoji: "🎟️" },
  { itemId: "premium_scratch", name: "Premium Scratch Card", description: "10x better prize odds!",                       category: "ScratchCards",price: 500,    currency: "grass",   emoji: "✨" },
  { itemId: "golden_scratch",  name: "Golden Scratch Card",  description: "Huge prizes — premium quality",                category: "ScratchCards",price: 5,      currency: "carrots", emoji: "🌟" },
  // Jobs
  { itemId: "job_merchant",    name: "Merchant License",     description: "Unlock the Merchant job",                      category: "Jobs",        price: 2000,   currency: "grass",   emoji: "💰", jobName: "Merchant" },
  { itemId: "job_researcher",  name: "Research Permit",      description: "Unlock the Researcher job",                    category: "Jobs",        price: 3000,   currency: "grass",   emoji: "🔬", jobName: "Researcher" },
  { itemId: "job_alchemist",   name: "Alchemist's Tome",     description: "Unlock the Alchemist job",                    category: "Jobs",        price: 5000,   currency: "grass",   emoji: "⚗️", jobName: "Alchemist" },
  { itemId: "job_enchanter",   name: "Enchanter's Staff",    description: "Unlock the Enchanter job",                    category: "Jobs",        price: 8000,   currency: "grass",   emoji: "✨", jobName: "Enchanter" },
  { itemId: "job_wizard",      name: "Wizard's Spellbook",   description: "Unlock the Wizard job",                       category: "Jobs",        price: 10000,  currency: "grass",   emoji: "🪄", jobName: "Wizard" },
  { itemId: "job_dragon",      name: "Dragon Tamer Bond",    description: "Unlock the Dragon Tamer job",                 category: "Jobs",        price: 50000,  currency: "grass",   emoji: "🐉", jobName: "Dragon Tamer" },
  // Pets
  { itemId: "pet_common_bunny",name: "Common Bunny",         description: "A cute bunny companion",                       category: "Pets",        price: 1000,   currency: "grass",   emoji: "🐰" },
  { itemId: "pet_golden_bunny",name: "Golden Bunny",         description: "A rare golden bunny — very lucky!",           category: "Pets",        price: 5000,   currency: "grass",   emoji: "✨" },
  { itemId: "pet_cat",         name: "Lucky Cat",            description: "Beckons fortune your way",                    category: "Pets",        price: 3000,   currency: "grass",   emoji: "🐱" },
  { itemId: "pet_fox",         name: "Cunning Fox",          description: "A sly companion for cunning gamblers",        category: "Pets",        price: 4000,   currency: "grass",   emoji: "🦊" },
  { itemId: "pet_dragon",      name: "Mini Dragon",          description: "A tiny fire-breathing companion",             category: "Pets",        price: 20000,  currency: "grass",   emoji: "🐲" },
  // Cosmetics (titles)
  { itemId: "title_bunny_fan",    name: "Title: Bunny Fan",    description: "Display 🐰 Bunny Fan on your profile",      category: "Cosmetics",   price: 500,    currency: "grass",   emoji: "🐰", titleId: "bunny_fan" },
  { itemId: "title_grass_lover",  name: "Title: Grass Lover",  description: "Display 🌿 Grass Lover on your profile",    category: "Cosmetics",   price: 800,    currency: "grass",   emoji: "🌿", titleId: "grass_lover" },
  { itemId: "title_carrot_fan",   name: "Title: Carrot Fan",   description: "Display 🥕 Carrot Fan on your profile",     category: "Cosmetics",   price: 800,    currency: "grass",   emoji: "🥕", titleId: "carrot_fan" },
  { itemId: "title_fisher_pro",   name: "Title: Fisher Pro",   description: "Display 🎣 Fisher Pro on your profile",     category: "Cosmetics",   price: 2000,   currency: "grass",   emoji: "🎣", titleId: "fisher_pro" },
  { itemId: "title_hunter_mark",  name: "Title: Hunter Mark",  description: "Display 🏹 Hunter Mark on your profile",    category: "Cosmetics",   price: 2000,   currency: "grass",   emoji: "🏹", titleId: "hunter_mark" },
  { itemId: "title_gambler",      name: "Title: Gambler",      description: "Display 🎰 Gambler on your profile",        category: "Cosmetics",   price: 2500,   currency: "grass",   emoji: "🎰", titleId: "gambler" },
  { itemId: "title_hard_worker",  name: "Title: Hard Worker",  description: "Display 💼 Hard Worker on your profile",    category: "Cosmetics",   price: 2500,   currency: "grass",   emoji: "💼", titleId: "hard_worker" },
  { itemId: "title_diamond_miner",name: "Title: Diamond Miner",description: "Display 💎 Diamond Miner on your profile",  category: "Cosmetics",   price: 5000,   currency: "grass",   emoji: "💎", titleId: "diamond_miner" },
  { itemId: "title_grass_baron",  name: "Title: Grass Baron",  description: "Display 🌾 Grass Baron on your profile",    category: "Cosmetics",   price: 6000,   currency: "grass",   emoji: "🌾", titleId: "grass_baron" },
  { itemId: "title_night_raider", name: "Title: Night Raider", description: "Display 🌙 Night Raider on your profile",   category: "Cosmetics",   price: 6000,   currency: "grass",   emoji: "🌙", titleId: "night_raider" },
  { itemId: "title_enchanted",    name: "Title: Enchanted",    description: "Display ✨ Enchanted on your profile",       category: "Cosmetics",   price: 7000,   currency: "grass",   emoji: "✨", titleId: "enchanted" },
  { itemId: "title_bunny_king",   name: "Title: Bunny King",   description: "Display 👑 Bunny King on your profile",     category: "Cosmetics",   price: 15000,  currency: "grass",   emoji: "👑", titleId: "bunny_king" },
  { itemId: "title_carrot_king",  name: "Title: Carrot King",  description: "Display 🥕 Carrot King on your profile",    category: "Cosmetics",   price: 15000,  currency: "grass",   emoji: "🥕", titleId: "carrot_king" },
  { itemId: "title_high_roller",  name: "Title: High Roller",  description: "Display 🎲 High Roller on your profile",    category: "Cosmetics",   price: 18000,  currency: "grass",   emoji: "🎲", titleId: "high_roller" },
  { itemId: "title_dragon_tamer", name: "Title: Dragon Tamer", description: "Display 🐉 Dragon Tamer on your profile",   category: "Cosmetics",   price: 20000,  currency: "grass",   emoji: "🐉", titleId: "dragon_tamer" },
  { itemId: "title_the_legend",   name: "Title: The Legend",   description: "Display ⚡ The Legend on your profile",      category: "Cosmetics",   price: 50000,  currency: "grass",   emoji: "⚡", titleId: "the_legend" },
  { itemId: "title_bunny_god",    name: "Title: Bunny God",    description: "Display 🌟 Bunny God on your profile",      category: "Cosmetics",   price: 75000,  currency: "grass",   emoji: "🌟", titleId: "bunny_god" },
  { itemId: "title_carrot_deity", name: "Title: Carrot Deity", description: "Display 🌈 Carrot Deity on your profile",   category: "Cosmetics",   price: 100000, currency: "grass",   emoji: "🌈", titleId: "carrot_deity" },
];

async function seedDefaultItems() {
  await Promise.all(
    DEFAULT_ITEMS.map((item) =>
      ShopItem.updateOne({ itemId: item.itemId }, { $setOnInsert: item }, { upsert: true })
    )
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("🛒 Browse the Bunny Dealer shop!")
    .addSubcommand((sub) => sub.setName("browse").setDescription("Browse shop items"))
    .addSubcommand((sub) => sub.setName("inventory").setDescription("View your inventory")),

  async execute(interaction) {
    await interaction.deferReply();
    await seedDefaultItems();

    const sub = interaction.options.getSubcommand();
    if (sub === "inventory") return showInventory(interaction);
    await showShop(interaction);
  },
};

async function showInventory(interaction) {
  const user = await getOrCreateUser(interaction.user.id, interaction.user.username);
  const inv = await Inventory.findOne({ userId: interaction.user.id });

  const lines = [];
  if (inv?.items?.length) {
    lines.push("**📦 Items:**");
    inv.items.forEach((i) => lines.push(`  ${i.name} ×${i.quantity}`));
  }
  if (inv?.scratchCards > 0) lines.push(`\n🎟️ **Scratch Cards:** ${inv.scratchCards}`);
  if (inv?.fish?.length) {
    lines.push("\n**🐟 Fish:**");
    inv.fish.forEach((f) => lines.push(`  ${f.emoji} ${f.name} (${f.rarity}) ×${f.quantity}`));
  }
  if (inv?.bunnies?.length) {
    lines.push("\n**🐰 Bunnies:**");
    inv.bunnies.forEach((b) => lines.push(`  ${b.emoji} ${b.name} ×${b.quantity}`));
  }

  // Owned titles
  const ownedTitles = user.ownedTitles || [];
  if (ownedTitles.length) {
    lines.push("\n**🎨 Titles:**");
    ownedTitles.forEach((id) => {
      const t = ALL_TITLES[id];
      const equipped = user.equippedTitle === id ? " ✅" : "";
      lines.push(`  ${t ? t.display : id}${equipped}`);
    });
  }

  const embed = baseEmbed(COLORS.primary)
    .setTitle("🎒 Your Inventory")
    .setDescription(lines.length ? lines.join("\n") : "Your inventory is empty! Visit **/shop browse** to buy items.")
    .setFooter({ text: user.equippedTitle ? `Active title: ${ALL_TITLES[user.equippedTitle]?.display || user.equippedTitle}` : "No title equipped" });

  // Equip menu if any titles owned
  const components = [];
  if (ownedTitles.length) {
    const equipMenu = new StringSelectMenuBuilder()
      .setCustomId("inv_equip_title")
      .setPlaceholder("🎨 Equip or change your title...")
      .addOptions([
        { label: "None (Remove Title)", description: "Unequip your current title", value: "none" },
        ...ownedTitles.map((id) => {
          const t = ALL_TITLES[id] || { display: id, rarity: "?" };
          const isEquipped = user.equippedTitle === id;
          return {
            label: t.display.replace(/[^\w\s]/gu, "").trim().slice(0, 25) || id,
            description: `${t.rarity}${isEquipped ? " — Currently Equipped" : ""}`,
            value: id,
          };
        }),
      ]);
    components.push(new ActionRowBuilder().addComponents(equipMenu));
  }

  const msg = await interaction.editReply({ embeds: [embed], components });

  if (!components.length) return;

  const collector = msg.createMessageComponentCollector({
    filter: (i) => {
      if (i.user.id !== interaction.user.id) {
        i.reply({ content: "❌ This isn't your inventory!", ephemeral: true }).catch(() => {});
        return false;
      }
      return true;
    },
    time: 60000,
  });

  collector.on("collect", async (i) => {
    try {
      const titleId = i.values[0];
      const u = await getOrCreateUser(i.user.id, i.user.username);
      u.equippedTitle = titleId === "none" ? null : titleId;
      await u.save();
      const label = titleId === "none" ? "None" : ALL_TITLES[titleId]?.display;
      await i.reply({
        content: titleId === "none" ? "✅ Title removed!" : `✅ Now wearing **${label}**!`,
        ephemeral: true,
      });
    } catch (err) {
      console.error("inv equip error:", err);
    }
  });

  collector.on("end", () => interaction.editReply({ components: [] }).catch(() => {}));
}

async function showShop(interaction) {
  let selectedCategory = "Consumables";
  let page = 0;

  async function getItems() {
    return ShopItem.find({ category: selectedCategory, enabled: true });
  }

  async function buildShopEmbed(items, user) {
    const start = page * PAGE_SIZE;
    const pageItems = items.slice(start, start + PAGE_SIZE);
    const totalPages = Math.ceil(items.length / PAGE_SIZE) || 1;

    const desc = pageItems.length
      ? pageItems.map((item) => {
          const owned = item.titleId && user.ownedTitles?.includes(item.titleId);
          const equipped = item.titleId && user.equippedTitle === item.titleId;
          const status = equipped ? " ✅ **Equipped**" : owned ? " ✔️ **Owned**" : "";
          return `${item.emoji} **${item.name}**${status}\n${item.description}\n💰 ${formatCurrency(item.price, item.currency)}`;
        }).join("\n\n")
      : "No items in this category.";

    return baseEmbed(COLORS.primary)
      .setTitle("🛒 Bunny Dealer Shop")
      .setDescription(`**Category:** ${selectedCategory} | 💰 Your balance: 🌿 ${user.grass.toLocaleString()} | 🥕 ${user.carrots}\n\n${desc}`)
      .setFooter({ text: `Page ${page + 1}/${totalPages} • 🐰 Bunny Dealer Shop` });
  }

  function buildComponents(items, user) {
    const catMenu = new StringSelectMenuBuilder()
      .setCustomId("shop_cat")
      .setPlaceholder("📂 Select Category")
      .addOptions(CATEGORIES.map((c) => ({ label: c, value: c })));

    const start = page * PAGE_SIZE;
    const totalPages = Math.ceil(items.length / PAGE_SIZE) || 1;
    const pageItems = items.slice(start, start + PAGE_SIZE);

    const rows = [new ActionRowBuilder().addComponents(catMenu)];

    if (pageItems.length) {
      const buyRow = new ActionRowBuilder();
      pageItems.slice(0, 5).forEach((item) => {
        const owned = item.titleId && user.ownedTitles?.includes(item.titleId);
        const equipped = item.titleId && user.equippedTitle === item.titleId;
        if (equipped) {
          buyRow.addComponents(
            new ButtonBuilder()
              .setCustomId(`equip_${item.itemId}`)
              .setLabel(`✅ Equipped`)
              .setStyle(ButtonStyle.Success)
              .setDisabled(true)
          );
        } else if (owned && item.titleId) {
          buyRow.addComponents(
            new ButtonBuilder()
              .setCustomId(`equip_${item.itemId}`)
              .setLabel(`Equip`)
              .setStyle(ButtonStyle.Primary)
          );
        } else {
          buyRow.addComponents(
            new ButtonBuilder()
              .setCustomId(`buy_${item.itemId}`)
              .setLabel(`Buy ${item.name}`.slice(0, 80))
              .setStyle(ButtonStyle.Success)
          );
        }
      });
      rows.push(buyRow);
    }

    const navRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("shop_prev").setLabel("◀ Prev").setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
      new ButtonBuilder().setCustomId("shop_next").setLabel("Next ▶").setStyle(ButtonStyle.Primary).setDisabled(page >= totalPages - 1),
      new ButtonBuilder().setCustomId("shop_refresh").setLabel("🔄").setStyle(ButtonStyle.Secondary)
    );
    rows.push(navRow);
    return rows;
  }

  let user = await getOrCreateUser(interaction.user.id, interaction.user.username);
  let items = await getItems();
  const embed = await buildShopEmbed(items, user);
  const msg = await interaction.editReply({ embeds: [embed], components: buildComponents(items, user) });

  const collector = msg.createMessageComponentCollector({
    filter: (i) => {
      if (i.user.id !== interaction.user.id) {
        i.reply({ content: "❌ This shop menu isn't yours!", ephemeral: true }).catch(() => {});
        return false;
      }
      return true;
    },
    time: 180000,
  });

  collector.on("collect", async (i) => {
    try {
      user = await getOrCreateUser(i.user.id, i.user.username);

      if (i.customId === "shop_cat") {
        selectedCategory = i.values[0];
        page = 0;
        items = await getItems();
        await i.update({ embeds: [await buildShopEmbed(items, user)], components: buildComponents(items, user) });
        return;
      }
      if (i.customId === "shop_prev") {
        page--;
        items = await getItems();
        await i.update({ embeds: [await buildShopEmbed(items, user)], components: buildComponents(items, user) });
        return;
      }
      if (i.customId === "shop_next") {
        page++;
        items = await getItems();
        await i.update({ embeds: [await buildShopEmbed(items, user)], components: buildComponents(items, user) });
        return;
      }
      if (i.customId === "shop_refresh") {
        items = await getItems();
        await i.update({ embeds: [await buildShopEmbed(items, user)], components: buildComponents(items, user) });
        return;
      }

      // Equip title from shop
      if (i.customId.startsWith("equip_")) {
        const itemId = i.customId.replace("equip_", "");
        const shopItem = await ShopItem.findOne({ itemId });
        if (!shopItem?.titleId) return i.reply({ content: "Item not found!", ephemeral: true });

        user.equippedTitle = shopItem.titleId;
        await user.save();

        const titleInfo = ALL_TITLES[shopItem.titleId];
        items = await getItems();
        await i.update({ embeds: [await buildShopEmbed(items, user)], components: buildComponents(items, user) });
        await interaction.followUp({ content: `✅ Now wearing **${titleInfo?.display || shopItem.titleId}**!`, ephemeral: true });
        return;
      }

      // Buy item
      if (i.customId.startsWith("buy_")) {
        const itemId = i.customId.replace("buy_", "");
        const shopItem = await ShopItem.findOne({ itemId });
        if (!shopItem) return i.reply({ content: "Item not found!", ephemeral: true });

        // Title check
        if (shopItem.titleId && user.ownedTitles?.includes(shopItem.titleId)) {
          return i.reply({ embeds: [errorEmbed("Already Owned", "You already own this title! Use the Equip button to wear it.")], ephemeral: true });
        }

        await processPurchase(i, shopItem, 1, interaction, user);
        user = await getOrCreateUser(i.user.id, i.user.username);
        items = await getItems();
        await interaction.editReply({ embeds: [await buildShopEmbed(items, user)], components: buildComponents(items, user) });
      }
    } catch (err) {
      console.error("shop collector error:", err);
      try { await i.reply({ content: "⚠️ An error occurred. Please try again.", ephemeral: true }); } catch {}
    }
  });

  collector.on("end", () => interaction.editReply({ components: [] }).catch(() => {}));
}

async function processPurchase(i, item, qty, interaction, user) {
  const total = item.price * qty;

  if (user[item.currency] < total) {
    return i.reply({
      embeds: [errorEmbed("Insufficient Funds", `You need ${formatCurrency(total, item.currency)} but only have ${formatCurrency(user[item.currency], item.currency)}.`)],
      ephemeral: true,
    });
  }

  await removeCurrency(i.user.id, item.currency, total, i.guildId, `shop: ${item.name}`);

  let inv = await Inventory.findOne({ userId: i.user.id });
  if (!inv) inv = await Inventory.create({ userId: i.user.id });

  if (item.category === "ScratchCards") {
    const cardQty = item.itemId === "scratch_card_x5" ? 5 * qty : qty;
    inv.scratchCards += cardQty;
  } else if (item.category === "Jobs" && item.jobName) {
    await User.updateOne({ userId: i.user.id }, { $set: { job: item.jobName } });
  } else if (item.category === "Cosmetics" && item.titleId) {
    await User.updateOne({ userId: i.user.id }, { $addToSet: { ownedTitles: item.titleId } });
  } else {
    const existing = inv.items.find((it) => it.itemId === item.itemId);
    if (existing) existing.quantity += qty;
    else inv.items.push({ itemId: item.itemId, name: item.name, category: item.category, quantity: qty });
  }

  inv.markModified("items");
  await inv.save();

  await Log.create({
    guildId: i.guildId,
    type: "shop",
    userId: i.user.id,
    action: "purchase",
    details: { itemId: item.itemId, name: item.name, qty },
    amount: total,
    currency: item.currency,
  }).catch(() => {});

  const embed = successEmbed("Purchase Successful!", `You bought **${qty}× ${item.emoji} ${item.name}** for ${formatCurrency(total, item.currency)}!`);

  // For titles, also offer equip button
  if (item.titleId) {
    const equipBtn = new ButtonBuilder()
      .setCustomId(`equip_title_${item.titleId}_instant`)
      .setLabel("✨ Equip Now")
      .setStyle(ButtonStyle.Primary);
    const row = new ActionRowBuilder().addComponents(equipBtn);

    const confirmMsg = await i.reply({ embeds: [embed], components: [row], ephemeral: true });

    const equipCollector = confirmMsg.createMessageComponentCollector({ time: 30000 });
    equipCollector.on("collect", async (btn) => {
      try {
        await btn.deferUpdate();
        await User.updateOne({ userId: btn.user.id }, { $set: { equippedTitle: item.titleId } });
        const titleInfo = ALL_TITLES[item.titleId];
        await btn.followUp({ content: `✅ Now wearing **${titleInfo?.display || item.titleId}**!`, ephemeral: true });
        equipCollector.stop();
      } catch {}
    });
    equipCollector.on("end", () => confirmMsg.edit({ components: [] }).catch(() => {}));
    return;
  }

  if (i.replied || i.deferred) await i.followUp({ embeds: [embed], ephemeral: true });
  else await i.reply({ embeds: [embed], ephemeral: true });
}
