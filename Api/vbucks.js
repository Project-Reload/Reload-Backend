const express = require("express");
const app = express.Router();
const User = require("../model/user.js");
const Profile = require("../model/profiles.js");
const log = require("../structs/log.js");
const fs = require("fs");
const uuid = require("uuid");
const config = JSON.parse(fs.readFileSync("./Config/config.json").toString());

app.get("/api/reload/vbucks", async (req, res) => {
    const { apikey, username, reason } = req.query;

    if (!apikey || apikey !== config.Api.bApiKey) {
        return res.status(401).json({ code: "401", error: "Invalid or missing API key." });
    }
    if (!username) {
        return res.status(400).json({ code: "400", error: "Missing username." });
    }
    if (!reason) {
        return res.status(400).json({ code: "400", error: "Missing reason." });
    }

    const validReasons = config.Api.reasons;
    const addValue = validReasons[reason];

    if (addValue === undefined) {
        return res.status(400).json({ code: "400", error: `Invalid reason. Allowed values: ${Object.keys(validReasons).join(", ")}.` });
    }

    const apiusername = username.trim().toLowerCase();

    try {
        const user = await User.findOne({ username_lower: apiusername });

        if (!user) {
            return res.status(200).json({ message: "User not found." });
        }

        const filter = { accountId: user.accountId };
        const updateCommonCore = { $inc: { 'profiles.common_core.items.Currency:MtxPurchased.quantity': addValue } };
        const updateProfile0 = { $inc: { 'profiles.profile0.items.Currency:MtxPurchased.quantity': addValue } };
        const options = { new: true };

        const updatedProfile = await Profile.findOneAndUpdate(filter, updateCommonCore, options);

        if (!updatedProfile) {
            return res.status(404).json({ code: "404", error: "Profile not found or V-Bucks item missing." });
        }

        await Profile.updateOne(filter, updateProfile0);

        const common_core = updatedProfile.profiles.common_core;
        const newQuantityCommonCore = common_core.items['Currency:MtxPurchased'].quantity;
        const profile0 = updatedProfile.profiles.profile0;
        const newQuantityProfile0 = profile0.items['Currency:MtxPurchased'].quantity + addValue;

        const purchaseId = uuid.v4();
        const lootList = [{
            "itemType": "Currency:MtxGiveaway",
            "itemGuid": "Currency:MtxGiveaway",
            "quantity": addValue
        }];

        common_core.items[purchaseId] = {
            "templateId": `GiftBox:GB_MakeGood`,
            "attributes": {
                "fromAccountId": `[Administrator]`,
                "lootList": lootList,
                "params": {
                    "userMessage": `Thanks For Using Reload Backend!`
                },
                "giftedOn": new Date().toISOString()
            },
            "quantity": 1
        };

        let ApplyProfileChanges = [
            {
                "changeType": "itemQuantityChanged",
                "itemId": "Currency:MtxPurchased",
                "quantity": newQuantityCommonCore
            },
            { // for s1, s2 and s3
                "changeType": "itemQuantityChanged",
                "itemId": "Currency:MtxPurchased",
                "quantity": newQuantityProfile0
            },
            {
                "changeType": "itemAdded",
                "itemId": purchaseId,
                "templateId": "GiftBox:GB_MakeGood"
            }
        ];

        common_core.rvn += 1;
        common_core.commandRevision += 1;
        await Profile.updateOne(filter, { $set: { 'profiles.common_core': common_core, 'profiles.profile0.items.Currency:MtxPurchased.quantity': newQuantityProfile0 } });

        return res.status(200).json({
            profileRevision: common_core.rvn,
            profileCommandRevision: common_core.commandRevision,
            profileChanges: ApplyProfileChanges,
            newQuantityCommonCore,
            newQuantityProfile0
        });

    } catch (err) {
        log.error("Server error:", err);
        return res.status(500).json({ code: "500", error: "Server error. Check console logs for more details." });
    }
});

module.exports = app;
