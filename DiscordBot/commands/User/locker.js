const { MessageAttachment } = require("discord.js");
const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");
const User = require("../../../model/user.js");
const Profiles = require("../../../model/profiles.js");
const fs = require("fs");
const config = require("../../../Config/config.json");

module.exports = {
    commandInfo: {
        name: "locker",
        description: "Displays specific items from your locker as an image.",
        options: [
            {
                name: "category",
                description: "Select the category of items to display.",
                type: 3,
                required: true,
                choices: [
                    { name: "Skins", value: "skins" },
                    { name: "BackBlings", value: "backblings" },
                    { name: "Emotes", value: "emotes" },
                    { name: "Pickaxes", value: "pickaxes" },
                    { name: "Gliders", value: "gliders" },
                    { name: "Warps", value: "warp" },
                    { name: "SkyDiveContrail", value: "skydivecontrail" },
                    { name: "Loading Screens", value: "loading_screens" },
                ],
            },
        ],
    },

    execute: async (interaction) => {
        await interaction.deferReply({ ephemeral: true });

        const user = await User.findOne({ discordId: interaction.user.id }).lean();
        if (!user) {
            return interaction.editReply({ content: "You do not have a registered account!", ephemeral: true });
        }

        const profile = await Profiles.findOne({ accountId: user.accountId });
        if (!profile || !profile.profiles || !profile.profiles.athena) {
            return interaction.editReply({ content: "No locker data found for your account.", ephemeral: true });
        }

        const category = interaction.options.getString("category");
        const items = profile.profiles.athena.items;
        let filteredItems = [];
        switch (category) {
            case "skins":
                filteredItems = Object.keys(items).filter(id => id.startsWith("AthenaCharacter:"));
                break;
            case "backblings":
                filteredItems = Object.keys(items).filter(id => id.startsWith("AthenaBackpack:"));
                break;
            case "emotes":
                filteredItems = Object.keys(items).filter(id => id.startsWith("AthenaDance:"));
                break;
            case "emotes":
                filteredItems = Object.keys(items).filter(id => id.startsWith("AthenaDance:"));
                break;
            case "pickaxes":
                filteredItems = Object.keys(items).filter(id => id.startsWith("AthenaPickaxe:"));
                break;
            case "gliders":
                filteredItems = Object.keys(items).filter(id => id.startsWith("AthenaGlider:"));
                break;
            case "warp":
                filteredItems = Object.keys(items).filter(id => id.startsWith("AthenaItemWrap:"));
                break;
            case "skydivecontrail":
                filteredItems = Object.keys(items).filter(id => id.startsWith("AthenaSkyDiveContrail:"));
                break;
            case "loading_screens":
                filteredItems = Object.keys(items).filter(id => id.startsWith("AthenaLoadingScreen:"));
                break;
            default:
                return interaction.editReply({ content: "Invalid category selected.", ephemeral: true });
        }

        if (filteredItems.length === 0) {
            return interaction.editReply({ content: `No items found in your locker for the ${category} category.`, ephemeral: true });
        }
        let itemsData = [];
        try {
            const apiResponse = await axios.get("https://fortnite-api.com/v2/cosmetics/br");
            const allCosmetics = apiResponse.data.data;

            // bEnableLockerLimit false
            if (!config.bEnableLockerLimit) {
                itemsData = filteredItems.map(id => {
                    const itemId = id
                        .replace("AthenaCharacter:", "")
                        .replace("AthenaBackpack:", "")
                        .replace("AthenaDance:", "")
                        .replace("AthenaPickaxe:", "")
                        .replace("AthenaGlider:", "")
                        .replace("AthenaItemWrap:", "")
                        .replace("AthenaSkyDiveContrail:", "")
                        .replace("AthenaLoadingScreen:", "");
                    const cosmetic = allCosmetics.find(item => item.id === itemId || item.id.includes(itemId));
                    if (cosmetic) {
                        const season = cosmetic.introduction && cosmetic.introduction.season ? cosmetic.introduction.season : null;
                        const chapter = cosmetic.introduction && cosmetic.introduction.chapter ? cosmetic.introduction.chapter : null;

                        return {
                            id: itemId,
                            name: cosmetic.name,
                            image: cosmetic.type.value === "emoji" && cosmetic.images.smallIcon ? cosmetic.images.smallIcon : cosmetic.images.icon,
                            season: season,
                            chapter: chapter
                        };
                    }
                    return null;
                }).filter(item => item !== null);
            } else {
                // bEnableLockerLimit true
                itemsData = filteredItems.map(id => {
                    const itemId = id
                        .replace("AthenaCharacter:", "")
                        .replace("AthenaBackpack:", "")
                        .replace("AthenaDance:", "")
                        .replace("AthenaPickaxe:", "")
                        .replace("AthenaGlider:", "")
                        .replace("AthenaItemWrap:", "")
                        .replace("AthenaSkyDiveContrail:", "")
                        .replace("AthenaLoadingScreen:", "");
                    const cosmetic = allCosmetics.find(item => item.id === itemId || item.id.includes(itemId));
                    if (cosmetic) {
                        const season = cosmetic.introduction && cosmetic.introduction.season ? cosmetic.introduction.season : null;
                        const chapter = cosmetic.introduction && cosmetic.introduction.chapter ? cosmetic.introduction.chapter : null;

                        if (season !== null && chapter !== null) {
                            if (chapter <= config.bLimitChapter && season <= config.bLimitSeason) {
                                return {
                                    id: itemId,
                                    name: cosmetic.name,
                                    image: cosmetic.type.value === "emoji" && cosmetic.images.smallIcon ? cosmetic.images.smallIcon : cosmetic.images.icon,
                                    season: season,
                                    chapter: chapter
                                };
                            }
                        }
                    }
                    return null;
                }).filter(item => item !== null);
            }
        } catch (error) {
            console.error("Error fetching cosmetics data from Fortnite API:", error);
            return interaction.editReply({ content: "Failed to fetch item data from the Fortnite API.", ephemeral: true });
        }
        if (itemsData.length === 0) {
            return interaction.editReply({ content: `No matching items found for ${category} in the Fortnite API.`, ephemeral: true });
        }

        const itemSize = 150;
        const padding = 20;
        const itemsPerRow = 5;
        const maxRowsPerPage = 6;
        
        const canvasWidth = itemsPerRow * (itemSize + padding) + padding;
        const canvasHeight = maxRowsPerPage * (itemSize + padding) + 100;
        
        const totalPages = Math.ceil(itemsData.length / (itemsPerRow * maxRowsPerPage));
        const attachments = [];
        
        for (let page = 0; page < totalPages; page++) {
            const canvas = createCanvas(canvasWidth, canvasHeight);
            const ctx = canvas.getContext("2d");
        
            const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
            gradient.addColorStop(0, "#2C2F33");
            gradient.addColorStop(1, "#23272A");
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
            const logoImage = await loadImage("https://i.imgur.com/2RImwlb.png");
            const logoSize = 50;
            const logoX = 20;
            const logoY = 20;
            
            ctx.save();
            ctx.beginPath();
            ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2, false);
            ctx.closePath();
            ctx.clip(); 
            ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
            ctx.restore();
            
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "40px Arial";
            ctx.fillText(`${user.username}'s Locker - Page ${page + 1}/${totalPages}`, 80, 50);
        
            let startIndex = page * itemsPerRow * maxRowsPerPage;
            let endIndex = Math.min(startIndex + itemsPerRow * maxRowsPerPage, itemsData.length);
        
            let x = padding;
            let y = 100;
            for (let i = startIndex; i < endIndex; i++) {
                const item = itemsData[i];
        
                ctx.fillStyle = "#3A3F47";
                ctx.beginPath();
                ctx.moveTo(x + 10, y);
                ctx.arcTo(x + itemSize, y, x + itemSize, y + itemSize, 10);
                ctx.arcTo(x + itemSize, y + itemSize, x, y + itemSize, 10);
                ctx.arcTo(x, y + itemSize, x, y, 10);
                ctx.arcTo(x, y, x + itemSize, y, 10);
                ctx.closePath();
                ctx.fill();
        
                if (item.image) {
                    try {
                        const itemImage = await loadImage(item.image);
                        ctx.drawImage(itemImage, x + 10, y + 10, itemSize - 20, itemSize - 20);
                    } catch (err) {
                        console.error(`Error loading image for item ${item.name}:`, err);
                    }
                }
        
                ctx.fillStyle = "#FFFFFF";
                ctx.font = "20px Arial";
                ctx.fillText(item.name, x + 10, y + itemSize + 20);
        
                x += itemSize + padding;
                if (x + itemSize > canvasWidth) {
                    x = padding;
                    y += itemSize + padding + 40;
                }
            }
            const attachment = new MessageAttachment(canvas.toBuffer(), `locker_page_${page + 1}.png`);
            attachments.push(attachment);
        }
        
        const chunkSize = 10;
        for (let i = 0; i < attachments.length; i += chunkSize) {
            const chunk = attachments.slice(i, i + chunkSize);
            await interaction.followUp({ content: `Here are more pages of your ${category}:`, files: chunk, ephemeral: true });
        }        
    },
};