const express = require("express");
const app = express.Router();

const Friends = require("../model/friends");
const Profile = require("../model/profiles.js");
const User = require("../model/user.js");
const SACCodeModel = require('../model/saccodes.js');
const profileManager = require("../structs/profile.js");
const error = require("../structs/error.js");
const functions = require("../structs/functions.js");
const log = require("../structs/log.js");
const config = require('../Config/config.json')
const fs = require("fs");
const path = require("path");
const catalog = functions.getItemShop();

const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");

global.giftReceived = {};

app.post("/fortnite/api/game/v2/profile/*/client/SetReceiveGiftsEnabled", verifyToken, async (req, res) => {
    log.debug(`SetReceiveGiftsEnabled: Request received with body: ${JSON.stringify(req.body)}`);

    const profiles = await Profile.findOne({ accountId: req.user.accountId });
    log.debug(`SetReceiveGiftsEnabled: Fetched profiles for accountId: ${req.user.accountId}`);

    if (!await profileManager.validateProfile(req.query.profileId, profiles)) {
        log.debug(`SetReceiveGiftsEnabled: Validation failed for profileId: ${req.query.profileId}`);
        return error.createError(
            "errors.com.epicgames.modules.profiles.operation_forbidden",
            `Unable to find template configuration for profile ${req.query.profileId}`, 
            [req.query.profileId], 12813, undefined, 403, res
        );
    }

    let profile = profiles.profiles[req.query.profileId];
    log.debug(`SetReceiveGiftsEnabled: Validated profile for profileId: ${req.query.profileId}`);

    if (req.query.profileId != "common_core") {
        log.debug(`SetReceiveGiftsEnabled: Invalid profileId: ${req.query.profileId} for SetReceiveGiftsEnabled`);
        return error.createError(
            "errors.com.epicgames.modules.profiles.invalid_command",
            `SetReceiveGiftsEnabled is not valid on ${req.query.profileId} profile`, 
            ["SetReceiveGiftsEnabled",req.query.profileId], 12801, undefined, 400, res
        );
    }

    const memory = functions.GetVersionInfo(req);
    log.debug(`SetReceiveGiftsEnabled: Retrieved version info: ${JSON.stringify(memory)}`);

    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    let QueryRevision = req.query.rvn || -1;

    if (typeof req.body.bReceiveGifts != "boolean") {
        log.debug(`SetReceiveGiftsEnabled: Invalid value for bReceiveGifts: ${req.body.bReceiveGifts}`);
        return ValidationError("bReceiveGifts", "a boolean", res);
    }

    profile.stats.attributes.allowed_to_receive_gifts = req.body.bReceiveGifts;
    log.debug(`SetReceiveGiftsEnabled: Updated allowed_to_receive_gifts to ${req.body.bReceiveGifts}`);

    ApplyProfileChanges.push({
        "changeType": "statModified",
        "name": "allowed_to_receive_gifts",
        "value": profile.stats.attributes.allowed_to_receive_gifts
    });

    if (ApplyProfileChanges.length > 0) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();
        log.debug(`SetReceiveGiftsEnabled: Profile changes applied, revision updated to ${profile.rvn}`);

        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
        log.debug(`SetReceiveGiftsEnabled: Profile updated in database`);
    }

    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
    log.debug(`SetReceiveGiftsEnabled: Response sent with profile revision ${profile.rvn}`);
});

app.post("/fortnite/api/game/v2/profile/*/client/ClientQuestLogin", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId });

    if (!await profileManager.validateProfile(req.query.profileId, profiles)) return error.createError(
        "errors.com.epicgames.modules.profiles.operation_forbidden",
        `Unable to find template configuration for profile ${req.query.profileId}`, 
        [req.query.profileId], 12813, undefined, 403, res
    );

    let profile = profiles.profiles[req.query.profileId];
    let athena = profiles.profiles["athena"];
    var AthenaQuestIDS = JSON.parse(JSON.stringify(require("./../responses/quests.json")));
    const memory = functions.GetVersionInfo(req);

    var ApplyProfileChanges = [];
    var Notifications = [];
    var BaseRevision = profile.rvn || 0;
    var QueryRevision = req.query.rvn || -1;
    var StatChanged = false;

    var QuestCount = 0;
    var ShouldGiveQuest = true;
    var DateFormat = (new Date().toISOString()).split("T")[0];
    var DailyQuestIDS;
    var SeasonQuestIDS;

    const SeasonPrefix = memory.season < 10 ? `0${memory.season}` : memory.season;

    try {
        if (req.query.profileId == "profile0") {
            for (var key in profile.items) {
                if (profile.items[key].templateId.toLowerCase().startsWith("quest:daily")) {
                    QuestCount += 1;
                }
            }
        }

        if (req.query.profileId == "athena") {
            DailyQuestIDS = AthenaQuestIDS.Daily;

            if (AthenaQuestIDS.hasOwnProperty(`Season${SeasonPrefix}`)) {
                SeasonQuestIDS = AthenaQuestIDS[`Season${SeasonPrefix}`];
            }

            for (var key in profile.items) {
                if (profile.items[key].templateId.toLowerCase().startsWith("quest:athenadaily")) {
                    QuestCount += 1;
                }
            }
        }

        if (profile.stats.attributes.hasOwnProperty("quest_manager")) {
            if (profile.stats.attributes.quest_manager.hasOwnProperty("dailyLoginInterval")) {
                if (profile.stats.attributes.quest_manager.dailyLoginInterval.includes("T")) {
                    var DailyLoginDate = (profile.stats.attributes.quest_manager.dailyLoginInterval).split("T")[0];

                    if (DailyLoginDate == DateFormat) {
                        ShouldGiveQuest = false;
                    } else {
                        ShouldGiveQuest = true;
                        if (profile.stats.attributes.quest_manager.dailyQuestRerolls <= 0) {
                            profile.stats.attributes.quest_manager.dailyQuestRerolls += 1;
                        }
                    }
                }
            }
        }

        if (QuestCount < 3 && ShouldGiveQuest == true) {
            const selectedQuests = [];
            while (selectedQuests.length < 3) {
                const randomIndex = Math.floor(Math.random() * DailyQuestIDS.length);
                const quest = DailyQuestIDS[randomIndex];

                if (
                    !Object.values(profile.items).some(
                        (item) => item.templateId.toLowerCase() === quest.templateId.toLowerCase()
                    ) &&
                    !selectedQuests.includes(quest)
                ) {
                    selectedQuests.push(quest);
                }
            }

            for (const quest of selectedQuests) {
                const NewQuestID = functions.MakeID();

                profile.items[NewQuestID] = {
                    "templateId": quest.templateId,
                    "attributes": {
                        "creation_time": new Date().toISOString(),
                        "level": -1,
                        "item_seen": false,
                        "sent_new_notification": false,
                        "xp_reward_scalar": 1,
                        "quest_state": "Active",
                        "last_state_change_time": new Date().toISOString(),
                        "max_level_bonus": 0,
                        "xp": 0,
                        "favorite": false
                    },
                    "quantity": 1
                };

                for (var i in quest.objectives) {
                    profile.items[NewQuestID].attributes[`completion_${quest.objectives[i].toLowerCase()}`] = 0;
                }

                ApplyProfileChanges.push({
                    "changeType": "itemAdded",
                    "itemId": NewQuestID,
                    "item": profile.items[NewQuestID]
                });
            }

            profile.stats.attributes.quest_manager.dailyLoginInterval = new Date().toISOString();

            ApplyProfileChanges.push({
                "changeType": "statModified",
                "name": "quest_manager",
                "value": profile.stats.attributes.quest_manager
            });

            StatChanged = true;
        }
    } catch (err) { log.error(err); }

    for (var key in profile.items) {
        if (key.startsWith("QS") && Number.isInteger(Number(key[2])) && Number.isInteger(Number(key[3])) && key[4] === "-") {
            if (!key.startsWith(`QS${SeasonPrefix}-`)) {
                delete profile.items[key];

                ApplyProfileChanges.push({
                    "changeType": "itemRemoved",
                    "itemId": key
                });

                StatChanged = true;
            }
        }
    }

    if (SeasonQuestIDS) {
        var QuestsToAdd = [];
        
        if (req.query.profileId == "athena") {
            for (var ChallengeBundleScheduleID in SeasonQuestIDS.ChallengeBundleSchedules) {
                if (profile.items.hasOwnProperty(ChallengeBundleScheduleID)) {
                    ApplyProfileChanges.push({
                        "changeType": "itemRemoved",
                        "itemId": ChallengeBundleScheduleID
                    });
                }

                var ChallengeBundleSchedule = SeasonQuestIDS.ChallengeBundleSchedules[ChallengeBundleScheduleID];

                profile.items[ChallengeBundleScheduleID] = {
                    "templateId": ChallengeBundleSchedule.templateId,
                    "attributes": {
                        "unlock_epoch": new Date().toISOString(),
                        "max_level_bonus": 0,
                        "level": 1,
                        "item_seen": true,
                        "xp": 0,
                        "favorite": false,
                        "granted_bundles": ChallengeBundleSchedule.granted_bundles
                    },
                    "quantity": 1
                };

                ApplyProfileChanges.push({
                    "changeType": "itemAdded",
                    "itemId": ChallengeBundleScheduleID,
                    "item": profile.items[ChallengeBundleScheduleID]
                });

                StatChanged = true;
            }

            for (var ChallengeBundleID in SeasonQuestIDS.ChallengeBundles) {
                if (profile.items.hasOwnProperty(ChallengeBundleID)) {
                    ApplyProfileChanges.push({
                        "changeType": "itemRemoved",
                        "itemId": ChallengeBundleID
                    });
                }

                var ChallengeBundle = SeasonQuestIDS.ChallengeBundles[ChallengeBundleID];

                if (config.bCompletedSeasonalQuests == true && ChallengeBundle.hasOwnProperty("questStages")) {
                    ChallengeBundle.grantedquestinstanceids = ChallengeBundle.grantedquestinstanceids.concat(ChallengeBundle.questStages);
                }

                profile.items[ChallengeBundleID] = {
                    "templateId": ChallengeBundle.templateId,
                    "attributes": {
                        "has_unlock_by_completion": false,
                        "num_quests_completed": 0,
                        "level": 0,
                        "grantedquestinstanceids": ChallengeBundle.grantedquestinstanceids,
                        "item_seen": true,
                        "max_allowed_bundle_level": 0,
                        "num_granted_bundle_quests": 0,
                        "max_level_bonus": 0,
                        "challenge_bundle_schedule_id": ChallengeBundle.challenge_bundle_schedule_id,
                        "num_progress_quests_completed": 0,
                        "xp": 0,
                        "favorite": false
                    },
                    "quantity": 1
                };

                QuestsToAdd = QuestsToAdd.concat(ChallengeBundle.grantedquestinstanceids);
                profile.items[ChallengeBundleID].attributes.num_granted_bundle_quests = ChallengeBundle.grantedquestinstanceids.length;

                if (config.bCompletedSeasonalQuests == true) {
                    profile.items[ChallengeBundleID].attributes.num_quests_completed = ChallengeBundle.grantedquestinstanceids.length;
                    profile.items[ChallengeBundleID].attributes.num_progress_quests_completed = ChallengeBundle.grantedquestinstanceids.length;

                    if ((memory.season == 10 || memory.season == 11) && (ChallengeBundle.templateId.toLowerCase().includes("missionbundle_s10_0") || ChallengeBundle.templateId.toLowerCase() == "challengebundle:missionbundle_s11_stretchgoals2")) {
                        profile.items[ChallengeBundleID].attributes.level += 1;
                    }
                }

                ApplyProfileChanges.push({
                    "changeType": "itemAdded",
                    "itemId": ChallengeBundleID,
                    "item": profile.items[ChallengeBundleID]
                });

                StatChanged = true;
            }
        }
    }

    function ParseQuest(QuestID) {
        var Quest = SeasonQuestIDS.Quests[QuestID];
        if (!Quest) {
            return;
        }

        if (profile.items.hasOwnProperty(QuestID)) {
            ApplyProfileChanges.push({
                "changeType": "itemRemoved",
                "itemId": QuestID
            });
        }

        profile.items[QuestID] = {
            "templateId": Quest.templateId,
            "attributes": {
                "creation_time": new Date().toISOString(),
                "level": -1,
                "item_seen": true,
                "sent_new_notification": true,
                "challenge_bundle_id": Quest.challenge_bundle_id || "",
                "xp_reward_scalar": 1,
                "quest_state": "Active",
                "last_state_change_time": new Date().toISOString(),
                "max_level_bonus": 0,
                "xp": 0,
                "favorite": false
            },
            "quantity": 1
        };

        if (config.bCompletedSeasonalQuests == true) {
            profile.items[QuestID].attributes.quest_state = "Claimed";

            if (Quest.hasOwnProperty("rewards")) {
                for (var reward in Quest.rewards) {
                    if (Quest.rewards[reward].templateId.startsWith("Quest:")) {
                        for (var Q in SeasonQuestIDS.Quests) {
                            if (SeasonQuestIDS.Quests[Q].templateId == Quest.rewards[reward].templateId) {
                                SeasonQuestIDS.ChallengeBundles[SeasonQuestIDS.Quests[Q].challenge_bundle_id].grantedquestinstanceids.push(Q);
                                ParseQuest(Q);
                            }
                        }
                    }
                }
            }
        }

        for (var i in Quest.objectives) {
            if (config.bCompletedSeasonalQuests == true) {
                profile.items[QuestID].attributes[`completion_${i}`] = Quest.objectives[i];
            } else {
                profile.items[QuestID].attributes[`completion_${i}`] = 0;
            }
        }

        ApplyProfileChanges.push({
            "changeType": "itemAdded",
            "itemId": QuestID,
            "item": profile.items[QuestID]
        });

        StatChanged = true;
    }

    for (var Quest in QuestsToAdd) {
        ParseQuest(QuestsToAdd[Quest]);
    }

    if (StatChanged == true) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();

        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
    }

    // this doesn't work properly on version v12.20 and above but whatever
    if (QueryRevision != BaseRevision) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        notifications: Notifications,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
});

