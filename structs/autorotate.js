const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('../Config/config.json');
const log = require("./log.js");

const webhook = config.bItemShopWebhook; 
const fortniteapi = "https://fortnite-api.com/v2/cosmetics/br";
const catalogcfg = path.join(__dirname, "..", 'Config', 'catalog_config.json');

const chapterlimit = config.bChapterlimit; 
const seasonlimit = config.bSeasonlimit; 
const dailyItemsCount = config.bDailyItemsAmount;
const featuredItemsCount = config.bFeaturedItemsAmount;

async function fetchitems() {
    try {
        const response = await axios.get(fortniteapi);
        const cosmetics = response.data.data || [];
        const excludedItems = config.bExcludedItems || [];

        return cosmetics.filter(item => {
            const { id, introduction, rarity } = item;
            const chapter = introduction?.chapter ? parseInt(introduction.chapter, 10) : null;
            const season = introduction?.season ? introduction.season.toString() : null;
            const itemRarity = rarity?.displayValue?.toLowerCase();

            if (!chapter || !season) return false;
            if (excludedItems.includes(id)) return false;

            const maxChapter = parseInt(chapterlimit, 10);
            const maxSeason = seasonlimit.toString();

            if (maxSeason === "OG") {
                return chapter >= 1 && chapter <= maxChapter && itemRarity !== "common";
            }

            if (
                chapter < 1 || chapter > maxChapter ||
                (chapter === maxChapter && (season === "X" || parseInt(season, 10) > parseInt(maxSeason, 10)))
            ) {
                return false;
            }

            return itemRarity !== "common";
        });
    } catch (error) {
        log.error('Error fetching cosmetics:', error.message || error);
        return [];
    }
}

function pickRandomItems(items, count) {
    const itemTypeBuckets = {
        athenaCharacter: [],
        athenaDance: [],
        athenaBackpack: [],
        athenaGlider: [],
        athenaPickaxe: [],
        loadingScreen: [],
        emoji: []
    };

    items.forEach(item => {
        const type = item.type?.value.toLowerCase();
        switch (type) {
            case "outfit":
                itemTypeBuckets.athenaCharacter.push(item);
                break;
            case "emote":
                itemTypeBuckets.athenaDance.push(item);
                break;
            case "backpack":
                itemTypeBuckets.athenaBackpack.push(item);
                break;
            case "glider":
                itemTypeBuckets.athenaGlider.push(item);
                break;
            case "pickaxe":
                itemTypeBuckets.athenaPickaxe.push(item);
                break;
            case "loadingscreen":
                itemTypeBuckets.loadingScreen.push(item);
                break;
            case "emoji":
                itemTypeBuckets.emoji.push(item);
                break;
            default:
                break;
        }
    });

    const selectedItems = [];

    function addItemsFromBucket(bucket, requiredCount) {
        const availableItems = bucket.sort(() => 0.5 - Math.random()).slice(0, requiredCount);
        selectedItems.push(...availableItems);
    }

    addItemsFromBucket(itemTypeBuckets.athenaCharacter, Math.min(2, count));
    addItemsFromBucket(itemTypeBuckets.athenaDance, Math.min(1, count));
    addItemsFromBucket(itemTypeBuckets.athenaBackpack, Math.min(1, count));
    addItemsFromBucket(itemTypeBuckets.athenaGlider, Math.min(1, count));
    addItemsFromBucket(itemTypeBuckets.athenaPickaxe, Math.min(1, count));
    addItemsFromBucket(itemTypeBuckets.loadingScreen, Math.min(1, count));
    addItemsFromBucket(itemTypeBuckets.emoji, Math.min(1, count));

    const remainingCount = count - selectedItems.length;
    const remainingItems = items.filter(item => !selectedItems.includes(item));

    const extraItems = remainingItems.sort(() => 0.5 - Math.random()).slice(0, remainingCount);
    selectedItems.push(...extraItems);

    return selectedItems.slice(0, count);
}

function formatitemgrantsyk(item) {
    const { id, backendValue, type } = item;
    let itemType;

    switch (type.value.toLowerCase()) {
        case "outfit":
            itemType = "AthenaCharacter";  
            break;
        case "emote":
            itemType = "AthenaDance";  
            break;
        default:
            itemType = backendValue || `Athena${capitalizeomg(type.value)}`;
            break;
    }

    return [`${itemType}:${id}`];
}

