const { SlashCommandBuilder } = require("discord.js");
const { baseEmbed, COLORS } = require("../../utils/embed");

const BUNNY_MESSAGES = [
  "These two are hopping into each other's hearts! 🐰💕",
  "A match made in the carrot patch! 🥕✨",
  "They're definitely sharing a burrow together! 🏠🐰",
  "Their love is as fluffy as a bunny's tail! 🐇💛",
  "They'll be thumping hearts together forever! 💗",
  "Not even a fox could separate these two! 🦊❌",
  "They're meant to graze the same meadow! 🌿💚",
  "Two bunnies, one hole — it's fate! 🐰🐰",
  "Their compatibility is off the charts... for bunnies! 📊🐇",
  "Love at first hop! 🐾💕",
];

function generateShipName(name1, name2) {
  const half1 = name1.slice(0, Math.ceil(name1.length / 2));
  const half2 = name2.slice(Math.floor(name2.length / 2));
  return half1 + half2;
}

function getCompatibilityColor(pct) {
  if (pct >= 80) return COLORS.success;
  if (pct >= 50) return COLORS.warning;
  return COLORS.error;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ship")
    .setDescription("💕 Check the compatibility between two users!")
    .addUserOption((o) => o.setName("user1").setDescription("First user").setRequired(true))
    .addUserOption((o) => o.setName("user2").setDescription("Second user").setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply();
    const user1 = interaction.options.getUser("user1");
    const user2 = interaction.options.getUser("user2");

    const seed = (BigInt(user1.id) + BigInt(user2.id)) % 101n;
    const compatibility = Number(seed);
    const shipName = generateShipName(user1.username, user2.username);
    const message = BUNNY_MESSAGES[Math.floor(Math.random() * BUNNY_MESSAGES.length)];

    const bar = buildBar(compatibility);
    const hearts = compatibility >= 80 ? "💕💕💕" : compatibility >= 50 ? "💛💛" : "🤍";

    const embed = baseEmbed(getCompatibilityColor(compatibility))
      .setTitle(`💕 Ship — ${user1.username} & ${user2.username}`)
      .setDescription([
        `${user1} **+** ${user2}`,
        ``,
        `**Ship Name:** \`${shipName}\``,
        ``,
        `${bar} **${compatibility}%** ${hearts}`,
        ``,
        `*${message}*`,
      ].join("\n"))
      .setThumbnail(user1.displayAvatarURL());

    interaction.editReply({ embeds: [embed] });
  },
};

function buildBar(pct) {
  const filled = Math.round(pct / 10);
  const empty = 10 - filled;
  return `[${"█".repeat(filled)}${"░".repeat(empty)}]`;
}
