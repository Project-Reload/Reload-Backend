const fs = require("fs");
const UserStats = require("../model/userstats.js");

function createProfiles(accountId) {
    let profiles = {};

    fs.readdirSync("./Config/DefaultProfiles").forEach(fileName => {
        const profile = require(`../Config/DefaultProfiles/${fileName}`);

        profile.accountId = accountId;
        profile.created = new Date().toISOString();
        profile.updated = new Date().toISOString();

        profiles[profile.profileId] = profile;
    });

    return profiles;
}

async function createUserStatsProfiles(accountId) {
    await UserStats.create({
        created: new Date().toISOString(),
        accountId: accountId,
        solo: {
            placetop1: 0,
            placetop10: 0,
            placetop25: 0,
            score: 0,
            kills: 0,
            deaths: 0,
            kd: 0,
            matchesplayed: 0,
            minutesplayed: 0,
            playersoutlived: 0
        },
        duo: {
            placetop1: 0,
            placetop5: 0,
            placetop12: 0,
            score: 0,
            kills: 0,
            deaths: 0,
            kd: 0,
            matchesplayed: 0,
            minutesplayed: 0,
            playersoutlived: 0
        },
        trio: {
            placetop1: 0,
            placetop3: 0,
            placetop6: 0,
            score: 0,
            kills: 0,
            deaths: 0,
            kd: 0,
            matchesplayed: 0,
            minutesplayed: 0,
            playersoutlived: 0
        },
        squad: {
            placetop1: 0,
            placetop3: 0,
            placetop6: 0,
            score: 0,
            kills: 0,
            deaths: 0,
            kd: 0,
            matchesplayed: 0,
            minutesplayed: 0,
            playersoutlived: 0
        },
        ltm: {
            wins: 0,
            score: 0,
            kills: 0,
            deaths: 0,
            kd: 0,
            matchesplayed: 0,
            minutesplayed: 0,
            playersoutlived: 0
        },
    });
}

async function validateProfile(profileId, profiles) {
    try {
        let profile = profiles.profiles[profileId];

        if (!profile || !profileId) throw new Error("Invalid profile/profileId");
    } catch {
        return false;
    }

    return true;
}

module.exports = {
    createProfiles,
    createUserStatsProfiles,
    validateProfile
}