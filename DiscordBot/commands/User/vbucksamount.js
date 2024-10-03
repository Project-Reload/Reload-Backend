const { MessageEmbed } = require("discord.js");
const Profiles = require('../../../model/profiles.js');
const Users = require('../../../model/user.js');

module.exports = {
    commandInfo: {
        name: "vbucksamount",
        description: "Displays your current V-Bucks balance.",
    },
    execute: async (interaction) => {

    await interaction.deferReply({ ephemeral: true })

    const currentuser = await Users.findOne({ discordId: interaction.user.id });
    const vbucksamount = await Profiles.findOne({ accountId: currentuser?.accountId });
    const currency = vbucksamount?.profiles.common_core.items["Currency:MtxPurchased"].quantity;
    if (!currentuser) 
    {
        return interaction.editReply({ content: "You are not registered!", ephemeral: true });
    }
    const embed = new MessageEmbed()
        .setTitle("V-Bucks Count:")
        .setDescription(`You currently have **` + currency + " V-Bucks** in your Account!")
        .setTimestamp()
        .setThumbnail('https://i.imgur.com/yLbihQa.png')
        .setFooter({
            text: "Reload Backend",
            iconURL: "https://i.imgur.com/2RImwlb.png"
        })
        .setColor("WHITE")
    await interaction.editReply({ embeds: [embed], ephemeral: true });
}
}