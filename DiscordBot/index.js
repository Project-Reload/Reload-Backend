const { Client, Intents, MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_BANS] });
const fs = require("fs");
const path = require("path");
const config = JSON.parse(fs.readFileSync("./Config/config.json").toString());
const log = require("../structs/log.js");
const Users = require("../model/user.js");
const Profiles = require("../model/profiles.js");
const { activeTrades } = require('../model/activeTrades.js');
const uuid = require('uuid');
const { QuickDB } = require("quick.db");
const db = new QuickDB();

client.once("ready", () => {
    log.bot("Bot is up and running!");

    if (config.bEnableBackendStatus) {
        if (!config.bBackendStatusChannelId || config.bBackendStatusChannelId.trim() === "") {
            log.error("The channel ID has not been set in config.json for bEnableBackendStatus.");
        } else {
            const channel = client.channels.cache.get(config.bBackendStatusChannelId);
            if (!channel) {
                log.error(`Cannot find the channel with ID ${config.bBackendStatusChannelId}`);
            } else {
                const embed = new MessageEmbed()
                    .setTitle("Backend Online")
                    .setDescription("Reload Backend is now online")
                    .setColor("GREEN")
                    .setThumbnail("https://i.imgur.com/2RImwlb.png")
                    .setFooter({
                        text: "Reload Backend",
                        iconURL: "https://i.imgur.com/2RImwlb.png",
                    })
                    .setTimestamp();

                channel.send({ embeds: [embed] }).catch(err => {
                    log.error(err);
                });
            }
        }
    }

    let commands = client.application.commands;

    const loadCommands = (dir) => {
        fs.readdirSync(dir).forEach(file => {
            const filePath = path.join(dir, file);
            if (fs.lstatSync(filePath).isDirectory()) {
                loadCommands(filePath);
            } else if (file.endsWith(".js")) {
                const command = require(filePath);
                commands.create(command.commandInfo);
            }
        });
    };

    loadCommands(path.join(__dirname, "commands"));
});

