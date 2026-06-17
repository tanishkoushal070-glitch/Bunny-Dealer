const { errorEmbed } = require("../utils/embed");

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    // --- Slash Commands ---
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(`Error in /${interaction.commandName}:`, err);
        const embed = errorEmbed("Command Error", "Something went wrong running this command. Please try again.");
        const reply = { embeds: [embed], ephemeral: true };
        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply);
          } else {
            await interaction.reply(reply);
          }
        } catch {}
      }
      return;
    }

    // --- Button / Select Menu interactions ---
    // If a collector is active, it will handle these. If not (expired or wrong user),
    // we reply with a graceful message so Discord doesn't show "interaction failed".
    if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) {
      // Give active collectors 800ms to process first, then handle orphans
      setTimeout(async () => {
        try {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: "⏰ This interaction has expired or isn't for you.",
              ephemeral: true,
            });
          }
        } catch {
          // Already handled by a collector — safe to ignore
        }
      }, 800);
    }
  },
};
