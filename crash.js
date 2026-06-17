const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getOrCreateUser, addCurrency, removeCurrency, formatCurrency } = require("../../utils/economy");
const { baseEmbed, errorEmbed, COLORS } = require("../../utils/embed");
const { updateQuestProgress } = require("../../utils/questHelper");

// Exponential distribution heavily weighted toward low crash points
function generateCrashPoint() {
  const r = Math.random();
  if (r < 0.25) return 1.0 + Math.random() * 0.3; // instant crash 25% of the time
  if (r < 0.50) return 1.3 + Math.random() * 0.7;  // 1.3x–2.0x
  if (r < 0.70) return 2.0 + Math.random() * 2.0;  // 2x–4x
  if (r < 0.85) return 4.0 + Math.random() * 6.0;  // 4x–10x
  if (r < 0.95) return 10.0 + Math.random() * 10.0;// 10x–20x
  return 20.0 + Math.random() * 30.0;               // 20x–50x
}

const STEPS = [1.15, 1.30, 1.50, 1.75, 2.00, 2.50, 3.00, 4.00, 5.00, 7.50, 10.0, 15.0, 20.0, 30.0, 50.0];
const STEP_DELAY = 2500; // ms between multiplier steps

const ROCKET_FRAMES = ["🚀", "🚀💨", "🚀💨💨", "🚀🔥"];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("crash")
    .setDescription("🚀 Bet on a rising multiplier — cash out before it crashes!")
    .addIntegerOption((o) => o.setName("bet").setDescription("Amount of grass to bet").setRequired(true).setMinValue(1)),

  async execute(interaction) {
    await interaction.deferReply();
    const bet = interaction.options.getInteger("bet");
    const user = await getOrCreateUser(interaction.user.id, interaction.user.username);

    if (user.grass < bet) {
      return interaction.editReply({ embeds: [errorEmbed("Insufficient Funds", `You only have 🌿 **${user.grass.toLocaleString()}**!`)] });
    }

    await removeCurrency(interaction.user.id, "grass", bet, interaction.guildId, "crash bet");

    const crashPoint = generateCrashPoint();
    let currentMultiplier = 1.0;
    let cashedOut = false;
    let stepIdx = 0;
    let frame = 0;

    const buildEmbed = (crashed = false, cashoutMult = null) => {
      if (crashed) {
        return baseEmbed(COLORS.error)
          .setTitle("💥 CRASH!")
          .setDescription(`The rocket exploded at **${crashPoint.toFixed(2)}x**!\n\n❌ You lost ${formatCurrency(bet, "grass")}`)
          .addFields({ name: "💸 Wagered", value: formatCurrency(bet, "grass"), inline: true });
      }
      if (cashoutMult !== null) {
        const winAmount = Math.floor(bet * cashoutMult);
        return baseEmbed(cashoutMult >= 5 ? COLORS.rare : COLORS.success)
          .setTitle("💰 Cashed Out!")
          .setDescription(`You cashed out at **${cashoutMult.toFixed(2)}x**! ${cashoutMult >= 5 ? "🔥 Amazing!" : ""}`)
          .addFields(
            { name: "💸 Bet", value: formatCurrency(bet, "grass"), inline: true },
            { name: "💰 Won", value: formatCurrency(winAmount, "grass"), inline: true },
            { name: "✖️ Multiplier", value: `${cashoutMult.toFixed(2)}x`, inline: true }
          );
      }
      const rocketAnim = ROCKET_FRAMES[frame % ROCKET_FRAMES.length];
      return baseEmbed(COLORS.warning)
        .setTitle(`🚀 Crash — ${rocketAnim}`)
        .setDescription(`**Current Multiplier: \`${currentMultiplier.toFixed(2)}x\`**\n\n⚠️ Click **Cash Out** before the rocket crashes!\nHigher multiplier = higher risk!`)
        .addFields({ name: "💸 Bet", value: formatCurrency(bet, "grass"), inline: true });
    };

    const cashOutRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("crash_cashout")
        .setLabel(`💨 Cash Out`)
        .setStyle(ButtonStyle.Success)
    );

    const msg = await interaction.editReply({ embeds: [buildEmbed()], components: [cashOutRow] });

    const collector = msg.createMessageComponentCollector({
      filter: (i) => {
        if (i.user.id !== interaction.user.id) {
          i.reply({ content: "❌ This isn't your crash game!", ephemeral: true }).catch(() => {});
          return false;
        }
        return i.customId === "crash_cashout";
      },
      max: 1,
      time: STEPS.length * STEP_DELAY + 3000,
    });

    collector.on("collect", async (i) => {
      try {
        cashedOut = true;
        await i.deferUpdate();
        const winAmount = Math.floor(bet * currentMultiplier);
        await addCurrency(interaction.user.id, "grass", winAmount, interaction.guildId, "crash cashout");
        if (currentMultiplier > 1) {
          await updateQuestProgress(interaction.user.id, "gamblingWins");
          await updateQuestProgress(interaction.user.id, "earned", winAmount - bet);
        }
        await interaction.editReply({ embeds: [buildEmbed(false, currentMultiplier)], components: [] });
        collector.stop("cashed_out");
      } catch (err) {
        console.error("crash cashout error:", err);
      }
    });

    // Advance multiplier on a timer
    const advance = async () => {
      if (cashedOut) return;

      const nextMult = STEPS[stepIdx];
      if (nextMult === undefined || nextMult > crashPoint) {
        // CRASH!
        await interaction.editReply({ embeds: [buildEmbed(true)], components: [] }).catch(() => {});
        collector.stop("crashed");
        return;
      }

      currentMultiplier = nextMult;
      stepIdx++;
      frame++;

      await interaction.editReply({ embeds: [buildEmbed()], components: [cashOutRow] }).catch(() => {});
      setTimeout(advance, STEP_DELAY);
    };

    // Check for instant crash before first step
    if (crashPoint < STEPS[0]) {
      setTimeout(async () => {
        if (!cashedOut) {
          await interaction.editReply({ embeds: [buildEmbed(true)], components: [] }).catch(() => {});
          collector.stop("crashed");
        }
      }, 1200);
    } else {
      setTimeout(advance, STEP_DELAY);
    }
  },
};
