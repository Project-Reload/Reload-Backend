const Users = require('../../../model/user.js');
const Profiles = require('../../../model/profiles.js');
const fs = require('fs');
const path = require('path');
const destr = require('destr');
const config = require('../../../Config/config.json')
const { MessageEmbed } = require('discord.js')

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
    if (!user)
        return interaction.editReply({ content: "That user does not own an account" });
    const profile = await Profiles.findOne({ accountId: user.accountId });
    if (!profile)
        return interaction.editReply({ content: "That user does not own an account" });
    const cosmeticname = interaction.options.getString('cosmeticname');
    try {
        await fetch(`https://fortnite-api.com/v2/cosmetics/br/search?name=${cosmeticname}`).then(res => res.json()).then(async (json) => {
            const cosmeticFromAPI = json.data;
            if (!cosmeticFromAPI)
                return await interaction.editReply({ content: "Could not find the cosmetic" });
            const cosmeticimage = cosmeticFromAPI.images.icon;
            const regex = /^(?:[A-Z][a-z]*\b\s*)+$/;
            if (!regex.test(cosmeticname))
                return await interaction.editReply({ content: "Please check for correct casing. E.g 'renegade raider' is wrong, but 'Renegade Raider' is correct." });
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
                        return await interaction.editReply({ content: "That user already has that cosmetic" });
                    }
                    found = true;
                    cosmetic = items[key];
                    break;
                }
            }
            if (!found)
                return await interaction.editReply({ content: `Could not find the cosmetic ${cosmeticname}` });
            await Profiles.findOneAndUpdate({ accountId: user.accountId }, {
                $set: {
                    [`profiles.athena.items.${foundcosmeticname}`]: cosmetic,
                },
            }, { new: true }).catch(async (err) => {
                console.log(err);
                return await interaction.editReply({ content: "An error occured while adding the cosmetic" });
            });
            const embed = new MessageEmbed()
                .setTitle("Cosmetic added")
                .setDescription("Successfully gave the user the cosmetic **" + cosmeticname + "**")
                .setThumbnail(cosmeticimage)
                .setColor("GREEN")
                .setFooter({
                    text: "Reload Backend",
                    iconURL: "https://i.imgur.com/2RImwlb.png"
                })
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
        });
    }
    catch (err) {
        console.log(err);
    }
    }
};