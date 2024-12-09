const Users = require("../../../model/user.js");
const MMCodes = require("../../../model/mmcodes.js");
const { MessageEmbed } = require("discord.js");

module.exports = {
    commandInfo: {
        name: "create-code",
        description: "Creates a custom matchmaking code.",
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
        try {
            console.log("Received interaction:", interaction);

            const user = await Users.findOne({ discordId: interaction.user.id });
            if (!user) {
                console.log("User not found in the database.");
                return interaction.reply({ content: "You do not have an account." });
            }

            if (!user.canCreateCodes) {
                console.log("User not allowed to create codes.");
                return interaction.reply({ content: "You are not allowed to create codes!", ephemeral: true });
            }

            const code = interaction.options.getString('code');
            const ip = interaction.options.getString('ip');
            const port = interaction.options.getInteger('port');

            if (code.length > 16) return interaction.reply({ content: "Your code can't be longer than 16 characters.", ephemeral: true });
            if (code.length < 4) return interaction.reply({ content: "Your code has to be at least 4 characters long.", ephemeral: true });
            if (code.includes(" ")) return interaction.reply({ content: "Your code can't contain spaces", ephemeral: true });
            if (/[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g.test(code)) return interaction.reply({ content: "Your code can't contain any special characters", ephemeral: true });

            const ipExp = new RegExp("^((25[0-5]|(2[0-4]|1[0-9]|[1-9]|)[0-9])(\.(?!$)|$)){4}$");
            if (!ipExp.test(ip)) return interaction.reply({ content: "You provided an invalid IP address", ephemeral: true });

            const codeExists = await MMCodes.findOne({ code_lower: code.toLowerCase() });
            if (codeExists) return interaction.reply({ content: "This code already exists", ephemeral: true });

            const newCode = await MMCodes.create({
                created: new Date(),
                owner: user,
                code: code,
                code_lower: code.toLowerCase(),
                ip: ip,
                port: port
            });
            await newCode.save();

            const embed = new MessageEmbed()
                .setTitle("Code Created!")
                .setDescription("Your code has been created. You can now use it to host games.")
                .setColor("#2b2d31")
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
                        inline: false
                    }
                ])
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error("Error in createcode command:", error);
            return interaction.reply({ content: "An error occurred while processing your request.", ephemeral: true });
        }
    }
};
