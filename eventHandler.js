const fs = require("fs");
const path = require("path");

async function loadEvents(client) {
    let loaded = 0;

    const files = fs.readdirSync(__dirname);

    for (const file of files) {
        if (
            [
                "ready.js",
                "interactionCreate.js",
                "messageCreate.js"
            ].includes(file)
        ) {
            try {
                const event = require(path.join(__dirname, file));

                if (event.name && event.execute) {
                    if (event.once) {
                        client.once(event.name, (...args) =>
                            event.execute(...args, client)
                        );
                    } else {
                        client.on(event.name, (...args) =>
                            event.execute(...args, client)
                        );
                    }

                    loaded++;
                }
            } catch (err) {
                console.error(`Failed to load event ${file}:`, err);
            }
        }
    }

    console.log(`🎪 Loaded ${loaded} events`);
}

module.exports = { loadEvents };
