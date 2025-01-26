const Users = require('../../../model/user.js');
const Profiles = require('../../../model/profiles.js');
const fs = require('fs');
const path = require('path');
const destr = require('destr');
const config = require('../../../Config/config.json');
const uuid = require("uuid");
const log = require("../../../structs/log.js");
const { MessageEmbed } = require('discord.js');

module.exports = {
    commandInfo: {
        name: "additem",
        description: "Allows you to give a user any skin, pickaxe, glider, etc.",
        options: [
            {
                name: "user",
                description: "The user you want to give the cosmetic to",
                required: true,
                type: 6
            },
            {
                name: "cosmeticname",
                description: "The name of the cosmetic you want to give",
                required: true,
                type: 3
            }
        ]
    },
    execute: async (interaction) => {
        await interaction.deferReply({ ephemeral: true });

        if (!config.moderators.includes(interaction.user.id)) {
            return interaction.editReply({ content: "You do not have moderator permissions.", ephemeral: true });
        }

        const selectedUser = interaction.options.getUser('user');
        const selectedUserId = selectedUser.id;
        const user = await Users.findOne({ discordId: selectedUserId });

        if (!user) {
            return interaction.editReply({ content: "That user does not own an account", ephemeral: true });
        }

        const profile = await Profiles.findOne({ accountId: user.accountId });

        if (!profile) {
            return interaction.editReply({ content: "That user does not own an account", ephemeral: true });
        }

        const cosmeticname = interaction.options.getString('cosmeticname');

        try {
            await fetch(`https://fortnite-api.com/v2/cosmetics/br/search?name=${cosmeticname}`)
                .then(res => res.json())
                .then(async (json) => {
                    const cosmeticFromAPI = json.data;
                    if (!cosmeticFromAPI) {
                        return await interaction.editReply({ content: "Could not find the cosmetic", ephemeral: true });
                    }

                    const cosmeticimage = cosmeticFromAPI.images.icon;
                    const regex = /^[A-Za-z0-9'°. \s]+$/;
                    if (!regex.test(cosmeticname)) {
                        return await interaction.editReply({ content: "Please check for correct casing. E.g 'Renegade Raider' is correct.", ephemeral: true });
                    }

                    let cosmetic = {};
                    const file = fs.readFileSync(path.join(__dirname, "../../../Config/DefaultProfiles/allathena.json"));
                    const jsonFile = destr(file.toString());
                    const items = jsonFile.items;
                    let foundcosmeticname = "";
                    let found = false;

                    for (const key of Object.keys(items)) {
                        const [type, id] = key.split(":");
                        if (id === cosmeticFromAPI.id) {
                            foundcosmeticname = key;
                            if (profile.profiles.athena.items[key]) {
                                return await interaction.editReply({ content: "That user already has that cosmetic", ephemeral: true });
                            }
                            found = true;
                            cosmetic = items[key];
                            break;
                        }
                    }

                    if (!found) {
                        return await interaction.editReply({ content: `Could not find the cosmetic ${cosmeticname}`, ephemeral: true });
                    }

                    const purchaseId = uuid.v4();
                    const lootList = [{
                        "itemType": cosmetic.templateId,
                        "itemGuid": cosmetic.templateId,
                        "quantity": 1
                    }];

                    const common_core = profile.profiles["common_core"];
                    const athena = profile.profiles["athena"];

                    common_core.items[purchaseId] = {
                        "templateId": `GiftBox:GB_MakeGood`,
                        "attributes": {
                            "fromAccountId": `[${interaction.user.username}]`,
                            "lootList": lootList,
                            "params": {
                                "userMessage": `Thanks For Using Reload Backend!`
                            },
                            "giftedOn": new Date().toISOString()
                        },
                        "quantity": 1
                    };

                    athena.items[foundcosmeticname] = cosmetic;

                    let ApplyProfileChanges = [
                        {
                            "changeType": "itemAdded",
                            "itemId": foundcosmeticname,
                            "templateId": cosmetic.templateId
                        },
                        {
                            "changeType": "itemAdded",
                            "itemId": purchaseId,
                            "templateId": "GiftBox:GB_MakeGood"
                        }
                    ];

                    common_core.rvn++;
                    common_core.commandRevision++;
                    common_core.updated = new Date().toISOString();
                    athena.rvn++;
                    athena.commandRevision++;
                    athena.updated = new Date().toISOString();

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
                        .setTitle("Cosmetic Gift Sent")
                        .setDescription(`Successfully gave the user the cosmetic **${cosmeticname}** with a GiftBox`)
                        .setThumbnail(cosmeticimage)
                        .setColor("GREEN")
                        .setFooter({
                            text: "Reload Backend",
                            iconURL: "https://i.imgur.com/2RImwlb.png"
                        })
                        .setTimestamp();

                    await interaction.editReply({ embeds: [embed], ephemeral: true });

                    return {
                        profileRevision: common_core.rvn,
                        profileCommandRevision: common_core.commandRevision,
                        profileChanges: ApplyProfileChanges
                    };
                });
        } catch (err) {
            log.error(err);
            await interaction.editReply({ content: "An unexpected error occurred", ephemeral: true });
        }
    }
};
