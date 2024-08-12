const express = require("express");
const mongoose = require("mongoose");
const fs = require("fs");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const path = require("path");
const config = JSON.parse(fs.readFileSync("./Config/config.json").toString());

const log = require("./structs/log.js");
const error = require("./structs/error.js");
const functions = require("./structs/functions.js");

const app = express();

if (!fs.existsSync("./ClientSettings")) fs.mkdirSync("./ClientSettings");

global.JWT_SECRET = functions.MakeID();
const PORT = config.port;
const WEBSITEPORT = config.Website.websiteport;

if (!fs.existsSync("./ClientSettings")) fs.mkdirSync("./ClientSettings");

global.JWT_SECRET = functions.MakeID();

console.log('Welcome to Reload Backend\n');

const tokens = JSON.parse(fs.readFileSync("./tokenManager/tokens.json").toString());

for (let tokenType in tokens) {
    for (let tokenIndex in tokens[tokenType]) {
        let decodedToken = jwt.decode(tokens[tokenType][tokenIndex].token.replace("eg1~", ""));

        if (DateAddHours(new Date(decodedToken.creation_date), decodedToken.hours_expire).getTime() <= new Date().getTime()) {
            tokens[tokenType].splice(Number(tokenIndex), 1);
        }
    }
}

fs.writeFileSync("./tokenManager/tokens.json", JSON.stringify(tokens, null, 2));

global.accessTokens = tokens.accessTokens;
global.refreshTokens = tokens.refreshTokens;
global.clientTokens = tokens.clientTokens;

global.exchangeCodes = [];

mongoose.connect(config.mongodb.database, () => {
    log.backend("App successfully connected to MongoDB!");
});

mongoose.connection.on("error", err => {
    log.error("MongoDB failed to connect, please make sure you have MongoDB installed and running.");
    throw err;
});

app.use(rateLimit({ windowMs: 0.5 * 60 * 1000, max: 45 }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

fs.readdirSync("./routes").forEach(fileName => {
    app.use(require(`./routes/${fileName}`));
});

app.get("/unknown", (req, res) => {
    log.debug('GET /unknown endpoint called');
    res.json({ msg: "Reboot Backend - Made by Burlone" });
});

app.listen(PORT, () => {
    log.backend(`Backend started listening on port ${PORT}`);

    require("./xmpp/xmpp.js");
    if (config.discord.bUseDiscordBot === true) {
        require("./DiscordBot");
    }
}).on("error", async (err) => {
    if (err.code === "EADDRINUSE") {
        log.error(`Port ${PORT} is already in use!\nClosing in 3 seconds...`);
        await functions.sleep(3000);
        process.exit(0);
    } else throw err;
});

if (config.Website.bUseWebsite === true) {
    const websiteApp = express();
    require('./Website/website')(websiteApp);

    websiteApp.listen(WEBSITEPORT, () => {
        log.website(`Website started listening on port ${WEBSITEPORT}`);
    }).on("error", async (err) => {
        if (err.code === "EADDRINUSE") {
            log.error(`Website port ${WEBSITEPORT} is already in use!\nClosing in 3 seconds...`);
            await functions.sleep(3000);
            process.exit(1);
        } else {
            throw err;
        }
    });
}

app.use((req, res, next) => {
    const url = req.originalUrl;
    log.debug(`Missing endpoint: ${req.method} ${url} request port ${req.socket.localPort}`);
    if (req.url.includes("..")) {
        res.redirect("https://youtu.be/dQw4w9WgXcQ");
        return;
    }
    error.createError(
        "errors.com.epicgames.common.not_found", 
        "Sorry the resource you were trying to find could not be found", 
        undefined, 1004, undefined, 404, res
    );
});

module.exports = app;