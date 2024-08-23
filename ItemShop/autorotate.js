const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('../Config/config.json')
const log = require("../structs/log.js");

const webhook = config.bItemShopWebhook; 
const fortniteapi = "https://fortnite-api.com/v2/cosmetics/br";
const catalogcfg = path.join(__dirname, "..", 'Config', 'catalog_config.json');

const seasonlimit = config.bSeasonlimit; 
const dailyItemsCount = config.bDailyItemsAmount;
const featuredItemsCount = config.bFeaturedItemsAmount;


async function fetchitems() {
    try {
        const response = await axios.get(fortniteapi);
        const cosmetics = response.data.data || [];

        return cosmetics.filter(item => {
            const { chapter, season } = item.introduction || {};
            return chapter === '1' && season && parseInt(season, 10) <= seasonlimit;
        });
    } catch (error) {
        log.error('Error fetching cosmetics:', error.message || error);
        return [];
    }
}

function pickRandomItems(items, count) {    
    const shuffled = items.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
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

    switch (rarity) {
        case 'epic':
            return 1500;
        case 'legendary':
            return 2000;
        case 'uncommon':
            return 200;
        case 'rare':
            return 500;
        default:
            return 500; 
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
    log.debug("The item shop has rotated!");
}

async function discordpost(itemShop) {
    const embed = {
        title: "Reload Item Shop",
        description: `These are the cosmetics for today!`,
        fields: [],
    };
    itemShop.daily.forEach(item => {
        const itemName = item.id = (item.name || "Unknown Item");
        embed.fields.push({
            name: itemName,
            value: `Rarity: ${item.rarity?.displayValue || "Unknown"}\nPrice: ${notproperpricegen(item)} V-Bucks`,
            inline: true
        });
    });

    itemShop.featured.forEach(item => {
        const itemName = item.id = (item.name || "Unknown Item");
        embed.fields.push({
            name: itemName,
            value: `Rarity: ${item.rarity?.displayValue || "Unknown"}\nPrice: ${notproperpricegen(item)} V-Bucks`,
            inline: true
        });
    });

    try {
        await axios.post(webhook, { embeds: [embed] });
    } catch (error) {
        log.error("Error sending item shop to Discord:", error.message || error);
    }
}

async function rotateshop() {
    try {
        const cosmetics = await fetchitems();
        if (cosmetics.length === 0) {
            log.error('No cosmetics found?');
            return;
        }

        const dailyItems = pickRandomItems(cosmetics, dailyItemsCount);
        const featuredItems = pickRandomItems(cosmetics, featuredItemsCount);

        updatecfgomg(dailyItems, featuredItems);
        await discordpost({ daily: dailyItems, featured: featuredItems });
    } catch (error) {
        log.error('Error while rotating:', error.message || error);
    }
}

function milisecstillnextrotation() {
    const now = new Date();
    const nextRotation = new Date(now);
    nextRotation.setUTCHours(config.bRotateTime, 0, 0, 0);

    if (now.getUTCHours() >= config.bRotateTime) {
        nextRotation.setUTCDate(now.getUTCDate() + 1);
    }

    return nextRotation.getTime() - now.getTime();
}

rotateshop();

setTimeout(function scheduleNextRotation() {
    rotateshop();
    setInterval(rotateshop, 24 * 60 * 60 * 1000); 
}, milisecstillnextrotation());
