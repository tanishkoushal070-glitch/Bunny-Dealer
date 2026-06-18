const fs = require("fs");
const path = require("path");

async function loadCommands(client) {
    let loaded = 0;

    const files = fs.readdirSync(__dirname);

    for (const file of files) {
        if (
            file.endsWith(".js") &&
            ![
                "index.js",
                "commandHandler.js",
                "eventHandler.js",
                "deploy-commands.js"
            ].includes(file)
        ) {
            try {
                const command = require(path.join(__dirname, file));

                if (command.data && command.execute) {
                    client.commands.set(command.data.name, command);
                    loaded++;
                }
            } catch (err) {
                console.error(`Failed to load ${file}:`, err);
            }
        }
    }

    console.log(`📦 Loaded ${loaded} commands`);
}

module.exports = { loadCommands };