client.on("interactionCreate", async interaction => {
    if (!interaction.isApplicationCommand()) return;

    const executeCommand = (dir, commandName) => {
        const commandPath = path.join(dir, commandName + ".js");
        if (fs.existsSync(commandPath)) {
            require(commandPath).execute(interaction);
            return true;
        }
        const subdirectories = fs.readdirSync(dir).filter(subdir => fs.lstatSync(path.join(dir, subdir)).isDirectory());
        for (const subdir of subdirectories) {
            if (executeCommand(path.join(dir, subdir), commandName)) {
                return true;
            }
        }
        return false;
    };

    executeCommand(path.join(__dirname, "commands"), interaction.commandName);

        if (!interaction.isButton()) return;
    if (interaction.customId === "accept-trade") {
      await interaction.deferReply({ ephemeral: true });

      const data = await db.get(`userget_${interaction.message.id}`);

      if (interaction.user.id !== data.commandUser.id) {
        return await interaction.editReply({ content: `You can't click on this button.`, ephemeral: true });
      } else {
        const user = await Users.findOne({ discordId: interaction.user.id });
        const profile = await Profiles.findOne({ accountId: user.accountId });

        const selectedUserUser = await Users.findOne({ discordId: data.selectedUserId });
        const selectedUserProfile = await Profiles.findOne({ accountId: selectedUserUser.accountId });

        const update = { $unset: {} };
        update.$unset[`profiles.athena.items.${data.foundcosmeticname}`] = "";

        await Profiles.findOneAndUpdate(
          { accountId: data.selectedUserAccountId },
          update,
          { new: true }
        ).catch(async (err) => {
          return interaction.editReply({ content: "An error occurRED while removing the cosmetic" });
        });

        const purchaseId = uuid.v4();
        const lootList = [{
          "itemType": data.templateId,
          "itemGuid": data.templateId,
          "quantity": 1
        }];

        const common_core = profile.profiles["common_core"];
        const athena = profile.profiles["athena"];

        common_core.items[purchaseId] = {
          "templateId": `GiftBox:GB_MakeGood`,
          "attributes": {
            "fromAccountId": `[${data.selectedUserUsername}]`,
            "lootList": lootList,
            "params": {
              "userMessage": `Thanks For Using Reload Backend!`
            },
            "giftedOn": new Date().toISOString()
          },
          "quantity": 1
        };

        athena.items[data.foundcosmeticname] = data.cosmetic;

        let ApplyProfileChanges = [
          {
            "changeType": "itemAdded",
            "itemId": data.foundcosmeticname,
            "templateId": data.templateId
          },
          {
            "changeType": "itemAdded",
            "itemId": purchaseId,
            "templateId": "GiftBox:GB_MakeGood"
          }
        ];

        common_core.rvn++;
        common_core.commandRevision++;
        common_core.updated = new Date().toISOString();
        athena.rvn++;
        athena.commandRevision++;
        athena.updated = new Date().toISOString();

        await Profiles.updateOne(
          { accountId: data.user },
          {
            $set: {
              'profiles.common_core': common_core,
              'profiles.athena': athena
            }
          }
        );

        await interaction.editReply({ content: "You accepted the trade.", ephemeral: true })

        const embedData = data.message.embeds[0];

        if (!embedData) {
          console.error("No embed data found");
          return interaction.editReply({ content: "Failed to retrieve embed data.", ephemeral: true });
        }

        const originalDescription = embedData.description || "No description available";
        const updatedDescription = originalDescription.replace(
          /Waiting.*?trade/i,
          `Trade accepted by <@${data.selectedUserId}>`
        );

        const embed = new MessageEmbed()
          .setColor("GREEN")
          .setDescription(updatedDescription)
          .setImage('attachment://trade-image.png')
          .setTimestamp()
          .setThumbnail('attachment://trade-user.png')
          .setFooter({ text: 'Trading System • Credits to alon5757 - Ãłøn.' })

        const row = new MessageActionRow()
          .addComponents(
            new MessageButton()
              .setCustomId("accept-trade")
              .setLabel("Accept")
              .setStyle('SUCCESS')
              .setDisabled(true),

            new MessageButton()
              .setCustomId("decline-trade")
              .setLabel("Decline")
              .setStyle('DANGER')
              .setDisabled(true),

            new MessageButton()
              .setCustomId("cancel-trade")
              .setLabel("Cancel Trade")
              .setStyle('DANGER')
              .setDisabled(true),
          );

        const canvasBuffer = Buffer.from(data.canvasBuffer.data);
        const dataUrl = Buffer.from(data.dataUrl.data);

        try {
          const message = await interaction.channel.messages.fetch(data.message.id);

          await message.edit({
            files: [
              { attachment: canvasBuffer, name: 'trade-image.png' },
              { attachment: dataUrl, name: 'trade-user.png' }
            ],
            embeds: [embed],
            components: [row],
            content: `||<@${data.commandUser?.id}> | <@${data.selectedUserId}>||`
          });

          const messageLink = message.url;

          const user = interaction.guild.members.cache.get(data.commandUser.id);

          if (user) {
            await user.send(`**<@${data.selectedUserId}> | \`${data.selectedUser.globalName}\` | \`${data.selectedUser.id}\`** has accepted your trade offer **|** ${messageLink}`);
          } else {
            console.error("User not found.");
          }
        } catch (error) {
          console.error("Error editing message or sending DM:", error);
        }

        activeTrades.delete(data.commandUser.id);
        activeTrades.delete(data.selectedUserId);

        await db.delete(`userget_${interaction.message.id}`);

        return {
          profileRevision: common_core.rvn,
          profileCommandRevision: common_core.commandRevision,
          profileChanges: ApplyProfileChanges
        };
      }
    }
    if (!interaction.isButton()) return;
    if (interaction.customId === "decline-trade") {
      await interaction.deferReply({ ephemeral: true });

      const data = await db.get(`userget_${interaction.message.id}`);

      if (interaction.user.id !== data.commandUser.id) {
        return await interaction.editReply({ content: `You can't click on this button.`, ephemeral: true });
      } else {
        await interaction.editReply({ content: "You declined the trade.", ephemeral: true })

        const embedData = data.message.embeds[0];

        if (!embedData) {
          console.error("No embed data found");
          return interaction.editReply({ content: "Failed to retrieve embed data.", ephemeral: true });
        }

        const originalDescription = embedData.description || "No description available";
        const updatedDescription = originalDescription.replace(
          /Waiting.*?trade/i,
          `Trade declined by <@${data.selectedUserId}>`
        );

        const embed = new MessageEmbed()
          .setColor("RED")
          .setDescription(updatedDescription)
          .setImage('attachment://trade-image.png')
          .setTimestamp()
          .setThumbnail('attachment://trade-user.png')
          .setFooter({ text: 'Trading System • Credits to alon5757 - Ãłøn.' })

        const row = new MessageActionRow()
          .addComponents(
            new MessageButton()
              .setCustomId("accept-trade")
              .setLabel("Accept")
              .setStyle('SUCCESS')
              .setDisabled(true),

            new MessageButton()
              .setCustomId("decline-trade")
              .setLabel("Decline")
              .setStyle('DANGER')
              .setDisabled(true),

            new MessageButton()
              .setCustomId("cancel-trade")
              .setLabel("Cancel Trade")
              .setStyle('DANGER')
              .setDisabled(true),
          );


        const canvasBuffer = Buffer.from(data.canvasBuffer.data);
        const dataUrl = Buffer.from(data.dataUrl.data);

        const message = await interaction.channel.messages.fetch(data.message.id);

        try {
          await message.edit({
            files: [
              { attachment: canvasBuffer, name: 'trade-image.png' },
              { attachment: dataUrl, name: 'trade-user.png' }
            ],
            embeds: [embed],
            components: [row],
            content: `||<@${data.commandUser?.id}> | <@${data.selectedUserId}>||`,
          });

          const messageLink = message.url;

          const user = interaction.guild.members.cache.get(data.commandUser.id);

          if (user) {
            await user.send(`**<@${data.selectedUserId}> | \`${data.selectedUser.globalName}\` | \`${data.selectedUser.id}\`** has declined your trade offer **|** ${messageLink}`);
          } else {
            console.error("User not found.");
          }
        } catch (error) {
          console.error("Error editing message or sending DM:", error);
        }

        await db.delete(`userget_${interaction.message.id}`);

        activeTrades.delete(data.commandUser.id);
        activeTrades.delete(data.selectedUserId);
      }
    }
    if (!interaction.isButton()) return;
    if (interaction.customId === "cancel-trade") {
      await interaction.deferReply({ ephemeral: true });

      const data = await db.get(`userget_${interaction.message.id}`);

      if (interaction.user.id !== data.commandUser.id) {
        return await interaction.editReply({ content: `You can't click on this button.`, ephemeral: true });
      } else {
        const embedData = data.message.embeds[0];

        if (!embedData) {
          console.error("No embed data found");
          return interaction.editReply({ content: "Failed to retrieve embed data.", ephemeral: true });
        }

        const originalDescription = embedData.description || "No description available";
        const updatedDescription = originalDescription.replace(
          /Waiting.*?trade/i,
          `Trade canceled by <@${data.commandUser.id}>`
        );

        const embed = new MessageEmbed()
          .setColor("RED")
          .setDescription(updatedDescription)
          .setImage('attachment://trade-image.png')
          .setTimestamp()
          .setThumbnail('attachment://trade-user.png')
          .setFooter({ text: 'Trading System • Credits to alon5757 - Ãłøn.' })

        const row = new MessageActionRow()
          .addComponents(
            new MessageButton()
              .setCustomId("accept-trade")
              .setLabel("Accept")
              .setStyle('SUCCESS')
              .setDisabled(true),

            new MessageButton()
              .setCustomId("decline-trade")
              .setLabel("Decline")
              .setStyle('DANGER')
              .setDisabled(true),

            new MessageButton()
              .setCustomId("cancel-trade")
              .setLabel("Cancel Trade")
              .setStyle('DANGER')
              .setDisabled(true),
          );

        const canvasBuffer = Buffer.from(data.canvasBuffer.data);
        const dataUrl = Buffer.from(data.dataUrl.data);

        try {
          const message = await interaction.channel.messages.fetch(data.message.id);

          await message.edit({
            files: [
              { attachment: canvasBuffer, name: 'trade-image.png' },
              { attachment: dataUrl, name: 'trade-user.png' }
            ],
            embeds: [embed],
            components: [row],
            content: `||<@${data.commandUser?.id}> | <@${data.selectedUserId}>||`
          });
        } catch (error) {
          console.error("Error editing message or sending DM:", error);
        }

        activeTrades.delete(data.commandUser.id);
        activeTrades.delete(data.selectedUserId);

        await db.delete(`userget_${interaction.message.id}`);

        await interaction.editReply({ content: "Trade was canceled.", ephemeral: true });
      }
    }

    if (!interaction.isButton()) return;
    if (interaction.customId === "accept-trade2") {
      await interaction.deferReply({ ephemeral: true });

      const data = await db.get(`usergive_${interaction.message.id}`);

      if (interaction.user.id !== data.commandUser.id) {
        return await interaction.editReply({ content: `You can't click on this button.`, ephemeral: true });
      } else {
        const user = await Users.findOne({ discordId: interaction.user.id });
        const profile = await Profiles.findOne({ accountId: user.accountId });

        const selectedUserUser = await Users.findOne({ discordId: data.selectedUserId });
        const selectedUserProfile = await Profiles.findOne({ accountId: selectedUserUser.accountId });

        const update = { $unset: {} };
        update.$unset[`profiles.athena.items.${data.foundcosmeticname}`] = "";

        await Profiles.findOneAndUpdate(
          { accountId: data.user },
          update,
          { new: true }
        ).catch(async (err) => {
          return interaction.editReply({ content: "An error occurRED while removing the cosmetic" });
        });

        const purchaseId = uuid.v4();
        const lootList = [{
          "itemType": data.templateId,
          "itemGuid": data.templateId,
          "quantity": 1
        }];

        const common_core = selectedUserProfile.profiles["common_core"];
        const athena = selectedUserProfile.profiles["athena"];

        common_core.items[purchaseId] = {
          "templateId": `GiftBox:GB_MakeGood`,
          "attributes": {
            "fromAccountId": `[${data.selectedUserUsername}]`,
            "lootList": lootList,
            "params": {
              "userMessage": `Thanks For Using Reload Backend!`
            },
            "giftedOn": new Date().toISOString()
          },
          "quantity": 1
        };

        athena.items[data.foundcosmeticname] = data.cosmetic;

        let ApplyProfileChanges = [
          {
            "changeType": "itemAdded",
            "itemId": data.foundcosmeticname,
            "templateId": data.templateId
          },
          {
            "changeType": "itemAdded",
            "itemId": purchaseId,
            "templateId": "GiftBox:GB_MakeGood"
          }
        ];

        common_core.rvn++;
        common_core.commandRevision++;
        common_core.updated = new Date().toISOString();
        athena.rvn++;
        athena.commandRevision++;
        athena.updated = new Date().toISOString();

        await Profiles.updateOne(
          { accountId: data.selectedUserAccountId },
          {
            $set: {
              'profiles.common_core': common_core,
              'profiles.athena': athena
            }
          }
        );

        await interaction.editReply({ content: "You accepted the trade.", ephemeral: true })

        const embedData = data.message.embeds[0];

        if (!embedData) {
          console.error("No embed data found");
          return interaction.editReply({ content: "Failed to retrieve embed data.", ephemeral: true });
        }

        const originalDescription = embedData.description || "No description available";
        const updatedDescription = originalDescription.replace(
          /Waiting.*?trade/i,
          `Trade accepted by <@${data.selectedUserId}>`
        );

        const embed = new MessageEmbed()
          .setColor("GREEN")
          .setDescription(updatedDescription)
          .setImage('attachment://trade-image.png')
          .setTimestamp()
          .setThumbnail('attachment://trade-user.png')
          .setFooter({ text: 'Trading System • Credits to alon5757 - Ãłøn.' })

        const row = new MessageActionRow()
          .addComponents(
            new MessageButton()
              .setCustomId("accept-trade")
              .setLabel("Accept")
              .setStyle('SUCCESS')
              .setDisabled(true),

            new MessageButton()
              .setCustomId("decline-trade")
              .setLabel("Decline")
              .setStyle('DANGER')
              .setDisabled(true),

            new MessageButton()
              .setCustomId("cancel-trade")
              .setLabel("Cancel Trade")
              .setStyle('DANGER')
              .setDisabled(true),
          );

        const canvasBuffer = Buffer.from(data.canvasBuffer.data);
        const dataUrl = Buffer.from(data.dataUrl.data);

        try {
          const message = await interaction.channel.messages.fetch(data.message.id);

          await message.edit({
            files: [
              { attachment: canvasBuffer, name: 'trade-image.png' },
              { attachment: dataUrl, name: 'trade-user.png' }
            ],
            embeds: [embed],
            components: [row],
            content: `||<@${data.commandUser?.id}> | <@${data.selectedUserId}>||`
          });

          const messageLink = message.url;

          const user = interaction.guild.members.cache.get(data.commandUser.id);

          if (user) {
            await user.send(`**<@${data.selectedUserId}> | \`${data.selectedUser.globalName}\` | \`${data.selectedUser.id}\`** has accepted your trade offer **|** ${messageLink}`);
          } else {
            console.error("User not found.");
          }
        } catch (error) {
          console.error("Error editing message or sending DM:", error);
        }

        activeTrades.delete(data.commandUser.id);
        activeTrades.delete(data.selectedUserId);

        await db.delete(`usergive_${interaction.message.id}`);

        return {
          profileRevision: common_core.rvn,
          profileCommandRevision: common_core.commandRevision,
          profileChanges: ApplyProfileChanges
        };
      }
    }
    if (!interaction.isButton()) return;
    if (interaction.customId === "decline-trade2") {
      await interaction.deferReply({ ephemeral: true });

      const data = await db.get(`usergive_${interaction.message.id}`);

      if (interaction.user.id !== data.commandUser.id) {
        return await interaction.editReply({ content: `You can't click on this button.`, ephemeral: true });
      } else {
        await interaction.editReply({ content: "You declined the trade.", ephemeral: true })

        const embedData = data.message.embeds[0];

        if (!embedData) {
          console.error("No embed data found");
          return interaction.editReply({ content: "Failed to retrieve embed data.", ephemeral: true });
        }

        const originalDescription = embedData.description || "No description available";
        const updatedDescription = originalDescription.replace(
          /Waiting.*?trade/i,
          `Trade declined by <@${data.selectedUserId}>`
        );

        const embed = new MessageEmbed()
          .setColor("RED")
          .setDescription(updatedDescription)
          .setImage('attachment://trade-image.png')
          .setTimestamp()
          .setThumbnail('attachment://trade-user.png')
          .setFooter({ text: 'Trading System • Credits to alon5757 - Ãłøn.' })

        const row = new MessageActionRow()
          .addComponents(
            new MessageButton()
              .setCustomId("accept-trade")
              .setLabel("Accept")
              .setStyle('SUCCESS')
              .setDisabled(true),

            new MessageButton()
              .setCustomId("decline-trade")
              .setLabel("Decline")
              .setStyle('DANGER')
              .setDisabled(true),

            new MessageButton()
              .setCustomId("cancel-trade")
              .setLabel("Cancel Trade")
              .setStyle('DANGER')
              .setDisabled(true),
          );


        const canvasBuffer = Buffer.from(data.canvasBuffer.data);
        const dataUrl = Buffer.from(data.dataUrl.data);

        const message = await interaction.channel.messages.fetch(data.message.id);

        try {
          await message.edit({
            files: [
              { attachment: canvasBuffer, name: 'trade-image.png' },
              { attachment: dataUrl, name: 'trade-user.png' }
            ],
            embeds: [embed],
            components: [row],
            content: `||<@${data.commandUser?.id}> | <@${data.selectedUserId}>||`,
          });

          const messageLink = message.url;

          const user = interaction.guild.members.cache.get(data.commandUser.id);

          if (user) {
            await user.send(`**<@${data.selectedUserId}> | \`${data.selectedUser.globalName}\` | \`${data.selectedUser.id}\`** has declined your trade offer **|** ${messageLink}`);
          } else {
            console.error("User not found.");
          }
        } catch (error) {
          console.error("Error editing message or sending DM:", error);
        }

        await db.delete(`usergive_${interaction.message.id}`);

        activeTrades.delete(data.commandUser.id);
        activeTrades.delete(data.selectedUserId);
      }
    }
    if (!interaction.isButton()) return;
    if (interaction.customId === "cancel-trade2") {
      await interaction.deferReply({ ephemeral: true });

      const data = await db.get(`usergive_${interaction.message.id}`);

      if (interaction.user.id !== data.commandUser.id) {
        return await interaction.editReply({ content: `You can't click on this button.`, ephemeral: true });
      } else {
        const embedData = data.message.embeds[0];

        if (!embedData) {
          console.error("No embed data found");
          return interaction.editReply({ content: "Failed to retrieve embed data.", ephemeral: true });
        }

        const originalDescription = embedData.description || "No description available";
        const updatedDescription = originalDescription.replace(
          /Waiting.*?trade/i,
          `Trade canceled by <@${data.commandUser.id}>`
        );

        const embed = new MessageEmbed()
          .setColor("RED")
          .setDescription(updatedDescription)
          .setImage('attachment://trade-image.png')
          .setTimestamp()
          .setThumbnail('attachment://trade-user.png')
          .setFooter({ text: 'Trading System • Credits to alon5757 - Ãłøn.' })

        const row = new MessageActionRow()
          .addComponents(
            new MessageButton()
              .setCustomId("accept-trade")
              .setLabel("Accept")
              .setStyle('SUCCESS')
              .setDisabled(true),

            new MessageButton()
              .setCustomId("decline-trade")
              .setLabel("Decline")
              .setStyle('DANGER')
              .setDisabled(true),

            new MessageButton()
              .setCustomId("cancel-trade")
              .setLabel("Cancel Trade")
              .setStyle('DANGER')
              .setDisabled(true),
          );

        const canvasBuffer = Buffer.from(data.canvasBuffer.data);
        const dataUrl = Buffer.from(data.dataUrl.data);

        try {
          const message = await interaction.channel.messages.fetch(data.message.id);

          await message.edit({
            files: [
              { attachment: canvasBuffer, name: 'trade-image.png' },
              { attachment: dataUrl, name: 'trade-user.png' }
            ],
            embeds: [embed],
            components: [row],
            content: `||<@${data.commandUser?.id}> | <@${data.selectedUserId}>||`
          });
        } catch (error) {
          console.error("Error editing message or sending DM:", error);
        }

        activeTrades.delete(data.commandUser.id);
        activeTrades.delete(data.selectedUserId);

        await db.delete(`usergive_${interaction.message.id}`);

        await interaction.editReply({ content: "Trade was canceled.", ephemeral: true });
      }
    }
});

