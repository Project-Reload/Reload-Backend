const User = require('../../../model/user.js');
const fs = require("fs");
const config = JSON.parse(fs.readFileSync("./Config/config.json").toString());

module.exports = {
    commandInfo: {
        name: "togglemmc",
        description: "Toggle being able to create custom matchmaking codes for this user.",
        options: [
            {
                name: "user",
                description: "The user whose account you want to select",
                required: true,
                type: 6
            }
        ]
    },
    execute: async (interaction) => {
        if (!config.moderators.includes(interaction.user.id)) {
            return interaction.editReply({ content: "You do not have moderator permissions.", ephemeral: true });
        }
        
        await interaction.deferReply({ ephemeral: true });

        const user = await User.findOne({ discordId: interaction.options.getUser('user')?.id });
        if (!user) return await interaction.editReply({ content: "That user dose not have a account." });

        const updatedUser = await User.findOneAndUpdate({ discordId: interaction.options.getUser('user')?.id }, { $set: { canCreateCodes: !user.canCreateCodes } }, { new: true });

        await interaction.editReply({ content: `Successfully toggled ${interaction.options.getUser('user')?.username}'s ability to create custom matchmaking codes to ${updatedUser?.canCreateCodes}` });
    }
};
