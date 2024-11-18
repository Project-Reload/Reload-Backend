const { MessageEmbed } = require("discord.js");
const Users = require('../../../model/user.js');
const Profiles = require('../../../model/profiles.js');
const SACCodes = require('../../../model/saccodes.js');
const Friends = require('../../../model/friends.js');
const config = require('../../../Config/config.json')

module.exports = {
    commandInfo: {
        name: "deletediscord",
        description: "Deletes a users account",
        options: [
            {
                name: "username",
                description: "Target username.",
                required: true,
                type: 6
            }
        ]
    },
    execute: async (interaction) => {
        await interaction.deferReply({ ephemeral: true });

        if (!config.moderators.includes(interaction.user.id)) {
            return interaction.editReply({ content: "You do not have moderator permissions.", ephemeral: true });
        }

        const discordId = interaction.options.getUser('username').id;
        const user = interaction.options.getUser('username');
        const deleteAccount = await Users.findOne({ discordId: discordId })
        const accountId = deleteAccount.accountId;

        if (deleteAccount == null) {
            await interaction.editReply({ content: "The selected user does not have **an account**", ephemeral: true });
            return;
        }

        await Users.deleteOne({ username: username }).catch(error => {
            // Nothing Uwu or just use: log.debug('No SAC codes found or error occurred:', error);
        });
        await Profiles.deleteOne({ accountId: accountId }).catch(error => {
            // Nothing Uwu or just use: log.debug('No SAC codes found or error occurred:', error);
        });
        await Friends.deleteOne({ accountId: accountId }).catch(error => {
            // Nothing Uwu or just use: log.debug('No SAC codes found or error occurred:', error);
        });
        await SACCodes.deleteOne({ owneraccountId: accountId }).catch(error => {
            // Nothing Uwu or just use: log.debug('No SAC codes found or error occurred:', error);
        });

        const embed = new MessageEmbed()
            .setTitle("Account deleted")
            .setDescription("The account has been **deleted**")
            .setColor("GREEN")
            .setFooter({
                text: "Reload Backend",
                iconURL: "https://i.imgur.com/2RImwlb.png"
            })
            .setTimestamp();
        await interaction.editReply({ embeds: [embed], ephemeral: true });

        try {
            await user.send({ content: `Your account has been deleted by <@${interaction.user.id}>` });
        } catch (error) {
            // Nothing Uwu or just use: console.error('Could not send DM:', error);
        }
    }
}