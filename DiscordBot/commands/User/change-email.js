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
            return interaction.reply({ content: "You did not provide a valid email address!", ephemeral: true });
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
            iconURL: "https://i.imgur.com/2RImwlb.png",
        })
            .setTimestamp();
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
}