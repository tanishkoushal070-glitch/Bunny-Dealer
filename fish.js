const { SlashCommandBuilder } = require("discord.js");
const { getOrCreateUser } = require("../../utils/economy");
const Inventory = require("../../models/Inventory");
const { checkCooldown, COOLDOWNS } = require("../../utils/cooldown");
const { COLORS, baseEmbed, errorEmbed } = require("../../utils/embed");
const { updateQuestProgress } = require("../../utils/questHelper");

const FISH_TABLE = [
  { name: "Sardine", rarity: "Common", emoji: "🐟", weight: 35 },
  { name: "Bass", rarity: "Common", emoji: "🐠", weight: 25 },
  { name: "Trout", rarity: "Uncommon", emoji: "🐡", weight: 20 },
  { name: "Salmon", rarity: "Rare", emoji: "🦈", weight: 12 },
  { name: "Tuna", rarity: "Epic", emoji: "🐋", weight: 6 },
  { name: "Golden Fish", rarity: "Legendary", emoji: "✨🐟", weight: 1.5 },
  { name: "Mythical Leviathan", rarity: "Mythical", emoji: "🌊👑", weight: 0.5 },
];

const RARITY_COLORS = { Common: COLORS.info, Uncommon: COLORS.success, Rare: COLORS.primary, Epic: COLORS.gambling, Legendary: COLORS.warning, Mythical: COLORS.rare };

function catchFish() {
  const total = FISH_TABLE.reduce((s, f) => s + f.weight, 0);
  let rand = Math.random() * total;
  for (const f of FISH_TABLE) { rand -= f.weight; if (rand <= 0) return f; }
  return FISH_TABLE[0];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fish")
    .setDescription("🎣 Go fishing and catch something rare!"),

  async execute(interaction) {
    await interaction.deferReply();
    const user = await getOrCreateUser(interaction.user.id, interaction.user.username);
    const cd = checkCooldown(user.lastFish, COOLDOWNS.FISH);

    if (cd.onCooldown) {
      return interaction.editReply({ embeds: [errorEmbed("Still Fishing!", `Your line is still in the water! Wait **${cd.readableTime}**.`)] });
    }

    const fish = catchFish();
    user.lastFish = new Date();
    user.stats.fishCaught = (user.stats.fishCaught || 0) + 1;
    await user.save();

    let inv = await Inventory.findOne({ userId: interaction.user.id });
    if (!inv) inv = await Inventory.create({ userId: interaction.user.id });

    const existing = inv.fish.find((f) => f.name === fish.name);
    if (existing) { existing.quantity++; }
    else { inv.fish.push({ name: fish.name, rarity: fish.rarity, emoji: fish.emoji, quantity: 1 }); }
    inv.markModified("fish");
    await inv.save();

    await updateQuestProgress(interaction.user.id, "fish");

    const embed = baseEmbed(RARITY_COLORS[fish.rarity] || COLORS.info)
      .setTitle(`🎣 You caught something!`)
      .setDescription(`${fish.emoji} **${fish.name}**\n*${fish.rarity}*`)
      .addFields(
        { name: "⏰ Next Fishing", value: "In 10 minutes", inline: true },
        { name: "🐟 Total Fish", value: `${user.stats.fishCaught}`, inline: true }
      );

    interaction.editReply({ embeds: [embed] });
  },
};
