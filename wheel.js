const { SlashCommandBuilder } = require("discord.js");
const { getOrCreateUser, addCurrency, removeCurrency, formatCurrency } = require("../../utils/economy");
const { baseEmbed, errorEmbed, COLORS } = require("../../utils/embed");
const { updateQuestProgress } = require("../../utils/questHelper");

const SEGMENTS = [
  { label: "💀 Lose All",  multiplier: 0,   weight: 20, color: COLORS.error   },
  { label: "🟫 0.5×",      multiplier: 0.5, weight: 20, color: COLORS.warning },
  { label: "🔄 Even",      multiplier: 1.0, weight: 18, color: COLORS.info    },
  { label: "🟢 1.5×",      multiplier: 1.5, weight: 15, color: COLORS.success },
  { label: "🔵 2×",        multiplier: 2.0, weight: 12, color: COLORS.primary },
  { label: "🟣 3×",        multiplier: 3.0, weight: 8,  color: COLORS.rare    },
  { label: "🟠 5×",        multiplier: 5.0, weight: 4,  color: COLORS.gambling },
  { label: "⭐ 10×",       multiplier: 10,  weight: 2,  color: COLORS.warning  },
  { label: "🌟 JACKPOT 25×",multiplier:25,  weight: 1,  color: COLORS.rare    },
];

function spinWheel() {
  const total = SEGMENTS.reduce((s, seg) => s + seg.weight, 0);
  let r = Math.random() * total;
  for (const seg of SEGMENTS) { r -= seg.weight; if (r <= 0) return seg; }
  return SEGMENTS[0];
}

const SPIN_FRAMES = ["🎡", "🌀", "🎡", "🌀", "🎡"];

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("wheel")
    .setDescription("🎡 Spin the prize wheel and test your luck!")
    .addIntegerOption((o) => o.setName("bet").setDescription("Amount of grass to bet").setRequired(true).setMinValue(1)),

  async execute(interaction) {
    await interaction.deferReply();
    const bet = interaction.options.getInteger("bet");
    const user = await getOrCreateUser(interaction.user.id, interaction.user.username);

    if (user.grass < bet) {
      return interaction.editReply({ embeds: [errorEmbed("Insufficient Funds", `You only have 🌿 **${user.grass.toLocaleString()}**!`)] });
    }

    await removeCurrency(interaction.user.id, "grass", bet, interaction.guildId, "wheel bet");

    const result = spinWheel();

    // Animated spin
    const segmentList = SEGMENTS.map((s) => `${s.label}`).join("  |  ");
    for (let i = 0; i < SPIN_FRAMES.length; i++) {
      await interaction.editReply({
        embeds: [
          baseEmbed(COLORS.warning)
            .setTitle(`🎡 Spinning... ${SPIN_FRAMES[i]}`)
            .setDescription(`**Wheel spinning!**\n\n${segmentList}`)
            .setFooter({ text: "🐰 Place your bets..." }),
        ],
      });
      await sleep(600);
    }

    // Final result
    const winAmount = Math.floor(bet * result.multiplier);
    const won = result.multiplier > 1;
    const pushed = result.multiplier === 1.0;

    if (winAmount > 0) {
      await addCurrency(interaction.user.id, "grass", winAmount, interaction.guildId, "wheel win");
    }
    if (won) {
      await updateQuestProgress(interaction.user.id, "gamblingWins");
      await updateQuestProgress(interaction.user.id, "earned", winAmount - bet);
    }

    const wheelDisplay = SEGMENTS.map((s) =>
      s.label === result.label ? `**→ [${s.label}] ←**` : s.label
    ).join("  |  ");

    const description = pushed
      ? `🔄 You landed on **${result.label}** — your bet is returned!`
      : won
      ? `🎉 You landed on **${result.label}**! What a spin!`
      : result.multiplier === 0.5
      ? `😬 You landed on **${result.label}** — lost half your bet.`
      : `💀 You landed on **${result.label}** — better luck next time!`;

    const embed = baseEmbed(result.color)
      .setTitle(`🎡 Wheel Result — ${result.label}`)
      .setDescription(`${description}\n\n${wheelDisplay}`)
      .addFields(
        { name: "💸 Bet", value: formatCurrency(bet, "grass"), inline: true },
        { name: won || pushed ? "💰 Won" : "💔 Lost", value: winAmount > 0 ? formatCurrency(winAmount, "grass") : formatCurrency(bet - winAmount, "grass"), inline: true },
        { name: "✖️ Multiplier", value: `${result.multiplier}×`, inline: true }
      )
      .setFooter({ text: "🐰 Bunny Dealer — Spin again with /wheel" });

    await interaction.editReply({ embeds: [embed] });
  },
};
