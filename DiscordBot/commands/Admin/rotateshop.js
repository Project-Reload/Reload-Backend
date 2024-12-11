const functions = require("../../../structs/autorotate.js");
const fs = require("fs");
const config = JSON.parse(fs.readFileSync("./Config/config.json").toString());
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rotate-shop")
    .setDescription("Refreshing the shop."),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!config.moderators.includes(interaction.user.id)) {
      return interaction.editReply({ content: "You do not have moderator permissions.", ephemeral: true });
    }

    try {
      await functions.rotateshop();
      interaction.editReply({ content: "Successfully Rotated the shop!", ephemeral: true });
    } catch (error) {
      console.error("Error during shop rotation:", error);
      interaction.editReply({ content: "An error occurred while rotating the shop.", ephemeral: true });
    }
  }

}