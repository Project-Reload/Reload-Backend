const { MessageEmbed } = require("discord.js");
const Users = require("../../../model/user.js");

module.exports = {
    commandInfo: {
        name: "lookup",
        description: "Search for a Discord user\'s ID by providing their in-game username.",
        options: [
            {
                name: "user",
                description: "Target username.",
                required: true,
                type: 3
            }
        ]
    },
    execute: async (interaction) => {

    await interaction.deferReply({ ephemeral: true });

    const { options } = interaction;

    const user = await Users.findOne({ username_lower: (options.get("user").value).toLowerCase() }).lean();
    if (!user) return interaction.editReply({ content: "The account username you entered does not exist.", ephemeral: true });

    let onlineStatus = global.Clients.some(i => i.accountId == user.accountId);

    let embed = new MessageEmbed()
        .setColor("GREEN")
        .setDescription(`**User Information:**\n- **Discord User:** <@${user.discordId}>\n- **DiscordID:** ${user.discordId}\n- **In-Game Username:** ${user.username}\n- **Banned:** ${user.banned ? "Yes" : "No"}\n- **Online:** ${onlineStatus ? "Yes" : "No"}`)
        .setFooter({
            text: "Reload Backend",
            iconURL: "https://cdn.discordapp.com/attachments/1252374830225948672/1263993256136675378/IMG_1736.png?ex=669c40f4&is=669aef74&hm=5ded3e4588c05a56f271e0a07f7631317a3ebd72eae7497c4de5ee712a4db6dd&"
        })

    interaction.editReply({ embeds: [embed], ephemeral: true });
    }
}