module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (message.mentions.has(client.user) && !message.author.bot) {
      const uptime = Date.now() - client.startTime;
      const days = Math.floor(uptime / 86400000);
      const hours = Math.floor((uptime % 86400000) / 3600000);
      const minutes = Math.floor((uptime % 3600000) / 60000);
      const seconds = Math.floor((uptime % 60000) / 1000);
      const ping = client.ws.ping;

      message.reply({
        content: [
          "🐰 **Bunny Dealer** is online!",
          `📡 **Ping:** \`${ping}ms\``,
          `⏱️ **Uptime:** \`${days}d ${hours}h ${minutes}m ${seconds}s\``,
          `\nUse \`/help\` or browse commands with slash!`,
        ].join("\n"),
      });
    }
  },
};