app.post("/fortnite/api/game/v2/profile/*/client/FortRerollDailyQuest", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId });
    const profile = profiles.profiles[req.query.profileId];

    // do not change any of these or you will end up breaking it
    const questsData = require("./../responses/quests.json");
    const dailyQuests = questsData.Daily;

    const ApplyProfileChanges = [];
    const Notifications = [];
    let BaseRevision = profile.rvn || 0;
    const QueryRevision = req.query.rvn || -1;
    let StatChanged = false;

    const currentDate = new Date().toISOString().split("T")[0];
    if (!profile.stats.attributes.quest_manager) {
        profile.stats.attributes.quest_manager = {};
    }

    if (
        !profile.stats.attributes.quest_manager.dailyLoginInterval ||
        profile.stats.attributes.quest_manager.dailyLoginInterval.split("T")[0] !== currentDate
    ) {
        profile.stats.attributes.quest_manager.dailyLoginInterval = new Date().toISOString();

        const selectedQuests = [];
        while (selectedQuests.length < 3) {
            const randomIndex = Math.floor(Math.random() * dailyQuests.length);
            const quest = dailyQuests[randomIndex];

            if (
                !Object.values(profile.items).some(
                    (item) => item.templateId.toLowerCase() === quest.templateId.toLowerCase()
                ) &&
                !selectedQuests.includes(quest)
            ) {
                selectedQuests.push(quest);
            }
        }

        for (const quest of selectedQuests) {
            const questId = functions.MakeID();
            profile.items[questId] = {
                templateId: quest.templateId,
                attributes: {
                    creation_time: new Date().toISOString(),
                    level: -1,
                    item_seen: false,
                    sent_new_notification: false,
                    xp_reward_scalar: 1,
                    quest_state: "Active",
                    last_state_change_time: new Date().toISOString(),
                    max_level_bonus: 0,
                    xp: 0,
                    favorite: false,
                },
                quantity: 1,
            };

            for (const objective of quest.objectives) {
                profile.items[questId].attributes[`completion_${objective.toLowerCase()}`] = 0;
            }

            ApplyProfileChanges.push({
                changeType: "itemAdded",
                itemId: questId,
                item: profile.items[questId],
            });
        }

        ApplyProfileChanges.push({
            changeType: "statModified",
            name: "quest_manager",
            value: profile.stats.attributes.quest_manager,
        });

        StatChanged = true;
    }

    if (req.body.questId && profile.stats.attributes.quest_manager.dailyQuestRerolls > 0) {
        profile.stats.attributes.quest_manager.dailyQuestRerolls -= 1;

        delete profile.items[req.body.questId];

        const selectedQuests = [];
        while (selectedQuests.length < 1) {
            const randomIndex = Math.floor(Math.random() * dailyQuests.length);
            const quest = dailyQuests[randomIndex];

            if (
                !Object.values(profile.items).some(
                    (item) => item.templateId.toLowerCase() === quest.templateId.toLowerCase()
                ) &&
                !selectedQuests.includes(quest)
            ) {
                selectedQuests.push(quest);
            }
        }

        const rerollQuestID = functions.MakeID();
        const quest = selectedQuests[0];
        profile.items[rerollQuestID] = {
            templateId: quest.templateId,
            attributes: {
                creation_time: new Date().toISOString(),
                level: -1,
                item_seen: false,
                sent_new_notification: false,
                xp_reward_scalar: 1,
                quest_state: "Active",
                last_state_change_time: new Date().toISOString(),
                max_level_bonus: 0,
                xp: 0,
                favorite: false,
            },
            quantity: 1,
        };

        for (const objective of quest.objectives) {
            profile.items[rerollQuestID].attributes[`completion_${objective.toLowerCase()}`] = 0;
        }

        ApplyProfileChanges.push({
            changeType: "itemAdded",
            itemId: rerollQuestID,
            item: profile.items[rerollQuestID],
        });

        ApplyProfileChanges.push({
            changeType: "itemRemoved",
            itemId: req.body.questId,
        });

        Notifications.push({
            type: "dailyQuestReroll",
            primary: true,
            newQuestId: quest.templateId,
        });

        StatChanged = true;
    }

    if (StatChanged) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();

        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
    }

    // this doesn't work properly on version v12.20 and above but whatever
    if (QueryRevision !== BaseRevision) {
        ApplyProfileChanges.splice(0, ApplyProfileChanges.length, {
            changeType: "fullProfileUpdate",
            profile: profile,
        });
    }

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId || "athena",
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        notifications: Notifications,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1,
    });
});

app.post("/fortnite/api/game/v2/profile/*/client/MarkNewQuestNotificationSent", verifyToken, async (req, res) => {
    log.debug(`MarkNewQuestNotificationSent: Request received with body: ${JSON.stringify(req.body)}`);

    const profiles = await Profile.findOne({ accountId: req.user.accountId });
    log.debug(`MarkNewQuestNotificationSent: Fetched profiles for accountId: ${req.user.accountId}`);

    if (!await profileManager.validateProfile(req.query.profileId, profiles)) {
        log.debug(`MarkNewQuestNotificationSent: Validation failed for profileId: ${req.query.profileId}`);
        return error.createError(
            "errors.com.epicgames.modules.profiles.operation_forbidden",
            `Unable to find template configuration for profile ${req.query.profileId}`, 
            [req.query.profileId], 12813, undefined, 403, res
        );
    }

    let profile = profiles.profiles[req.query.profileId];
    log.debug(`MarkNewQuestNotificationSent: Validated profile for profileId: ${req.query.profileId}`);

    var ApplyProfileChanges = [];
    var Notifications = [];
    var BaseRevision = profile.rvn || 0;
    var QueryRevision = req.query.rvn || -1;
    var StatChanged = false;

    if (req.body.itemIds) {
        for (var i in req.body.itemIds) {
            var id = req.body.itemIds[i];

            if (profile.items[id]) {
                profile.items[id].attributes.sent_new_notification = true;
                ApplyProfileChanges.push({
                    "changeType": "itemAttrChanged",
                    "itemId": id,
                    "attributeName": "sent_new_notification",
                    "attributeValue": true
                });
                log.debug(`MarkNewQuestNotificationSent: Notification marked as sent for itemId: ${id}`);
            } else {
                log.debug(`MarkNewQuestNotificationSent: ItemId ${id} not found in profile`);
            }
        }

        StatChanged = true;
    }

    if (StatChanged == true) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();
        log.debug(`MarkNewQuestNotificationSent: Profile changes applied, revision updated to ${profile.rvn}`);

        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
        log.debug(`MarkNewQuestNotificationSent: Profile updated in database`);
    }

    if (QueryRevision != BaseRevision) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        notifications: Notifications,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
    log.debug(`MarkNewQuestNotificationSent: Response sent with profile revision ${profile.rvn}`);
});

app.post("/fortnite/api/game/v2/profile/*/client/AthenaPinQuest", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId });
    let profile = profiles.profiles[req.query.profileId];

    // do not change any of these or you will end up breaking it
    var ApplyProfileChanges = [];
    var BaseRevision = profile.rvn || 0;
    var QueryRevision = req.query.rvn || -1;
    var StatChanged = false;

    if (profile.stats.attributes.hasOwnProperty("pinned_quest")) {
        profile.stats.attributes.pinned_quest = req.body.pinnedQuest || "";
        StatChanged = true;
    }

    if (StatChanged == true) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();

        ApplyProfileChanges.push({
            "changeType": "statModified",
            "name": "pinned_quest",
            "value": profile.stats.attributes.pinned_quest
        })

        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
    }

    // this doesn't work properly on version v12.20 and above but whatever
    if (QueryRevision != BaseRevision) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        notifications: Notifications,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
});

app.post("/fortnite/api/game/v2/profile/*/client/GiftCatalogEntry", verifyToken, async (req, res) => {
    log.debug(`GiftCatalogEntry: Request received with body: ${JSON.stringify(req.body)}`);

    const profiles = await Profile.findOne({ accountId: req.user.accountId });
    log.debug(`GiftCatalogEntry: Fetched profiles for accountId: ${req.user.accountId}`);

    if (!await profileManager.validateProfile(req.query.profileId, profiles)) {
        log.debug(`GiftCatalogEntry: Validation failed for profileId: ${req.query.profileId}`);
        return error.createError(
            "errors.com.epicgames.modules.profiles.operation_forbidden",
            `Unable to find template configuration for profile ${req.query.profileId}`, 
            [req.query.profileId], 12813, undefined, 403, res
        );
    }

    let profile = profiles.profiles[req.query.profileId];
    let profile0 = profiles.profiles["profile0"];
    log.debug(`GiftCatalogEntry: Validated profile for profileId: ${req.query.profileId}`);

    if (req.query.profileId != "common_core") {
        log.debug(`GiftCatalogEntry: Invalid profileId: ${req.query.profileId} for GiftCatalogEntry`);
        return error.createError(
            "errors.com.epicgames.modules.profiles.invalid_command",
            `GiftCatalogEntry is not valid on ${req.query.profileId} profile`, 
            ["GiftCatalogEntry",req.query.profileId], 12801, undefined, 400, res
        );
    }

    const memory = functions.GetVersionInfo(req);
    log.debug(`GiftCatalogEntry: Retrieved version info: ${JSON.stringify(memory)}`);

    let Notifications = [];
    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    let QueryRevision = req.query.rvn || -1;
    let validGiftBoxes = [
        "GiftBox:gb_default",
        "GiftBox:gb_giftwrap1",
        "GiftBox:gb_giftwrap2",
        "GiftBox:gb_giftwrap3"
    ];

    let missingFields = checkFields(["offerId","receiverAccountIds","giftWrapTemplateId"], req.body);

    if (missingFields.fields.length > 0) {
        log.debug(`GiftCatalogEntry: Missing fields: ${missingFields.fields.join(", ")}`);
        return error.createError(
            "errors.com.epicgames.validation.validation_failed",
            `Validation Failed. [${missingFields.fields.join(", ")}] field(s) is missing.`,
            [`[${missingFields.fields.join(", ")}]`], 1040, undefined, 400, res
        );
    }

    if (typeof req.body.offerId != "string") {
        log.debug(`GiftCatalogEntry: Invalid value for offerId: ${req.body.offerId}`);
        return ValidationError("offerId", "a string", res);
    }
    if (!Array.isArray(req.body.receiverAccountIds)) {
        log.debug(`GiftCatalogEntry: Invalid value for receiverAccountIds: ${req.body.receiverAccountIds}`);
        return ValidationError("receiverAccountIds", "an array", res);
    }
    if (typeof req.body.giftWrapTemplateId != "string") {
        log.debug(`GiftCatalogEntry: Invalid value for giftWrapTemplateId: ${req.body.giftWrapTemplateId}`);
        return ValidationError("giftWrapTemplateId", "a string", res);
    }
    if (typeof req.body.personalMessage != "string") {
        log.debug(`GiftCatalogEntry: Invalid value for personalMessage: ${req.body.personalMessage}`);
        return ValidationError("personalMessage", "a string", res);
    }

    if (req.body.personalMessage.length > 100) {
        log.debug(`GiftCatalogEntry: Personal message exceeds 100 characters: ${req.body.personalMessage.length}`);
        return error.createError(
            "errors.com.epicgames.string.length_check",
            `The personalMessage you provided is longer than 100 characters, please make sure your personal message is less than 100 characters long and try again.`,
            undefined, 16027, undefined, 400, res
        );
    }

    if (!validGiftBoxes.includes(req.body.giftWrapTemplateId)) {
        log.debug(`GiftCatalogEntry: Invalid giftWrapTemplateId: ${req.body.giftWrapTemplateId}`);
        return error.createError(
            "errors.com.epicgames.giftbox.invalid",
            `The giftbox you provided is invalid, please provide a valid giftbox and try again.`,
            undefined, 16027, undefined, 400, res
        );
    }

    if (req.body.receiverAccountIds.length < 1 || req.body.receiverAccountIds.length > 5) {
        log.debug(`GiftCatalogEntry: Invalid number of receiverAccountIds: ${req.body.receiverAccountIds.length}`);
        return error.createError(
            "errors.com.epicgames.item.quantity.range_check",
            `You need to atleast gift to 1 person and can not gift to more than 5 people.`,
            undefined, 16027, undefined, 400, res
        );
    }

    if (checkIfDuplicateExists(req.body.receiverAccountIds)) {
        log.debug(`GiftCatalogEntry: Duplicate receiverAccountIds found`);
        return error.createError(
            "errors.com.epicgames.array.duplicate_found",
            `There are duplicate accountIds in receiverAccountIds, please remove the duplicates and try again.`,
            undefined, 16027, undefined, 400, res
        );
    }

    let sender = await Friends.findOne({ accountId: req.user.accountId }).lean();
    log.debug(`GiftCatalogEntry: Fetched friends list for accountId: ${req.user.accountId}`);

    for (let receiverId of req.body.receiverAccountIds) {
        if (typeof receiverId != "string") {
            log.debug(`GiftCatalogEntry: Non-string value found in receiverAccountIds: ${receiverId}`);
            return error.createError(
                "errors.com.epicgames.array.invalid_string",
                `There is a non-string object inside receiverAccountIds, please provide a valid value and try again.`,
                undefined, 16027, undefined, 400, res
            );
        }

        if (!sender.list.accepted.find(i => i.accountId == receiverId) && receiverId != req.user.accountId) {
            log.debug(`GiftCatalogEntry: User ${req.user.accountId} is not friends with ${receiverId}`);
            return error.createError(
                "errors.com.epicgames.friends.no_relationship",
                `User ${req.user.accountId} is not friends with ${receiverId}`,
                [req.user.accountId,receiverId], 28004, undefined, 403, res
            );
        }
    }

    if (!profile.items) profile.items = {};

    let findOfferId = functions.getOfferID(req.body.offerId);
    if (!findOfferId) {
        log.debug(`GiftCatalogEntry: Invalid offerId: ${req.body.offerId}`);
        return error.createError(
            "errors.com.epicgames.fortnite.id_invalid",
            `Offer ID (id: '${req.body.offerId}') not found`, 
            [req.body.offerId], 16027, undefined, 400, res
        );
    }

    log.debug(`GiftCatalogEntry: OfferId ${req.body.offerId} found`);

    switch (true) {
        case /^BR(Daily|Weekly)Storefront$/.test(findOfferId.name):
            if (findOfferId.offerId.prices[0].currencyType.toLowerCase() == "mtxcurrency") {
                let paid = false;
                let price = (findOfferId.offerId.prices[0].finalPrice) * req.body.receiverAccountIds.length;

                for (let key in profile.items) {
                    if (!profile.items[key].templateId.toLowerCase().startsWith("currency:mtx")) continue;

                    let currencyPlatform = profile.items[key].attributes.platform;
                    if ((currencyPlatform.toLowerCase() != profile.stats.attributes.current_mtx_platform.toLowerCase()) && (currencyPlatform.toLowerCase() != "shared")) continue;

                    if (profile.items[key].quantity < price) {
                        log.debug(`GiftCatalogEntry: Insufficient currency: required ${price}, available ${profile.items[key].quantity}`);
                        return error.createError(
                            "errors.com.epicgames.currency.mtx.insufficient",
                            `You can not afford this item (${price}), you only have ${profile.items[key].quantity}.`,
                            [`${price}`,`${profile.items[key].quantity}`], 1040, undefined, 400, res
                        );
                    }

                    profile.items[key].quantity -= price;
                    profile0.items[key].quantity -= price;
                        
                    ApplyProfileChanges.push(
                        {
                            "changeType": "itemQuantityChanged",
                            "itemId": key,
                            "quantity": profile.items[key].quantity
                        },
                        {
                            "changeType": "itemQuantityChanged",
                            "itemId": key,
                            "quantity": profile0.items[key].quantity
                        }
                    );

                    paid = true;
                    log.debug(`GiftCatalogEntry: Currency deducted: ${price}, remaining ${profile.items[key].quantity}`);
                    break;
                }

                if (!paid && price > 0) {
                    log.debug(`GiftCatalogEntry: Insufficient currency: required ${price}, no currency available`);
                    return error.createError(
                        "errors.com.epicgames.currency.mtx.insufficient",
                        `You can not afford this item.`,
                        [], 1040, undefined, 400, res
                    );
                }
            }

            for (let receiverId of req.body.receiverAccountIds) {
                const receiverProfiles = await Profile.findOne({ accountId: receiverId });
                let athena = receiverProfiles.profiles["athena"];
                let common_core = receiverProfiles.profiles["common_core"];

                if (!athena.items) athena.items = {};

                if (!common_core.stats.attributes.allowed_to_receive_gifts) {
                    log.debug(`GiftCatalogEntry: User ${receiverId} has disabled receiving gifts`);
                    return error.createError(
                        "errors.com.epicgames.user.gift_disabled",
                        `User ${receiverId} has disabled receiving gifts.`,
                        [receiverId], 28004, undefined, 403, res
                    );
                }

                for (let itemGrant of findOfferId.offerId.itemGrants) {
                    for (let itemId in athena.items) {
                        if (itemGrant.templateId.toLowerCase() == athena.items[itemId].templateId.toLowerCase()) {
                            log.debug(`GiftCatalogEntry: User ${receiverId} already owns item ${itemGrant.templateId}`);
                            return error.createError(
                                "errors.com.epicgames.modules.gamesubcatalog.purchase_not_allowed",
                                `User ${receiverId} already owns this item.`,
                                [receiverId], 28004, undefined, 403, res
                            );
                        }
                    }
                }
            }

            for (let receiverId of req.body.receiverAccountIds) {
                const receiverProfiles = await Profile.findOne({ accountId: receiverId });
                let athena = receiverProfiles.profiles["athena"];
                let common_core = ((receiverId == req.user.accountId) ? profile : receiverProfiles.profiles["common_core"]);

                let giftBoxItemID = functions.MakeID();
                let giftBoxItem = {
                    "templateId": req.body.giftWrapTemplateId,
                    "attributes": {
                        "fromAccountId": req.user.accountId,
                        "lootList": [],
                        "params": {
                            "userMessage": req.body.personalMessage
                        },
                        "level": 1,
                        "giftedOn": new Date().toISOString()
                    },
                    "quantity": 1
                };

                if (!athena.items) athena.items = {};
                if (!common_core.items) common_core.items = {};

                for (let value of findOfferId.offerId.itemGrants) {
                    const ID = functions.MakeID();

                    const Item = {
                        "templateId": value.templateId,
                        "attributes": {
                            "item_seen": false,
                            "variants": [],
                        },
                        "quantity": 1
                    };
            
                    athena.items[ID] = Item;

                    giftBoxItem.attributes.lootList.push({
                        "itemType": Item.templateId,
                        "itemGuid": ID,
                        "itemProfile": "athena",
                        "quantity": 1
                    });
                }

                common_core.items[giftBoxItemID] = giftBoxItem;
                profile0.items[giftBoxItemID] = giftBoxItem;

                if (receiverId == req.user.accountId) {
                    ApplyProfileChanges.push(
                        {
                            "changeType": "itemAdded",
                            "itemId": giftBoxItemID,
                            "item": common_core.items[giftBoxItemID]
                        },
                        {
                            "changeType": "itemAdded",
                            "itemId": giftBoxItemID,
                            "item": profile0.items[giftBoxItemID]
                        }
                    );
                }

                athena.rvn += 1;
                athena.commandRevision += 1;
                athena.updated = new Date().toISOString();

                common_core.rvn += 1;
                common_core.commandRevision += 1;
                common_core.updated = new Date().toISOString();

                profile0.rvn += 1;
                profile0.commandRevision += 1;
                profile0.updated = new Date().toISOString();

                await receiverProfiles.updateOne({ 
                    $set: { 
                        [`profiles.athena`]: athena, 
                        [`profiles.common_core`]: common_core,
                        [`profiles.profile0`]: profile0
                    } 
                });

                global.giftReceived[receiverId] = true;

                functions.sendXmppMessageToId({
                    type: "com.epicgames.gift.received",
                    payload: {},
                    timestamp: new Date().toISOString()
                }, receiverId);
                log.debug(`GiftCatalogEntry: Gift sent to receiver ${receiverId}`);
            }
        break;
    }

    if (ApplyProfileChanges.length > 0 && !req.body.receiverAccountIds.includes(req.user.accountId)) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();

        await profiles.updateOne({ 
            $set: { 
                [`profiles.${req.query.profileId}`]: profile, 
                [`profiles.profile0`]: profile0
            } 
        });
    }

    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        notifications: Notifications,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
    log.debug(`GiftCatalogEntry: Response sent with profile revision ${profile.rvn}`);
});

