const { MessageEmbed } = require("discord.js");
const User = require("../../../model/user.js");
const bcrypt = require("bcrypt");
const functions = require("../../../structs/functions.js");

module.exports = {
    commandInfo: {
        name: "change-password",
        description: "Change your password.",
        options: [
            {
                name: "password",
                description: "Your new password.",
                required: true,
                type: 3
            }
        ]
    },
    execute: async (interaction) => {
        await interaction.deferReply({ ephemeral: true });

        const user = await User.findOne({ discordId: interaction.user.id });
        if (!user) return interaction.editReply({ content: "You do not have a registered account!", ephemeral: true });

        const plainPassword = interaction.options.get("password").value;

        if (plainPassword.length >= 128) {
            return interaction.editReply({ content: "Your password must be less than 128 characters long.", ephemeral: true });
        }
        if (plainPassword.length < 4) {
            return interaction.editReply({ content: "Your password must be at least 4 characters long.", ephemeral: true });
        }

        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        await user.updateOne({ $set: { password: hashedPassword } });

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
            .setTitle("Password changed")
            .setDescription("Your account password has been changed.")
            .setColor("GREEN")
            .setFooter({
                text: "Reload Backend",
                iconURL: "https://i.imgur.com/2RImwlb.png",
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed], ephemeral: true });
    }
};
