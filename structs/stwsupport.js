const fs = require('fs');
const path = require('path');
const log = require("./log.js");
function handleSTW() {
    const configPath = path.join(__dirname, '..', 'Config', 'config.json');
    const profilePath = path.join(__dirname, '..', 'Config', 'DefaultProfiles', 'common_core.json');

    function updateProfile(configEnabled) {
        try {
            const profileData = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
            const requiredItems = {
                "Campaign": {
                    "templateId": "Token:campaignaccess",
                    "attributes": {
                        "max_level_bonus": 0,
                        "level": 1,
                        "item_seen": true,
                        "xp": 0,
                        "favorite": false
                    },
                    "quantity": 1
                },
                "CampaignFoundersPack1": {
                    "templateId": "Token:founderspack_1",
                    "attributes": {
                        "max_level_bonus": 0,
                        "level": 1,
                        "item_seen": true,
                        "xp": 0,
                        "favorite": false
                    },
                    "quantity": 1
                }
            };

            const items = profileData.items || {};

            if (configEnabled) {
                Object.keys(requiredItems).forEach(key => {
                    if (!items[key]) {
                        items[key] = requiredItems[key];
                        
                    }
                });
            } else {
                Object.keys(requiredItems).forEach(key => {
                    if (items[key]) {
                        delete items[key];
                        
                    }
                });
            }

            profileData.items = items;
            fs.writeFileSync(profilePath, JSON.stringify(profileData, null, 2));
            log.backend(`STW is ${configEnabled ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error(`Error updating profile: ${error.message}`);
        }
    }

    try {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const isSTWEnabled = configData?.STW?.enabled;

        
        updateProfile(isSTWEnabled);
    } catch (error) {
        console.error(`Error reading configuration: ${error.message}`);
    }
}

module.exports = { handleSTW };