app.post("/fortnite/api/game/v2/profile/*/client/SetActiveArchetype", async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId });
    let profile = profiles.profiles[req.query.profileId];

    var ApplyProfileChanges = [];
    var BaseRevision = profile.rvn || 0;
    var QueryRevision = req.query.rvn || -1;
    var StatChanged = false;

    if (req.body.archetypeGroup && req.body.archetype) {
        if (!profile.stats.attributes.hasOwnProperty("loadout_archetype_values")) {
            profile.stats.attributes.loadout_archetype_values = {}
        }

        profile.stats.attributes.loadout_archetype_values[req.body.archetypeGroup] = req.body.archetype;
        StatChanged = true;
    }

    if (StatChanged == true) {
        profile.rvn += 1;
        profile.commandRevision += 1;

        ApplyProfileChanges.push({
            "changeType": "statModified",
            "name": "loadout_archetype_values",
            "value": profile.stats.attributes.loadout_archetype_values
        })

        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
    }

    if (QueryRevision != BaseRevision) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    })
});

app.post("/fortnite/api/game/v2/profile/*/client/UnlockRewardNode", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId });
    let profile = profiles.profiles[req.query.profileId];
    let common_core = profiles.profiles["common_core"];
    const WinterFestIDS = require("./../responses/winterfestRewards.json");
    const memory = functions.GetVersionInfo(req);

    // do not change any of these or you will end up breaking it
    var ApplyProfileChanges = [];
    var MultiUpdate = [];
    var BaseRevision = profile.rvn;
    var ProfileRevisionCheck = (memory.build >= 19.01) ? profile.commandRevision : profile.rvn; 
    var QueryRevision = req.query.rvn || -1;
    var StatChanged = false;
    var CommonCoreChanged = false;
    var ItemExists = false;
    var Season = "Season" + memory.season;

    const GiftID = functions.MakeID();
    profile.items[GiftID] = {"templateId":"GiftBox:gb_winterfestreward","attributes":{"max_level_bonus":0,"fromAccountId":"","lootList":[],"level":1,"item_seen":false,"xp":0,"giftedOn":new Date().toISOString(),"params":{"SubGame":"Athena","winterfestGift":"true"},"favorite":false},"quantity":1};

    if (req.body.nodeId && req.body.rewardGraphId) {
        for (var i = 0; i < WinterFestIDS[Season][req.body.nodeId].length; i++) {
            var ID = functions.MakeID();
            Reward = WinterFestIDS[Season][req.body.nodeId][i]

            if (Reward.toLowerCase().startsWith("homebasebannericon:")) {
                if (CommonCoreChanged == false) {
                    MultiUpdate.push({
                        "profileRevision": common_core.rvn || 0,
                        "profileId": "common_core",
                        "profileChangesBaseRevision": common_core.rvn || 0,
                        "profileChanges": [],
                        "profileCommandRevision": common_core.commandRevision || 0,
                    })

                    CommonCoreChanged = true;
                }

                for (var key in common_core.items) {
                    if (common_core.items[key].templateId.toLowerCase() == Reward.toLowerCase()) {
                        common_core.items[key].attributes.item_seen = false;
                        ID = key;
                        ItemExists = true;

                        MultiUpdate[0].profileChanges.push({
                            "changeType": "itemAttrChanged",
                            "itemId": key,
                            "attributeName": "item_seen",
                            "attributeValue": common_core.items[key].attributes.item_seen
                        })
                    }
                }

                if (ItemExists == false) {
                    common_core.items[ID] = {
                        "templateId": Reward,
                        "attributes": {
                            "max_level_bonus": 0,
                            "level": 1,
                            "item_seen": false,
                            "xp": 0,
                            "variants": [],
                            "favorite": false
                        },
                        "quantity": 1
                    };
        
                    MultiUpdate[0].profileChanges.push({
                        "changeType": "itemAdded",
                        "itemId": ID,
                        "item": common_core.items[ID]
                    })
                }

                ItemExists = false;

                common_core.rvn += 1;
                common_core.commandRevision += 1;
        
                MultiUpdate[0].profileRevision = common_core.rvn || 0;
                MultiUpdate[0].profileCommandRevision = common_core.commandRevision || 0;

                profile.items[GiftID].attributes.lootList.push({"itemType":Reward,"itemGuid":ID,"itemProfile":"common_core","attributes":{"creation_time":new Date().toISOString()},"quantity":1})
            }

            if (!Reward.toLowerCase().startsWith("homebasebannericon:")) {
                for (var key in profile.items) {
                    if (profile.items[key].templateId.toLowerCase() == Reward.toLowerCase()) {
                        profile.items[key].attributes.item_seen = false;
                        ID = key;
                        ItemExists = true;

                        ApplyProfileChanges.push({
                            "changeType": "itemAttrChanged",
                            "itemId": key,
                            "attributeName": "item_seen",
                            "attributeValue": profile.items[key].attributes.item_seen
                        })
                    }
                }

                if (ItemExists == false) {
                    profile.items[ID] = {
                        "templateId": Reward,
                        "attributes": {
                            "max_level_bonus": 0,
                            "level": 1,
                            "item_seen": false,
                            "xp": 0,
                            "variants": [],
                            "favorite": false
                        },
                        "quantity": 1
                    };
        
                    ApplyProfileChanges.push({
                        "changeType": "itemAdded",
                        "itemId": ID,
                        "item": profile.items[ID]
                    })
                }

                ItemExists = false;

                profile.items[GiftID].attributes.lootList.push({"itemType":Reward,"itemGuid":ID,"itemProfile":"athena","attributes":{"creation_time":new Date().toISOString()},"quantity":1})
            }
        }
        profile.items[req.body.rewardGraphId].attributes.reward_keys[0].unlock_keys_used += 1;
        profile.items[req.body.rewardGraphId].attributes.reward_nodes_claimed.push(req.body.nodeId);

        StatChanged = true;
    }

    if (StatChanged == true) {
        profile.rvn += 1;
        profile.commandRevision += 1;

        ApplyProfileChanges.push({
            "changeType": "itemAdded",
            "itemId": GiftID,
            "item": profile.items[GiftID]
        })

        ApplyProfileChanges.push({
            "changeType": "itemAttrChanged",
            "itemId": req.body.rewardGraphId,
            "attributeName": "reward_keys",
            "attributeValue": profile.items[req.body.rewardGraphId].attributes.reward_keys
        })

        ApplyProfileChanges.push({
            "changeType": "itemAttrChanged",
            "itemId": req.body.rewardGraphId,
            "attributeName": "reward_nodes_claimed",
            "attributeValue": profile.items[req.body.rewardGraphId].attributes.reward_nodes_claimed
        })

        if (memory.season == 19) {
            profile.items.S19_GIFT_KEY.quantity -= 1;

            ApplyProfileChanges.push({
                "changeType": "itemQuantityChanged",
                "itemId": "S19_GIFT_KEY",
                "quantity": profile.items.S19_GIFT_KEY.quantity
            })
        }

        if (memory.season == 11) {
            profile.items.S11_GIFT_KEY.quantity -= 1;

            ApplyProfileChanges.push({
                "changeType": "itemQuantityChanged",
                "itemId": "S11_GIFT_KEY",
                "quantity": profile.items.S11_GIFT_KEY.quantity
            })
        }

        if (CommonCoreChanged == true) {
            await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
        }

        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
    }

    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        multiUpdate: MultiUpdate,
        responseVersion: 1
    })
});

app.post("/fortnite/api/game/v2/profile/*/client/RemoveGiftBox", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId });

    if (!await profileManager.validateProfile(req.query.profileId, profiles)) return error.createError(
        "errors.com.epicgames.modules.profiles.operation_forbidden",
        `Unable to find template configuration for profile ${req.query.profileId}`, 
        [req.query.profileId], 12813, undefined, 403, res
    );

    let profile = profiles.profiles[req.query.profileId];

    if (req.query.profileId != "athena" && req.query.profileId != "common_core" && req.query.profileId != "profile0") return error.createError(
        "errors.com.epicgames.modules.profiles.invalid_command",
        `RemoveGiftBox is not valid on ${req.query.profileId} profile`, 
        ["RemoveGiftBox",req.query.profileId], 12801, undefined, 400, res
    );

    const memory = functions.GetVersionInfo(req);

    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    let QueryRevision = req.query.rvn || -1;

    if (typeof req.body.giftBoxItemId == "string") {
        if (!profile.items[req.body.giftBoxItemId]) return error.createError(
            "errors.com.epicgames.fortnite.id_invalid",
            `Item (id: '${req.body.giftBoxItemId}') not found`, 
            [req.body.giftBoxItemId], 16027, undefined, 400, res
        );

        if (!profile.items[req.body.giftBoxItemId].templateId.startsWith("GiftBox:")) return error.createError(
            "errors.com.epicgames.fortnite.id_invalid",
            `The specified item id is not a giftbox.`, 
            [req.body.giftBoxItemId], 16027, undefined, 400, res
        );

        delete profile.items[req.body.giftBoxItemId];

        ApplyProfileChanges.push({
            "changeType": "itemRemoved",
            "itemId": req.body.giftBoxItemId
        });
    }

    if (Array.isArray(req.body.giftBoxItemIds)) {
        for (let giftBoxItemId of req.body.giftBoxItemIds) {
            if (typeof giftBoxItemId != "string") continue;
            if (!profile.items[giftBoxItemId]) continue;
            if (!profile.items[giftBoxItemId].templateId.startsWith("GiftBox:")) continue;
    
            delete profile.items[giftBoxItemId];
    
            ApplyProfileChanges.push({
                "changeType": "itemRemoved",
                "itemId": giftBoxItemId
            });
        }
    }

    if (ApplyProfileChanges.length > 0) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();

        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
    }

    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
});

// Set party assist quest
app.post("/fortnite/api/game/v2/profile/*/client/SetPartyAssistQuest", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId });
    let profile = profiles.profiles[req.query.profileId];

    const memory = functions.GetVersionInfo(req);

    // do not change any of these or you will end up breaking it
    var ApplyProfileChanges = [];
    var BaseRevision = profile.rvn;
    var ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    var QueryRevision = req.query.rvn || -1;
    var StatChanged = false;

    if (profile.stats.attributes.hasOwnProperty("party_assist_quest")) {
        profile.stats.attributes.party_assist_quest = req.body.questToPinAsPartyAssist || "";
        StatChanged = true;
    }

    if (StatChanged == true) {
        profile.rvn += 1;
        profile.commandRevision += 1;

        ApplyProfileChanges.push({
            "changeType": "statModified",
            "name": "party_assist_quest",
            "value": profile.stats.attributes.party_assist_quest
        })

        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
    }

    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    })
});

app.post("/fortnite/api/game/v2/profile/*/client/UpdateQuestClientObjectives", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId });
    let profile = profiles.profiles[req.query.profileId];
    const memory = functions.GetVersionInfo(req);

    // do not change any of these or you will end up breaking it
    var ApplyProfileChanges = [];
    var BaseRevision = profile.rvn;
    var ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    var QueryRevision = req.query.rvn || -1;
    var StatChanged = false;

    if (req.body.advance) {
        for (var i in req.body.advance) {
            var QuestsToUpdate = [];

            for (var x in profile.items) {
                if (profile.items[x].templateId.toLowerCase().startsWith("quest:")) {
                    for (var y in profile.items[x].attributes) {
                        if (y.toLowerCase() == `completion_${req.body.advance[i].statName}`) {
                            QuestsToUpdate.push(x)
                        }
                    }
                }
            }

            for (var i = 0; i < QuestsToUpdate.length; i++) {
                var bIncomplete = false;
                
                profile.items[QuestsToUpdate[i]].attributes[`completion_${req.body.advance[i].statName}`] = req.body.advance[i].count;

                ApplyProfileChanges.push({
                    "changeType": "itemAttrChanged",
                    "itemId": QuestsToUpdate[i],
                    "attributeName": `completion_${req.body.advance[i].statName}`,
                    "attributeValue": req.body.advance[i].count
                })

                if (profile.items[QuestsToUpdate[i]].attributes.quest_state.toLowerCase() != "claimed") {
                    for (var x in profile.items[QuestsToUpdate[i]].attributes) {
                        if (x.toLowerCase().startsWith("completion_")) {
                            if (profile.items[QuestsToUpdate[i]].attributes[x] == 0) {
                                bIncomplete = true;
                            }
                        }
                    }
    
                    if (bIncomplete == false) {
                        profile.items[QuestsToUpdate[i]].attributes.quest_state = "Claimed";
    
                        ApplyProfileChanges.push({
                            "changeType": "itemAttrChanged",
                            "itemId": QuestsToUpdate[i],
                            "attributeName": "quest_state",
                            "attributeValue": profile.items[QuestsToUpdate[i]].attributes.quest_state
                        })
                    }
                }

                StatChanged = true;
            }
        }
    }

    if (StatChanged == true) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        
        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
    }
	
    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    })
});

app.post("/fortnite/api/game/v2/profile/*/client/RequestRestedStateIncrease", async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.params[0] });
    let profile = profiles.profiles[req.query.profileId];
    const memory = functions.GetVersionInfo(req);

    // do not change any of these or you will end up breaking it
    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    let QueryRevision = req.query.rvn || -1;
    let StatChanged = false;
    let xp = profile.stats.attributes["book_xp"] + req.body.restedXpGenAccumulated;

    if (xp !== profile.stats.attributes["book_xp"]) {
        StatChanged = true;
        profile.stats.attributes["book_xp"] = xp;
        profile.stats.attributes["xp"] = xp;
    }

    if (StatChanged == true) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        ApplyProfileChanges.push({
            "changeType": "statModified",
            "name": "book_xp",
            "value": profile.stats.attributes.book_xp
        },
        {
            "changeType": "statModified",
            "name": "xp",
            "value": profile.stats.attributes.xp
        });
        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
    }

    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
});

