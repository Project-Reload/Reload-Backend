const { MessageEmbed } = require("discord.js");
const Users = require('../../../model/user.js');

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
        const user = await Users.findOne({ discordId: interaction.user.id });
        if (!user)
            return interaction.reply({ content: "You are not registered!", ephemeral: true });
        const plainEmail = interaction.options.getString('email');

        const emailFilter = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
        if (!emailFilter.test(plainEmail)) {
            return interaction.editReply({ content: "You did not provide a valid email address!", ephemeral: true });
        }

        const existingUser = await Users.findOne({ email: plainEmail });
        if (existingUser) {
            return interaction.reply({ content: "Email is already in use, please choose another one.", ephemeral: true });
        }
        
        await user.updateOne({ $set: { email: plainEmail } });
        const embed = new MessageEmbed()
            .setTitle("Email changed")
            .setDescription("Your account email has been changed")
            .setColor("GREEN")
            .setFooter({
            text: "Reload Backend",
            iconURL: "https://cdn.discordapp.com/attachments/1252374830225948672/1263993256136675378/IMG_1736.png?ex=669c40f4&is=669aef74&hm=5ded3e4588c05a56f271e0a07f7631317a3ebd72eae7497c4de5ee712a4db6dd&",
        })
            .setTimestamp();
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
}