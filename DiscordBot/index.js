const { Client, Intents } = require("discord.js");
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS] });
const fs = require("fs");
const path = require("path");
const config = JSON.parse(fs.readFileSync("./Config/config.json").toString());
const log = require("../structs/log.js");

client.once("ready", () => {
    log.bot("Bot is up and running!");

    let commands = client.application.commands;

    const loadCommands = (dir) => {
        fs.readdirSync(dir).forEach(file => {
            const filePath = path.join(dir, file);
            if (fs.lstatSync(filePath).isDirectory()) {
                loadCommands(filePath);
            } else if (file.endsWith(".js")) {
                const command = require(filePath);
                commands.create(command.commandInfo);
            }
        });
    };

    loadCommands(path.join(__dirname, "commands"));
});

client.on("interactionCreate", async interaction => {
    if (!interaction.isApplicationCommand()) return;

    const executeCommand = (dir, commandName) => {
        const commandPath = path.join(dir, commandName + ".js");
        if (fs.existsSync(commandPath)) {
            require(commandPath).execute(interaction);
            return true;
        }
        const subdirectories = fs.readdirSync(dir).filter(subdir => fs.lstatSync(path.join(dir, subdir)).isDirectory());
        for (const subdir of subdirectories) {
            if (executeCommand(path.join(dir, subdir), commandName)) {
                return true;
            }
        }
        return false;
    };

    executeCommand(path.join(__dirname, "commands"), interaction.commandName);
});

//AntiCrash System
client.on("error", (err) => {
    console.log("Discord API Error:", err);
});
  
process.on("unhandledRejection", (reason, p) => {
    console.log("Unhandled promise rejection:", reason, p);
});
  
process.on("uncaughtException", (err, origin) => {
    console.log("Uncaught Exception:", err, origin);
});
  
process.on("uncaughtExceptionMonitor", (err, origin) => {
    console.log("Uncaught Exception Monitor:", err, origin);
});

client.login(config.discord.bot_token);