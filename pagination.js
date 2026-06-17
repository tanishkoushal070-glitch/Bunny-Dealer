const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");

async function paginate(interaction, pages, timeout = 60000) {
  if (!pages.length) return;
  if (pages.length === 1) {
    return interaction.editReply({ embeds: [pages[0]], components: [] });
  }

  let current = 0;

  const prevBtn = new ButtonBuilder()
    .setCustomId("page_prev")
    .setLabel("◀ Previous")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  const nextBtn = new ButtonBuilder()
    .setCustomId("page_next")
    .setLabel("Next ▶")
    .setStyle(ButtonStyle.Primary);

  const pageBtn = new ButtonBuilder()
    .setCustomId("page_info")
    .setLabel(`Page 1 / ${pages.length}`)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  const row = new ActionRowBuilder().addComponents(prevBtn, pageBtn, nextBtn);

  await interaction.editReply({ embeds: [pages[0]], components: [row] });

  const message = await interaction.fetchReply();
  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === interaction.user.id,
    time: timeout,
  });

  collector.on("collect", async (btn) => {
    if (btn.customId === "page_prev") current = Math.max(0, current - 1);
    if (btn.customId === "page_next") current = Math.min(pages.length - 1, current + 1);

    prevBtn.setDisabled(current === 0);
    nextBtn.setDisabled(current === pages.length - 1);
    pageBtn.setLabel(`Page ${current + 1} / ${pages.length}`);

    await btn.update({ embeds: [pages[current]], components: [row] });
  });

  collector.on("end", () => {
    prevBtn.setDisabled(true);
    nextBtn.setDisabled(true);
    interaction.editReply({ components: [row] }).catch(() => {});
  });
}

module.exports = { paginate };
