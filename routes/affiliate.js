const express = require("express");
const app = express.Router();

const codes = require("./../model/saccodes.js");
const Profile = require("../model/profiles.js");
const User = require("./../model/user.js");

const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");
const log = require("../structs/log.js");

app.get("/affiliate/api/public/affiliates/slug/:slug", async (req, res) => {
    var slug = req.params.slug;
    var lccode = slug.toLowerCase();

    log.debug(`GET /affiliate/api/public/affiliates/slug/${slug} called`);

    const code = await codes.findOne({ code_lower: lccode });

    var ValidCode = null;

    if (code === null) { ValidCode = false } else { ValidCode = true }

    if (ValidCode === true) {
        log.debug(`Code found: ${code.code}`);
        return res.json({
            "id": code.code,
            "slug": code.code,
            "displayName": code.code,
            "code_higher": code.code_higher,
            "status": "ACTIVE",
            "verified": false
        });
    }

    if (ValidCode === false) {
        log.debug(`Code not found: ${slug}`);
        res.status(404);
        res.json({});
    }
});

app.post("/fortnite/api/game/v2/profile/*/client/SetAffiliateName", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.params[0] });
    let profile = profiles.profiles[req.query.profileId];

    var ApplyProfileChanges = [];
    var BaseRevision = profile.rvn || 0;
    var QueryRevision = req.query.rvn || -1;
    var StatChanged = false;

    var slug = req.body.affiliateName;
    var lccode = slug.toLowerCase();

    log.debug(`POST /fortnite/api/game/v2/profile/*/client/SetAffiliateName called with slug: ${slug}`);

    const code = await codes.findOne({ code_lower: lccode });

    if (code == null) {
        log.debug(`Affiliate name not found: ${slug}`);
        res.status(404);
        res.json({});
    }

    profile.stats.attributes.mtx_affiliate_set_time = new Date().toISOString();
    profile.stats.attributes.mtx_affiliate = code.code;

    await User.updateOne({ accountId: req.user.accountId }, { $set: { currentSACCode: code.code } });

    StatChanged = true;

    if (StatChanged === true) {
        profile.rvn += 1;
        profile.commandRevision += 1;

        ApplyProfileChanges.push({
            "changeType": "statModified",
            "name": "mtx_affiliate_set_time",
            "value": profile.stats.attributes.mtx_affiliate_set_time
        });

        ApplyProfileChanges.push({
            "changeType": "statModified",
            "name": "mtx_affiliate",
            "value": profile.stats.attributes.mtx_affiliate
        });
    }

    if (QueryRevision != BaseRevision) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });

    res.json({
        "profileRevision": profile.rvn || 0,
        "profileId": req.query.profileId || "common_core",
        "profileChangesBaseRevision": BaseRevision,
        "profileChanges": ApplyProfileChanges,
        "profileCommandRevision": profile.commandRevision || 0,
        "serverTime": new Date().toISOString(),
        "responseVersion": 1
    });
    res.end();
});

module.exports = app;