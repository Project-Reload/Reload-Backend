const axios = require('axios');
const Users = require('../../../model/user.js');
const Profiles = require('../../../model/profiles.js');
const fs = require('fs');
const path = require('path');
const destr = require('destr');
const config = require('../../../Config/config.json');
const uuid = require("uuid");
const { MessageEmbed } = require('discord.js');

module.exports = {
    commandInfo: {
        name: "additem",
        description: "Allows you to gift a daily shop item to a user.",
        options: [
            {
                name: "user",
                description: "The user you want to gift the cosmetic to",
                required: true,
                type: 6
            },
            {
                name: "item",
                description: "The name or ID of the daily shop item you want to gift",
                required: true,
                type: 3
            },
            {
                name: "message",
                description: "Custom message to include with the gift",
                required: false,
                type: 3
            }
        ]
    },
    execute: async (interaction) => {
        await interaction.deferReply({ ephemeral: true });

        const selectedUser = interaction.options.getUser('user');
        const selectedUserId = selectedUser.id;
        const user = await Users.findOne({ discordId: selectedUserId });

        if (!user) {
            return interaction.editReply({ content: "That user does not own an account", ephemeral: true });
        }

        const profile = await Profiles.findOne({ accountId: user.accountId });
        if (!profile || !profile.profiles) {
            return interaction.editReply({ content: "Could not find the recipient's profile.", ephemeral: true });
        }

        const cosmeticNameOrId = interaction.options.getString('item');
        const customMessage = interaction.options.getString('message') || `Thanks for using Project Reload!`;

        try {
            async function fetchCosmeticData(nameOrId) {
                try {
                    const response = await axios.get(`https://fortnite-api.com/v2/cosmetics/br/search?name=${encodeURIComponent(nameOrId)}`);
                    return response.data?.data || null;
                } catch (error) {
                    console.error("Erreur lors de la récupération des données cosmétiques :", error.message);
                    return null;
                }
            }
            
            const catalogPath = path.join(__dirname, "../../../Config/catalog_config.json");
            const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

            let foundItem = null;
            let itemPrice = 0;
            let cosmeticImage = null;

            for (const [sectionName, section] of Object.entries(catalog)) {
                if (!section.itemGrants || !Array.isArray(section.itemGrants)) continue;

                const itemNameMatch = section.name?.toLowerCase() === cosmeticNameOrId.toLowerCase();
                const itemIdMatch = section.itemGrants?.some(grant => grant?.toLowerCase() === cosmeticNameOrId.toLowerCase());

                if (itemNameMatch || itemIdMatch) {
                    foundItem = section.itemGrants[0];
                    itemPrice = section.price;
                    const cosmeticData = await fetchCosmeticData(section.name || cosmeticNameOrId);
                    cosmeticImage = cosmeticData?.images?.smallIcon || null;
                    break;
                }
            }

            if (!foundItem) {
                return interaction.editReply({ content: "The specified item is not available in the daily shop.", ephemeral: true });
            }

            const sender = await Users.findOne({ discordId: interaction.user.id });
            const senderProfile = await Profiles.findOne({ accountId: sender.accountId });
            if (!senderProfile || !senderProfile.profiles) {
                return interaction.editReply({ content: "Could not find your profile.", ephemeral: true });
            }

            const senderVbucks = senderProfile.profiles.common_core.items["Currency:MtxPurchased"]?.quantity || 0;
            if (senderVbucks < itemPrice) {
                return interaction.editReply({ content: "You do not have enough V-Bucks to gift this item.", ephemeral: true });
            }

            if (profile.profiles.athena.items[foundItem]) {
                return interaction.editReply({ content: "The user already owns this item.", ephemeral: true });
            }

            await Profiles.findOneAndUpdate(
                { accountId: sender.accountId },
                { $inc: { 'profiles.common_core.items.Currency:MtxPurchased.quantity': -itemPrice } }
            );

            const purchaseId = uuid.v4();
            const lootList = [{
                "itemType": foundItem,
                "itemGuid": foundItem,
                "quantity": 1
            }];

            const common_core = profile.profiles["common_core"];
            const athena = profile.profiles["athena"];

            common_core.items[purchaseId] = {
                "templateId": `GiftBox:GB_MakeGood`,
                "attributes": {
                    "fromAccountId": interaction.user.username,
                    "lootList": lootList,
                    "params": { "userMessage": customMessage },
                    "giftedOn": new Date().toISOString()
                },
                "quantity": 1
            };

            athena.items[foundItem] = {
                "templateId": foundItem,
                "attributes": {},
                "quantity": 1
            };

            await Profiles.updateOne(
                { accountId: user.accountId },
                {
                    $set: {
                        'profiles.common_core': common_core,
                        'profiles.athena': athena
                    }
                }
            );

            const embed = new MessageEmbed()
                .setTitle("Gift Sent!")
                .setDescription(`**${cosmeticNameOrId}** has been gifted to ${selectedUser} for **${itemPrice} V-Bucks**.`)
                .setThumbnail(cosmeticImage || 'https://via.placeholder.com/512')
                embed.addFields(
                { name: 'Message:', value: customMessage, inline: true }
                )
                .setColor("BLUE")
                .setFooter({
                    text: "Reload Backend",
                    iconURL: "https://i.imgur.com/2RImwlb.png"
                })
                .setTimestamp();
                
            return interaction.editReply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error("Error executing additem command:", error);
            return interaction.editReply({ content: "An unexpected error occurred.", ephemeral: true });
        }
    }
};