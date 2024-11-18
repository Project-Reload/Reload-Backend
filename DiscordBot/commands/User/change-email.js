const { MessageEmbed } = require("discord.js");
const Users = require('../../../model/user.js');
const functions = require("../../../structs/functions.js");

module.exports = {
    commandInfo: {
        name: "change-email",
        description: "Allows you to change your email",
        options: [
            {
                name: "email",
                description: "Your desired email.",
                required: true,
                type: 3
            }
        ]
    },
    execute: async (interaction) => {
        await interaction.deferReply({ ephemeral: true });

        const user = await Users.findOne({ discordId: interaction.user.id });
        if (!user) {
            return interaction.editReply({ content: "You are not registered!", ephemeral: true });
        }

        const plainEmail = interaction.options.getString('email');

        const emailFilter = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
        if (!emailFilter.test(plainEmail)) {
            return interaction.editReply({ content: "You did not provide a valid email address!", ephemeral: true });
        }

        const existingUser = await Users.findOne({ email: plainEmail });
        if (existingUser) {
            return interaction.editReply({ content: "Email is already in use, please choose another one.", ephemeral: true });
        }

        await user.updateOne({ $set: { email: plainEmail } });

        const refreshTokenIndex = global.refreshTokens.findIndex(i => i.accountId == user.accountId);
        if (refreshTokenIndex != -1) global.refreshTokens.splice(refreshTokenIndex, 1);

        const accessTokenIndex = global.accessTokens.findIndex(i => i.accountId == user.accountId);
        if (accessTokenIndex != -1) {
            global.accessTokens.splice(accessTokenIndex, 1);

            const xmppClient = global.Clients.find(client => client.accountId == user.accountId);
            if (xmppClient) xmppClient.client.close();
        }

        if (accessTokenIndex != -1 || refreshTokenIndex != -1) {
            await functions.UpdateTokens();
        }

        const embed = new MessageEmbed()
            .setTitle("Email changed")
            .setDescription("Your account email has been changed.")
            .setColor("GREEN")
            .setFooter({
                text: "Reload Backend",
                iconURL: "https://i.imgur.com/2RImwlb.png",
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed], ephemeral: true });
    }
};