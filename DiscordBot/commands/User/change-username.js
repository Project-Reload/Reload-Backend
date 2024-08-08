const { MessageEmbed } = require("discord.js");
const User = require("../../../model/user.js");
const Badwords = require("bad-words");

const badwords = new Badwords();

module.exports = {
    commandInfo: {
        name: "change-username",
        description: "Change your username.",
        options: [
            {
                name: "username",
                description: "Your new username.",
                required: true,
                type: 3 // string
            }
        ]
    },
    execute: async (interaction) => {
        await interaction.deferReply({ ephemeral: true });

        const user = await User.findOne({ discordId: interaction.user.id });
        if (!user)
            return interaction.editReply({ content: "You are not registered!", ephemeral: true });

        const username = interaction.options.getString('username');
        if (!badwords.isProfane(username)) {
            return interaction.editReply({ content: "Invalid username. Username must not contain inappropriate language." });
        }

        const plainUsername = interaction.options.getString('username');

        const existingUser = await User.findOne({ username: plainUsername });
        if (existingUser) {
            return interaction.editReply({ content: "Username already exists. Please choose a different one." });
        }

        await user.updateOne({ $set: { username: username, username_lower: username.toLowerCase() } });

        const embed = new MessageEmbed()
            .setTitle("Username changed")
            .setDescription(`Your account username has been changed to **${username}**`)
            .setColor("GREEN")
            .setFooter({
                text: "Reload Backend",
                iconURL: "https://i.imgur.com/2RImwlb.png",
            })
            .setTimestamp();
        await interaction.editReply({ embeds: [embed], ephemeral: true });
    }
}