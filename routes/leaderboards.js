const express = require("express");
const app = express.Router();
const User = require("../model/user.js");
const UserStats = require("../model/userstats.js");
const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");
const functions = require("../structs/functions.js");
const log = require("../structs/log.js");

app.get("/*/api/statsv2/leaderboards/:leaderboardName", async (req, res) => {
    log.debug(`GET /*/api/statsv2/leaderboards/${req.params.leaderboardName} called`);
    try {
        const playlist = req.params.leaderboardName.split("playlist_default")[1];
        const typeStat = req.params.leaderboardName.split("_keyboardmouse")[0].split("br_")[1];
        const stats = await UserStats.find({});
        if (!stats) return res.status(404).end();
        const clientsStats = [];
        const finalStats = [];
        let maxSize = 100;

        if (req.query.maxSize) {
            if (req.query.maxSize <= 150 && req.query.maxSize > 0) {
                maxSize = Number(req.query.maxSize);
            } else {
                return res.json({
                    error: "minSize: 1 / maxSize: 100"
                });
            }
        }

        for (var stat of stats) {
            const findUser = await User.findOne({ accountId: stat.accountId });
            if (!findUser) continue;
            
            clientsStats.push({
                displayName: findUser.username,
                account: findUser.accountId,
                value: stat[playlist][typeStat] || 0
            });
        }

        clientsStats.sort((a, b) => b.value - a.value);

        for (var finalStat of clientsStats) {
            if (finalStats.length >= maxSize) continue;

            finalStats.push({
                displayName: finalStat.displayName,
                account: finalStat.account,
                value: finalStat.value
            });
        }

        res.json({
            maxSize: maxSize,
            entries: finalStats
        });
    } catch (err) {
        res.json({
            error: "stat not found"
        });
    }
});

app.post("/fortnite/api/leaderboards/type/global/stat/:leaderboardName/window/:typeLeaderboard", async (req, res) => {
    log.debug(`POST /fortnite/api/leaderboards/type/global/stat/${req.params.leaderboardName}/window/req.params.typeLeaderboard called`)
    const playlist = functions.PlaylistNames(req.params.leaderboardName.split("m0_p")[1]).toLowerCase().replace("playlist_default", "");
    const typeStat = req.params.leaderboardName.split("_pc")[0].split("br_")[1];
    const stats = await UserStats.find({});
    if (!stats) return res.status(404).end();
    const entries = [];

    for (var stat of stats) {
        const user = await User.findOne({ accountId: stat.accountId });
        if (!user) continue;

        entries.push({
            accountId: user.accountId,
            displayName: user.username,
            rank: 1,
            value: stat[playlist][typeStat] || 0
        });
    }

    entries.sort((a, b) => b.value - a.value);
    entries.forEach((entry, index) => entry.rank = index + 1);

    res.json({
        statName: req.params.leaderboardName,
        statWindow: req.params.typeLeaderboard,
        entries: entries
    });
});

app.post("/*/api/statsv2/query", verifyToken, async (req, res) => {
    log.debug(`POST /*/api/statsv2/query called`);
    if (!req.body.stats) return res.status(400).end();
    const statKey = req.body.stats[0];
    const playlist = statKey.split("playlist_default")[1];
    const typeStat = statKey.split("_keyboardmouse")[0].split("br_")[1];
    const stats = await UserStats.find({});
    if (!stats) return res.status(404).end();
    const clientsStats = [];

    for (var owner of req.body.owners) {
        const individualStat = await UserStats.findOne({ accountId: owner });
        if (!individualStat) continue;
        if (individualStat[playlist] == undefined) continue;
        if (individualStat[playlist][typeStat] == undefined) continue;

        clientsStats.push({
            accountId: individualStat.accountId,
            endTime: req.body.endTime || 0,
            startTime: req.body.startTime || 0,
            stats: {
                [statKey]: individualStat[playlist][typeStat] || 0
            }
        });
    }

    res.json(clientsStats);
});

app.get("/fortnite/api/game/v2/leaderboards/cohort/:accountId", verifyToken, async (req, res) => {
    log.debug(`GET /fortnite/api/game/v2/leaderboards/cohort/${req.params.accountId} called`);
    res.json({});
});