app.post("/fortnite/api/game/v2/profile/*/client/RefundMtxPurchase", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.params[0] });
    let profile = profiles.profiles[req.query.profileId];
    let profile0 = profiles.profiles["profile0"];

    const ItemProfile = profiles.profiles.athena;
    const memory = functions.GetVersionInfo(req);

    var ApplyProfileChanges = [];
    var MultiUpdate = [];
    var BaseRevision = profile.rvn || 0;
    var QueryRevision = req.query.rvn || -1;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    var ItemGuids = [];

    if (req.body.purchaseId) {
        MultiUpdate.push({
            "profileRevision": ItemProfile.rvn || 0,
            "profileId": "athena",
            "profileChangesBaseRevision": ItemProfile.rvn || 0,
            "profileChanges": [],
            "profileCommandRevision": ItemProfile.commandRevision || 0,
        })

        profile.stats.attributes.mtx_purchase_history.refundsUsed += 1;
        profile.stats.attributes.mtx_purchase_history.refundCredits -= 1;
        for (var i in profile.stats.attributes.mtx_purchase_history.purchases) {
            if (profile.stats.attributes.mtx_purchase_history.purchases[i].purchaseId == req.body.purchaseId) {
                for (var x in profile.stats.attributes.mtx_purchase_history.purchases[i].lootResult) {
                    ItemGuids.push(profile.stats.attributes.mtx_purchase_history.purchases[i].lootResult[x].itemGuid)
                }
                profile.stats.attributes.mtx_purchase_history.purchases[i].refundDate = new Date().toISOString();
                for (var key in profile.items) {
                    if (profile.items[key].templateId.toLowerCase().startsWith("currency:mtx")) {
                        if (profile.items[key].attributes.platform.toLowerCase() == profile.stats.attributes.current_mtx_platform.toLowerCase() || profile.items[key].attributes.platform.toLowerCase() == "shared") {
                            profile.items[key].quantity += profile.stats.attributes.mtx_purchase_history.purchases[i].totalMtxPaid;
                            profile0.items[key].quantity += profile.stats.attributes.mtx_purchase_history.purchases[i].totalMtxPaid;
                    
                            ApplyProfileChanges.push(
                                {
                                    "changeType": "itemQuantityChanged",
                                    "itemId": key,
                                    "quantity": profile.items[key].quantity
                                },
                                {
                                    "changeType": "itemQuantityChanged",
                                    "itemId": key,
                                    "quantity": profile0.items[key].quantity
                                }
                            );
                    
                            break;
                        }
                    }
                }
            }
        }

        for (var i in ItemGuids) {
			try {
				delete ItemProfile.items[ItemGuids[i]]
				MultiUpdate[0].profileChanges.push({
					"changeType": "itemRemoved",
					"itemId": ItemGuids[i]
				})
			} catch (err) {}
        }
        ItemProfile.rvn += 1;
        ItemProfile.commandRevision += 1;
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile0.rvn += 1;
        profile0.commandRevision += 1;
        StatChanged = true;
    }

    if (ApplyProfileChanges.length > 0) {
        
        ApplyProfileChanges.push({
            "changeType": "statModified",
            "name": "mtx_purchase_history",
            "value": profile.stats.attributes.mtx_purchase_history
        })
        MultiUpdate[0].profileRevision = ItemProfile.rvn || 0;
        MultiUpdate[0].profileCommandRevision = ItemProfile.commandRevision || 0;

        await profiles.updateOne({
            $set: {
                [`profiles.${req.query.profileId}`]: profile,
                [`profiles.profile0`]: profile0,
                [`profiles.athena`]: ItemProfile
            }
        });
    }

    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }
    
    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        multiUpdate: MultiUpdate,
        responseVersion: 1
    })
});

app.post("/fortnite/api/game/v2/profile/*/client/IncrementNamedCounterStat", async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.params[0] });
    let profile = profiles.profiles[req.query.profileId];

    // do not change any of these or you will end up breaking it
    var ApplyProfileChanges = [];
    var BaseRevision = profile.rvn || 0;
    var QueryRevision = req.query.rvn || -1;
    var StatChanged = false;

    if (req.body.counterName && profile.stats.attributes.hasOwnProperty("named_counters")) {
        if (profile.stats.attributes.named_counters.hasOwnProperty(req.body.counterName)) {
            profile.stats.attributes.named_counters[req.body.counterName].current_count += 1;
            profile.stats.attributes.named_counters[req.body.counterName].last_incremented_time = new Date().toISOString();

            StatChanged = true;
        }
    }

    if (StatChanged == true) {
        profile.rvn += 1;
        profile.commandRevision += 1;

        ApplyProfileChanges.push({
            "changeType": "statModified",
            "name": "named_counters",
            "value": profile.stats.attributes.named_counters
        })

        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile} });
    }

    // this doesn't work properly on version v12.20 and above but whatever
    if (QueryRevision != BaseRevision) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    })
});

