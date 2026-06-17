require("dotenv").config();

const { Client, GatewayIntentBits, Collection } = require("discord.js");
const mongoose = require("mongoose");
const { loadCommands } = require("./commandHandler");
const { loadEvents } = require("./eventHandler");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();
client.cooldowns = new Collection();
client.startTime = Date.now();

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("🌿 Connected to MongoDB");

    await loadCommands(client);
    await loadEvents(client);

    await client.login(process.env.TOKEN || process.env.DISCORD_TOKEN);
  } catch (err) {
    console.error("Failed to start bot:", err);
    process.exit(1);
  }
}

client.once("ready", () => {
  console.log(`🐰 ${client.user.tag} is online!`);
});

main();
