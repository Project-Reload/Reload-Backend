const { MessageEmbed, PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const Users = require('../../../model/user.js');
const Profiles = require('../../../model/profiles.js');
const config = require('../../../Config/config.json')

module.exports = {
    commandInfo: {
        name: "delete",
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

    if (!config.moderators.includes(interaction.user.id)) {
        console.log("User does not have moderator permissions.");
        return interaction.reply({ content: "You do not have moderator permissions.", ephemeral: true });
    }

    const discordId = interaction.options.getUser('username').id;
    const user = interaction.options.getUser('username');
    const deleteAccount = await Users.findOne({ discordId: discordId })

    if (deleteAccount == null) {
        await interaction.reply({ content: "The selected user does not have **an account**", ephemeral: true });
        return;
    }

    await Users.deleteOne({ discordId: discordId })
    await Profiles.deleteOne({ discordId: discordId })

    const embed = new MessageEmbed()
        .setTitle("Account deleted")
        .setDescription("The account has been **deleted**")
        .setColor("GREEN")
        .setFooter({
            text: "Reload Backend",
            iconURL: "https://cdn.discordapp.com/attachments/1252374830225948672/1263993256136675378/IMG_1736.png?ex=669c40f4&is=669aef74&hm=5ded3e4588c05a56f271e0a07f7631317a3ebd72eae7497c4de5ee712a4db6dd&"
        })
        .setTimestamp();
    await interaction.reply({ embeds: [embed], ephemeral: true });
    await interaction.options.getUser('username').send({ content: `Your account has been deleted by <@${interaction.user.id}>` });
}
}