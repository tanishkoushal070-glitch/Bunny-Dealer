require("dotenv").config();

const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const commands = [];
const commandsPath = path.join(__dirname, "commands");

function readCommands(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      readCommands(fullPath);
    } else if (file.endsWith(".js")) {
      const command = require(fullPath);
      if (command.data) commands.push(command.data.toJSON());
    }
  }
}

readCommands(commandsPath);

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`🐰 Registering ${commands.length} slash commands...`);
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), {
      body: commands,
    });
    console.log("✅ Commands registered globally!");
  } catch (err) {
    console.error("Failed to deploy commands:", err);
  }
})();