app.post("/fortnite/api/game/v2/profile/*/client/PurchaseCatalogEntry", verifyToken, async (req, res) => {
    log.debug(`PurchaseCatalogEntry: Request received with body: ${JSON.stringify(req.body)}`);

    const profiles = await Profile.findOne({ accountId: req.user.accountId });
    log.debug(`PurchaseCatalogEntry: Fetched profiles for accountId: ${req.user.accountId}`);

    if (!await profileManager.validateProfile(req.query.profileId, profiles)) {
        log.debug(`PurchaseCatalogEntry: Validation failed for profileId: ${req.query.profileId}`);
        return error.createError(
            "errors.com.epicgames.modules.profiles.operation_forbidden",
            `Unable to find template configuration for profile ${req.query.profileId}`, 
            [req.query.profileId], 12813, undefined, 403, res
        );
    }

    let profile = profiles.profiles[req.query.profileId];
    let athena = profiles.profiles["athena"];
    let profile0 = profiles.profiles["profile0"];
    log.debug(`PurchaseCatalogEntry: Validated profile for profileId: ${req.query.profileId}`);

    if (req.query.profileId != "common_core" && req.query.profileId != "profile0") {
        log.debug(`PurchaseCatalogEntry: Invalid profileId: ${req.query.profileId} for PurchaseCatalogEntry`);
        return error.createError(
            "errors.com.epicgames.modules.profiles.invalid_command",
            `PurchaseCatalogEntry is not valid on ${req.query.profileId} profile`, 
            ["PurchaseCatalogEntry", req.query.profileId], 12801, undefined, 400, res
        );
    }

    let MultiUpdate = [{
        "profileRevision": athena.rvn || 0,
        "profileId": "athena",
        "profileChangesBaseRevision": athena.rvn || 0,
        "profileChanges": [],
        "profileCommandRevision": athena.commandRevision || 0,
    }];

    const memory = functions.GetVersionInfo(req);
    log.debug(`PurchaseCatalogEntry: Retrieved version info: ${JSON.stringify(memory)}`);

    let Notifications = [];
    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    let QueryRevision = req.query.rvn || -1;

    let missingFields = checkFields(["offerId"], req.body);

    if (missingFields.fields.length > 0) {
        log.debug(`PurchaseCatalogEntry: Missing fields: ${missingFields.fields.join(", ")}`);
        return error.createError(
            "errors.com.epicgames.validation.validation_failed",
            `Validation Failed. [${missingFields.fields.join(", ")}] field(s) is missing.`,
            [`[${missingFields.fields.join(", ")}]`], 1040, undefined, 400, res
        );
    }

    if (typeof req.body.offerId != "string") {
        log.debug(`PurchaseCatalogEntry: Invalid value for offerId: ${req.body.offerId}`);
        return ValidationError("offerId", "a string", res);
    }
    if (typeof req.body.purchaseQuantity != "number") {
        log.debug(`PurchaseCatalogEntry: Invalid value for purchaseQuantity: ${req.body.purchaseQuantity}`);
        return ValidationError("purchaseQuantity", "a number", res);
    }
    if (req.body.purchaseQuantity < 1) {
        log.debug(`PurchaseCatalogEntry: purchaseQuantity is less than 1: ${req.body.purchaseQuantity}`);
        return error.createError(
            "errors.com.epicgames.validation.validation_failed",
            `Validation Failed. 'purchaseQuantity' is less than 1.`,
            ['purchaseQuantity'], 1040, undefined, 400, res
        );
    }

    if (!profile.items) profile.items = {};
    if (!athena.items) athena.items = {};
    if (!profile0.items) profile0.items = {};

    let findOfferId = functions.getOfferID(req.body.offerId);
    if (!findOfferId) {
        log.debug(`PurchaseCatalogEntry: Invalid offerId: ${req.body.offerId}`);
        return error.createError(
            "errors.com.epicgames.fortnite.id_invalid",
            `Offer ID (id: '${req.body.offerId}') not found`, 
            [req.body.offerId], 16027, undefined, 400, res
        );
    }

    if (config.bEnableBattlepass === true) {
        if (memory.season == config.bBattlePassSeason) {
            log.debug(`PurchaseCatalogEntry: Battle Pass season ${config.bBattlePassSeason} enabled`);

            var season = `Season${config.bBattlePassSeason}`; // Don't change it if you don't know what it is
            var OnlySeasonNumber = `${config.bBattlePassSeason}`;
            var ItemExists = false;
            let BattlePass = JSON.parse(fs.readFileSync(path.join(__dirname, "../responses/Athena/BattlePass/", `${season}.json`), "utf8"));
            if (!BattlePass) {
                log.debug(`PurchaseCatalogEntry: No Battle Pass found for season: ${season}`);
                return error.createError("errors.com.epicgames.fortnite.id_invalid", `No Battle Pass for this season.`, [req.body.offerId], 16027, undefined, 400, res);
            }

            if (req.body.offerId == BattlePass.battlePassOfferId || req.body.offerId == BattlePass.battleBundleOfferId || req.body.offerId == BattlePass.tierOfferId) {
                let offerId = req.body.offerId;
                let purchaseQuantity = req.body.purchaseQuantity || 1;
                let totalPrice = findOfferId.offerId.prices[0].finalPrice * purchaseQuantity;
                
                if (req.body.offerId == BattlePass.battlePassOfferId || req.body.offerId == BattlePass.battleBundleOfferId || req.body.offerId == BattlePass.tierOfferId) {
                    if (findOfferId.offerId.prices[0].currencyType.toLowerCase() == "mtxcurrency") {
                        let paid = false;
                        for (let key in profile.items) {
                            if (!profile.items[key].templateId.toLowerCase().startsWith("currency:mtx")) continue;
                            let currencyPlatform = profile.items[key].attributes.platform;
                            if ((currencyPlatform.toLowerCase() != profile.stats.attributes.current_mtx_platform.toLowerCase()) && (currencyPlatform.toLowerCase() != "shared")) continue;
                            if (profile.items[key].quantity < totalPrice) {
                                log.debug(`PurchaseCatalogEntry: Insufficient currency: required ${totalPrice}, available ${profile.items[key].quantity}`);
                                return error.createError("errors.com.epicgames.currency.mtx.insufficient", `You cannot afford this item (${totalPrice}), you only have ${profile.items[key].quantity}.`, [`${totalPrice}`, `${profile.items[key].quantity}`], 1040, undefined, 400, res);
                            }
                
                            profile.items[key].quantity -= totalPrice;
                            profile0.items[key].quantity -= totalPrice;
                            ApplyProfileChanges.push(
                                {
                                    "changeType": "itemQuantityChanged",
                                    "itemId": key,
                                    "quantity": profile.items[key].quantity
                                },
                                {
                                    "changeType": "itemQuantityChanged",
                                    "itemId": key,
                                    "quantity": profile0.items[key].quantity
                                }
                            );                            
                            paid = true;
                            log.debug(`PurchaseCatalogEntry: Currency deducted: ${totalPrice}, remaining ${profile.items[key].quantity}`);
                            break;
                        }
                        if (!paid && totalPrice > 0) {
                            log.debug(`PurchaseCatalogEntry: Insufficient currency: required ${totalPrice}, no currency available`);
                            return error.createError("errors.com.epicgames.currency.mtx.insufficient", `You cannot afford this item (${totalPrice}).`, [`${totalPrice}`], 1040, undefined, 400, res);
                        }
                    }
                }

                if (BattlePass.battlePassOfferId == offerId || BattlePass.battleBundleOfferId == offerId) {
                    var lootList = [];
                    var EndingTier = athena.stats.attributes.book_level;
                    athena.stats.attributes.book_purchased = true;

                    const tokenKey = `Token:Athena_S${OnlySeasonNumber}_NoBattleBundleOption_Token`;
                    const tokenData = {
                        "templateId": `Token:athena_s${OnlySeasonNumber}_nobattlebundleoption_token`,
                        "attributes": {
                            "max_level_bonus": 0,
                            "level": 1,
                            "item_seen": true,
                            "xp": 0,
                            "favorite": false
                        },
                        "quantity": 1
                    };
        
                    profiles.profiles["common_core"].items[tokenKey] = tokenData;
                
                    ApplyProfileChanges.push({
                        "changeType": "itemAdded",
                        "itemId": tokenKey,
                        "item": tokenData
                    });

                    if (BattlePass.battleBundleOfferId == offerId) {
                        athena.stats.attributes.book_level += 25;
                        if (athena.stats.attributes.book_level > 100)
                            athena.stats.attributes.book_level = 100;
                        EndingTier = athena.stats.attributes.book_level;
                    }
                    for (var i = 0; i < EndingTier; i++) {
                        var FreeTier = BattlePass.freeRewards[i] || {};
                        var PaidTier = BattlePass.paidRewards[i] || {};
                        for (var item in FreeTier) {
                            if (item.toLowerCase() == "token:athenaseasonxpboost") {
                                athena.stats.attributes.season_match_boost += FreeTier[item];
                                MultiUpdate[0].profileChanges.push({
                                    "changeType": "statModified",
                                    "name": "season_match_boost",
                                    "value": athena.stats.attributes.season_match_boost
                                });
                            }
                            if (item.toLowerCase() == "token:athenaseasonfriendxpboost") {
                                athena.stats.attributes.season_friend_match_boost += FreeTier[item];
                                MultiUpdate[0].profileChanges.push({
                                    "changeType": "statModified",
                                    "name": "season_friend_match_boost",
                                    "value": athena.stats.attributes.season_friend_match_boost
                                });
                            }
                            if (item.toLowerCase().startsWith("currency:mtx")) {
                                for (var key in profile.items) {
                                    if (profile.items[key].templateId.toLowerCase().startsWith("currency:mtx")) {
                                        if (profile.items[key].attributes.platform.toLowerCase() == profile.stats.attributes.current_mtx_platform.toLowerCase() || profile.items[key].attributes.platform.toLowerCase() == "shared") {
                                            profile.items[key].attributes.quantity += FreeTier[item];
                                            break;
                                        }
                                    }
                                }
                            }
                            if (item.toLowerCase().startsWith("homebasebanner")) {
                                for (var key in profile.items) {
                                    if (profile.items[key].templateId.toLowerCase() == item.toLowerCase()) {
                                        profile.items[key].attributes.item_seen = false;
                                        ItemExists = true;
                                        ApplyProfileChanges.push({
                                            "changeType": "itemAttrChanged",
                                            "itemId": key,
                                            "attributeName": "item_seen",
                                            "attributeValue": profile.items[key].attributes.item_seen
                                        });
                                    }
                                }
                                if (ItemExists == false) {
                                    var ItemID = functions.MakeID();
                                    var Item = { "templateId": item, "attributes": { "item_seen": false }, "quantity": 1 };
                                    profile.items[ItemID] = Item;
                                    ApplyProfileChanges.push({
                                        "changeType": "itemAdded",
                                        "itemId": ItemID,
                                        "item": Item
                                    });
                                }
                                ItemExists = false;
                            }
                            if (item.toLowerCase().startsWith("athena")) {
                                for (var key in athena.items) {
                                    if (athena.items[key].templateId.toLowerCase() == item.toLowerCase()) {
                                        athena.items[key].attributes.item_seen = false;
                                        ItemExists = true;
                                        MultiUpdate[0].profileChanges.push({
                                            "changeType": "itemAttrChanged",
                                            "itemId": key,
                                            "attributeName": "item_seen",
                                            "attributeValue": athena.items[key].attributes.item_seen
                                        });
                                    }
                                }
                                if (ItemExists == false) {
                                    var ItemID = functions.MakeID();
                                    const Item = { "templateId": item, "attributes": { "max_level_bonus": 0, "level": 1, "item_seen": false, "xp": 0, "variants": [], "favorite": false }, "quantity": FreeTier[item] };
                                    athena.items[ItemID] = Item;
                                    MultiUpdate[0].profileChanges.push({
                                        "changeType": "itemAdded",
                                        "itemId": ItemID,
                                        "item": Item
                                    });
                                }
                                ItemExists = false;
                            }
                            lootList.push({
                                "itemType": item,
                                "itemGuid": item,
                                "quantity": FreeTier[item]
                            });
                        }
                        for (var item in PaidTier) {
                            if (item.toLowerCase() == "token:athenaseasonxpboost") {
                                athena.stats.attributes.season_match_boost += PaidTier[item];
                                MultiUpdate[0].profileChanges.push({
                                    "changeType": "statModified",
                                    "name": "season_match_boost",
                                    "value": athena.stats.attributes.season_match_boost
                                });
                            }
                            if (item.toLowerCase() == "token:athenaseasonfriendxpboost") {
                                athena.stats.attributes.season_friend_match_boost += PaidTier[item];
                                MultiUpdate[0].profileChanges.push({
                                    "changeType": "statModified",
                                    "name": "season_friend_match_boost",
                                    "value": athena.stats.attributes.season_friend_match_boost
                                });
                            }
                            if (item.toLowerCase().startsWith("currency:mtx")) {
                                for (var key in profile.items) {
                                    if (profile.items[key].templateId.toLowerCase().startsWith("currency:mtx")) {
                                        if (profile.items[key].attributes.platform.toLowerCase() == profile.stats.attributes.current_mtx_platform.toLowerCase() || profile.items[key].attributes.platform.toLowerCase() == "shared") {
                                            profile.items[key].quantity += PaidTier[item];
                                            profile0.items[key].quantity += PaidTier[item];
                                            break;
                                        }
                                    }
                                }
                            }
                            if (item.toLowerCase().startsWith("homebasebanner")) {
                                for (var key in profile.items) {
                                    if (profile.items[key].templateId.toLowerCase() == item.toLowerCase()) {
                                        profile.items[key].attributes.item_seen = false;
                                        ItemExists = true;
                                        ApplyProfileChanges.push({
                                            "changeType": "itemAttrChanged",
                                            "itemId": key,
                                            "attributeName": "item_seen",
                                            "attributeValue": profile.items[key].attributes.item_seen
                                        });
                                    }
                                }
                                if (ItemExists == false) {
                                    var ItemID = functions.MakeID();
                                    var Item = { "templateId": item, "attributes": { "item_seen": false }, "quantity": 1 };
                                    profile.items[ItemID] = Item;
                                    ApplyProfileChanges.push({
                                        "changeType": "itemAdded",
                                        "itemId": ItemID,
                                        "item": Item
                                    });
                                }
                                ItemExists = false;
                            }
                            if (item.toLowerCase().startsWith("athena")) {
                                for (var key in athena.items) {
                                    if (athena.items[key].templateId.toLowerCase() == item.toLowerCase()) {
                                        athena.items[key].attributes.item_seen = false;
                                        ItemExists = true;
                                        MultiUpdate[0].profileChanges.push({
                                            "changeType": "itemAttrChanged",
                                            "itemId": key,
                                            "attributeName": "item_seen",
                                            "attributeValue": athena.items[key].attributes.item_seen
                                        });
                                    }
                                }
                                if (ItemExists == false) {
                                    var ItemID = functions.MakeID();
                                    const Item = { "templateId": item, "attributes": { "max_level_bonus": 0, "level": 1, "item_seen": false, "xp": 0, "variants": [], "favorite": false }, "quantity": PaidTier[item] };
                                    athena.items[ItemID] = Item;
                                    MultiUpdate[0].profileChanges.push({
                                        "changeType": "itemAdded",
                                        "itemId": ItemID,
                                        "item": Item
                                    });
                                }
                                ItemExists = false;
                            }
                            lootList.push({
                                "itemType": item,
                                "itemGuid": item,
                                "quantity": PaidTier[item]
                            });
                        }
                    }
                    var GiftBoxID = functions.MakeID();
                    var GiftBox = { "templateId": 8 <= 4 ? "GiftBox:gb_battlepass" : "GiftBox:gb_battlepasspurchased", "attributes": { "max_level_bonus": 0, "fromAccountId": "", "lootList": lootList } };
                    if (8 > 2) {
                        profile.items[GiftBoxID] = GiftBox;
                        ApplyProfileChanges.push({
                            "changeType": "itemAdded",
                            "itemId": GiftBoxID,
                            "item": GiftBox
                        });
                    }
                    MultiUpdate[0].profileChanges.push({
                        "changeType": "statModified",
                        "name": "book_purchased",
                        "value": athena.stats.attributes.book_purchased
                    });
                    MultiUpdate[0].profileChanges.push({
                        "changeType": "statModified",
                        "name": "book_level",
                        "value": athena.stats.attributes.book_level
                    });
                }

                if (BattlePass.tierOfferId == offerId) {
                    var lootList = [];
                    var StartingTier = athena.stats.attributes.book_level;
                    var EndingTier;
                    athena.stats.attributes.book_level += req.body.purchaseQuantity || 1;
                    EndingTier = athena.stats.attributes.book_level;
                    for (let i = StartingTier; i < EndingTier; i++) {
                        var FreeTier = BattlePass.freeRewards[i] || {};
                        var PaidTier = BattlePass.paidRewards[i] || {};
                        for (var item in FreeTier) {
                            if (item.toLowerCase() == "token:athenaseasonxpboost") {
                                athena.stats.attributes.season_match_boost += FreeTier[item];
                                MultiUpdate[0].profileChanges.push({
                                    "changeType": "statModified",
                                    "name": "season_match_boost",
                                    "value": athena.stats.attributes.season_match_boost
                                });
                            }
                            if (item.toLowerCase() == "token:athenaseasonfriendxpboost") {
                                athena.stats.attributes.season_friend_match_boost += FreeTier[item];
                                MultiUpdate[0].profileChanges.push({
                                    "changeType": "statModified",
                                    "name": "season_friend_match_boost",
                                    "value": athena.stats.attributes.season_friend_match_boost
                                });
                            }
                            if (item.toLowerCase().startsWith("currency:mtx")) {
                                for (var key in profile.items) {
                                    if (profile.items[key].templateId.toLowerCase().startsWith("currency:mtx")) {
                                        if (profile.items[key].attributes.platform.toLowerCase() == profile.stats.attributes.current_mtx_platform.toLowerCase() || profile.items[key].attributes.platform.toLowerCase() == "shared") {
                                            profile.items[key].quantity += FreeTier[item];
                                            profile0.items[key].quantity += PaidTier[item];
                                            break;
                                        }
                                    }
                                }
                            }
                            if (item.toLowerCase().startsWith("homebasebanner")) {
                                for (var key in profile.items) {
                                    if (profile.items[key].templateId.toLowerCase() == item.toLowerCase()) {
                                        profile.items[key].attributes.item_seen = false;
                                        ItemExists = true;
                                        ApplyProfileChanges.push({
                                            "changeType": "itemAttrChanged",
                                            "itemId": key,
                                            "attributeName": "item_seen",
                                            "attributeValue": profile.items[key].attributes.item_seen
                                        });
                                    }
                                }
                                if (ItemExists == false) {
                                    var ItemID = functions.MakeID();
                                    var Item = { "templateId": item, "attributes": { "item_seen": false }, "quantity": 1 };
                                    profile.items[ItemID] = Item;
                                    ApplyProfileChanges.push({
                                        "changeType": "itemAdded",
                                        "itemId": ItemID,
                                        "item": Item
                                    });
                                }
                                ItemExists = false;
                            }
                            if (item.toLowerCase().startsWith("athena")) {
                                for (var key in athena.items) {
                                    if (athena.items[key].templateId.toLowerCase() == item.toLowerCase()) {
                                        athena.items[key].attributes.item_seen = false;
                                        ItemExists = true;
                                        MultiUpdate[0].profileChanges.push({
                                            "changeType": "itemAttrChanged",
                                            "itemId": key,
                                            "attributeName": "item_seen",
                                            "attributeValue": athena.items[key].attributes.item_seen
                                        });
                                    }
                                }
                                if (ItemExists == false) {
                                    var ItemID = functions.MakeID();
                                    const Item = { "templateId": item, "attributes": { "max_level_bonus": 0, "level": 1, "item_seen": false, "xp": 0, "variants": [], "favorite": false }, "quantity": FreeTier[item] };
                                    athena.items[ItemID] = Item;
                                    MultiUpdate[0].profileChanges.push({
                                        "changeType": "itemAdded",
                                        "itemId": ItemID,
                                        "item": Item
                                    });
                                }
                                ItemExists = false;
                            }
                            lootList.push({
                                "itemType": item,
                                "itemGuid": item,
                                "quantity": FreeTier[item]
                            });
                        }
                        for (var item in PaidTier) {
                            if (item.toLowerCase() == "token:athenaseasonxpboost") {
                                athena.stats.attributes.season_match_boost += PaidTier[item];
                                MultiUpdate[0].profileChanges.push({
                                    "changeType": "statModified",
                                    "name": "season_match_boost",
                                    "value": athena.stats.attributes.season_match_boost
                                });
                            }
                            if (item.toLowerCase() == "token:athenaseasonfriendxpboost") {
                                athena.stats.attributes.season_friend_match_boost += PaidTier[item];
                                MultiUpdate[0].profileChanges.push({
                                    "changeType": "statModified",
                                    "name": "season_friend_match_boost",
                                    "value": athena.stats.attributes.season_friend_match_boost
                                });
                            }
                            if (item.toLowerCase().startsWith("currency:mtx")) {
                                for (var key in profile.items) {
                                    if (profile.items[key].templateId.toLowerCase().startsWith("currency:mtx")) {
                                        if (profile.items[key].attributes.platform.toLowerCase() == profile.stats.attributes.current_mtx_platform.toLowerCase() || profile.items[key].attributes.platform.toLowerCase() == "shared") {
                                            profile.items[key].quantity += PaidTier[item];
                                            profile0.items[key].quantity += PaidTier[item];
                                            break;
                                        }
                                    }
                                }
                            }
                            if (item.toLowerCase().startsWith("homebasebanner")) {
                                for (var key in profile.items) {
                                    if (profile.items[key].templateId.toLowerCase() == item.toLowerCase()) {
                                        profile.items[key].attributes.item_seen = false;
                                        ItemExists = true;
                                        ApplyProfileChanges.push({
                                            "changeType": "itemAttrChanged",
                                            "itemId": key,
                                            "attributeName": "item_seen",
                                            "attributeValue": profile.items[key].attributes.item_seen
                                        });
                                    }
                                }
                                if (ItemExists == false) {
                                    var ItemID = functions.MakeID();
                                    var Item = { "templateId": item, "attributes": { "item_seen": false }, "quantity": 1 };
                                    profile.items[ItemID] = Item;
                                    ApplyProfileChanges.push({
                                        "changeType": "itemAdded",
                                        "itemId": ItemID,
                                        "item": Item
                                    });
                                }
                                ItemExists = false;
                            }
                            if (item.toLowerCase().startsWith("athena")) {
                                for (var key in athena.items) {
                                    if (athena.items[key].templateId.toLowerCase() == item.toLowerCase()) {
                                        athena.items[key].attributes.item_seen = false;
                                        ItemExists = true;
                                        MultiUpdate[0].profileChanges.push({
                                            "changeType": "itemAttrChanged",
                                            "itemId": key,
                                            "attributeName": "item_seen",
                                            "attributeValue": athena.items[key].attributes.item_seen
                                        });
                                    }
                                }
                                if (ItemExists == false) {
                                    var ItemID = functions.MakeID();
                                    const Item = { "templateId": item, "attributes": { "max_level_bonus": 0, "level": 1, "item_seen": false, "xp": 0, "variants": [], "favorite": false }, "quantity": PaidTier[item] };
                                    athena.items[ItemID] = Item;
                                    MultiUpdate[0].profileChanges.push({
                                        "changeType": "itemAdded",
                                        "itemId": ItemID,
                                        "item": Item
                                    });
                                }
                                ItemExists = false;
                            }
                            lootList.push({
                                "itemType": item,
                                "itemGuid": item,
                                "quantity": PaidTier[item]
                            });
                        }
                    }
                    var GiftBoxID = functions.MakeID();
                    var GiftBox = {
                        "templateId": "GiftBox:gb_battlepass",
                        "attributes": {
                            "max_level_bonus": 0,
                            "fromAccountId": "",
                            "lootList": lootList
                        }
                    };
                    if (8 > 2) {
                        profile.items[GiftBoxID] = GiftBox;
                        ApplyProfileChanges.push({
                            "changeType": "itemAdded",
                            "itemId": GiftBoxID,
                            "item": GiftBox
                        });
                    }
                    MultiUpdate[0].profileChanges.push({
                        "changeType": "statModified",
                        "name": "book_level",
                        "value": athena.stats.attributes.book_level
                    });
                }
                log.debug(`PurchaseCatalogEntry: Successfully processed Battle Pass purchase`);

                if (MultiUpdate[0].profileChanges.length > 0) {
                    athena.rvn += 1;
                    athena.commandRevision += 1;
                    athena.updated = new Date().toISOString();
                    MultiUpdate[0].profileRevision = athena.rvn;
                    MultiUpdate[0].profileCommandRevision = athena.commandRevision;
                }

                if (ApplyProfileChanges.length > 0) {
                    profile.rvn += 1;
                    profile.commandRevision += 1;
                    profile.updated = new Date().toISOString();
                    await profiles?.updateOne({ 
                        $set: { 
                            [`profiles.${req.query.profileId}`]: profile, 
                            [`profiles.athena`]: athena,
                            [`profiles.profile0`]: profile0
                        } 
                    });
                }

                if (QueryRevision != ProfileRevisionCheck) {
                    ApplyProfileChanges = [{
                        "changeType": "fullProfileUpdate",
                        "profile": profile
                    }];
                }

                res.json({
                    profileRevision: profile.rvn || 0,
                    profileId: req.query.profileId,
                    profileChangesBaseRevision: BaseRevision,
                    profileChanges: ApplyProfileChanges,
                    notifications: Notifications,
                    profileCommandRevision: profile.commandRevision || 0,
                    serverTime: new Date().toISOString(),
                    multiUpdate: MultiUpdate,
                    responseVersion: 1
                });

                if (ApplyProfileChanges.length > 0) {
                    await profiles?.updateOne({ 
                        $set: { 
                            [`profiles.${req.query.profileId}`]: profile, 
                            [`profiles.athena`]: athena,
                            [`profiles.profile0`]: profile0
                        } 
                    });
                }
                return;
            }
        }
    }

    switch (true) {
        case /^BR(Daily|Weekly|Season)Storefront$/.test(findOfferId.name):
            Notifications.push({
                "type": "CatalogPurchase",
                "primary": true,
                "lootResult": {
                    "items": []
                }
            });

            for (let value of findOfferId.offerId.itemGrants) {
                const ID = functions.MakeID();

                for (let itemId in athena.items) {
                    if (value.templateId.toLowerCase() == athena.items[itemId].templateId.toLowerCase()) {
                        log.debug(`PurchaseCatalogEntry: Item already owned: ${value.templateId}`);
                        return error.createError(
                            "errors.com.epicgames.offer.already_owned",
                            `You have already bought this item before.`,
                            undefined, 1040, undefined, 400, res
                        );
                    }
                }

                const Item = {
                    "templateId": value.templateId,
                    "attributes": {
                        "item_seen": false,
                        "variants": [],
                    },
                    "quantity": 1
                };

                athena.items[ID] = Item;

                MultiUpdate[0].profileChanges.push({
                    "changeType": "itemAdded",
                    "itemId": ID,
                    "item": athena.items[ID]
                });

                Notifications[0].lootResult.items.push({
                    "itemType": Item.templateId,
                    "itemGuid": ID,
                    "itemProfile": "athena",
                    "quantity": 1
                });
            }

            if (findOfferId.offerId.prices[0].currencyType.toLowerCase() == "mtxcurrency") {
                let paid = false;

                for (let key in profile.items) {
                    if (!profile.items[key].templateId.toLowerCase().startsWith("currency:mtx")) continue;

                    let currencyPlatform = profile.items[key].attributes.platform;

                    if ((currencyPlatform.toLowerCase() != profile.stats.attributes.current_mtx_platform.toLowerCase()) && (currencyPlatform.toLowerCase() != "shared")) continue;

                    if (profile.items[key].quantity < findOfferId.offerId.prices[0].finalPrice) {
                        log.debug(`PurchaseCatalogEntry: Insufficient currency: required ${findOfferId.offerId.prices[0].finalPrice}, available ${profile.items[key].quantity}`);
                        return error.createError(
                            "errors.com.epicgames.currency.mtx.insufficient",
                            `You cannot afford this item (${findOfferId.offerId.prices[0].finalPrice}), you only have ${profile.items[key].quantity}.`,
                            [`${findOfferId.offerId.prices[0].finalPrice}`, `${profile.items[key].quantity}`], 1040, undefined, 400, res
                        );
                    }

                    profile.items[key].quantity -= findOfferId.offerId.prices[0].finalPrice;
                    profile0.items[key].quantity -= findOfferId.offerId.prices[0].finalPrice;;

                    ApplyProfileChanges.push(
                        {
                            "changeType": "itemQuantityChanged",
                            "itemId": key,
                            "quantity": profile.items[key].quantity
                        },
                        {
                            "changeType": "itemQuantityChanged",
                            "itemId": key,
                            "quantity": profile0.items[key].quantity
                        }
                    );                    

                    paid = true;
                    log.debug(`PurchaseCatalogEntry: Currency deducted: ${findOfferId.offerId.prices[0].finalPrice}, remaining ${profile.items[key].quantity}`);
                    break;
                }

                if (!paid && findOfferId.offerId.prices[0].finalPrice > 0) {
                    log.debug(`PurchaseCatalogEntry: Insufficient currency: required ${findOfferId.offerId.prices[0].finalPrice}, no currency available`);
                    return error.createError(
                        "errors.com.epicgames.currency.mtx.insufficient",
                        `You cannot afford this item (${findOfferId.offerId.prices[0].finalPrice}).`,
                        [`${findOfferId.offerId.prices[0].finalPrice}`], 1040, undefined, 400, res
                    );
                }

                if (findOfferId.offerId.itemGrants.length != 0) {

                    if (!profile.stats.attributes.mtx_purchase_history) {
                        profile.stats.attributes.mtx_purchase_history = { purchases: [] };
                    }
                    if (!profile0.stats.attributes.mtx_purchase_history) {
                        profile0.stats.attributes.mtx_purchase_history = { purchases: [] };
                    } 

                    var purchaseId = functions.MakeID();
                    profile.stats.attributes.mtx_purchase_history.purchases.push({"purchaseId":purchaseId,"offerId":`v2:/${purchaseId}`,"purchaseDate":new Date().toISOString(),"freeRefundEligible":false,"fulfillments":[],"lootResult":Notifications[0].lootResult.items,"totalMtxPaid":findOfferId.offerId.prices[0].finalPrice,"metadata":{},"gameContext":""})
                    profile0.stats.attributes.mtx_purchase_history.purchases.push({"purchaseId":purchaseId,"offerId":`v2:/${purchaseId}`,"purchaseDate":new Date().toISOString(),"freeRefundEligible":false,"fulfillments":[],"lootResult":Notifications[0].lootResult.items,"totalMtxPaid":findOfferId.offerId.prices[0].finalPrice,"metadata":{},"gameContext":""})

                    ApplyProfileChanges.push(
                        {
                            "changeType": "statModified",
                            "name": "mtx_purchase_history",
                            "value": profile.stats.attributes.mtx_purchase_history
                        },
                        {
                            "changeType": "statModified",
                            "name": "mtx_purchase_history",
                            "value": profile0.stats.attributes.mtx_purchase_history
                        }
                    );

                    log.debug(`PurchaseCatalogEntry: Successfully added the item to refunding tab`);
                }
            }

            log.debug(`PurchaseCatalogEntry: Successfully processed storefront purchase`);

            break;
    }

    if (MultiUpdate[0].profileChanges.length > 0) {
        athena.rvn += 1;
        athena.commandRevision += 1;
        athena.updated = new Date().toISOString();
        MultiUpdate[0].profileRevision = athena.rvn;
        MultiUpdate[0].profileCommandRevision = athena.commandRevision;
    }

    if (ApplyProfileChanges.length > 0) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();
        await profiles?.updateOne({ 
            $set: { 
                [`profiles.${req.query.profileId}`]: profile, 
                [`profiles.athena`]: athena,
                [`profiles.profile0`]: profile0
            } 
        });
    }

    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    if (config.bEnableSACRewards === true) {
        const user = await User.findOne({ accountId: req.user.accountId });
        
        if (user && user.currentSACCode) {
            const sacCodeEntry = await SACCodeModel.findOne({ 
                $or: [
                    { code: user.currentSACCode },
                    { code_lower: user.currentSACCode.toLowerCase() },
                    { code_higher: user.currentSACCode.toUpperCase() }
                ]
            });
            
            if (sacCodeEntry) {
                let findOfferId = functions.getOfferID(req.body.offerId);
                let purchaseQuantity = req.body.purchaseQuantity || 1;
                let totalPrice = findOfferId.offerId.prices[0].finalPrice * purchaseQuantity;
                const rewardAmount = (totalPrice * config.bPercentageSACRewards) / 100;

                const profile = await Profile.findOneAndUpdate(
                    { accountId: sacCodeEntry.owneraccountId }, 
                    { $inc: { 'profiles.common_core.items.Currency:MtxPurchased.quantity': rewardAmount } }
                );
    
                if (!profile) {
                    log.debug(`PurchaseCatalogEntry: Failed to find account for SAC owner with accountId: ${sacCodeEntry.owneraccountId}`);
                } else {
                    log.debug(`PurchaseCatalogEntry: Added ${rewardAmount} V-Bucks to the SAC owner with accountId: ${sacCodeEntry.owneraccountId}`);
                }
            } else {
                log.debug(`PurchaseCatalogEntry: SAC code ${user.currentSACCode} is not valid.`);
            }
        } else {
            log.debug(`PurchaseCatalogEntry: User with accountId: ${req.user.accountId} is not supporting any creator. No V-Bucks awarded.`);
        }
    }    

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        notifications: Notifications,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        multiUpdate: MultiUpdate,
        responseVersion: 1
    });

    if (ApplyProfileChanges.length > 0) {
        await profiles?.updateOne({ 
            $set: { 
                [`profiles.${req.query.profileId}`]: profile, 
                [`profiles.athena`]: athena,
                [`profiles.profile0`]: profile0
            } 
        });
    }

    return;
});

