const express = require("express");
const functions = require("../structs/functions.js");
const fs = require("fs");
const app = express.Router();
const log = require("../structs/log.js");
const path = require("path");

const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");

const config = JSON.parse(fs.readFileSync("./Config/config.json").toString());

app.post("/fortnite/api/game/v2/chat/*/*/*/pc", (req, res) => {
    log.debug("POST /fortnite/api/game/v2/chat/*/*/*/pc called");
    let resp = config.chat.EnableGlobalChat ? { "GlobalChatRooms": [{ "roomName": "reloadbackendglobal" }] } : {};

    res.json(resp);
});

app.post("/fortnite/api/game/v2/tryPlayOnPlatform/account/*", (req, res) => {
    log.debug("POST /fortnite/api/game/v2/tryPlayOnPlatform/account/* called");
    res.setHeader("Content-Type", "text/plain");
    res.send(true);
});

app.get("/launcher/api/public/distributionpoints/", (req, res) => {
    log.debug("GET /launcher/api/public/distributionpoints/ called");
    res.json({
        "distributions": [
            "https://download.epicgames.com/",
            "https://download2.epicgames.com/",
            "https://download3.epicgames.com/",
            "https://download4.epicgames.com/",
            "https://epicgames-download1.akamaized.net/"
        ]
    });
});

app.get("/launcher/api/public/assets/*", async (req, res) => {
    res.json({
        "appName": "FortniteContentBuilds",
        "labelName": "ReloadBackend",
        "buildVersion": "++Fortnite+Release-20.00-CL-19458861-Windows",
        "catalogItemId": "5cb97847cee34581afdbc445400e2f77",
        "expires": "9999-12-31T23:59:59.999Z",
        "items": {
            "MANIFEST": {
                "signature": "ReloadBackend",
                "distribution": "https://reloadbackend.ol.epicgames.com/",
                "path": "Builds/Fortnite/Content/CloudDir/ReloadBackend.manifest",
                "hash": "55bb954f5596cadbe03693e1c06ca73368d427f3",
                "additionalDistributions": []
            },
            "CHUNKS": {
                "signature": "ReloadBackend",
                "distribution": "https://reloadbackend.ol.epicgames.com/",
                "path": "Builds/Fortnite/Content/CloudDir/ReloadBackend.manifest",
                "additionalDistributions": []
            }
        },
        "assetId": "FortniteContentBuilds"
    });
})

app.get("/Builds/Fortnite/Content/CloudDir/*.manifest", async (req, res) => {
    res.set("Content-Type", "application/octet-stream")

    const manifest = fs.readFileSync(path.join(__dirname, "..", "responses", "CloudDir", "ReloadBackend.manifest"));

    res.status(200).send(manifest).end();
})

app.get("/Builds/Fortnite/Content/CloudDir/*.chunk", async (req, res) => {
    res.set("Content-Type", "application/octet-stream")

    const chunk = fs.readFileSync(path.join(__dirname, "..", "responses", "CloudDir", "ReloadBackend.chunk"));

    res.status(200).send(chunk).end();
})

app.get("/Builds/Fortnite/Content/CloudDir/*.ini", async (req, res) => {
    const ini = fs.readFileSync(path.join(__dirname, "..", "responses", "CloudDir", "Full.ini"));

    res.status(200).send(ini).end();
})

app.get("/waitingroom/api/waitingroom", (req, res) => {
    log.debug("GET /waitingroom/api/waitingroom called");
    res.status(204);
    res.end();
}); 

app.get("/socialban/api/public/v1/*", (req, res) => {
    log.debug("GET /socialban/api/public/v1/* called");
    res.json({
        "bans": [],
        "warnings": []
    });
});

app.get("/fortnite/api/game/v2/events/tournamentandhistory/*/EU/WindowsClient", (req, res) => {
    log.debug("GET /fortnite/api/game/v2/events/tournamentandhistory/*/EU/WindowsClient called");
    res.json({});
});

