const { MessageEmbed } = require("discord.js");
const Users = require("../../../model/user.js");
const Profiles = require("../../../model/profiles.js");
const log = require("../../../structs/log.js");
const uuid = require("uuid");

const cooldowns = new Map();

module.exports = {
    commandInfo: {
        name: "giftvbucks",
        description: "Send another user your V-Bucks",
        options: [
            {
                name: 'user',
                type: 6,
                description: 'The user you want to gift V-Bucks to',
                required: true,
            },
            {
                name: 'vbucks',
                type: 3,
                description: 'The amount of V-Bucks you want to gift',
                required: true,
            },
        ],
    },
    async execute(interaction) {
        const recieverUser = interaction.options.getUser("user");

        try {
            const cooldownKey = interaction.user.id;
            const currentTime = Date.now();
            const cooldownTime = 30000;

            if (cooldowns.has(cooldownKey)) {
                const expirationTime = cooldowns.get(cooldownKey) + cooldownTime;

                if (currentTime < expirationTime) {
                    const timeLeft = ((expirationTime - currentTime) / 1000).toFixed(1);
                    return interaction.reply({
                        content: `You are sending gifts too quickly! Please wait **${timeLeft} seconds** before sending another gift.`,
                        ephemeral: true
                    });
                }
            }

            await interaction.deferReply({ ephemeral: true });

            const sender = await Users.findOne({ discordId: interaction.user.id });
            const recieverUserId = recieverUser?.id;
            const recieveuser = await Users.findOne({ discordId: recieverUserId });

            if (!recieveuser) {
                return interaction.editReply({ content: "That user does not own an account", ephemeral: true });
            }

            if (!sender) {
                return interaction.editReply({ content: "You do not own an account", ephemeral: true });
            }

            if (recieveuser.id === sender.id) {
                return interaction.editReply({ content: "You cannot **gift yourself**", ephemeral: true });
            }

            const vbucks = parseInt(interaction.options.getString('vbucks'));

            if (isNaN(vbucks)) {
                return interaction.editReply({ content: "You need to type a **valid number** for **V-Bucks**", ephemeral: true });
            }

            if (vbucks < 0) {
                return interaction.editReply({ content: "You can't gift **Negative V-Bucks**", ephemeral: true });
            }

            const currentuser = await Profiles.findOne({ accountId: sender?.accountId });
            const recieverProfile = await Profiles.findOne({ accountId: recieveuser?.accountId });

            if (!currentuser || !recieverProfile) {
                return interaction.editReply({ content: "Profile failure or account does not exist", ephemeral: true });
            }

            const senderCommonCore = currentuser.profiles.common_core;
            const recieverCommonCore = recieverProfile.profiles.common_core;

            const senderProfile0 = currentuser.profiles.profile0;
            const recieverProfile0 = recieverProfile.profiles.profile0;

            const sendervbucks = senderCommonCore.items['Currency:MtxPurchased'];
            const recievervbucks = recieverCommonCore.items['Currency:MtxPurchased'];

            if (!sendervbucks) {
                return interaction.editReply({ content: "User Profile failure or account does not exist", ephemeral: true });
            }

            if (!recievervbucks) {
                return interaction.editReply({ content: "Profile failure or account does not exist", ephemeral: true });
            }

            sendervbucks.quantity -= vbucks;
            recievervbucks.quantity += vbucks;

            senderProfile0.items['Currency:MtxPurchased'].quantity -= vbucks;
            recieverProfile0.items['Currency:MtxPurchased'].quantity += vbucks;

            const purchaseId = uuid.v4();
            const lootList = [{
                "itemType": "Currency:MtxGiveaway",
                "itemGuid": "Currency:MtxGiveaway",
                "quantity": vbucks
            }];

            recieverCommonCore.items[purchaseId] = {
                "templateId": `GiftBox:GB_MakeGood`,
                "attributes": {
                    "fromAccountId": sender.accountId,
                    "lootList": lootList,
                    "params": {
                        "userMessage": `You received a gift from ${sender.username || "Unknown Player"}!`
                    },
                    "giftedOn": new Date().toISOString()
                },
                "quantity": 1
            };

            senderCommonCore.rvn += 1;
            senderCommonCore.commandRevision += 1;

            recieverCommonCore.rvn += 1;
            recieverCommonCore.commandRevision += 1;

            await Profiles.updateOne({ accountId: sender?.accountId }, {
                $set: {
                    'profiles.common_core': senderCommonCore,
                    'profiles.profile0': senderProfile0
                }
            });

            await Profiles.updateOne({ accountId: recieveuser?.accountId }, {
                $set: {
                    'profiles.common_core': recieverCommonCore,
                    'profiles.profile0': recieverProfile0
                }
            });

            let ApplyProfileChanges = [
                {
                    "changeType": "itemQuantityChanged",
                    "itemId": "Currency:MtxPurchased",
                    "quantity": recieverCommonCore.items['Currency:MtxPurchased'].quantity
                },
                {
                    "changeType": "itemQuantityChanged",
                    "itemId": "Currency:MtxPurchased",
                    "quantity": recieverProfile0.items['Currency:MtxPurchased'].quantity
                },
                {
                    "changeType": "itemAdded",
                    "itemId": purchaseId,
                    "templateId": "GiftBox:GB_MakeGood"
                }
            ];

            const embed = new MessageEmbed()
                .setTitle("Gift Sent!")
                .setDescription(`Gifted **${vbucks} V-Bucks** to **${recieveuser.username}**`)
                .setThumbnail("https://i.imgur.com/yLbihQa.png")
                .setColor("GREEN")
                .setFooter({
                    text: "Reload Backend",
                    iconURL: "https://i.imgur.com/2RImwlb.png"
                });

            await interaction.editReply({ embeds: [embed], ephemeral: true });

            cooldowns.set(cooldownKey, currentTime);

            return {
                profileRevision: recieverCommonCore.rvn,
                profileCommandRevision: recieverCommonCore.commandRevision,
                profileChanges: ApplyProfileChanges,
                newQuantityCommonCore: recieverCommonCore.items['Currency:MtxPurchased'].quantity,
                newQuantityProfile0: recieverProfile0.items['Currency:MtxPurchased'].quantity
            };
        } catch (error) {
            log.error(error);
        }
    },
};