client.on("guildBanAdd", async (ban) => {
    if (!config.bEnableCrossBans) 
        return;

    const memberBan = await ban.fetch();

    if (memberBan.user.bot)
        return;

    const userData = await Users.findOne({ discordId: memberBan.user.id });

    if (userData && userData.banned !== true) {
        await userData.updateOne({ $set: { banned: true } });

        let refreshToken = global.refreshTokens.findIndex(i => i.accountId == userData.accountId);

        if (refreshToken != -1)
            global.refreshTokens.splice(refreshToken, 1);
        let accessToken = global.accessTokens.findIndex(i => i.accountId == userData.accountId);

        if (accessToken != -1) {
            global.accessTokens.splice(accessToken, 1);
            let xmppClient = global.Clients.find(client => client.accountId == userData.accountId);
            if (xmppClient)
                xmppClient.client.close();
        }

        if (accessToken != -1 || refreshToken != -1) {
            await functions.UpdateTokens();
        }

        log.debug(`user ${memberBan.user.username} (ID: ${memberBan.user.id}) was banned on the discord and also in the game (Cross Ban active).`);
    }
});

client.on("guildBanRemove", async (ban) => {
    if (!config.bEnableCrossBans) 
        return;

    if (ban.user.bot)
        return;

    const userData = await Users.findOne({ discordId: ban.user.id });
    
    if (userData && userData.banned === true) {
        await userData.updateOne({ $set: { banned: false } });

        log.debug(`User ${ban.user.username} (ID: ${ban.user.id}) is now unbanned.`);
    }
});

//AntiCrash System
client.on("error", (err) => {
    console.log("Discord API Error:", err);
});
  
process.on("unhandledRejection", (reason, p) => {
    console.log("Unhandled promise rejection:", reason, p);
});
  
process.on("uncaughtException", (err, origin) => {
    console.log("Uncaught Exception:", err, origin);
});
  
process.on("uncaughtExceptionMonitor", (err, origin) => {
    console.log("Uncaught Exception Monitor:", err, origin);
});

client.login(config.discord.bot_token);
