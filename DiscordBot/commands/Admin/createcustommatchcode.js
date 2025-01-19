const MMCodes = require("../../../model/mmcodes.js");
const { MessageEmbed } = require("discord.js");
const log = require("../../../structs/log.js");
const config = require('../../../Config/config.json')

module.exports = {
    commandInfo: {
        name: "create-custom-match-code",
        description: "Create a custom matchmaking code.",
        options: [
            {
                name: "code",
                description: "The matchmaking code you want.",
                required: true,
                type: 3
            }, 
            {
                name: "ip",
                description: "The ip of your gameserver.",
                required: true,
                type: 3
            }, 
            {
                name: "port",
                description: "The port of your gameserver.",
                required: true,
                type: 4
            }
        ]
    },
    execute: async (interaction) => {
        if (!config.moderators.includes(interaction.user.id)) {
            return interaction.reply({ content: "You do not have moderator permissions.", ephemeral: true });
        }

        try {
            const code = interaction.options.getString('code');
            const ip = interaction.options.getString('ip');
            const port = interaction.options.getInteger('port');

            if (code.length > 24) return interaction.reply({ content: "Your code can't be longer than 24 characters.", ephemeral: true });
            if (code.length < 4) return interaction.reply({ content: "Your code has to be at least 4 characters long.", ephemeral: true });
            if (code.includes(" ")) return interaction.reply({ content: "Your code can't contain spaces", ephemeral: true });
            if (/[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g.test(code)) return interaction.reply({ content: "Your code can't contain any special characters", ephemeral: true });

            const ipExp = new RegExp("^((25[0-5]|(2[0-4]|1[0-9]|[1-9]|)[0-9])(\.(?!$)|$)){4}$");
            if (!ipExp.test(ip)) return interaction.reply({ content: "You provided an invalid IP address", ephemeral: true });

            if (port < 1 || port > 65535) {
                return interaction.reply({ content: "The port must be a number between 1 and 65535.", ephemeral: true });
            }

            const codeExists = await MMCodes.findOne({ code_lower: code.toLowerCase() });
            if (codeExists) return interaction.reply({ content: "This code already exists", ephemeral: true });

            const newCode = await MMCodes.create({
                created: new Date(),
                code: code,
                code_lower: code.toLowerCase(),
                ip: ip,
                port: port
            });
            await newCode.save();

            const embed = new MessageEmbed()
                .setTitle("Successfully Created Custom Game Code!")
                .setDescription("Your code has been created. You can now use it to host custom games.")
                .setColor("GREEN")
                .addFields([
                    {
                        name: "Code",
                        value: code, 
                        inline: true
                    },
                    {
                        name: "IP",
                        value: ip,
                        inline: true
                    },
                    {
                        name: "Port",
                        value: port?.toString(),
                        inline: true
                    }
                ])
                .setTimestamp()
                .setThumbnail("https://i.imgur.com/2RImwlb.png")
                .setFooter({
                    text: "Reload Backend",
                    iconURL: "https://i.imgur.com/2RImwlb.png"
                });

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            log.error(error);
            return interaction.reply({ content: "An error occurred while processing your request.", ephemeral: true });
        }
    }
};