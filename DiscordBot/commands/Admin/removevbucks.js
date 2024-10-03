const Users = require('../../../model/user');
const Profiles = require('../../../model/profiles');
const config = require('../../../Config/config.json')

module.exports = {
    commandInfo: {
        name: "removevbucks",
        description: "Lets you change a users amount of vbucks",
        options: [
            {
                name: "user",
                description: "The user you want to change the vbucks of",
                required: true,
                type: 6
            },
            {
                name: "vbucks",
                description: "The amount of vbucks you want to remove (Can be a negative number to take vbucks)",
                required: true,
                type: 4
            }
        ]
    },
    execute: async (interaction) => {
    await interaction.deferReply({ ephemeral: true });

    if (!config.moderators.includes(interaction.user.id)) {
        return interaction.editReply({ content: "You do not have moderator permissions.", ephemeral: true });
    }
        
    const selectedUser = interaction.options.getUser('user');
    const selectedUserId = selectedUser?.id;
    const user = await Users.findOne({ discordId: selectedUserId });
    if (!user)
        return interaction.editReply({ content: "That user does not own an account", ephemeral: true });
    const vbucks = parseInt(interaction.options.getInteger('vbucks'));
    const profile = await Profiles.findOneAndUpdate({ accountId: user.accountId }, { $inc: { 'profiles.common_core.items.Currency:MtxPurchased.quantity': - vbucks } });
    if (!profile)
        return interaction.editReply({ content: "That user does not own an account", ephemeral: true });

    const embed = new MessageEmbed()
        .setTitle("Vbucks Changed")
        .setDescription("Successfully changed the amount of vbucks for <@" + selectedUserId + "> to **" + vbucks + "**")
        .setThumbnail("https://i.imgur.com/yLbihQa.png")
        .setColor("GREEN")
        .setFooter({
            text: "Reload Backend",
            iconURL: "https://i.imgur.com/2RImwlb.png"
        })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed], ephemeral: true });
}
}