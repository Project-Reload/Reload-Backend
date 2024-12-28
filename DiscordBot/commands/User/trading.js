const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const Users = require('../../../model/user.js');
const Profiles = require('../../../model/profiles.js');
const uuid = require('uuid');
const fs = require('fs');
const path = require('path');
const destr = require('destr');
const { createCanvas, loadImage } = require('canvas');
const AthenaFilters = "AthenaCharacter:|AthenaBackpack:|AthenaDance:|AthenaEmoji:|AthenaItemWrap:|AthenaPickaxe:|AthenaMusicPack:|AthenaLoadingScreen:|AthenaSpray:|AthenaGlider:|AthenaSkyDive:|AthenaToy:";
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const { activeTrades } = require('../../../model/activeTrades.js');

module.exports = {
  commandInfo: {
    name: "trade",
    description: "Trading cosmetics with other players.",
    options: [
      {
        name: "user",
        description: "The user you want to trade with.",
        required: true,
        type: 6,
      },
      {
        name: "get",
        description: "The cosmetic you want to get. (Name or CID)",
        required: false,
        type: 3,
      },
      {
        name: "give",
        description: "The cosmetic you want to give. (Name or CID)",
        required: false,
        type: 3,
      },
    ],
  },
  execute: async (interaction) => {
    const { options } = interaction;
    const selectedUser = options.getUser('user');
    const getCosmetic = options.getString('get');
    const giveCosmetic = options.getString('give');

    await interaction.deferReply({ ephemeral: false });

    let loadingDots = 1;
    const interval = setInterval(async () => {
      loadingDots++;
      if (loadingDots > 3) loadingDots = 1;
      await interaction.editReply({
        content: `## Creating trade for **${interaction.user}**` + ".".repeat(loadingDots),
        ephemeral: true
      });
    }, 500);

    if (activeTrades.has(interaction.user.id)) {
      clearInterval(interval);
      return await interaction.editReply({
        content: "You already have an active trade! Please finish the current trade before starting a new one.",
        ephemeral: true
      });
    }

    if (activeTrades.has(selectedUser.id)) {
      clearInterval(interval);
      return await interaction.editReply({
        content: `<@${selectedUser.id}> already has an active trade. Please try again later.`,
        ephemeral: true
      });
    }

    if (interaction.user.id === selectedUser.id) {
      clearInterval(interval);
      return await interaction.editReply({ content: "You can't trade with your self.", ephemeral: true });

    }
    if (getCosmetic && giveCosmetic) {
      clearInterval(interval);
      return await interaction.editReply({ content: "You can't choose both options because this feature is not available yet. It might be added in a future update.", ephemeral: true });
    }

    if (!getCosmetic && !giveCosmetic) {
      clearInterval(interval);
      return interaction.editReply({ content: "You must provide a cosmetic to get or to give.", ephemeral: true });
    }

    const user = await Users.findOne({ discordId: interaction.user.id });
    const profile = await Profiles.findOne({ accountId: user.accountId });

    const selectedUserUser = await Users.findOne({ discordId: selectedUser.id });
    const selectedUserProfile = await Profiles.findOne({ accountId: selectedUserUser.accountId });

    if (!selectedUserUser || !selectedUserProfile) {
      clearInterval(interval);
      return interaction.editReply({ content: `${selectedUser} dones't own an account.`, ephemeral: true });
    }

    if (!user || !profile) {
      clearInterval(interval);
      return interaction.editReply({ content: "You don't own an account", ephemeral: true });
    }

    const response = await fetch(`https://fortniteapi.io/v2/items/list?lang=en`, {
      method: "GET",
      headers: {
        'Authorization': "44f2eb39-7a490a9c-bc5d3f68-c379966f"
      }
    });
    const data = await response.json();
    const itemData = data.items;

    let cosmeticToGet;
    if (getCosmetic) {
      const cosmeticToGet2 = itemData.find(item => item.name.toLowerCase() === getCosmetic.toLowerCase() || item.id.toLowerCase() === getCosmetic.toLowerCase());
      cosmeticToGet = cosmeticToGet2
      if (!cosmeticToGet2) {
        clearInterval(interval);
        return interaction.editReply({ content: "The cosmetic you want to get was not found.", ephemeral: true });
      }
    }

    let cosmeticToGive;
    if (giveCosmetic) {
      const cosmeticToGive2 = itemData.find(item => item.name.toLowerCase() === giveCosmetic.toLowerCase() || item.id.toLowerCase() === giveCosmetic.toLowerCase());
      cosmeticToGive = cosmeticToGive2
      if (!cosmeticToGive2) {
        clearInterval(interval);
        return interaction.editReply({ content: "The cosmetic you want to get was not found.", ephemeral: true });
      }
    }

    const userHasCosmetic = (profile, cosmeticSearch) => {
      const items = profile.profiles.athena.items || {};
      let found = false;
      let cosmetic = null;

      for (const key of Object.keys(items)) {
        const [type, id] = key.split(":");
        const item = items[key];

        if (!item || !item.id || !item.name) continue;

        const itemId = item.id.replace(new RegExp(`^(${AthenaFilters})`), "").toLowerCase();

        if (itemId === cosmeticSearch.toLowerCase() || item.name.toLowerCase() === cosmeticSearch.toLowerCase()) {
          found = true;
          cosmetic = item;
          break;
        }
      }

      return { found, cosmetic };
    };

    const userHasGiveCosmetic = giveCosmetic ? userHasCosmetic(profile, giveCosmetic) : { found: false, cosmetic: null };
    const selectedUserHasGetCosmetic = getCosmetic ? userHasCosmetic(selectedUserProfile, getCosmetic) : { found: false, cosmetic: null };

    let cosmetic = {};
    const file = fs.readFileSync(path.join(__dirname, "../../../Config/DefaultProfiles/allathena.json"));
    const jsonFile = destr(file.toString());
    const items = jsonFile.items;
    let foundcosmeticname = "";
    let found = false;

    if (getCosmetic) {
      for (const key of Object.keys(items)) {
        const [type, id] = key.split(":");
        if (id === cosmeticToGet.id) {
          foundcosmeticname = key;
          if (getCosmetic && !selectedUserProfile.profiles.athena.items[key]) {
            clearInterval(interval);
            return await interaction.editReply({ content: "The user you want to trade with does not have the cosmetic you are trying to get.", ephemeral: true });
          }
          found = true;
          cosmetic = items[key];
          break;
        }
      }

    }

    if (!userHasGiveCosmetic && !selectedUserHasGetCosmetic) {
      clearInterval(interval);
      return interaction.editReply({
        content: "Neither you nor the selected user have the requested cosmetics for trade.",
        ephemeral: true
      });
    }

    if (giveCosmetic && !userHasGiveCosmetic) {
      clearInterval(interval);
      return interaction.editReply({ content: "You don't have the cosmetic you're trying to give.", ephemeral: true });
    }

    let cosmeticFromAPI1;
    let cosmeticFromAPI2;

    if (getCosmetic) {
      let cosmetic = {};
      const file = fs.readFileSync(path.join(__dirname, "../../../Config/DefaultProfiles/allathena.json"));
      const jsonFile = destr(file.toString());
      const items = jsonFile.items;
      let foundcosmeticname = "";
      let found = false;

      const cosmeticFromAPI = itemData.find(
        (cosmetic) => cosmetic.id.toLowerCase() === cosmeticToGet.id.toLowerCase()
      );

      cosmeticFromAPI1 = cosmeticFromAPI;

      for (const key of Object.keys(items)) {
        const [type, id] = key.split(":");
        if (id === cosmeticFromAPI.id) {
          foundcosmeticname = key;
          if (profile.profiles.athena.items[key]) {
            clearInterval(interval);
            return interaction.editReply({ content: "You already have that cosmetic.", ephemeral: true });
          }
          if (!selectedUserProfile.profiles.athena.items[key]) {
            clearInterval(interval);
            return interaction.editReply({ content: `${selectedUser} doesn't own this cosmetic.`, ephemeral: true });
          }
          found = true;
          cosmetic = items[key];
          break;
        }
      }

      async function createTradeCanvas(getCosmetic, giveCosmetic, user1, user2) {

        const canvas = createCanvas(800, 400);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'transparent';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const getCosmeticImgUrl = cosmeticFromAPI?.images?.icon || "https://i.imgur.com/xe79i4J.png";
        const giveCosmeticImgUrl = cosmeticFromAPI2?.images?.icon || "https://i.imgur.com/xe79i4J.png";

        const getCosmeticImg = await loadImage(getCosmeticImgUrl);
        const giveCosmeticImg = await loadImage(giveCosmeticImgUrl);

        const getImgWidth = getCosmeticImgUrl === "https://i.imgur.com/xe79i4J.png" ? 130 : 200;
        const getImgHeight = getCosmeticImgUrl === "https://i.imgur.com/xe79i4J.png" ? 200 : 200;

        const giveImgWidth = giveCosmeticImgUrl === "https://i.imgur.com/xe79i4J.png" ? 130 : 200;
        const giveImgHeight = giveCosmeticImgUrl === "https://i.imgur.com/xe79i4J.png" ? 200 : 200;

        const giveImgXPos = giveCosmeticImgUrl === "https://i.imgur.com/xe79i4J.png" ? 615 : 585;

        ctx.drawImage(getCosmeticImg, 0, 100, getImgWidth, getImgHeight);
        ctx.drawImage(giveCosmeticImg, giveImgXPos, 100, giveImgWidth, giveImgHeight);


        const GreenArrowUrl = cosmeticFromAPI2?.name ? "https://i.imgur.com/R88eRWz.png" : "https://i.imgur.com/YFTmEMb.png";
        const RedArrowUrl = cosmeticFromAPI1?.name ? "https://i.imgur.com/R88eRWz.png" : "https://i.imgur.com/YFTmEMb.png";

        const GreenArrow = await loadImage(GreenArrowUrl);
        const RedArrow = await loadImage(RedArrowUrl);

        function getImageDimensions(image, desiredWidth) {
          const aspectRatio = image.width / image.height;
          const height = desiredWidth / aspectRatio;
          return { width: desiredWidth, height };
        }

        const greenArrowWidth = 200;
        const redArrowWidth = 200;

        const { width: greenArrowActualWidth, height: greenArrowHeight } = getImageDimensions(GreenArrow, greenArrowWidth);
        const { width: redArrowActualWidth, height: redArrowHeight } = getImageDimensions(RedArrow, redArrowWidth);

        const canvasCenterX = canvas.width / 2;
        const canvasCenterY = canvas.height / 2;

        const verticalOffset = 15;

        const redArrowX = canvasCenterX - redArrowActualWidth / 2;
        const redArrowY = canvasCenterY - redArrowHeight - verticalOffset;

        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(RedArrow, -redArrowX - redArrowActualWidth, redArrowY, redArrowActualWidth, redArrowHeight);
        ctx.restore();

        const greenArrowX = canvasCenterX - greenArrowActualWidth / 2;
        const greenArrowY = redArrowY + redArrowHeight + 10 - verticalOffset;

        ctx.drawImage(GreenArrow, greenArrowX, greenArrowY + 30, greenArrowActualWidth, greenArrowHeight);

        ctx.font = 'bold 45px Arial, Sans';
        ctx.fillStyle = 'white';

        ctx.fillText(user1.globalName, 50, 365);
        ctx.fillText(user2.globalName, 650, 365);

        ctx.font = 'bold 20px Arial, Sans';
        ctx.fillStyle = 'white';
        ctx.fillText(`${cosmeticFromAPI.name}`, 360, 210);

        const cosmeticFromAPI2Name = cosmeticFromAPI2?.name || "Nothing"
        ctx.font = 'bold 20px Arial, Sans';
        ctx.fillStyle = 'white';
        ctx.fillText(`${cosmeticFromAPI2Name}`, 360, 120);

        return canvas.toBuffer();
      }

      const canvasBuffer = await createTradeCanvas(cosmetic, giveCosmetic, interaction.user, selectedUser);

      const cosmetic1 = (cosmeticFromAPI1?.name && getCosmetic) ? `${cosmeticFromAPI1.name} - ${cosmeticToGet.id}` : "Nothing";
      const cosmetic2 = (cosmeticFromAPI2?.name && giveCosmetic) ? `${cosmeticFromAPI2.name} - ${cosmeticToGive.id}` : "Nothing";

      async function createTradeImage(userAvatarUrl, selectedUserAvatarUrl) {
        const userAvatarUrlPng = userAvatarUrl.replace("webp", "png");
        const selectedUserAvatarUrlPng = selectedUserAvatarUrl.replace("webp", "png");

        const canvas = createCanvas(400, 400);
        const ctx = canvas.getContext('2d');
        const avatarSize = 400;

        try {
          const userAvatar = await loadImage(userAvatarUrlPng);
          const selectedUserAvatar = await loadImage(selectedUserAvatarUrlPng);

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(avatarSize, 0);
          ctx.lineTo(avatarSize, avatarSize);
          ctx.lineTo(0, avatarSize);
          ctx.closePath();
          ctx.clip();

          ctx.drawImage(userAvatar, 0, 0, avatarSize, avatarSize);

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(0, avatarSize);
          ctx.lineTo(avatarSize, avatarSize);
          ctx.lineTo(avatarSize, 0);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(selectedUserAvatar, 0, 0, avatarSize, avatarSize);
          ctx.restore();

          ctx.strokeStyle = 'black';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(avatarSize, 0);
          ctx.lineTo(0, avatarSize);
          ctx.stroke();

          ctx.strokeStyle = 'black';
          ctx.lineWidth = 5;
          ctx.strokeRect(0, 0, avatarSize, avatarSize);

          const imageBuffer = canvas.toBuffer();

          return imageBuffer;
        } catch (error) {
          console.error("Error loading avatars:", error);
          throw new Error('Failed to load avatar images');
        }
      }

      const dataUrl = await createTradeImage(interaction.user.displayAvatarURL(), selectedUser.displayAvatarURL());

      const tradeEmbed = new MessageEmbed()
        .setColor(0x0099FF)
        .setDescription(`## Trade created by ${interaction.user}
        ### Waiting for ${selectedUser} to accept the trade\n
        ${interaction.user} gave to ${selectedUser} • \`${cosmetic2}\`
        ${selectedUser} gave to ${interaction.user} • \`${cosmetic1}\`\n\n`)
        .setImage('attachment://trade-image.png')
        .setTimestamp()
        .setThumbnail('attachment://trade-user.png')
        .setFooter({ text: 'Trading System • Credits to alon5757 - Ãłøn.' })

      const row = new MessageActionRow()
        .addComponents(
          new MessageButton()
            .setCustomId("accept-trade")
            .setLabel("Accept")
            .setStyle("SUCCESS"),

          new MessageButton()
            .setCustomId("decline-trade")
            .setLabel("Decline")
            .setStyle("DANGER"),

          new MessageButton()
            .setCustomId("cancel-trade")
            .setLabel("Cancel Trade")
            .setStyle("DANGER"),
        )

      clearInterval(interval);
      const message = await interaction.editReply({
        content: "",
        embeds: [tradeEmbed],
        files: [
          { attachment: canvasBuffer, name: 'trade-image.png' },
          { attachment: dataUrl, name: 'trade-user.png' }
        ],
        components: [row]
      });

      const messageLink = message.url;

      try {
        const user = interaction.guild.members.cache.get(selectedUser.id);

        if (user) {
          await user.send(`You have a new trade offer from **${interaction.user} | \`${interaction.user.globalName}\` | \`${interaction.user.id}\` | ** ${messageLink}`);
        } else {
          console.error("User not found.");
        }
      } catch (error) {
        console.error("Could not send DM:", error);
      }

      await db.set(`userget_${message.id}`, {
        type: "get",
        message: message,
        templateId: cosmetic.templateId,
        selectedUserUsername: selectedUser.username,
        selectedUser: selectedUser,
        foundcosmeticname: foundcosmeticname,
        cosmetic: cosmetic,
        user: user.accountId,
        selectedUserAccountId: selectedUserUser.accountId,
        selectedUserId: selectedUser.id,
        commandUser: interaction.user,
        canvasBuffer: canvasBuffer,
        dataUrl: dataUrl,
      });

      activeTrades.set(interaction.user.id, true);
      activeTrades.set(selectedUser.id, true);
    }

    if (giveCosmetic) {
      let cosmetic = {};
      const file = fs.readFileSync(path.join(__dirname, "../../../Config/DefaultProfiles/allathena.json"));
      const jsonFile = destr(file.toString());
      const items = jsonFile.items;
      let foundcosmeticname = "";
      let found = false;

      const cosmeticFromAPI = itemData.find(
        (cosmetic) => cosmetic.id.toLowerCase() === cosmeticToGive.id.toLowerCase()
      );
      cosmeticFromAPI2 = cosmeticFromAPI;

      for (const key of Object.keys(items)) {
        const [type, id] = key.split(":");
        if (id === cosmeticFromAPI.id) {
          foundcosmeticname = key;
          if (selectedUserProfile.profiles.athena.items[key]) {
            clearInterval(interval);
            return interaction.editReply({ content: "That user already has that cosmetic.", ephemeral: true });
          }
          if (!profile.profiles.athena.items[key]) {
            clearInterval(interval);
            return interaction.editReply({ content: "You don't own this cosmetic.", ephemeral: true });
          }
          found = true;
          cosmetic = items[key];
          break;
        }
      }

      async function createTradeCanvas(getCosmetic, giveCosmetic, user1, user2) {

        const canvas = createCanvas(800, 400);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'transparent';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const getCosmeticImgUrl = cosmeticFromAPI1?.images?.icon || "https://i.imgur.com/xe79i4J.png";
        const giveCosmeticImgUrl = cosmeticFromAPI?.images?.icon || "https://i.imgur.com/xe79i4J.png";

        const getCosmeticImg = await loadImage(getCosmeticImgUrl);
        const giveCosmeticImg = await loadImage(giveCosmeticImgUrl);

        const getImgWidth = getCosmeticImgUrl === "https://i.imgur.com/xe79i4J.png" ? 130 : 200;
        const getImgHeight = getCosmeticImgUrl === "https://i.imgur.com/xe79i4J.png" ? 200 : 200;

        const giveImgWidth = giveCosmeticImgUrl === "https://i.imgur.com/xe79i4J.png" ? 130 : 200;
        const giveImgHeight = giveCosmeticImgUrl === "https://i.imgur.com/xe79i4J.png" ? 200 : 200;

        const getImgXPos = getCosmeticImgUrl === "https://i.imgur.com/xe79i4J.png" ? 35 : 0;

        ctx.drawImage(getCosmeticImg, getImgXPos, 100, getImgWidth, getImgHeight);
        ctx.drawImage(giveCosmeticImg, 585, 100, giveImgWidth, giveImgHeight);

        const GreenArrowUrl = cosmeticFromAPI2?.name ? "https://i.imgur.com/R88eRWz.png" : "https://i.imgur.com/YFTmEMb.png";
        const RedArrowUrl = cosmeticFromAPI1?.name ? "https://i.imgur.com/R88eRWz.png" : "https://i.imgur.com/YFTmEMb.png";

        const GreenArrow = await loadImage(GreenArrowUrl);
        const RedArrow = await loadImage(RedArrowUrl);

        function getImageDimensions(image, desiredWidth) {
          const aspectRatio = image.width / image.height;
          const height = desiredWidth / aspectRatio;
          return { width: desiredWidth, height };
        }

        const greenArrowWidth = 200;
        const redArrowWidth = 200;

        const { width: greenArrowActualWidth, height: greenArrowHeight } = getImageDimensions(GreenArrow, greenArrowWidth);
        const { width: redArrowActualWidth, height: redArrowHeight } = getImageDimensions(RedArrow, redArrowWidth);

        const canvasCenterX = canvas.width / 2;
        const canvasCenterY = canvas.height / 2;

        const verticalOffset = 15;

        const redArrowX = canvasCenterX - redArrowActualWidth / 2;
        const redArrowY = canvasCenterY - redArrowHeight - verticalOffset;

        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(RedArrow, -redArrowX - redArrowActualWidth, redArrowY, redArrowActualWidth, redArrowHeight);
        ctx.restore();

        const greenArrowX = canvasCenterX - greenArrowActualWidth / 2;
        const greenArrowY = redArrowY + redArrowHeight + 10 - verticalOffset;

        ctx.drawImage(GreenArrow, greenArrowX, greenArrowY + 30, greenArrowActualWidth, greenArrowHeight);

        ctx.font = 'bold 45px Arial, Sans';
        ctx.fillStyle = 'white';

        ctx.fillText(user1.globalName, 50, 365);
        ctx.fillText(user2.globalName, 650, 365);

        const cosmeticFromAPI2Name = cosmeticFromAPI2?.name || "Nothing";
        ctx.font = 'bold 20px Arial, Sans';
        ctx.fillStyle = 'white';
        ctx.fillText(`${cosmeticFromAPI2Name}`, 360, 120);


        const cosmeticFromAPI1Name = cosmeticFromAPI1?.name || "Nothing";

        ctx.font = 'bold 20px Arial, Sans';
        ctx.fillStyle = 'white';
        ctx.fillText(`${cosmeticFromAPI1Name}`, 360, 210);

        return canvas.toBuffer();
      }

      const canvasBuffer = await createTradeCanvas(cosmetic, giveCosmetic, interaction.user, selectedUser);

      const cosmetic1 = (cosmeticFromAPI1?.name && getCosmetic) ? `${cosmeticFromAPI1.name} - ${cosmeticToGet.id}` : "Nothing";
      const cosmetic2 = (cosmeticFromAPI2?.name && giveCosmetic) ? `${cosmeticFromAPI2.name} - ${cosmeticToGive.id}` : "Nothing";

      async function createTradeImage(userAvatarUrl, selectedUserAvatarUrl) {
        const userAvatarUrlPng = userAvatarUrl.replace("webp", "png");
        const selectedUserAvatarUrlPng = selectedUserAvatarUrl.replace("webp", "png");

        const canvas = createCanvas(400, 400);
        const ctx = canvas.getContext('2d');
        const avatarSize = 400;

        try {
          const userAvatar = await loadImage(userAvatarUrlPng);
          const selectedUserAvatar = await loadImage(selectedUserAvatarUrlPng);

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(avatarSize, 0);
          ctx.lineTo(avatarSize, avatarSize);
          ctx.lineTo(0, avatarSize);
          ctx.closePath();
          ctx.clip();

          ctx.drawImage(userAvatar, 0, 0, avatarSize, avatarSize);

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(0, avatarSize);
          ctx.lineTo(avatarSize, avatarSize);
          ctx.lineTo(avatarSize, 0);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(selectedUserAvatar, 0, 0, avatarSize, avatarSize);
          ctx.restore();

          ctx.strokeStyle = 'black';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(avatarSize, 0);
          ctx.lineTo(0, avatarSize);
          ctx.stroke();

          ctx.strokeStyle = 'black';
          ctx.lineWidth = 5;
          ctx.strokeRect(0, 0, avatarSize, avatarSize);

          const imageBuffer = canvas.toBuffer();

          return imageBuffer;
        } catch (error) {
          console.error("Error loading avatars:", error);
          throw new Error('Failed to load avatar images');
        }
      }

      const dataUrl = await createTradeImage(interaction.user.displayAvatarURL(), selectedUser.displayAvatarURL());

      const tradeEmbed = new MessageEmbed()
        .setColor(0x0099FF)
        .setDescription(`## Trade created by ${interaction.user}
        ### Waiting for ${selectedUser} to accept the trade\n
        ${interaction.user} gave to ${selectedUser} • \`${cosmetic2}\`
        ${selectedUser} gave to ${interaction.user} • \`${cosmetic1}\`\n\n`)
        .setImage('attachment://trade-image.png')
        .setTimestamp()
        .setThumbnail('attachment://trade-user.png')
        .setFooter({ text: 'Trading System • Credits to alon5757 - Ãłøn.' })

      const row = new MessageActionRow()
        .addComponents(
          new MessageButton()
            .setCustomId("accept-trade2")
            .setLabel("Accept")
            .setStyle("SUCCESS"),

          new MessageButton()
            .setCustomId("decline-trade2")
            .setLabel("Decline")
            .setStyle("DANGER"),

          new MessageButton()
            .setCustomId("cancel-trade2")
            .setLabel("Cancel Trade")
            .setStyle("DANGER"),
        )

      clearInterval(interval);
      const message = await interaction.editReply({
        content: "",
        embeds: [tradeEmbed],
        files: [
          { attachment: canvasBuffer, name: 'trade-image.png' },
          { attachment: dataUrl, name: 'trade-user.png' }
        ],
        components: [row]
      });

      const messageLink = message.url;

      try {
        const user = interaction.guild.members.cache.get(selectedUser.id);

        if (user) {
          await user.send(`You have a new trade offer from **${interaction.user} | \`${interaction.user.globalName}\` | \`${interaction.user.id}\` | ** ${messageLink}`);
        } else {
          console.error("User not found.");
        }
      } catch (error) {
        console.error("Could not send DM:", error);
      }

      await db.set(`usergive_${message.id}`, {
        type: "give",
        message: message,
        templateId: cosmetic.templateId,
        selectedUserUsername: selectedUser.username,
        selectedUser: selectedUser,
        foundcosmeticname: foundcosmeticname,
        cosmetic: cosmetic,
        user: user.accountId,
        selectedUserAccountId: selectedUserUser.accountId,
        selectedUserId: selectedUser.id,
        commandUser: interaction.user,
        canvasBuffer: canvasBuffer,
        dataUrl: dataUrl,
      });

      activeTrades.set(interaction.user.id, true);
      activeTrades.set(selectedUser.id, true);
    }
  }
};