// Archive locker items
app.post("/fortnite/api/game/v2/profile/*/client/SetItemArchivedStatusBatch", async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId });
    let profile = profiles.profiles[req.query.profileId];

    // do not change any of these or you will end up breaking it
    var ApplyProfileChanges = [];
    var BaseRevision = profile.rvn;
    var ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    var QueryRevision = req.query.rvn || -1;
    var StatChanged = false;

    if (req.body.itemIds) {
        for (var i in req.body.itemIds) {
            profile.items[req.body.itemIds[i]].attributes.archived = req.body.archived || false;

            ApplyProfileChanges.push({
                "changeType": "itemAttrChanged",
                "itemId": req.body.itemIds[i],
                "attributeName": "archived",
                "attributeValue": profile.items[req.body.itemIds[i]].attributes.archived
            })
        }
        StatChanged = true;
    }

    if (StatChanged == true) {
        profile.rvn += 1;
        profile.commandRevision += 1;

        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
    }

    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    })
});

app.post("/fortnite/api/game/v2/profile/*/client/MarkItemSeen", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId });

    if (!await profileManager.validateProfile(req.query.profileId, profiles)) return error.createError(
        "errors.com.epicgames.modules.profiles.operation_forbidden",
        `Unable to find template configuration for profile ${req.query.profileId}`, 
        [req.query.profileId], 12813, undefined, 403, res
    );

    let profile = profiles.profiles[req.query.profileId];

    const memory = functions.GetVersionInfo(req);

    if (req.query.profileId == "athena") profile.stats.attributes.season_num = memory.season;

    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    let QueryRevision = req.query.rvn || -1;

    let missingFields = checkFields(["itemIds"], req.body);

    if (missingFields.fields.length > 0) return error.createError(
        "errors.com.epicgames.validation.validation_failed",
        `Validation Failed. [${missingFields.fields.join(", ")}] field(s) is missing.`,
        [`[${missingFields.fields.join(", ")}]`], 1040, undefined, 400, res
    );

    if (!Array.isArray(req.body.itemIds)) return ValidationError("itemIds", "an array", res);

    if (!profile.items) profile.items = {};
    
    for (let i in req.body.itemIds) {
        if (!profile.items[req.body.itemIds[i]]) continue;
        
        profile.items[req.body.itemIds[i]].attributes.item_seen = true;
        
        ApplyProfileChanges.push({
            "changeType": "itemAttrChanged",
            "itemId": req.body.itemIds[i],
            "attributeName": "item_seen",
            "attributeValue": true
        });
    }

    if (ApplyProfileChanges.length > 0) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();

        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
    }

    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
});

app.post("/fortnite/api/game/v2/profile/*/client/SetItemFavoriteStatusBatch", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId });

    if (!await profileManager.validateProfile(req.query.profileId, profiles)) return error.createError(
        "errors.com.epicgames.modules.profiles.operation_forbidden",
        `Unable to find template configuration for profile ${req.query.profileId}`, 
        [req.query.profileId], 12813, undefined, 403, res
    );

    if (req.query.profileId != "athena") return error.createError(
        "errors.com.epicgames.modules.profiles.invalid_command",
        `SetItemFavoriteStatusBatch is not valid on ${req.query.profileId} profile`, 
        ["SetItemFavoriteStatusBatch",req.query.profileId], 12801, undefined, 400, res
    );

    let profile = profiles.profiles[req.query.profileId];

    const memory = functions.GetVersionInfo(req);

    if (req.query.profileId == "athena") profile.stats.attributes.season_num = memory.season;

    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    let QueryRevision = req.query.rvn || -1;

    let missingFields = checkFields(["itemIds","itemFavStatus"], req.body);

    if (missingFields.fields.length > 0) return error.createError(
        "errors.com.epicgames.validation.validation_failed",
        `Validation Failed. [${missingFields.fields.join(", ")}] field(s) is missing.`,
        [`[${missingFields.fields.join(", ")}]`], 1040, undefined, 400, res
    );

    if (!Array.isArray(req.body.itemIds)) return ValidationError("itemIds", "an array", res);
    if (!Array.isArray(req.body.itemFavStatus)) return ValidationError("itemFavStatus", "an array", res);

    if (!profile.items) profile.items = {};

    for (let i in req.body.itemIds) {
        if (!profile.items[req.body.itemIds[i]]) continue;
        if (typeof req.body.itemFavStatus[i] != "boolean") continue;

        profile.items[req.body.itemIds[i]].attributes.favorite = req.body.itemFavStatus[i];

        ApplyProfileChanges.push({
            "changeType": "itemAttrChanged",
            "itemId": req.body.itemIds[i],
            "attributeName": "favorite",
            "attributeValue": profile.items[req.body.itemIds[i]].attributes.favorite
        });
    }

    if (ApplyProfileChanges.length > 0) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();

        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
    }

    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
});

app.post("/fortnite/api/game/v2/profile/*/client/SetBattleRoyaleBanner", verifyToken, async (req, res) => {
    log.debug(`SetBattleRoyaleBanner: Request received with body: ${JSON.stringify(req.body)}`);

    const profiles = await Profile.findOne({ accountId: req.user.accountId });
    log.debug(`SetBattleRoyaleBanner: Fetched profiles for accountId: ${req.user.accountId}`);

    if (!await profileManager.validateProfile(req.query.profileId, profiles)) {
        log.debug(`SetBattleRoyaleBanner: Validation failed for profileId: ${req.query.profileId}`);
        return error.createError(
            "errors.com.epicgames.modules.profiles.operation_forbidden",
            `Unable to find template configuration for profile ${req.query.profileId}`, 
            [req.query.profileId], 12813, undefined, 403, res
        );
    }

    if (req.query.profileId != "athena") {
        log.debug(`SetBattleRoyaleBanner: Invalid profileId: ${req.query.profileId} for SetBattleRoyaleBanner`);
        return error.createError(
            "errors.com.epicgames.modules.profiles.invalid_command",
            `SetBattleRoyaleBanner is not valid on ${req.query.profileId} profile`, 
            ["SetBattleRoyaleBanner",req.query.profileId], 12801, undefined, 400, res
        );
    }

    let profile = profiles.profiles[req.query.profileId];
    log.debug(`SetBattleRoyaleBanner: Validated profile for profileId: ${req.query.profileId}`);

    const memory = functions.GetVersionInfo(req);
    log.debug(`SetBattleRoyaleBanner: Retrieved version info: ${JSON.stringify(memory)}`);

    if (req.query.profileId == "athena") profile.stats.attributes.season_num = memory.season;

    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    let QueryRevision = req.query.rvn || -1;

    let missingFields = checkFields(["homebaseBannerIconId","homebaseBannerColorId"], req.body);

    if (missingFields.fields.length > 0) {
        log.debug(`SetBattleRoyaleBanner: Missing fields: ${missingFields.fields.join(", ")}`);
        return error.createError(
            "errors.com.epicgames.validation.validation_failed",
            `Validation Failed. [${missingFields.fields.join(", ")}] field(s) is missing.`,
            [`[${missingFields.fields.join(", ")}]`], 1040, undefined, 400, res
        );
    }

    if (typeof req.body.homebaseBannerIconId != "string") {
        log.debug(`SetBattleRoyaleBanner: Invalid value for homebaseBannerIconId: ${req.body.homebaseBannerIconId}`);
        return ValidationError("homebaseBannerIconId", "a string", res);
    }
    if (typeof req.body.homebaseBannerColorId != "string") {
        log.debug(`SetBattleRoyaleBanner: Invalid value for homebaseBannerColorId: ${req.body.homebaseBannerColorId}`);
        return ValidationError("homebaseBannerColorId", "a string", res);
    }

    let bannerProfileId = memory.build < 3.5 ? "profile0" : "common_core";

    let HomebaseBannerIconID = "";
    let HomebaseBannerColorID = "";

    if (!profiles.profiles[bannerProfileId].items) profiles.profiles[bannerProfileId].items = {};

    for (let itemId in profiles.profiles[bannerProfileId].items) {
        let templateId = profiles.profiles[bannerProfileId].items[itemId].templateId;

        if (templateId.toLowerCase() == `HomebaseBannerIcon:${req.body.homebaseBannerIconId}`.toLowerCase()) { HomebaseBannerIconID = itemId; continue; }
        if (templateId.toLowerCase() == `HomebaseBannerColor:${req.body.homebaseBannerColorId}`.toLowerCase()) { HomebaseBannerColorID = itemId; continue; }

        if (HomebaseBannerIconID && HomebaseBannerColorID) break;
    }

    if (!HomebaseBannerIconID) {
        log.debug(`SetBattleRoyaleBanner: Banner template 'HomebaseBannerIcon:${req.body.homebaseBannerIconId}' not found in profile`);
        return error.createError(
            "errors.com.epicgames.fortnite.item_not_found",
            `Banner template 'HomebaseBannerIcon:${req.body.homebaseBannerIconId}' not found in profile`, 
            [`HomebaseBannerIcon:${req.body.homebaseBannerIconId}`], 16006, undefined, 400, res
        );
    }

    if (!HomebaseBannerColorID) {
        log.debug(`SetBattleRoyaleBanner: Banner template 'HomebaseBannerColor:${req.body.homebaseBannerColorId}' not found in profile`);
        return error.createError(
            "errors.com.epicgames.fortnite.item_not_found",
            `Banner template 'HomebaseBannerColor:${req.body.homebaseBannerColorId}' not found in profile`, 
            [`HomebaseBannerColor:${req.body.homebaseBannerColorId}`], 16006, undefined, 400, res
        );
    }

    if (!profile.items) profile.items = {};

    let activeLoadoutId = profile.stats.attributes.loadouts[profile.stats.attributes.active_loadout_index];

    profile.stats.attributes.banner_icon = req.body.homebaseBannerIconId;
    profile.stats.attributes.banner_color = req.body.homebaseBannerColorId;

    profile.items[activeLoadoutId].attributes.banner_icon_template = req.body.homebaseBannerIconId;
    profile.items[activeLoadoutId].attributes.banner_color_template = req.body.homebaseBannerColorId;

    ApplyProfileChanges.push({
        "changeType": "statModified",
        "name": "banner_icon",
        "value": profile.stats.attributes.banner_icon
    });
    
    ApplyProfileChanges.push({
        "changeType": "statModified",
        "name": "banner_color",
        "value": profile.stats.attributes.banner_color
    });

    if (ApplyProfileChanges.length > 0) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();
        log.debug(`SetBattleRoyaleBanner: Profile changes applied, revision updated to ${profile.rvn}`);

        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
        log.debug(`SetBattleRoyaleBanner: Profile updated in database`);
    }

    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
    log.debug(`SetBattleRoyaleBanner: Response sent with profile revision ${profile.rvn}`);
});

