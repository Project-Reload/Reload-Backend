const express = require("express");
const router = express.Router();

const multer = require("multer");
const { Client, Intents, MessageAttachment } = require("discord.js");

const { verifyToken } = require("../tokenManager/tokenVerify.js");
const User = require("../model/user.js");
const Profiles = require("../model/profiles.js");

const config = require("../Config/config.json");
const log = require("../structs/log.js");

// Fortnite sends feedback as multipart/form-data (Bug/Comment/Player).
// express.json/urlencoded cannot parse it, so we need multer.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        // Lobby bug reports can include Screenshot.jpg + clientlog.log.gz.
        // Keep this generous but bounded.
        fileSize: 25 * 1024 * 1024,
        files: 10,
        fieldSize: 2 * 1024 * 1024
    }
});

// Simple in-memory cooldown to prevent spamming.
// Key: <accountId>:<type>
const lastReportAt = new Map();
const REPORT_COOLDOWN_MS = 15 * 1000;

let discordClient;
let discordClientReadyPromise;

async function getDiscordClient() {
    if (!config?.discord?.bUseDiscordBot) return null;
    if (!config?.discord?.bot_token) {
        log.warn("Reports: Discord bot is enabled but config.discord.bot_token is empty.");
        return null;
    }
    if (!config?.bReportChannelId || config.bReportChannelId === "your-discord-channel-id-here") {
        log.warn("Reports: config.bReportChannelId is not configured.");
        return null;
    }

    if (discordClient && discordClient.isReady?.()) return discordClient;
    if (discordClientReadyPromise) {
        await discordClientReadyPromise;
        return discordClient;
    }

    discordClient = new Client({
        intents: [
            Intents.FLAGS.GUILDS,
            Intents.FLAGS.GUILD_MESSAGES
        ]
    });

    discordClientReadyPromise = (async () => {
        await discordClient.login(config.discord.bot_token);
        if (!discordClient.isReady?.()) {
            await new Promise((resolve) => discordClient.once("ready", resolve));
        }
    })().catch((err) => {
        log.error("Reports: failed to login Discord client", err);
        // Reset so next request can retry.
        discordClientReadyPromise = null;
        discordClient = null;
        throw err;
    });

    await discordClientReadyPromise;
    return discordClient;
}

function normalizeType(urlType, bodyType) {
    const t = (urlType || bodyType || "").toString().trim();
    const lower = t.toLowerCase();
    if (lower === "bug") return "Bug";
    if (lower === "comment") return "Comment";
    if (lower === "player") return "Player";
    return t || "Unknown";
}

function canAcceptReport(accountId, type) {
    const key = `${accountId}:${type}`;
    const now = Date.now();
    const last = lastReportAt.get(key) || 0;
    if (now - last < REPORT_COOLDOWN_MS) return false;
    lastReportAt.set(key, now);
    return true;
}

async function sendToDiscord({ type, reporter, fields, files }) {
    const client = await getDiscordClient();
    if (!client) return;

    const channel = await client.channels.fetch(config.bReportChannelId).catch(() => null);
    if (!channel || !channel.send) {
        log.warn("Reports: Discord channel not found or not sendable.");
        return;
    }

    const embed = {
        title: `New Feedback Report (${type})`,
        description: "A new lobby / in-game feedback report arrived.",
        color: 0xFFA500,
        fields
    };

    const attachments = (files || []).slice(0, 10).map((f) => {
        // discord.js v13 can send Buffers as attachments.
        const name = f.originalname || "attachment.bin";
        return new MessageAttachment(f.buffer, name);
    });

    await channel.send({
        embeds: [embed],
        files: attachments
    }).catch((err) => {
        log.error("Reports: failed to send report to Discord", err);
    });
}

/**
 * LOBBY + IN-GAME FEEDBACK REPORTS
 *
 * Seen in your captures:
 *  - POST /fortnite/api/feedback/Bug
 *  - POST /fortnite/api/feedback/Comment
 *  - POST /fortnite/api/feedback/Player
 *
 * These are multipart/form-data requests with fields like:
 *  feedbacktype, displayname, email, accountid, engineversion, platform,
 *  gamebackend, gamename, subgamename, subject, feedbackbody
 *
 * Bug reports can also include files: Screenshot.jpg, clientlog.log.gz, etc.
 */