app.get("/fortnite/api/statsv2/account/:accountId", (req, res) => {
    log.debug(`GET /fortnite/api/statsv2/account/${req.params.accountId} called`);
    res.json({
        "startTime": 0,
        "endTime": 0,
        "stats": {},
        "accountId": req.params.accountId
    });
});

app.get("/statsproxy/api/statsv2/account/:accountId", (req, res) => {
    log.debug(`GET /statsproxy/api/statsv2/account/${req.params.accountId} called`);
    res.json({
        "startTime": 0,
        "endTime": 0,
        "stats": {},
        "accountId": req.params.accountId
    });
});

app.get("/fortnite/api/stats/accountId/:accountId/bulk/window/alltime", (req, res) => {
    log.debug(`GET /fortnite/api/stats/accountId/${req.params.accountId}/bulk/window/alltime called`);
    res.json({
        "startTime": 0,
        "endTime": 0,
        "stats": {},
        "accountId": req.params.accountId
    });
});

app.post("/fortnite/api/feedback/*", (req, res) => {
    log.debug("POST /fortnite/api/feedback/* called");
    res.status(200);
    res.end();
});

app.post("/fortnite/api/statsv2/query", (req, res) => {
    log.debug("POST /fortnite/api/statsv2/query called");
    res.json([]);
});

app.post("/statsproxy/api/statsv2/query", (req, res) => {
    log.debug("POST /statsproxy/api/statsv2/query called");
    res.json([]);
});

app.post("/fortnite/api/game/v2/events/v2/setSubgroup/*", (req, res) => {
    log.debug("POST /fortnite/api/game/v2/events/v2/setSubgroup/* called");
    res.status(204);
    res.end();
});

app.get("/fortnite/api/game/v2/enabled_features", (req, res) => {
    log.debug("GET /fortnite/api/game/v2/enabled_features called");
    res.json([]);
});

app.get("/api/v1/events/Fortnite/download/*", (req, res) => {
    log.debug("GET /api/v1/events/Fortnite/download/* called");
    res.json({});
});

app.get("/fortnite/api/game/v2/twitch/*", (req, res) => {
    log.debug("GET /fortnite/api/game/v2/twitch/* called");
    res.status(200);
    res.end();
});

app.get("/fortnite/api/game/v2/world/info", (req, res) => {
    log.debug("GET /fortnite/api/game/v2/world/info called");
    res.json({});
});

app.post("/fortnite/api/game/v2/chat/*/recommendGeneralChatRooms/pc", (req, res) => {
    log.debug("POST /fortnite/api/game/v2/chat/*/recommendGeneralChatRooms/pc called");
    res.json({});
});

app.get("/fortnite/api/receipts/v1/account/*/receipts", (req, res) => {
    log.debug("GET /fortnite/api/receipts/v1/account/*/receipts called");
    res.json([]);
});

app.get("/fortnite/api/game/v2/leaderboards/cohort/*", (req, res) => {
    log.debug("GET /fortnite/api/game/v2/leaderboards/cohort/* called");
    res.json([]);
});

app.post("/datarouter/api/v1/public/data", (req, res) => {
    log.debug("POST /datarouter/api/v1/public/data called");
    res.status(204);
    res.end();
});

app.post("/api/v1/assets/Fortnite/*/*", async (req, res) => {
    log.debug("POST /api/v1/assets/Fortnite/*/* called");
    if (req.body.hasOwnProperty("FortCreativeDiscoverySurface") && req.body.FortCreativeDiscoverySurface == 0) {
        const discovery_api_assets = require("./../responses/Discovery/discovery_api_assets.json");
        res.json(discovery_api_assets)
    }
    else {
        res.json({
            "FortCreativeDiscoverySurface": {
                "meta": {
                    "promotion": req.body.FortCreativeDiscoverySurface || 0
                },
                "assets": {}
            }
        })
    }
})

module.exports = app;