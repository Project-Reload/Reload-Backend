const express = require("express");
const app = express.Router();
const { verifyToken } = require("../tokenManager/tokenVerify.js");
const User = require("../model/user.js");
const Profiles = require("../model/profiles.js");
const { Client, Intents, TextChannel } = require('discord.js');
const config = require('../Config/config.json');
const log = require("../structs/log.js");

app.post("/fortnite/api/game/v2/toxicity/account/:unsafeReporter/report/:reportedPlayer", verifyToken, async (req, res) => {
    if (config.bEnableReports === true) {
        try {
            log.debug(`POST /fortnite/api/game/v2/toxicity/account/${req.params.unsafeReporter}/report/${req.params.reportedPlayer} called`);

            const reporter = req.user.accountId;
            const reportedPlayer = req.params.reportedPlayer;

            log.debug(`Searching for reporter with accountId: ${reporter}`);
            let reporterData = await User.findOne({ accountId: reporter }).lean();

            log.debug(`Searching for reported player with accountId: ${reportedPlayer}`);
            let reportedPlayerData = await User.findOne({ accountId: reportedPlayer }).lean();
            let reportedPlayerDataProfile = await Profiles.findOne({ accountId: reportedPlayer }).lean();

            if (!reportedPlayerData) {
                log.error(`Reported player with accountId: ${reportedPlayer} not found in the database`);
                return res.status(404).send({ "error": "Player not found" });
            }

            const reason = req.body.reason || 'No reason provided';
            const details = req.body.details || 'No details provided';
            const playerAlreadyReported = reportedPlayerDataProfile.profiles?.totalReports ? 'Yes' : 'No';

            log.debug(`Player already reported: ${playerAlreadyReported}`);

            const client = new Client({
                intents: [
                    Intents.FLAGS.GUILDS,
                    Intents.FLAGS.GUILD_MESSAGES,
                    Intents.FLAGS.GUILD_MEMBERS,
                    Intents.FLAGS.DIRECT_MESSAGES,
                    Intents.FLAGS.DIRECT_MESSAGE_TYPING,
                    Intents.FLAGS.DIRECT_MESSAGE_REACTIONS
                ]
            });

            await Profiles.findOneAndUpdate(
                { accountId: reportedPlayer },
                { $inc: { 'profiles.totalReports': 1 } },
                { new: true, upsert: true }
            ).then((updatedProfile) => {
                log.debug(`Successfully updated totalReports to ${updatedProfile.profiles.totalReports} for accountId: ${reportedPlayer}`);
            }).catch((err) => {
                log.error(`Error updating totalReports for accountId: ${reportedPlayer}`, err);
                return res.status(500).send({ "error": "Database update error" });
            });

            await new Promise((resolve, reject) => {
                client.once('ready', async () => {

                    try {
                        const payload = {
                            embeds: [{
                                title: 'New User Report',
                                description: 'A new report has arrived!',
                                color: 0xFFA500,
                                fields: [
                                    {
                                        name: "Reporting Player",
                                        value: reporterData.username,
                                        inline: true
                                    },
                                    {
                                        name: "Reported Player",
                                        value: reportedPlayerData.username,
                                        inline: true
                                    },
                                    {
                                        name: "Player already reported",
                                        value: playerAlreadyReported,
                                        inline: false
                                    },
                                    {
                                        name: "Reason",
                                        value: reason,
                                        inline: true
                                    },
                                    {
                                        name: "Additional Details",
                                        value: details,
                                        inline: true
                                    }
                                ]
                            }]
                        };

                        const channel = await client.channels.fetch(config.bReportChannelId);

                        if (channel instanceof TextChannel) {
                            log.debug(`Sending embed to channel with ID: ${channel.id}`);
                            const message = await channel.send({
                                embeds: [payload.embeds[0]]
                            });
                            log.debug(`Message sent with ID: ${message.id}`);
                        } else {
                            log.error("The channel is not a valid text channel or couldn't be found.");
                        }

                        resolve();
                    } catch (error) {
                        log.error('Error sending message:', error);
                        reject(error);
                    }
                });

                client.login(config.discord.bot_token).catch((err) => {
                    log.error("Error logging in Discord bot:", err);
                    reject(err);
                });
            });

            return res.status(200).send({ "success": true });
        } catch (error) {
            log.error(error);
            return res.status(500).send({ "error": "Internal server error" });
        }
    }
});

module.exports = app;