app.post("/fortnite/api/game/v2/profile/*/client/EquipBattleRoyaleCustomization", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId });

    if (!await profileManager.validateProfile(req.query.profileId, profiles)) return error.createError(
        "errors.com.epicgames.modules.profiles.operation_forbidden",
        `Unable to find template configuration for profile ${req.query.profileId}`, 
        [req.query.profileId], 12813, undefined, 403, res
    );

    if (req.query.profileId != "athena") return error.createError(
        "errors.com.epicgames.modules.profiles.invalid_command",
        `EquipBattleRoyaleCustomization is not valid on ${req.query.profileId} profile`, 
        ["EquipBattleRoyaleCustomization",req.query.profileId], 12801, undefined, 400, res
    );

    let profile = profiles.profiles[req.query.profileId];

    const memory = functions.GetVersionInfo(req);

    if (req.query.profileId == "athena") profile.stats.attributes.season_num = memory.season;

    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    let QueryRevision = req.query.rvn || -1;
    let specialCosmetics = [
        "AthenaCharacter:cid_random",
        "AthenaBackpack:bid_random",
        "AthenaPickaxe:pickaxe_random",
        "AthenaGlider:glider_random",
        "AthenaSkyDiveContrail:trails_random",
        "AthenaItemWrap:wrap_random",
        "AthenaMusicPack:musicpack_random",
        "AthenaLoadingScreen:lsid_random"
    ];

    let missingFields = checkFields(["slotName"], req.body);

    if (missingFields.fields.length > 0) return error.createError(
        "errors.com.epicgames.validation.validation_failed",
        `Validation Failed. [${missingFields.fields.join(", ")}] field(s) is missing.`,
        [`[${missingFields.fields.join(", ")}]`], 1040, undefined, 400, res
    );

    if (typeof req.body.itemToSlot != "string") return ValidationError("itemToSlot", "a string", res);
    if (typeof req.body.slotName != "string") return ValidationError("slotName", "a string", res);

    if (!profile.items) profile.items = {};

    if (!profile.items[req.body.itemToSlot] && req.body.itemToSlot) {
        let item = req.body.itemToSlot;

        if (!specialCosmetics.includes(item)) {
            return error.createError(
                "errors.com.epicgames.fortnite.id_invalid",
                `Item (id: '${req.body.itemToSlot}') not found`, 
                [req.body.itemToSlot], 16027, undefined, 400, res
            );
        } else {
            if (!item.startsWith(`Athena${req.body.slotName}:`)) return error.createError(
                "errors.com.epicgames.fortnite.id_invalid",
                `Cannot slot item of type ${item.split(":")[0]} in slot of category ${req.body.slotName}`, 
                [item.split(":")[0],req.body.slotName], 16027, undefined, 400, res
            );
        }
    }

    if (profile.items[req.body.itemToSlot]) {
        if (!profile.items[req.body.itemToSlot].templateId.startsWith(`Athena${req.body.slotName}:`)) return error.createError(
            "errors.com.epicgames.fortnite.id_invalid",
            `Cannot slot item of type ${profile.items[req.body.itemToSlot].templateId.split(":")[0]} in slot of category ${req.body.slotName}`, 
            [profile.items[req.body.itemToSlot].templateId.split(":")[0],req.body.slotName], 16027, undefined, 400, res
        );

        let Variants = req.body.variantUpdates;

        if (Array.isArray(Variants)) {
            for (let i in Variants) {
                if (typeof Variants[i] != "object") continue;
                if (!Variants[i].channel) continue;
                if (!Variants[i].active) continue;

                let index = profile.items[req.body.itemToSlot].attributes.variants.findIndex(x => x.channel == Variants[i].channel);

                if (index == -1) continue;
                if (!profile.items[req.body.itemToSlot].attributes.variants[index].owned.includes(Variants[i].active)) continue;

                profile.items[req.body.itemToSlot].attributes.variants[index].active = Variants[i].active;
            }

            ApplyProfileChanges.push({
                "changeType": "itemAttrChanged",
                "itemId": req.body.itemToSlot,
                "attributeName": "variants",
                "attributeValue": profile.items[req.body.itemToSlot].attributes.variants
            });
        }
    }

    let slotNames = ["Character","Backpack","Pickaxe","Glider","SkyDiveContrail","MusicPack","LoadingScreen"];

    let activeLoadoutId = profile.stats.attributes.loadouts[profile.stats.attributes.active_loadout_index];
    let templateId = profile.items[req.body.itemToSlot] ? profile.items[req.body.itemToSlot].templateId : req.body.itemToSlot;
    
    switch (req.body.slotName) {
        case "Dance":
            if (!profile.items[activeLoadoutId].attributes.locker_slots_data.slots[req.body.slotName]) break;

            if (typeof req.body.indexWithinSlot != "number") return ValidationError("indexWithinSlot", "a number", res);

            if (req.body.indexWithinSlot >= 0 && req.body.indexWithinSlot <= 5) {
                profile.stats.attributes.favorite_dance[req.body.indexWithinSlot] = req.body.itemToSlot;
                profile.items[activeLoadoutId].attributes.locker_slots_data.slots.Dance.items[req.body.indexWithinSlot] = templateId;

                ApplyProfileChanges.push({
                    "changeType": "statModified",
                    "name": "favorite_dance",
                    "value": profile.stats.attributes["favorite_dance"]
                });
            }
        break;

        case "ItemWrap":
            if (!profile.items[activeLoadoutId].attributes.locker_slots_data.slots[req.body.slotName]) break;

            if (typeof req.body.indexWithinSlot != "number") return ValidationError("indexWithinSlot", "a number", res);

            switch (true) {
                case req.body.indexWithinSlot >= 0 && req.body.indexWithinSlot <= 7:
                    profile.stats.attributes.favorite_itemwraps[req.body.indexWithinSlot] = req.body.itemToSlot;
                    profile.items[activeLoadoutId].attributes.locker_slots_data.slots.ItemWrap.items[req.body.indexWithinSlot] = templateId;

                    ApplyProfileChanges.push({
                        "changeType": "statModified",
                        "name": "favorite_itemwraps",
                        "value": profile.stats.attributes["favorite_itemwraps"]
                    });
                break;

                case req.body.indexWithinSlot == -1:
                    for (let i = 0; i < 7; i++) {
                        profile.stats.attributes.favorite_itemwraps[i] = req.body.itemToSlot;
                        profile.items[activeLoadoutId].attributes.locker_slots_data.slots.ItemWrap.items[i] = templateId;
                    }

                    ApplyProfileChanges.push({
                        "changeType": "statModified",
                        "name": "favorite_itemwraps",
                        "value": profile.stats.attributes["favorite_itemwraps"]
                    });
                break;
            }
        break;

        default:
            if (!slotNames.includes(req.body.slotName)) break;
            if (!profile.items[activeLoadoutId].attributes.locker_slots_data.slots[req.body.slotName]) break;

            if (req.body.slotName == "Pickaxe" || req.body.slotName == "Glider") {
                if (!req.body.itemToSlot) return error.createError(
                    "errors.com.epicgames.fortnite.id_invalid",
                    `${req.body.slotName} can not be empty.`, 
                    [req.body.slotName], 16027, undefined, 400, res
                );
            }

            profile.stats.attributes[(`favorite_${req.body.slotName}`).toLowerCase()] = req.body.itemToSlot;
            profile.items[activeLoadoutId].attributes.locker_slots_data.slots[req.body.slotName].items = [templateId];

            ApplyProfileChanges.push({
                "changeType": "statModified",
                "name": (`favorite_${req.body.slotName}`).toLowerCase(),
                "value": profile.stats.attributes[(`favorite_${req.body.slotName}`).toLowerCase()]
            });
        break;
    }

    if (ApplyProfileChanges.length > 0) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();

        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
    }

    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
});

app.post("/fortnite/api/game/v2/profile/:accountId/client/CopyCosmeticLoadout", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId });
    var profile = profiles.profiles[req.query.profileId];

    const memory = functions.GetVersionInfo(req);

    if (!await profileManager.validateProfile(req.query.profileId, profiles)) return error.createError(
        "errors.com.epicgames.modules.profiles.operation_forbidden",
        `Unable to find template configuration for profile ${req.query.profileId}`, 
        [req.query.profileId], 12813, undefined, 403, res
    );

    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    let QueryRevision = req.query.rvn || -1;
    let item;

    if (req.body.sourceIndex == 0) {
        item = profile.items[`Fortnite${req.body.targetIndex}-loadout`];
        profile.items[`Fortnite${req.body.targetIndex}-loadout`] = profile.items["sandbox_loadout"];
        profile.items[`Fortnite${req.body.targetIndex}-loadout`].attributes["locker_name"] = req.body.optNewNameForTarget;
        profile.stats.attributes.loadouts[req.body.targetIndex] = `Fortnite${req.body.targetIndex}-loadout`;
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    } else {
        item = profile.items[`Fortnite${req.body.sourceIndex}-loadout`];
        if (!item) return error.createError(
            "errors.com.epicgames.modules.profiles.operation_forbidden",
            `Locker item {0} not found`, 
            [req.query.profileId], 12813, undefined, 403, res
        );
        
        profile.stats.attributes["active_loadout_index"] = req.body.sourceIndex;
        profile.stats.attributes["last_applied_loadout"] = `Fortnite${req.body.sourceIndex}-loadout`;
        profile.items["sandbox_loadout"].attributes["locker_slots_data"] = item.attributes["locker_slots_data"];
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    
    }

    if (ApplyProfileChanges.length > 0) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();
        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
    }

    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
})
app.post("/fortnite/api/game/v2/profile/:accountId/client/SetCosmeticLockerName", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId });
    var profile = profiles.profiles[req.query.profileId];

    const memory = functions.GetVersionInfo(req);

    if (!await profileManager.validateProfile(req.query.profileId, profiles)) return error.createError(
        "errors.com.epicgames.modules.profiles.operation_forbidden",
        `Unable to find template configuration for profile ${req.query.profileId}`, 
        [req.query.profileId], 12813, undefined, 403, res
    );

    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    let QueryRevision = req.query.rvn || -1;
    let item = profile.items[req.body.lockerItem];
    if (!item) return error.createError(
        "errors.com.epicgames.modules.profiles.operation_forbidden",
        `Locker item {0} not found`,
        [req.query.profileId], 12813, undefined, 403, res
    );
    if (typeof req.body.name === "string" && item.attributes.locker_name != req.body.name) {
        
        item.attributes["locker_name"] = req.body.name;
        ApplyProfileChanges = [{
            "changeType": "itemAttrChanged",
            "itemId": req.body.lockerItem,
            "itemName": item.templateId,
            "item": item
        }];
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    };

    if (ApplyProfileChanges.length > 0) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();
        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
    }
    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }
    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
});

app.post("/fortnite/api/game/v2/profile/*/client/DeleteCosmeticLoadout", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({accountId: req.user.accountId});
    let profile = profiles.profiles[req.query.profileId];

    const memory = functions.GetVersionInfo(req);

    if (!await profileManager.validateProfile(req.query.profileId, profiles)) return error.createError(
        "errors.com.epicgames.modules.profiles.operation_forbidden",
        `Unable to find template configuration for profile ${req.query.profileId}`, 
        [req.query.profileId], 12813, undefined, 403, res
    );

    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    let QueryRevision = req.query.rvn || -1;

    if (req.body.leaveNullSlot == false) {
        log.debug("leaveNullSlot Called")
    } else {
        let loadoutname = `Fortnite${req.body.index}-loadout`;
        if(req.body.fallbackLoadoutIndex == -1) {
            delete profile.items[loadoutname];
            delete profile.stats.attributes.loadouts[req.body.index];
            ApplyProfileChanges = [{
                "changeType": "fullProfileUpdate",
                "profile": profile
            }];
        } else {
            let newLoadout = profile.stats.attributes.loadouts[req.body.fallbackLoadoutIndex]
            profile.stats.attributes["last_applied_loadout"] = newLoadout;
            profile.stats.attributes["active_loadout_index"] = req.body.fallbackLoadoutIndex;
            profile.items["sandbox_loadout"].attributes["locker_slots_data"] = profile.items[newLoadout].attributes["locker_slots_data"];
            delete profile.items[loadoutname];
            delete profile.stats.attributes.loadouts[req.body.index];
            ApplyProfileChanges = [{
                "changeType": "fullProfileUpdate",
                "profile": profile
            }];
        }
    }

    if (ApplyProfileChanges.length > 0) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();
        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
    }

    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
})

