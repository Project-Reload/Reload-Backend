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
            iconURL: "https://cdn.discordapp.com/attachments/1252374830225948672/1263993256136675378/IMG_1736.png?ex=669c40f4&is=669aef74&hm=5ded3e4588c05a56f271e0a07f7631317a3ebd72eae7497c4de5ee712a4db6dd&"
        })

        interaction.editReply({ embeds: [embed], ephemeral: true });
    }
}