function capitalizeomg(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function notproperpricegen(item) {
    const rarity = item.rarity?.displayValue?.toLowerCase();
    const type = item.type?.value?.toLowerCase();
    const series = item.series?.value?.toLowerCase();

    if (series) {
        switch (series) {
            case 'gaming legends series':
            case 'marvel series':
            case 'star wars series':
            case 'dc series':
            case 'icon series':
                switch (type) {
                    case 'outfit':
                        return 1500;
                    case 'pickaxe':
                        return 1200;
                    case 'backpack':
                        return 1200;
                    case 'emote':
                        return 500;
                    case 'glider':
                        return 1200;
                    case 'wrap':
                        return 700;
                    case 'loadingscreen':
                        return 500;
                    case 'music':
                        return 200;
                    case 'emoji':
                        return 200;
                    default:
                        return 999999;
                }
            case 'lava series':
                switch (type) {
                    case 'outfit':
                    case 'glider':
                    case 'backpack':
                        return 2000;
                    case 'pickaxe':
                        return 1200;
                    case 'loadingscreen':
                        return 500;
                    case 'music':
                        return 200;
                    case 'emoji':
                        return 200;
                    default:
                        return 999999;
                }
            case 'shadow series':
            case 'frozen series':
            case 'slurp series':
            case 'dark series':
                switch (type) {
                    case 'outfit':
                        return 1500;
                    case 'pickaxe':
                        return 1200;
                    case 'backpack':
                        return 1200;
                    case 'glider':
                        return 1200;
                    case 'wrap':
                        return 700;
                    case 'loadingscreen':
                        return 500;
                    case 'music':
                        return 200;
                    case 'emoji':
                        return 200;
                    default:
                        return 999999;
                }
            default:
                return 999999;
        }
    }

    switch (type) {
        case 'outfit':
            switch (rarity) {
                case 'legendary':
                    return 2000;
                case 'epic':
                    return 1500;
                case 'rare':
                    return 1200;
                case 'uncommon':
                    return 800;
                default:
                    return 999999;
            }
        case 'pickaxe':
            switch (rarity) {
                case 'epic':
                    return 1200;
                case 'rare':
                    return 800;
                case 'uncommon':
                    return 500;
                default:
                    return 999999;
            }
        case 'backpack':
            switch (rarity) {
                case 'legendary':
                    return 2000;
                case 'epic':
                    return 1500;
                case 'rare':
                    return 1200;
                case 'uncommon':
                    return 200;
                default:
                    return 999999;
            }
        case 'emote':
        case 'spray':
        case 'emoji':
            switch (rarity) {
                case 'legendary':
                    return 2000;
                case 'epic':
                    return 800;
                case 'rare':
                    return 500;
                case 'uncommon':
                    return 200;
                default:
                    return 999999;
            }
        case 'glider':
            switch (rarity) {
                case 'legendary':
                    return 2000;
                case 'epic':
                    return 1200;
                case 'rare':
                    return 800;
                case 'uncommon':
                    return 500;
                default:
                    return 999999;
            }
        case 'wrap':
            switch (rarity) {
                case 'legendary':
                    return 1200;
                case 'epic':
                    return 700;
                case 'rare':
                    return 500;
                case 'uncommon':
                    return 300;
                default:
                    return 999999;
            }
        case 'loadingscreen':
            switch (rarity) {
                case 'legendary':
                case 'epic':
                case 'rare':
                    return 500;
                case 'uncommon':
                    return 200;
                default:
                    return 999999;
            }
        case 'music':
            switch (rarity) {
                case 'legendary':
                case 'epic':
                    return 500;
                case 'rare':
                case 'uncommon':
                    return 200;
                default:
                    return 999999;
            }
        default:
            return 999999;
    }
}

function updatecfgomg(dailyItems, featuredItems) {
    const catalogConfig = { "//": "BR Item Shop Config" };

    dailyItems.forEach((item, index) => {
        catalogConfig[`daily${index + 1}`] = {
            itemGrants: formatitemgrantsyk(item),
            price: notproperpricegen(item)
        };
    });

    featuredItems.forEach((item, index) => {
        catalogConfig[`featured${index + 1}`] = {
            itemGrants: formatitemgrantsyk(item),
            price: notproperpricegen(item)
        };
    });

    fs.writeFileSync(catalogcfg, JSON.stringify(catalogConfig, null, 2), 'utf-8');
    log.AutoRotation("The item shop has rotated!");
}

async function fetchItemIcon(itemName) {
    try {
        const response = await axios.get(`https://fortnite-api.com/v2/cosmetics/br/search?name=${encodeURIComponent(itemName)}`);
        if (response.data && response.data.data && response.data.data.images && response.data.data.images.smallIcon) {
            return response.data.data.images.smallIcon;
        } else {
            log.error(`No small icon found for ${itemName}`);
            return null;
        }
    } catch (error) {
        log.error(`Error fetching icon for ${itemName}:`, error.message || error);
        return null;
    }
}

async function discordpost(itemShop) {
    const embeds = [];

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
    }

    async function formatItemEmbed(item, authorTitle = null) {
        const itemName = `**${capitalizeFirstLetter(item.name || "Unknown Item")}**`;
        const itemRarity = `Rarity: **${capitalizeFirstLetter(item.rarity?.displayValue || "Unknown")}**`;
        const itemPrice = `Price: **${notproperpricegen(item)} V-Bucks**`;
        const itemIcon = await fetchItemIcon(item.name);

        const embed = {
            title: itemName,
            color: 0x00FF7F,
            description: `${itemRarity}\n${itemPrice}`,
            thumbnail: {
                url: itemIcon || 'https://via.placeholder.com/150' // prevents crash with placeholder images
            }
        };

        if (authorTitle) {
            embed.author = { name: authorTitle };
        }

        return embed;
    }

    function getNextRotationTime() {
        const now = new Date();
        const [localHour, localMinute] = config.bRotateTime.split(':').map(Number);
        const nextRotation = new Date(now);

        nextRotation.setHours(localHour, localMinute, 0, 0);

        if (now >= nextRotation) {
            nextRotation.setDate(nextRotation.getDate() + 1);
        }

        return Math.floor(nextRotation.getTime() / 1000);
    }

    embeds.push({
        title: "Reload Item Shop",
        description: `These are the cosmetics for today!`,
        color: 0x00FF7F,
        fields: [],
    });

    if (itemShop.featured.length > 0) {
        for (const [index, item] of itemShop.featured.entries()) {
            const embed = await formatItemEmbed(item, index === 0 ? "Feature Item" : null);
            embeds.push(embed);
        }
    }

    if (itemShop.daily.length > 0) {
        for (const [index, item] of itemShop.daily.entries()) {
            const embed = await formatItemEmbed(item, index === 0 ? "Daily Item" : null);
            embeds.push(embed);
        }
    }

    const nextRotationTimestamp = getNextRotationTime();
    embeds.push({
        description: `The next shop will be updated at <t:${nextRotationTimestamp}:t>.`,
        color: 0x00FF7F
    });

    try {
        if (config.bEnableDiscordWebhook === true) {
            const chunkSize = 10;
            for (let i = 0; i < embeds.length; i += chunkSize) {
                const embedChunk = embeds.slice(i, i + chunkSize);
                const response = await axios.post(webhook, { embeds: embedChunk });
                log.AutoRotation(`Item shop posted successfully to Discord (chunk ${i / chunkSize + 1}):`, response.status);
            }
        }
    } catch (error) {
        log.error(`Error sending item shop to Discord: ${error.message}`);
        if (error.response && error.response.data) {
            log.error(`Discord API response: ${JSON.stringify(error.response.data, null, 2)}`);
        }
    }
}


