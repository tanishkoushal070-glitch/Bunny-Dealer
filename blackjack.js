const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getOrCreateUser, addCurrency, removeCurrency, formatCurrency } = require("../../utils/economy");
const { gamblingEmbed, errorEmbed, COLORS, baseEmbed } = require("../../utils/embed");
const { updateQuestProgress } = require("../../utils/questHelper");

const SUITS = ["♠", "♥", "♦", "♣"];
const VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function createDeck() {
  return SUITS.flatMap((s) => VALUES.map((v) => ({ suit: s, value: v })));
}

function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardValue(card) {
  if (["J", "Q", "K"].includes(card.value)) return 10;
  if (card.value === "A") return 11;
  return parseInt(card.value);
}

function handValue(hand) {
  let total = hand.reduce((sum, c) => sum + cardValue(c), 0);
  let aces = hand.filter((c) => c.value === "A").length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function displayHand(hand) {
  return hand.map((c) => `\`${c.value}${c.suit}\``).join(" ");
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("blackjack")
    .setDescription("🃏 Play a game of Blackjack!")
    .addIntegerOption((o) => o.setName("bet").setDescription("Amount of grass to bet").setRequired(true).setMinValue(1))
    .addUserOption((o) => o.setName("opponent").setDescription("Challenge another user (optional)").setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply();
    const bet = interaction.options.getInteger("bet");
    const player = await getOrCreateUser(interaction.user.id, interaction.user.username);

    if (player.grass < bet) {
      return interaction.editReply({ embeds: [errorEmbed("Insufficient Funds", `You only have 🌿 **${player.grass.toLocaleString()}** Grass!`)] });
    }

    await removeCurrency(interaction.user.id, "grass", bet, interaction.guildId, "blackjack bet");

    const deck = shuffleDeck(createDeck());
    const playerHand = [deck.pop(), deck.pop()];
    const dealerHand = [deck.pop(), deck.pop()];

    function buildEmbed(showDealer = false) {
      const pVal = handValue(playerHand);
      const dVal = showDealer ? handValue(dealerHand) : cardValue(dealerHand[0]);
      return gamblingEmbed("🃏 Blackjack", `**Your Hand:** ${displayHand(playerHand)} — **${pVal}**\n**Dealer:** ${showDealer ? displayHand(dealerHand) : `\`${dealerHand[0].value}${dealerHand[0].suit}\` 🂠`} — **${showDealer ? handValue(dealerHand) : "?"}**`);
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("bj_hit").setLabel("👊 Hit").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("bj_stand").setLabel("🛑 Stand").setStyle(ButtonStyle.Secondary)
    );

    const playerVal = handValue(playerHand);
    if (playerVal === 21) {
      const winAmount = Math.floor(bet * 2.5);
      await addCurrency(interaction.user.id, "grass", winAmount, interaction.guildId, "blackjack blackjack");
      player.stats.gamblingWins = (player.stats.gamblingWins || 0) + 1;
      await player.save();
      await updateQuestProgress(interaction.user.id, "gamblingWins");
      return interaction.editReply({ embeds: [baseEmbed(COLORS.success).setTitle("🃏 BLACKJACK! 🎉").setDescription(`**Your Hand:** ${displayHand(playerHand)} — **21**\n\n🎉 BLACKJACK! You win ${formatCurrency(winAmount, "grass")}!`)] });
    }

    const msg = await interaction.editReply({ embeds: [buildEmbed()], components: [row] });

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 60000,
    });

    collector.on("collect", async (btn) => {
      if (btn.customId === "bj_hit") {
        playerHand.push(deck.pop());
        const pVal = handValue(playerHand);

        if (pVal > 21) {
          player.stats.gamblingLosses = (player.stats.gamblingLosses || 0) + 1;
          await player.save();
          await btn.update({ embeds: [baseEmbed(COLORS.error).setTitle("🃏 Bust!").setDescription(`**Your Hand:** ${displayHand(playerHand)} — **${pVal}** (Bust!)\n\nYou lost ${formatCurrency(bet, "grass")}! 💸`)], components: [] });
          return collector.stop();
        }
        if (pVal === 21) {
          btn.customId = "bj_stand";
          collector.emit("collect", btn);
          return;
        }
        await btn.update({ embeds: [buildEmbed()], components: [row] });
      }

      if (btn.customId === "bj_stand") {
        while (handValue(dealerHand) < 17) dealerHand.push(deck.pop());
        const pVal = handValue(playerHand);
        const dVal = handValue(dealerHand);

        let result, winAmt = 0;
        if (dVal > 21 || pVal > dVal) {
          result = "win"; winAmt = bet * 2;
          await addCurrency(interaction.user.id, "grass", winAmt, interaction.guildId, "blackjack win");
          player.stats.gamblingWins = (player.stats.gamblingWins || 0) + 1;
          await updateQuestProgress(interaction.user.id, "gamblingWins");
        } else if (pVal === dVal) {
          result = "push"; winAmt = bet;
          await addCurrency(interaction.user.id, "grass", winAmt, interaction.guildId, "blackjack push");
        } else {
          result = "lose";
          player.stats.gamblingLosses = (player.stats.gamblingLosses || 0) + 1;
        }
        await player.save();

        const color = result === "win" ? COLORS.success : result === "push" ? COLORS.warning : COLORS.error;
        const title = result === "win" ? "🏆 You Win!" : result === "push" ? "🤝 Push!" : "💀 Dealer Wins!";
        const desc = `**Your Hand:** ${displayHand(playerHand)} — **${pVal}**\n**Dealer:** ${displayHand(dealerHand)} — **${dVal}**\n\n${result === "win" ? `You win ${formatCurrency(winAmt, "grass")}!` : result === "push" ? `Bet returned: ${formatCurrency(bet, "grass")}` : `You lost ${formatCurrency(bet, "grass")}!`}`;

        await btn.update({ embeds: [baseEmbed(color).setTitle(title).setDescription(desc)], components: [] });
        collector.stop();
      }
    });

    collector.on("end", (_, reason) => {
      if (reason === "time") {
        player.stats.gamblingLosses = (player.stats.gamblingLosses || 0) + 1;
        player.save();
        interaction.editReply({ components: [] }).catch(() => {});
      }
    });
  },
};
