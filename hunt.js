const { SlashCommandBuilder } = require("discord.js");
const { getOrCreateUser, addCurrency } = require("../../utils/economy");
const Inventory = require("../../models/Inventory");
const { checkCooldown, COOLDOWNS } = require("../../utils/cooldown");
const { COLORS, baseEmbed, errorEmbed } = require("../../utils/embed");
const { updateQuestProgress } = require("../../utils/questHelper");

const BUNNY_TABLE = [
  { name: "Common Bunny", rarity: "Common", emoji: "🐰", weight: 40, grassReward: 20 },
  { name: "Brown Bunny", rarity: "Common", emoji: "🐇", weight: 25, grassReward: 40 },
  { name: "Snow Bunny", rarity: "Uncommon", emoji: "🤍🐰", weight: 18, grassReward: 80 },
  { name: "Golden Bunny", rarity: "Rare", emoji: "✨🐰", weight: 10, grassReward: 200 },
  { name: "Crystal Bunny", rarity: "Epic", emoji: "💎🐰", weight: 5, grassReward: 500 },
  { name: "Mythical Bunny", rarity: "Mythical", emoji: "🌟🐰", weight: 2, grassReward: 1500 },
];

const RARITY_COLORS = { Common: COLORS.info, Uncommon: COLORS.success, Rare: COLORS.primary, Epic: COLORS.gambling, Mythical: COLORS.rare };

function huntBunny() {
  const total = BUNNY_TABLE.reduce((s, b) => s + b.weight, 0);
  let rand = Math.random() * total;
  for (const b of BUNNY_TABLE) { rand -= b.weight; if (rand <= 0) return b; }
  return BUNNY_TABLE[0];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("hunt")
    .setDescription("🏹 Hunt for bunnies and add them to your collection!"),

  async execute(interaction) {
    await interaction.deferReply();
    const user = await getOrCreateUser(interaction.user.id, interaction.user.username);
    const cd = checkCooldown(user.lastHunt, COOLDOWNS.HUNT);

    if (cd.onCooldown) {
      return interaction.editReply({ embeds: [errorEmbed("Still Hunting!", `You need to rest your bow for **${cd.readableTime}**!`)] });
    }

    const bunny = huntBunny();
    user.lastHunt = new Date();
    user.stats.huntsCompleted = (user.stats.huntsCompleted || 0) + 1;
    await user.save();

    let inv = await Inventory.findOne({ userId: interaction.user.id });
    if (!inv) inv = await Inventory.create({ userId: interaction.user.id });

    const existing = inv.bunnies.find((b) => b.name === bunny.name);
    if (existing) { existing.quantity++; }
    else { inv.bunnies.push({ name: bunny.name, rarity: bunny.rarity, emoji: bunny.emoji, quantity: 1 }); }
    inv.markModified("bunnies");
    await inv.save();

    await addCurrency(interaction.user.id, "grass", bunny.grassReward, interaction.guildId, `hunt ${bunny.name}`);
    await updateQuestProgress(interaction.user.id, "hunt");

    const embed = baseEmbed(RARITY_COLORS[bunny.rarity] || COLORS.info)
      .setTitle(`🏹 Hunt Successful!`)
      .setDescription(`You caught a ${bunny.emoji} **${bunny.name}**!\n*${bunny.rarity}*`)
      .addFields(
        { name: "💰 Bonus Grass", value: `🌿 **${bunny.grassReward}**`, inline: true },
        { name: "🏹 Total Hunts", value: `${user.stats.huntsCompleted}`, inline: true },
        { name: "⏰ Next Hunt", value: "In 15 minutes", inline: true }
      );

    interaction.editReply({ embeds: [embed] });
  },
};