async function rotateshop() {
    try {
        const cosmetics = await fetchitems();
        if (cosmetics.length === 0) {
            log.error('No cosmetics found?'); // target was here!
            return;
        }

        const dailyItems = pickRandomItems(cosmetics, dailyItemsCount);
        const featuredItems = pickRandomItems(cosmetics, featuredItemsCount);

        updatecfgomg(dailyItems, featuredItems);
        await discordpost({ daily: dailyItems, featured: featuredItems });

        const nextRotationTime = milisecstillnextrotation();
        log.AutoRotation(`Scheduling next rotation in: ${nextRotationTime} milliseconds`);
        
        setTimeout(rotateshop, nextRotationTime);

    } catch (error) {
        log.error('Error while rotating:', error.message || error);
    }
}

function getUTCTimeFromLocal(hour, minute) {
    const now = new Date();
    const localTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
    return new Date(localTime.toUTCString());
}

function milisecstillnextrotation() {
    const now = new Date();
    const [localHour, localMinute] = config.bRotateTime.toString().split(':').map(Number);
    const nextRotation = getUTCTimeFromLocal(localHour, localMinute);

    if (now.getTime() >= nextRotation.getTime()) {
        nextRotation.setUTCDate(nextRotation.getUTCDate() + 1);
    }

    const millisUntilNextRotation = nextRotation.getTime() - now.getTime();
    log.AutoRotation(`Current time: ${now.toUTCString()}`);
    log.AutoRotation(`Next rotation time (UTC): ${nextRotation.toUTCString()}`);
    log.AutoRotation(`Milliseconds until next rotation: ${millisUntilNextRotation}`);

    return millisUntilNextRotation;
}

setTimeout(rotateshop, milisecstillnextrotation());