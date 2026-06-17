const fs = require("fs");
const path = require("path");

async function loadCommands(client) {
  const commandsPath = path.join(__dirname, "../commands");
  let loaded = 0;

  function readDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        readDir(fullPath);
      } else if (file.endsWith(".js")) {
        try {
          const command = require(fullPath);
          if (command.data && command.execute) {
            client.commands.set(command.data.name, command);
            loaded++;
          }
        } catch (e) {
          console.error(`Failed to load command ${file}:`, e);
        }
      }
    }
  }

  readDir(commandsPath);
  console.log(`🐰 Loaded ${loaded} commands`);
}

module.exports = { loadCommands };
