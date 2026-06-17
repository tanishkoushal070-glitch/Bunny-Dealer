const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require("discord.js");
const { getOrCreateUser } = require("../../utils/economy");
const { baseEmbed, COLORS } = require("../../utils/embed");

const JOBS = [
  // Common
  { name: "Farmer",           emoji: "🌾", rarity: "Common",    minPay: 50,  maxPay: 300 },
  { name: "Builder",          emoji: "🔨", rarity: "Common",    minPay: 110, maxPay: 550 },
  { name: "Guard",            emoji: "🛡️", rarity: "Common",    minPay: 120, maxPay: 600 },
  { name: "Lumberjack",       emoji: "🪓", rarity: "Common",    minPay: 100, maxPay: 520 },
  { name: "Beekeeper",        emoji: "🐝", rarity: "Common",    minPay: 90,  maxPay: 480 },
  { name: "Herbalist",        emoji: "🌿", rarity: "Common",    minPay: 80,  maxPay: 440 },
  // Uncommon
  { name: "Fisher",           emoji: "🎣", rarity: "Uncommon",  minPay: 80,  maxPay: 400 },
  { name: "Hunter",           emoji: "🏹", rarity: "Uncommon",  minPay: 100, maxPay: 500 },
  { name: "Chef",             emoji: "👨‍🍳", rarity: "Uncommon",  minPay: 140, maxPay: 680 },
  { name: "Witch",            emoji: "🧙", rarity: "Uncommon",  minPay: 130, maxPay: 640 },
  { name: "Blacksmith",       emoji: "⚒️", rarity: "Uncommon",  minPay: 150, maxPay: 720 },
  { name: "Pirate",           emoji: "🏴‍☠️", rarity: "Uncommon",  minPay: 140, maxPay: 700 },
  // Rare
  { name: "Explorer",         emoji: "🗺️", rarity: "Rare",      minPay: 120, maxPay: 600 },
  { name: "Merchant",         emoji: "💰", rarity: "Rare",      minPay: 150, maxPay: 700 },
  { name: "Miner",            emoji: "⛏️", rarity: "Rare",      minPay: 130, maxPay: 650 },
  { name: "Researcher",       emoji: "🔬", rarity: "Rare",      minPay: 160, maxPay: 750 },
  { name: "Alchemist",        emoji: "⚗️", rarity: "Rare",      minPay: 170, maxPay: 800 },
  { name: "Redstone Engineer",emoji: "🔴", rarity: "Rare",      minPay: 180, maxPay: 850 },
  { name: "Diamond Miner",    emoji: "💎", rarity: "Rare",      minPay: 200, maxPay: 950 },
  // Epic
  { name: "Knight",           emoji: "⚔️", rarity: "Epic",      minPay: 220, maxPay: 1000 },
  { name: "Wizard",           emoji: "🪄", rarity: "Epic",      minPay: 240, maxPay: 1100 },
  { name: "Enchanter",        emoji: "✨", rarity: "Epic",      minPay: 260, maxPay: 1200 },
  { name: "Treasure Hunter",  emoji: "🗝️", rarity: "Epic",      minPay: 280, maxPay: 1300 },
  // Legendary
  { name: "Dragon Tamer",     emoji: "🐉", rarity: "Legendary", minPay: 400, maxPay: 2000 },
  { name: "Carrot King",      emoji: "🥕", rarity: "Legendary", minPay: 500, maxPay: 2500 },
];

const RARITY_COLORS = {
  Common: "🟢", Uncommon: "🔵", Rare: "🟣", Epic: "🟠", Legendary: "🟡",
};

const RARITY_ORDER = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("job")
    .setDescription("💼 View and select your job"),

  async execute(interaction) {
    await interaction.deferReply();
    const user = await getOrCreateUser(interaction.user.id, interaction.user.username);

    const grouped = RARITY_ORDER.map((rarity) => ({
      rarity,
      jobs: JOBS.filter((j) => j.rarity === rarity),
    }));

    const desc = grouped.map(({ rarity, jobs }) =>
      `**${RARITY_COLORS[rarity]} ${rarity}**\n` +
      jobs.map((j) => `${j.emoji} **${j.name}** — 🌿 ${j.minPay}–${j.maxPay}`).join("\n")
    ).join("\n\n");

    const embed = baseEmbed(COLORS.primary)
      .setTitle("💼 Job Board")
      .setDescription(`**Your Job:** ${user.job || "Unemployed"}\n\n${desc}\n\nPick a job below to switch!`);

    const chunks = [];
    for (let i = 0; i < JOBS.length; i += 25) chunks.push(JOBS.slice(i, i + 25));

    const rows = chunks.map((chunk) =>
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`job_select_${chunks.indexOf(chunk)}`)
          .setPlaceholder("🐰 Choose a job...")
          .addOptions(chunk.map((j) => ({
            label: j.name,
            description: `${j.rarity} | 🌿 ${j.minPay}–${j.maxPay} per shift`,
            value: j.name,
            emoji: j.emoji.split("\u200d")[0].trim(),
          })))
      )
    );

    const reply = await interaction.editReply({ embeds: [embed], components: rows });

    const collector = reply.createMessageComponentCollector({
      filter: (i) => {
        if (i.user.id !== interaction.user.id) {
          i.reply({ content: "❌ This job board isn't yours!", ephemeral: true }).catch(() => {});
          return false;
        }
        return true;
      },
      time: 45000,
    });

    collector.on("collect", async (i) => {
      try {
        const selectedJob = i.values[0];
        await i.deferUpdate();
        const u = await getOrCreateUser(i.user.id, i.user.username);
        u.job = selectedJob;
        await u.save();
        const job = JOBS.find((j) => j.name === selectedJob);
        embed.setDescription(`✅ You are now a **${job.emoji} ${job.name}**!\n\nUse \`/work\` to earn grass every 30 minutes.\n💼 Pay range: 🌿 ${job.minPay}–${job.maxPay} per shift`);
        await interaction.editReply({ embeds: [embed], components: [] });
        collector.stop();
      } catch (err) {
        console.error("job collector error:", err);
      }
    });

    collector.on("end", (_, reason) => {
      if (reason === "time") interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};
