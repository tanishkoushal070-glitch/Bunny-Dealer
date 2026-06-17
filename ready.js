const { ActivityType } = require("discord.js");

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    console.log(`🐰 ${client.user.tag} is online!`);
    client.user.setPresence({
      activities: [{ name: "🌿 /daily | Bunny Dealer", type: ActivityType.Playing }],
      status: "online",
    });
  },
};