app.post("/fortnite/api/game/v2/profile/*/client/SetCosmeticLockerBanner", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId });

    if (!await profileManager.validateProfile(req.query.profileId, profiles)) return error.createError(
        "errors.com.epicgames.modules.profiles.operation_forbidden",
        `Unable to find template configuration for profile ${req.query.profileId}`, 
        [req.query.profileId], 12813, undefined, 403, res
    );

    if (req.query.profileId != "athena") return error.createError(
        "errors.com.epicgames.modules.profiles.invalid_command",
        `SetCosmeticLockerBanner is not valid on ${req.query.profileId} profile`, 
        ["SetCosmeticLockerBanner",req.query.profileId], 12801, undefined, 400, res
    );

    let profile = profiles.profiles[req.query.profileId];

    const memory = functions.GetVersionInfo(req);

    if (req.query.profileId == "athena") profile.stats.attributes.season_num = memory.season;

    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    let QueryRevision = req.query.rvn || -1;

    let missingFields = checkFields(["bannerIconTemplateName","bannerColorTemplateName","lockerItem"], req.body);

    if (missingFields.fields.length > 0) return error.createError(
        "errors.com.epicgames.validation.validation_failed",
        `Validation Failed. [${missingFields.fields.join(", ")}] field(s) is missing.`,
        [`[${missingFields.fields.join(", ")}]`], 1040, undefined, 400, res
    );

    if (typeof req.body.lockerItem != "string") return ValidationError("lockerItem", "a string", res);
    if (typeof req.body.bannerIconTemplateName != "string") return ValidationError("bannerIconTemplateName", "a string", res);
    if (typeof req.body.bannerColorTemplateName != "string") return ValidationError("bannerColorTemplateName", "a string", res);

    if (!profile.items) profile.items = {};

    if (!profile.items[req.body.lockerItem]) return error.createError(
        "errors.com.epicgames.fortnite.id_invalid",
        `Item (id: '${req.body.lockerItem}') not found`, 
        [req.body.lockerItem], 16027, undefined, 400, res
    );

    if (profile.items[req.body.lockerItem].templateId.toLowerCase() != "cosmeticlocker:cosmeticlocker_athena") return error.createError(
        "errors.com.epicgames.fortnite.id_invalid",
        `lockerItem id is not a cosmeticlocker`, 
        ["lockerItem"], 16027, undefined, 400, res
    );

    let bannerProfileId = "common_core";

    let HomebaseBannerIconID = "";
    let HomebaseBannerColorID = "";

    if (!profiles.profiles[bannerProfileId].items) profiles.profiles[bannerProfileId].items = {};

    for (let itemId in profiles.profiles[bannerProfileId].items) {
        let templateId = profiles.profiles[bannerProfileId].items[itemId].templateId;

        if (templateId.toLowerCase() == `HomebaseBannerIcon:${req.body.bannerIconTemplateName}`.toLowerCase()) { HomebaseBannerIconID = itemId; continue; }
        if (templateId.toLowerCase() == `HomebaseBannerColor:${req.body.bannerColorTemplateName}`.toLowerCase()) { HomebaseBannerColorID = itemId; continue; }

        if (HomebaseBannerIconID && HomebaseBannerColorID) break;
    }

    if (!HomebaseBannerIconID) return error.createError(
        "errors.com.epicgames.fortnite.item_not_found",
        `Banner template 'HomebaseBannerIcon:${req.body.bannerIconTemplateName}' not found in profile`, 
        [`HomebaseBannerIcon:${req.body.bannerIconTemplateName}`], 16006, undefined, 400, res
    );

    if (!HomebaseBannerColorID) return error.createError(
        "errors.com.epicgames.fortnite.item_not_found",
        `Banner template 'HomebaseBannerColor:${req.body.bannerColorTemplateName}' not found in profile`, 
        [`HomebaseBannerColor:${req.body.bannerColorTemplateName}`], 16006, undefined, 400, res
    );

    profile.items[req.body.lockerItem].attributes.banner_icon_template = req.body.bannerIconTemplateName;
    profile.items[req.body.lockerItem].attributes.banner_color_template = req.body.bannerColorTemplateName;

    profile.stats.attributes.banner_icon = req.body.bannerIconTemplateName;
    profile.stats.attributes.banner_color = req.body.bannerColorTemplateName;

    ApplyProfileChanges.push({
        "changeType": "itemAttrChanged",
        "itemId": req.body.lockerItem,
        "attributeName": "banner_icon_template",
        "attributeValue": profile.items[req.body.lockerItem].attributes.banner_icon_template
    });

    ApplyProfileChanges.push({
        "changeType": "itemAttrChanged",
        "itemId": req.body.lockerItem,
        "attributeName": "banner_color_template",
        "attributeValue": profile.items[req.body.lockerItem].attributes.banner_color_template
    });

    if (ApplyProfileChanges.length > 0) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();

        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
    }

    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
});

app.post("/fortnite/api/game/v2/profile/*/client/SetCosmeticLockerSlot", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId });

    if (!await profileManager.validateProfile(req.query.profileId, profiles)) return error.createError(
        "errors.com.epicgames.modules.profiles.operation_forbidden",
        `Unable to find template configuration for profile ${req.query.profileId}`, 
        [req.query.profileId], 12813, undefined, 403, res
    );

    if (req.query.profileId != "athena") return error.createError(
        "errors.com.epicgames.modules.profiles.invalid_command",
        `SetCosmeticLockerSlot is not valid on ${req.query.profileId} profile`, 
        ["SetCosmeticLockerSlot",req.query.profileId], 12801, undefined, 400, res
    );

    let profile = profiles.profiles[req.query.profileId];

    const memory = functions.GetVersionInfo(req);

    if (req.query.profileId == "athena") profile.stats.attributes.season_num = memory.season;

    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    let QueryRevision = req.query.rvn || -1;
    let specialCosmetics = [
        "AthenaCharacter:cid_random",
        "AthenaBackpack:bid_random",
        "AthenaPickaxe:pickaxe_random",
        "AthenaGlider:glider_random",
        "AthenaSkyDiveContrail:trails_random",
        "AthenaItemWrap:wrap_random",
        "AthenaMusicPack:musicpack_random",
        "AthenaLoadingScreen:lsid_random"
    ];

    let missingFields = checkFields(["category","lockerItem"], req.body);

    if (missingFields.fields.length > 0) return error.createError(
        "errors.com.epicgames.validation.validation_failed",
        `Validation Failed. [${missingFields.fields.join(", ")}] field(s) is missing.`,
        [`[${missingFields.fields.join(", ")}]`], 1040, undefined, 400, res
    );

    if (typeof req.body.itemToSlot != "string") return ValidationError("itemToSlot", "a string", res);
    if (typeof req.body.slotIndex != "number") return ValidationError("slotIndex", "a number", res);
    if (typeof req.body.lockerItem != "string") return ValidationError("lockerItem", "a string", res);
    if (typeof req.body.category != "string") return ValidationError("category", "a string", res);

    if (!profile.items) profile.items = {};

    let itemToSlotID = "";

    if (req.body.itemToSlot) {
        for (let itemId in profile.items) {
            if (profile.items[itemId].templateId.toLowerCase() == req.body.itemToSlot.toLowerCase()) { itemToSlotID = itemId; break; };
        }
    }

    if (!profile.items[req.body.lockerItem]) return error.createError(
        "errors.com.epicgames.fortnite.id_invalid",
        `Item (id: '${req.body.lockerItem}') not found`, 
        [req.body.lockerItem], 16027, undefined, 400, res
    );

    if (profile.items[req.body.lockerItem].templateId.toLowerCase() != "cosmeticlocker:cosmeticlocker_athena") return error.createError(
        "errors.com.epicgames.fortnite.id_invalid",
        `lockerItem id is not a cosmeticlocker`, 
        ["lockerItem"], 16027, undefined, 400, res
    );

    if (!profile.items[itemToSlotID] && req.body.itemToSlot) {
        let item = req.body.itemToSlot;

        if (!specialCosmetics.includes(item)) {
            return error.createError(
                "errors.com.epicgames.fortnite.id_invalid",
                `Item (id: '${req.body.itemToSlot}') not found`, 
                [req.body.itemToSlot], 16027, undefined, 400, res
            );
        } else {
            if (!item.startsWith(`Athena${req.body.category}:`)) return error.createError(
                "errors.com.epicgames.fortnite.id_invalid",
                `Cannot slot item of type ${item.split(":")[0]} in slot of category ${req.body.category}`, 
                [item.split(":")[0],req.body.category], 16027, undefined, 400, res
            );
        }
    }

    if (profile.items[itemToSlotID]) {
        if (!profile.items[itemToSlotID].templateId.startsWith(`Athena${req.body.category}:`)) return error.createError(
            "errors.com.epicgames.fortnite.id_invalid",
            `Cannot slot item of type ${profile.items[itemToSlotID].templateId.split(":")[0]} in slot of category ${req.body.category}`, 
            [profile.items[itemToSlotID].templateId.split(":")[0],req.body.category], 16027, undefined, 400, res
        );

        let Variants = req.body.variantUpdates;

        if (Array.isArray(Variants)) {
            for (let i in Variants) {
                if (typeof Variants[i] != "object") continue;
                if (!Variants[i].channel) continue;
                if (!Variants[i].active) continue;

                let index = profile.items[itemToSlotID].attributes.variants.findIndex(x => x.channel == Variants[i].channel);

                if (index == -1) continue;
                if (!profile.items[itemToSlotID].attributes.variants[index].owned.includes(Variants[i].active)) continue;

                profile.items[itemToSlotID].attributes.variants[index].active = Variants[i].active;
            }

            ApplyProfileChanges.push({
                "changeType": "itemAttrChanged",
                "itemId": itemToSlotID,
                "attributeName": "variants",
                "attributeValue": profile.items[itemToSlotID].attributes.variants
            });
        }
    }
    
    switch (req.body.category) {
        case "Dance":
            if (!profile.items[req.body.lockerItem].attributes.locker_slots_data.slots[req.body.category]) break;

            if (req.body.slotIndex >= 0 && req.body.slotIndex <= 5) {
                profile.items[req.body.lockerItem].attributes.locker_slots_data.slots.Dance.items[req.body.slotIndex] = req.body.itemToSlot;
                profile.stats.attributes.favorite_dance[req.body.slotIndex] = itemToSlotID || req.body.itemToSlot;

                ApplyProfileChanges.push({
                    "changeType": "itemAttrChanged",
                    "itemId": req.body.lockerItem,
                    "attributeName": "locker_slots_data",
                    "attributeValue": profile.items[req.body.lockerItem].attributes.locker_slots_data
                });
            }
        break;

        case "ItemWrap":
            if (!profile.items[req.body.lockerItem].attributes.locker_slots_data.slots[req.body.category]) break;

            switch (true) {
                case req.body.slotIndex >= 0 && req.body.slotIndex <= 7:
                    profile.items[req.body.lockerItem].attributes.locker_slots_data.slots.ItemWrap.items[req.body.slotIndex] = req.body.itemToSlot;
                    profile.stats.attributes.favorite_itemwraps[req.body.slotIndex] = itemToSlotID || req.body.itemToSlot;

                    ApplyProfileChanges.push({
                        "changeType": "itemAttrChanged",
                        "itemId": req.body.lockerItem,
                        "attributeName": "locker_slots_data",
                        "attributeValue": profile.items[req.body.lockerItem].attributes.locker_slots_data
                    });
                break;

                case req.body.slotIndex == -1:
                    for (let i = 0; i < 7; i++) {
                        profile.items[req.body.lockerItem].attributes.locker_slots_data.slots.ItemWrap.items[i] = req.body.itemToSlot;
                        profile.stats.attributes.favorite_itemwraps[i] = itemToSlotID || req.body.itemToSlot;
                    }

                    ApplyProfileChanges.push({
                        "changeType": "itemAttrChanged",
                        "itemId": req.body.lockerItem,
                        "attributeName": "locker_slots_data",
                        "attributeValue": profile.items[req.body.lockerItem].attributes.locker_slots_data
                    });
                break;
            }
        break;

        default:
            if (!profile.items[req.body.lockerItem].attributes.locker_slots_data.slots[req.body.category]) break;

            if (req.body.category == "Pickaxe" || req.body.category == "Glider") {
                if (!req.body.itemToSlot) return error.createError(
                    "errors.com.epicgames.fortnite.id_invalid",
                    `${req.body.category} can not be empty.`, 
                    [req.body.category], 16027, undefined, 400, res
                );
            }

            profile.items[req.body.lockerItem].attributes.locker_slots_data.slots[req.body.category].items = [req.body.itemToSlot];
            profile.stats.attributes[(`favorite_${req.body.category}`).toLowerCase()] = itemToSlotID || req.body.itemToSlot;

            ApplyProfileChanges.push({
                "changeType": "itemAttrChanged",
                "itemId": req.body.lockerItem,
                "attributeName": "locker_slots_data",
                "attributeValue": profile.items[req.body.lockerItem].attributes.locker_slots_data
            });
        break;
    }

    if (ApplyProfileChanges.length > 0) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();

        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
    }

    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
});

app.post("/fortnite/api/game/v2/profile/*/client/PutModularCosmeticLoadout", async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId });
    let profile = profiles.profiles[req.query.profileId];

    // do not change any of these or you will end up breaking it
    var ApplyProfileChanges = [];
    var BaseRevision = profile.rvn || 0;
    var QueryRevision = req.query.rvn || -1;
    var StatChanged = false;

    if (!profile.stats.attributes.hasOwnProperty("loadout_presets")) {
        profile.stats.attributes.loadout_presets = {};

        ApplyProfileChanges.push({
            "changeType": "statModified",
            "name": "loadout_presets",
            "value": {}
        })

        StatChanged = true;
    }

    if (!profile.stats.attributes.loadout_presets.hasOwnProperty(req.body.loadoutType)) {
        const NewLoadoutID = functions.MakeID();

        profile.items[NewLoadoutID] = {
            "templateId": req.body.loadoutType,
            "attributes": {},
            "quantity": 1
        }

        ApplyProfileChanges.push({
            "changeType": "itemAdded",
            "itemId": NewLoadoutID,
            "item": profile.items[NewLoadoutID]
        })

        profile.stats.attributes.loadout_presets[req.body.loadoutType] = {
            [req.body.presetId]: NewLoadoutID
        };

        ApplyProfileChanges.push({
            "changeType": "statModified",
            "name": "loadout_presets",
            "value": profile.stats.attributes.loadout_presets
        })

        StatChanged = true;
    }

    var LoadoutGUID = [];

    try {
        LoadoutGUID = profile.stats.attributes.loadout_presets[req.body.loadoutType][req.body.presetId];
        profile.items[LoadoutGUID].attributes = JSON.parse(req.body.loadoutData);

        ApplyProfileChanges.push({
            "changeType": "itemAttrChanged",
            "itemId": LoadoutGUID,
            "attributeName": "slots",
            "attributeValue": profile.items[LoadoutGUID].attributes.slots
        })

        StatChanged = true;
        
    } catch (err) {}

    if (StatChanged == true) {
        profile.rvn += 1;
        profile.commandRevision += 1;

        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
    }

    // this doesn't work properly on version v12.20 and above but whatever
    if (QueryRevision != BaseRevision) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    })
});

app.post("/fortnite/api/game/v2/profile/*/client/:operation", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId });

    if (!await profileManager.validateProfile(req.query.profileId, profiles)) return error.createError(
        "errors.com.epicgames.modules.profiles.operation_forbidden",
        `Unable to find template configuration for profile ${req.query.profileId}`, 
        [req.query.profileId], 12813, undefined, 403, res
    );
    
    let profile = profiles.profiles[req.query.profileId];

    if (profile.rvn == profile.commandRevision) {
        profile.rvn += 1;

        if (req.query.profileId == "athena") {
            if (!profile.stats.attributes.last_applied_loadout) profile.stats.attributes.last_applied_loadout = profile.stats.attributes.loadouts[0];
        }

        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
    }

    const memory = functions.GetVersionInfo(req);

    if (req.query.profileId == "athena") profile.stats.attributes.season_num = memory.season;

    let MultiUpdate = [];

    if ((req.query.profileId == "common_core") && global.giftReceived[req.user.accountId]) {
        global.giftReceived[req.user.accountId] = false;

        let athena = profiles.profiles["athena"];

        MultiUpdate = [{
            "profileRevision": athena.rvn || 0,
            "profileId": "athena",
            "profileChangesBaseRevision": athena.rvn || 0,
            "profileChanges": [{
                "changeType": "fullProfileUpdate",
                "profile": athena
            }],
            "profileCommandRevision": athena.commandRevision || 0,
        }];
    }

    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    let QueryRevision = req.query.rvn || -1;

    switch (req.params.operation) {
        case "QueryProfile": break;
        case "ClientQuestLogin": break;
        case "RefreshExpeditions": break;
        case "GetMcpTimeForLogin": break;
        case "IncrementNamedCounterStat": break;
        case "SetHardcoreModifier": break;
        case "SetMtxPlatform": break;
        case "BulkEquipBattleRoyaleCustomization": break;

        default:
            error.createError(
                "errors.com.epicgames.fortnite.operation_not_found",
                `Operation ${req.params.operation} not valid`, 
                [req.params.operation], 16035, undefined, 404, res
            );
        return;
    }

    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        multiUpdate: MultiUpdate,
        responseVersion: 1
    });
});

app.post("/fortnite/api/game/v2/profile/:accountId/dedicated_server/:operation", async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.params.accountId }).lean();
    if (!profiles) return res.status(404).json({});

    if (!await profileManager.validateProfile(req.query.profileId, profiles)) return error.createError(
        "errors.com.epicgames.modules.profiles.operation_forbidden",
        `Unable to find template configuration for profile ${req.query.profileId}`, 
        [req.query.profileId], 12813, undefined, 403, res
    );
    
    let profile = profiles.profiles[req.query.profileId];

    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn;
    let QueryRevision = req.query.rvn || -1;

    if (QueryRevision != BaseRevision) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
});

function checkFields(fields, body) {
    let missingFields = { fields: [] };

    fields.forEach(field => {
        if (!body[field]) missingFields.fields.push(field);
    });

    return missingFields;
}

function ValidationError(field, type, res) {
    return error.createError(
        "errors.com.epicgames.validation.validation_failed",
        `Validation Failed. '${field}' is not ${type}.`,
        [field], 1040, undefined, 400, res
    );
}

function checkIfDuplicateExists(arr) {
    return new Set(arr).size !== arr.length
}

module.exports = app;