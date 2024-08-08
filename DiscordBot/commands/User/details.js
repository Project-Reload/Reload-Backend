const { MessageEmbed } = require("discord.js");
const User = require("../../../model/user.js");

module.exports = {
    commandInfo: {
        name: "details",
        description: "Retrieves your account info."
    },
    execute: async (interaction) => {
        await interaction.deferReply({ ephemeral: true });

        const user = await User.findOne({ discordId: interaction.user.id }).lean();
        if (!user) return interaction.editReply({ content: "You do not have a registered account!", ephemeral: true });

        let onlineStatus = global.Clients.some(i => i.accountId == user.accountId);

        let embed = new MessageEmbed()
        .setColor("GREEN")
        .setDescription("These are your account details")
        .setFields(
            { name: 'Username', value: user.username },
            { name: 'Email', value: `${user.email}` },
            { name: "Online", value: `${onlineStatus ? "Yes" : "No"}` },
            { name: "Banned", value: `${user.banned ? "Yes" : "No"}` },
            { name: "Account ID", value: user.accountId })
        .setTimestamp()
        .setThumbnail(interaction.user.avatarURL())
        .setFooter({
            text: "Reload Backend",
            iconURL: "https://i.imgur.com/2RImwlb.png"
        })

        interaction.editReply({ embeds: [embed], ephemeral: true });
    }
}
