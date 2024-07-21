const { MessageEmbed } = require("discord.js");
const functions = require("../../../structs/functions.js");

module.exports = {
    commandInfo: {
        name: "create",
        description: "Creates an account on Lawin.",
        options: [
            {
                name: "email",
                description: "Your email.",
                required: true,
                type: 3
            },
            {
                name: "username",
                description: "Your username.",
                required: true,
                type: 3
            },
            {
                name: "password",
                description: "Your password.",
                required: true,
                type: 3
            }
        ],
    },
    execute: async (interaction) => {
        await interaction.deferReply({ ephemeral: true });

        const { options } = interaction;

        const discordId = interaction.user.id;
        const email = options.get("email").value;
        const username = options.get("username").value;
        const password = options.get("password").value;

        await functions.registerUser(discordId, username, email, password).then(resp => {
            let embed = new MessageEmbed()
            .setColor(resp.status >= 400 ? "#ff0000" : "#56ff00")
            .setThumbnail(interaction.user.avatarURL({ format: 'png', dynamic: true, size: 256 }))
            .addFields({
                name: "Message",
                value: "Successfully created an account.",
            }, {
                name: "Username",
                value: username,
            }, {
                name: "Discord Tag",
                value: interaction.user.tag,
            })
            .setTimestamp()
            .setFooter({
                text: "Reload Backend",
                iconURL: "https://cdn.discordapp.com/attachments/1252374830225948672/1263993256136675378/IMG_1736.png?ex=669c40f4&is=669aef74&hm=5ded3e4588c05a56f271e0a07f7631317a3ebd72eae7497c4de5ee712a4db6dd&"
            })

            if (resp.status >= 400) return interaction.editReply({ embeds: [embed], ephemeral: true });

            (interaction.channel ? interaction.channel : interaction.user).send({ embeds: [embed] });
            interaction.editReply({ content: "You successfully created an account!", ephemeral: true });
        });
    }
}