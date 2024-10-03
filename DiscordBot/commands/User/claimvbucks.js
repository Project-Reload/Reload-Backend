const { MessageEmbed } = require("discord.js");
const Users = require('../../../model/user.js');
const Profiles = require('../../../model/profiles.js');

module.exports = {
    commandInfo: {
        name: "claimvbucks",
        description: "Claim your daily 250 V-Bucks"
    },
    async execute(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });

        const user = await Users.findOne({ discordId: interaction.user.id });
        if (!user) {
            return interaction.followUp({ content: "You are not registered", ephemeral: true });
        }

        const userProfile = await Profiles.findOne({ accountId: user?.accountId });
        
        const lastClaimed = userProfile?.profiles?.lastVbucksClaim;
        if (lastClaimed && (Date.now() - new Date(lastClaimed).getTime() < 24 * 60 * 60 * 1000)) {
            const timeLeft = 24 - Math.floor((Date.now() - new Date(lastClaimed).getTime()) / (1000 * 60 * 60));
            return interaction.followUp({
                content: `You have already claimed your daily **V-Bucks.** Please wait the remainder: **${timeLeft} hours.**`,
                ephemeral: true
            });
        }

        await Profiles.findOneAndUpdate(
            { accountId: user?.accountId },
            {
                $inc: { 'profiles.common_core.items.Currency:MtxPurchased.quantity': 250 }, //250 is vbucks for day but u can change it
                'profiles.lastVbucksClaim': Date.now()
            }
        );

        const embed = new MessageEmbed()
            .setTitle("Daily V-Bucks Claimed!")
            .setDescription(`You have claimed your daily **250 V-Bucks**!`)
            .setThumbnail("https://i.imgur.com/yLbihQa.png")
            .setColor("#1eff00")
            .setFooter({
                text: "Reload Backend",
                iconURL: "https://i.imgur.com/2RImwlb.png"
            })
        
        await interaction.followUp({ embeds: [embed], ephemeral: true });
    } catch (error) {
        console.error(error);
    }
}
}