app.get("/fortnite/api/stats/accountId/:accountId/bulk/window/:windowType", verifyToken, async (req, res) => {
    const stats = await UserStats.findOne({ "accountId": req.params.accountId });
    const allStats = ["solo", "duo", "squad"];
    const statsList = [];
    const allTypesStats = {
        all: ["br_kills", "br_score", "br_matchesplayed", "br_minutesplayed"],
        solo: ["br_placetop1", "br_placetop10", "br_placetop25"],
        duo: ["br_placetop1", "br_placetop5", "br_placetop12"],
        squad: ["br_placetop1", "br_placetop3", "br_placetop6"]
    }

    for (var stat of allStats) {
        for (var typeStat of allTypesStats.all) {
            statsList.push({
                name: `${typeStat}_pc_m0_p${functions.PlaylistNames(stat)}`,
                value: stats[stat][typeStat.replace("br_", "")] || 0,
                window: req.params.windowType,
                ownerType: 1
            });
        }

        for (var typeStats of allTypesStats[stat]) {
            statsList.push({
                name: `${typeStats}_pc_m0_p${functions.PlaylistNames(stat)}`,
                value: stats[stat][typeStats.replace("br_", "")] || 0,
                window: req.params.windowType,
                ownerType: 1
            });
        }
    }

    res.json(statsList);
});

app.get("/*/api/statsv2/account/:accountId", verifyToken, async (req, res) => {
    const stats = await UserStats.findOne({ accountId: req.params.accountId });

    res.json({
        accountId: req.params.accountId,
        endTime: 0,
        startTime: req.query.startTime || 0,
        stats: {
            br_placetop1_keyboardmouse_m0_playlist_defaultsolo: stats.solo.placetop1 || 0,
            br_placetop1_keyboardmouse_m0_playlist_defaultduo: stats.duo.placetop1 || 0,
            br_placetop1_keyboardmouse_m0_playlist_defaultsquad: stats.squad.placetop1 || 0,
            br_placetop1_keyboardmouse_m0_playlist_solidgold_solo: stats.ltm.wins || 0,
            br_placetop10_keyboardmouse_m0_playlist_defaultsolo: stats.solo.placetop10 || 0,
            br_placetop5_keyboardmouse_m0_playlist_defaultduo: stats.duo.placetop5 || 0,
            br_placetop3_keyboardmouse_m0_playlist_defaultsquad: stats.squad.placetop3 || 0,
            br_placetop25_keyboardmouse_m0_playlist_defaultsolo: stats.solo.placetop25 || 0,
            br_placetop12_keyboardmouse_m0_playlist_defaultduo: stats.duo.placetop12 || 0,
            br_placetop6_keyboardmouse_m0_playlist_defaultsquad: stats.squad.placetop6 || 0,
            br_kills_keyboardmouse_m0_playlist_defaultsolo: stats.solo.kills || 0,
            br_kills_keyboardmouse_m0_playlist_defaultduo: stats.duo.kills || 0,
            br_kills_keyboardmouse_m0_playlist_defaultsquad: stats.squad.kills || 0,
            br_kills_keyboardmouse_m0_playlist_solidgold_solo: stats.ltm.kills || 0,
            br_matchesplayed_keyboardmouse_m0_playlist_defaultsolo: stats.solo.matchesplayed || 0,
            br_matchesplayed_keyboardmouse_m0_playlist_defaultduo: stats.duo.matchesplayed || 0,
            br_matchesplayed_keyboardmouse_m0_playlist_defaultsquad: stats.squad.matchesplayed || 0,
            br_matchesplayed_keyboardmouse_m0_playlist_solidgold_solo: stats.ltm.matchesplayed || 0,
            br_minutesplayed_keyboardmouse_m0_playlist_defaultsolo: stats.solo.minutesplayed || 0,
            br_minutesplayed_keyboardmouse_m0_playlist_defaultduo: stats.duo.minutesplayed || 0,
            br_minutesplayed_keyboardmouse_m0_playlist_defaultsquad: stats.squad.minutesplayed || 0,
            br_minutesplayed_keyboardmouse_m0_playlist_solidgold_solo: stats.ltm.minutesplayed || 0,
            br_playersoutlived_keyboardmouse_m0_playlist_defaultsolo: stats.solo.playersoutlived || 0,
            br_playersoutlived_keyboardmouse_m0_playlist_defaultduo: stats.duo.playersoutlived || 0,
            br_playersoutlived_keyboardmouse_m0_playlist_defaultsquad: stats.squad.playersoutlived || 0,
            br_playersoutlived_keyboardmouse_m0_playlist_solidgold_solo: stats.ltm.playersoutlived || 0,
            br_score_keyboardmouse_m0_playlist_defaultsolo: stats.solo.score || 0,
            br_score_keyboardmouse_m0_playlist_defaultduo: stats.duo.score || 0,
            br_score_keyboardmouse_m0_playlist_defaultsquad: stats.squad.score || 0,
            br_score_keyboardmouse_m0_playlist_solidgold_solo: stats.ltm.score || 0
        }
    });
});

module.exports = app;