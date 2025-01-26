const Users = require('../../../model/user');
const Profiles = require('../../../model/profiles');
const config = require('../../../Config/config.json');
const { MessageEmbed } = require('discord.js');

module.exports = {
    commandInfo: {
        name: "removevbucks",
        description: "Lets you change a user's amount of V-Bucks",
        options: [
            {
                name: "user",
                description: "The user you want to change the V-Bucks of",
                required: true,
                type: 6
            },
            {
                name: "vbucks",
                description: "The amount of V-Bucks you want to remove (Can be a negative number to add V-Bucks)",
                required: true,
                type: 4
            }
        ]
    },
    execute: async (interaction) => {
        await interaction.deferReply({ ephemeral: true });

        if (!config.moderators.includes(interaction.user.id)) {
            return interaction.editReply({ content: "You do not have moderator permissions.", ephemeral: true });
        }

        const selectedUser = interaction.options.getUser('user');
        const selectedUserId = selectedUser?.id;
        const user = await Users.findOne({ discordId: selectedUserId });

        if (!user) {
            return interaction.editReply({ content: "That user does not own an account", ephemeral: true });
        }

        const vbucks = parseInt(interaction.options.getInteger('vbucks'));
        if (isNaN(vbucks) || vbucks === 0) {
            return interaction.editReply({ content: "Invalid V-Bucks amount specified.", ephemeral: true });
        }

        const filter = { accountId: user.accountId };
        const updateCommonCore = { $inc: { 'profiles.common_core.items.Currency:MtxPurchased.quantity': -vbucks } };
        const updateProfile0 = { $inc: { 'profiles.profile0.items.Currency:MtxPurchased.quantity': -vbucks } };

        const updatedProfile = await Profiles.findOneAndUpdate(filter, updateCommonCore, { new: true });
        if (!updatedProfile) {
            return interaction.editReply({ content: "That user does not own an account", ephemeral: true });
        }

        await Profiles.updateOne(filter, updateProfile0);

        const profile0 = updatedProfile.profiles["profile0"];
        const common_core = updatedProfile.profiles["common_core"];

        const newQuantityCommonCore = common_core.items['Currency:MtxPurchased'].quantity;
        const newQuantityProfile0 = profile0.items['Currency:MtxPurchased'].quantity;

        common_core.rvn += 1;
        common_core.commandRevision += 1;

        await Profiles.updateOne(filter, {
            $set: {
                'profiles.common_core': common_core,
                'profiles.profile0.items.Currency:MtxPurchased.quantity': newQuantityProfile0
            }
        });

        if (newQuantityCommonCore < 0 || newQuantityCommonCore >= 1000000) {
            return interaction.editReply({
                content: "V-Bucks amount is out of valid range after the update.",
                ephemeral: true
            });
        }

        const embed = new MessageEmbed()
            .setTitle("V-Bucks Updated")
            .setDescription(`Successfully removed **${vbucks}** V-Bucks from <@${selectedUserId}>`)
            .setThumbnail("https://i.imgur.com/yLbihQa.png")
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
            newQuantityCommonCore,
            newQuantityProfile0
        };
    }
};