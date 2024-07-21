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

        const validUsernameRegex = /^[a-zA-Z0-9]+$/;
        const username = interaction.options.getString('username');
        if (!validUsernameRegex.test(username) || badwords.isProfane(username)) {
            return interaction.editReply({ content: "Invalid username. Username must contain only letters and numbers, and no spaces or special characters. Additionally, it should not contain inappropriate language." });
        }

        const plainUsername = interaction.options.getString('username');
    
        if (plainUsername.length < 3) {
            return interaction.editReply({ content: "Invalid username. Username must have at least 3 characters." });
        }
    
        if (plainUsername.length > 20) {
            return interaction.editReply({ content: "Invalid username. Username must be 20 characters or less" });
        }

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
                iconURL: "https://cdn.discordapp.com/attachments/1252374830225948672/1263993256136675378/IMG_1736.png?ex=669c40f4&is=669aef74&hm=5ded3e4588c05a56f271e0a07f7631317a3ebd72eae7497c4de5ee712a4db6dd&",
            })
            .setTimestamp();
        await interaction.editReply({ embeds: [embed], ephemeral: true });
    }
}