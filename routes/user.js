const express = require("express");
const app = express.Router();

const error = require("../structs/error.js");
const log = require("../structs/log.js");

const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");
const User = require("../model/user.js");

app.get("/account/api/public/account", async (req, res) => {
    log.debug("GET /account/api/public/account called");
    let response = [];

    if (typeof req.query.accountId == "string") {
        let user = await User.findOne({ accountId: req.query.accountId, banned: false }).lean();

        if (user) {
            response.push({
                id: user.accountId,
                displayName: user.username,
                externalAuths: {}
            });
        }
    }

    if (Array.isArray(req.query.accountId)) {
        let users = await User.find({ accountId: { $in: req.query.accountId }, banned: false }).lean();

        if (users) {
            for (let user of users) {
                if (response.length >= 100) break;
                
                response.push({
                    id: user.accountId,
                    displayName: user.username,
                    externalAuths: {}
                });
            }
        }
    }

    res.json(response);
});

app.get("/account/api/public/account/displayName/:displayName", async (req, res) => {
    log.debug(`GET /account/api/public/account/displayName/${req.params.displayName} called`);
    let user = await User.findOne({ username_lower: req.params.displayName.toLowerCase(), banned: false }).lean();
    if (!user) return error.createError(
        "errors.com.epicgames.account.account_not_found",
        `Sorry, we couldn't find an account for ${req.params.displayName}`, 
        [req.params.displayName], 18007, undefined, 404, res
    );

    if (user.isServer == true) return error.createError(
        "errors.com.epicgames.account.account_not_found",
        `Sorry, we couldn't find an account for ${req.params.displayName}`, 
        [req.params.displayName], 18007, undefined, 404, res
    );
    
    res.json({
        id: user.accountId,
        displayName: user.username,
        externalAuths: {}
    });
});

app.get("/persona/api/public/account/lookup", async (req, res) => {
    log.debug("GET /persona/api/public/account/lookup called");
    if (typeof req.query.q != "string" || !req.query.q) return error.createError(
        "errors.com.epicgames.bad_request",
        "Required String parameter 'q' is invalid or not present", 
        undefined, 1001, undefined, 400, res
    );

    let user = await User.findOne({ username_lower: req.query.q.toLowerCase(), banned: false }).lean();
    if (!user) return error.createError(
        "errors.com.epicgames.account.account_not_found",
        `Sorry, we couldn't find an account for ${req.query.q}`, 
        [req.query.q], 18007, undefined, 404, res
    );
    
    res.json({
        id: user.accountId,
        displayName: user.username,
        externalAuths: {}
    });
});

app.get("/api/v1/search/:accountId", async (req, res) => {
    log.debug(`GET /api/v1/search/${req.params.accountId} called`);
    let response = [];

    if (typeof req.query.prefix != "string" || !req.query.prefix) return error.createError(
        "errors.com.epicgames.bad_request",
        "Required String parameter 'prefix' is invalid or not present", 
        undefined, 1001, undefined, 400, res
    );

    let users = await User.find({ username_lower: new RegExp(`^${req.query.prefix.toLowerCase()}`), banned: false }).lean();

    for (let user of users) {
        if (response.length >= 100) break;

        response.push({
            accountId: user.accountId,
            matches: [
                {
                    "value": user.username,
                    "platform": "epic"
                }
            ],
            matchType: req.query.prefix.toLowerCase() == user.username_lower ? "exact" : "prefix",
            epicMutuals: 0,
            sortPosition: response.length
        });
    }
    
    res.json(response);
});

app.get("/account/api/public/account/:accountId", verifyToken, (req, res) => {
    log.debug(`GET /account/api/public/account/${req.params.accountId} called`);
    res.json({
        id: req.user.accountId,
        displayName: req.user.username,
        name: "Reload",
        email: `[hidden]@${req.user.email.split("@")[1]}`,
        failedLoginAttempts: 0,
        lastLogin: new Date().toISOString(),
        numberOfDisplayNameChanges: 0,
        ageGroup: "UNKNOWN",
        headless: false,
        country: "US",
        lastName: "Server",
        preferredLanguage: "en",
        canUpdateDisplayName: false,
        tfaEnabled: false,
        emailVerified: true,
        minorVerified: false,
        minorExpected: false,
        minorStatus: "NOT_MINOR",
        cabinedMode: false,
        hasHashedEmail: false
    });
});

app.get("/sdk/v1/*", (req, res) => {
    const sdk = require("./../responses/sdkv1.json");
    res.json(sdk);
})

app.get("/epic/id/v2/sdk/accounts", async (req, res) => {
    let user = await User.findOne({ accountId: req.query.accountId, banned: false }).lean();
    if (!user) return error.createError(
        "errors.com.epicgames.account.account_not_found",
        `Sorry, we couldn't find an account for ${req.query.accountId}`, 
        [req.query.accountId], 18007, undefined, 404, res
    );
    res.json([{
        accountId: user.accountId,
        displayName: user.username,
        preferredLanguage: "en",
        cabinedMode: false,
        empty: false
    }]);
})

app.all("/fortnite/api/game/v2/profileToken/verify/:accountId", (req, res) => {
    log.debug(`ALL /fortnite/api/game/v2/profileToken/verify/${req.params.accountId} called`);
    
    if (req.method != "POST") {
        const err = error.method(req);
        return res.header(err.header).status(405).send(err.error);
    }

    res.status(204).send();
});

app.delete("/account/api/oauth/sessions/kill/*", async (req, res) => {
    log.debug("DELETE account/api/oauth/sessions/kill/* called");
    res.status(204);
    res.end();
})

app.all("/v1/epic-settings/public/users/*/values", (req, res) => {
    log.debug("ALL /v1/epic-settings/public/users/*/values called");
    res.json({});
})

app.get("/account/api/public/account/*/externalAuths", (req, res) => {
    log.debug("GET /account/api/public/account/*/externalAuths called");
    res.json([]);
});

app.get("/account/api/epicdomains/ssodomains", async (req, res) => {
    log.debug("GET /account/api/epicdomains/ssodomains called");
    res.json([
        "unrealengine.com",
        "unrealtournament.com",
        "fortnite.com",
        "epicgames.com"
    ])
})

app.post("/fortnite/api/game/v2/tryPlayOnPlatform/account/*", async (req, res) => {
    log.debug("POST /fortnite/api/game/v2/tryPlayOnPlatform/account/* called");
    res.setHeader("Content-Type", "text/plain");
    res.send(true);
})

module.exports = app;