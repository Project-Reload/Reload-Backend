const express = require("express");
const app = express.Router();

const Profile = require("../model/profiles.js");
const User = require("../model/user.js");
const functions = require("../structs/functions.js");
const log = require("../structs/log.js");

const fs = require("fs");
const path = require("path");
const config = require("../Config/config.json");

app.get("/api/reload/bptiers", async (req, res) => {
    try {
        const { apikey, username, reason } = req.query;

        // --- Basic validation ---
        if (!apikey || apikey !== config.Api.bApiKey) {
            return res.status(401).json({
                code: "401",
                error: "Invalid or missing API key."
            });
        }

        if (!username) {
            return res.status(400).json({
                code: "400",
                error: "Missing username."
            });
        }

        if (!reason) {
            return res.status(400).json({
                code: "400",
                error: "Missing reason."
            });
        }

        const validReasons = config.Api.battlepass || {};
        const tiersToAdd = validReasons[reason];

        if (typeof tiersToAdd !== "number" || tiersToAdd <= 0) {
            return res.status(400).json({
                code: "400",
                error: `Invalid reason. Allowed values: ${Object.keys(validReasons).join(", ")}`
            });
        }

        if (!config.bEnableBattlepass) {
            return res.status(400).json({
                code: "400",
                error: "Battle Pass is disabled in the server config."
            });
        }

        // --- Find user ---
        const usernameLower = username.trim().toLowerCase();
        const user = await User.findOne({ username_lower: usernameLower });

        if (!user) {
            return res.status(404).json({
                code: "404",
                error: "User not found."
            });
        }

        // --- Load profiles ---
        const profilesDoc = await Profile.findOne({ accountId: user.accountId });
        if (!profilesDoc || !profilesDoc.profiles) {
            return res.status(404).json({
                code: "404",
                error: "Profiles document not found."
            });
        }

        const profiles = profilesDoc.profiles;

        // profileId is either "common_core" or "profile0" there.
        let profile = profiles["common_core"] || profiles["profile0"];
        let profile0 = profiles["profile0"] || profile;
        let athena = profiles["athena"];

        if (!profile || !profile0 || !athena) {
            return res.status(404).json({
                code: "404",
                error: "Required profiles (common_core/profile0/athena) not found."
            });
        }

        // Ensure structures exist
        profile.items = profile.items || {};
        profile0.items = profile0.items || {};
        athena.items = athena.items || {};
        athena.stats = athena.stats || {};
        athena.stats.attributes = athena.stats.attributes || {};

        // defaults
        if (typeof athena.stats.attributes.season_match_boost !== "number") {
            athena.stats.attributes.season_match_boost = 0;
        }
        if (typeof athena.stats.attributes.season_friend_match_boost !== "number") {
            athena.stats.attributes.season_friend_match_boost = 0;
        }
        if (typeof athena.stats.attributes.book_level !== "number") {
            athena.stats.attributes.book_level = 1;
        }
		if (typeof athena.stats.attributes.book_purchased !== "boolean") {
			athena.stats.attributes.book_purchased = false;
		}
		
        // --- Load Battle Pass config ---
        const seasonName = `Season${config.bBattlePassSeason}`;
        const bpPath = path.join(
            __dirname,
            "../responses/Athena/BattlePass/",
            `${seasonName}.json`
        );

        let BattlePass;
        try {
            BattlePass = JSON.parse(fs.readFileSync(bpPath, "utf8"));
        } catch (e) {
            log.error("bptiers: Failed to load BattlePass JSON:", e);
            return res.status(500).json({
                code: "500",
                error: "Battle Pass configuration not found for this season."
            });
        }

        let lootList = [];
        let ItemExists = false;

        const startingTier = athena.stats.attributes.book_level;
        let endingTier;

        athena.stats.attributes.book_level += tiersToAdd;
        endingTier = athena.stats.attributes.book_level;

        // Loop through each tier and grant rewards
        for (let i = startingTier; i < endingTier; i++) {
            const FreeTier = BattlePass.freeRewards[i] || {};
            const PaidTier = BattlePass.paidRewards[i] || {};

            // -------- FREE TRACK --------
            for (let item in FreeTier) {
                if (!Object.prototype.hasOwnProperty.call(FreeTier, item)) continue;

                // XP boosts
                if (item.toLowerCase() == "token:athenaseasonxpboost") {
                    athena.stats.attributes.season_match_boost += FreeTier[item];
                }
                if (item.toLowerCase() == "token:athenaseasonfriendxpboost") {
                    athena.stats.attributes.season_friend_match_boost += FreeTier[item];
                }
				
                // V-Bucks: update MTX currency items on correct platform
				if (item.toLowerCase().startsWith("currency:mtx")) {
					for (let key in profile.items) {
						if (!Object.prototype.hasOwnProperty.call(profile.items, key)) continue;
						if (!profile.items[key].templateId) continue;
						if (!profile.items[key].templateId.toLowerCase().startsWith("currency:mtx")) continue;
						
						// Free track V-Bucks always
						profile.items[key].quantity += FreeTier[item];
						profile0.items[key].quantity += FreeTier[item];
						break;
					}
				}
				
                // Homebase banners go to profile/common_core
                if (item.toLowerCase().startsWith("homebasebanner")) {
                    for (let key in profile.items) {
                        if (!Object.prototype.hasOwnProperty.call(profile.items, key)) continue;
                        if (!profile.items[key].templateId) continue;

                        if (profile.items[key].templateId.toLowerCase() == item.toLowerCase()) {
                            profile.items[key].attributes =
                                profile.items[key].attributes || {};
                            profile.items[key].attributes.item_seen = false;
                            ItemExists = true;
                        }
                    }
                    if (ItemExists == false) {
                        const ItemID = functions.MakeID();
                        const Item = {
                            templateId: item,
                            attributes: { item_seen: false },
                            quantity: 1
                        };
                        profile.items[ItemID] = Item;
                    }
                    ItemExists = false;
                }

                // Athena cosmetics (skins, emotes, etc.)
                if (item.toLowerCase().startsWith("athena")) {
                    for (let key in athena.items) {
                        if (!Object.prototype.hasOwnProperty.call(athena.items, key))
                            continue;
                        if (!athena.items[key].templateId) continue;

                        if (athena.items[key].templateId.toLowerCase() == item.toLowerCase()) {
                            athena.items[key].attributes =
                                athena.items[key].attributes || {};
                            athena.items[key].attributes.item_seen = false;
                            ItemExists = true;
                        }
                    }
                    if (ItemExists == false) {
                        const ItemID = functions.MakeID();
                        const Item = {
                            templateId: item,
                            attributes: {
                                max_level_bonus: 0,
                                level: 1,
                                item_seen: false,
                                xp: 0,
                                variants: [],
                                favorite: false
                            },
                            quantity: FreeTier[item]
                        };
                        athena.items[ItemID] = Item;
                    }
                    ItemExists = false;
                }

                lootList.push({
                    itemType: item,
                    itemGuid: item,
                    quantity: FreeTier[item]
                });
            }

            // -------- PAID TRACK --------
			if (athena.stats.attributes.book_purchased) {
				for (let item in PaidTier) {
					if (!Object.prototype.hasOwnProperty.call(PaidTier, item)) continue;
	
					// XP boosts
					if (item.toLowerCase() == "token:athenaseasonxpboost") {
						athena.stats.attributes.season_match_boost += PaidTier[item];
					}
					if (item.toLowerCase() == "token:athenaseasonfriendxpboost") {
						athena.stats.attributes.season_friend_match_boost += PaidTier[item];
					}

					// V-Bucks
					if (item.toLowerCase().startsWith("currency:mtx")) {
						for (let key in profile.items) {
							if (!Object.prototype.hasOwnProperty.call(profile.items, key)) continue;
							if (!profile.items[key].templateId) continue;
							if (!profile.items[key].templateId.toLowerCase().startsWith("currency:mtx")) continue;

							profile.items[key].quantity += PaidTier[item];
							profile0.items[key].quantity += PaidTier[item];
							break;
						}
					}

					// Homebase banners
					if (item.toLowerCase().startsWith("homebasebanner")) {
						for (let key in profile.items) {
							if (!Object.prototype.hasOwnProperty.call(profile.items, key)) continue;
							if (!profile.items[key].templateId) continue;

							if (profile.items[key].templateId.toLowerCase() == item.toLowerCase()) {
								profile.items[key].attributes =
									profile.items[key].attributes || {};
								profile.items[key].attributes.item_seen = false;
								ItemExists = true;
							}
						}
						if (ItemExists == false) {
							const ItemID = functions.MakeID();
							const Item = {
								templateId: item,
								attributes: { item_seen: false },
								quantity: 1
							};
							profile.items[ItemID] = Item;
						}
						ItemExists = false;
					}

					// Athena cosmetics
					if (item.toLowerCase().startsWith("athena")) {
						for (let key in athena.items) {
							if (!Object.prototype.hasOwnProperty.call(athena.items, key))
								continue;
							if (!athena.items[key].templateId) continue;

							if (athena.items[key].templateId.toLowerCase() == item.toLowerCase()) {
								athena.items[key].attributes =
									athena.items[key].attributes || {};
								athena.items[key].attributes.item_seen = false;
								ItemExists = true;
							}
						}
						if (ItemExists == false) {
							const ItemID = functions.MakeID();
							const Item = {
								templateId: item,
								attributes: {
									max_level_bonus: 0,
									level: 1,
									item_seen: false,
									xp: 0,
									variants: [],
									favorite: false
								},
								quantity: PaidTier[item]
							};
							athena.items[ItemID] = Item;
						}
						ItemExists = false;
					}

					lootList.push({
						itemType: item,
						itemGuid: item,
						quantity: PaidTier[item]
					});
				}
			}
		}

        // --- Gift box ---
		if (lootList.length > 0) {
			const GiftBoxID = functions.MakeID();
			const GiftBox = {
				templateId: "GiftBox:gb_battlepass",
				attributes: {
					max_level_bonus: 0,
					fromAccountId: "",
					lootList: lootList
				},
				quantity: 1
			};
			profile.items[GiftBoxID] = GiftBox;
		}
		
        // --- Bump revisions & save ---
        athena.rvn = (athena.rvn || 0) + 1;
        athena.commandRevision = (athena.commandRevision || 0) + 1;
        athena.updated = new Date().toISOString();

        profile.rvn = (profile.rvn || 0) + 1;
        profile.commandRevision = (profile.commandRevision || 0) + 1;
        profile.updated = new Date().toISOString();

        profile0.rvn = (profile0.rvn || 0) + 1;
        profile0.commandRevision = (profile0.commandRevision || 0) + 1;
        profile0.updated = new Date().toISOString();

        // Put modified profiles back and save
        profiles["athena"] = athena;
        if (profiles["common_core"]) profiles["common_core"] = profile;
        if (profiles["profile0"]) profiles["profile0"] = profile0;

        await Profile.updateOne(
            { accountId: user.accountId },
            { $set: { profiles: profiles } }
        );

        return res.status(200).json({
            message: "Battle Pass tiers (and cosmetics) successfully added.",
            username: user.username,
            reason,
            tiersAdded: tiersToAdd,
            book_level_before: startingTier,
            book_level_after: endingTier,
            lootListCount: lootList.length
        });
    } catch (err) {
        log.error("bptiers: unexpected error:", err);
        return res.status(500).json({
            code: "500",
            error: "Server error. Check logs for details."
        });
    }
});

module.exports = app;