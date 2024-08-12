const config = require("../../../Config/config.json");
const SACCodes = require("../../../model/saccodes.js");

module.exports = {
    commandInfo: {
        name: "deletesac",
        description: "Deletes a Support A Creator Code.",
        options: [
            {
                name: "code",
                description: "The Support A Creator Code to delete.",
                required: true,
                type: 3
            }
        ],
    },
    execute: async (interaction) => {
        await interaction.deferReply({ ephemeral: true });

        if (!config.moderators.includes(interaction.user.id)) {
            return interaction.editReply({ content: "You do not have moderator permissions.", ephemeral: true });
        }

        const { options } = interaction;
        const code = options.get("code").value;

        try {
            const sacCode = await SACCodes.findOne({ code_lower: code.toLowerCase() });

            if (!sacCode) {
                return interaction.editReply({ content: `No **Support A Creator** code found for **${code}**.`, ephemeral: true });
            }

            await SACCodes.deleteOne({ _id: sacCode._id });

            return interaction.editReply({ content: `**Support A Creator** code **${code}** has been successfully deleted.`, ephemeral: true });

        } catch (error) {
            return interaction.editReply({ content: "There was an error while deleting the **SAC code.** Please try again later.", ephemeral: true });
        }
    }
}