router.post(
    "/fortnite/api/feedback/:type",
    verifyToken,
    upload.any(),
    async (req, res) => {
        log.debug(`POST /fortnite/api/feedback/${req.params.type} called`);

        // Even when disabled, respond OK so the client doesn't hang.
        if (config.bEnableReports !== true) {
            return res.status(200).end();
        }

        const type = normalizeType(req.params.type, req.body?.feedbacktype);
        const accountId = req.user?.accountId || req.body?.accountid || "unknown";

        if (!canAcceptReport(accountId, type)) {
            // Prevent spam (client doesn't need a special error)
            return res.status(200).end();
        }

        const reporterDisplayName = req.body?.displayname || req.user?.username || "Unknown";
        const reporterEmail = req.body?.email || "";
        const subject = req.body?.subject || "";
        const feedbackBody = req.body?.feedbackbody || "";
        const engineVersion = req.body?.engineversion || "";
        const platform = req.body?.platform || "";
        const gameBackend = req.body?.gamebackend || "";
        const gameName = req.body?.gamename || "";
        const subGameName = req.body?.subgamename || "";
        const correlationId = req.headers["x-epic-correlation-id"] || "";

        const fields = [
            { name: "Reporter", value: reporterDisplayName || "-", inline: true },
            { name: "AccountId", value: accountId || "-", inline: true },
            { name: "Type", value: type, inline: true },
            { name: "Subject", value: subject || "-", inline: false },
            { name: "Body", value: (feedbackBody || "-").slice(0, 1024), inline: false },
            { name: "Platform", value: platform || "-", inline: true },
            { name: "EngineVersion", value: engineVersion || "-", inline: true },
            { name: "Game", value: `${gameBackend || "-"} / ${gameName || "-"} / ${subGameName || "-"}`, inline: false }
        ];

        if (reporterEmail) {
            // Discord embeds have a max total size; keep this small.
            fields.push({ name: "Email", value: reporterEmail.slice(0, 256), inline: false });
        }
        if (correlationId) {
            fields.push({ name: "X-Epic-Correlation-ID", value: correlationId.toString().slice(0, 256), inline: false });
        }

        // Optional: include username from DB if it differs.
        try {
            const reporterData = await User.findOne({ accountId }).lean();
            if (reporterData?.username && reporterData.username !== reporterDisplayName) {
                fields.unshift({ name: "DB Username", value: reporterData.username, inline: true });
            }
        } catch (e) {
            // Non-fatal
        }

        await sendToDiscord({
            type,
            reporter: { accountId, displayName: reporterDisplayName },
            fields,
            files: req.files || []
        });

        return res.status(200).end();
    }
);

/**
 * IN-GAME TOXICITY REPORTS
 * (Existing endpoint kept as-is)
 */
router.post(
    "/fortnite/api/game/v2/toxicity/account/:unsafeReporter/report/:reportedPlayer",
    verifyToken,
    async (req, res) => {
        if (config.bEnableReports !== true) return res.status(200).end();

        try {
            log.debug(
                `POST /fortnite/api/game/v2/toxicity/account/${req.params.unsafeReporter}/report/${req.params.reportedPlayer} called`
            );

            const reporter = req.user.accountId;
            const reportedPlayer = req.params.reportedPlayer;

            log.debug(`Searching for reporter with accountId: ${reporter}`);
            let reporterData = await User.findOne({ accountId: reporter }).lean();

            log.debug(`Searching for reported player with accountId: ${reportedPlayer}`);
            let reportedPlayerData = await User.findOne({ accountId: reportedPlayer }).lean();
            let reportedPlayerDataProfile = await Profiles.findOne({ accountId: reportedPlayer }).lean();

            if (!reportedPlayerData) {
                log.error(`Reported player with accountId: ${reportedPlayer} not found in the database`);
                return res.status(404).send({ error: "Player not found" });
            }

            const reason = req.body.reason || "No reason provided";
            const details = req.body.details || "No details provided";
            const playerAlreadyReported = reportedPlayerDataProfile?.profiles?.totalReports ? "Yes" : "No";

            log.debug(`Player already reported: ${playerAlreadyReported}`);

            await Profiles.findOneAndUpdate(
                { accountId: reportedPlayer },
                { $inc: { "profiles.totalReports": 1 } },
                { new: true, upsert: true }
            )
                .then((updatedProfile) => {
                    log.debug(
                        `Successfully updated totalReports to ${updatedProfile.profiles.totalReports} for accountId: ${reportedPlayer}`
                    );
                })
                .catch((err) => {
                    log.error(`Error updating totalReports for accountId: ${reportedPlayer}`, err);
                    return res.status(500).send({ error: "Database update error" });
                });

            // Forward to Discord, if configured.
            await sendToDiscord({
                type: "Toxicity",
                reporter: { accountId: reporter, displayName: reporterData?.username || reporter },
                fields: [
                    { name: "Reporting Player", value: reporterData?.username || reporter, inline: true },
                    { name: "Reported Player", value: reportedPlayerData?.username || reportedPlayer, inline: true },
                    { name: "Player already reported", value: playerAlreadyReported, inline: false },
                    { name: "Reason", value: reason, inline: true },
                    { name: "Additional Details", value: details, inline: true }
                ]
            });

            return res.status(200).send({ success: true });
        } catch (error) {
            log.error(error);
            return res.status(500).send({ error: "Internal server error" });
        }
    }
);

module.exports = router;
