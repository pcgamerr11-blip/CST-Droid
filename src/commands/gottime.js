import fs from "fs";
import {
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("gottime")
    .setDescription("Check remaining Shock on Trial time")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("User")
        .setRequired(true)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("user");

    const data = JSON.parse(
      fs.readFileSync("./trialData.json", "utf8")
    );

    if (!data[user.id]) {
      return interaction.reply({
        content: "No active trial found.",
        ephemeral: true,
      });
    }

    const remaining =
      data[user.id].endTime - Date.now();

    if (remaining <= 0) {
      delete data[user.id];

      fs.writeFileSync(
        "./trialData.json",
        JSON.stringify(data, null, 2)
      );

      return interaction.reply({
        content: "This trial has expired.",
        ephemeral: true,
      });
    }

    const days = Math.floor(
      remaining / (1000 * 60 * 60 * 24)
    );

    const hours = Math.floor(
      (remaining % (1000 * 60 * 60 * 24)) /
      (1000 * 60 * 60)
    );

    const minutes = Math.floor(
      (remaining % (1000 * 60 * 60)) /
      (1000 * 60)
    );

    const embed = new EmbedBuilder()
      .setColor("#3498DB")
      .setTitle("Shock on Trial Timer")
      .setDescription(
        `${user} has **${days} days, ${hours} hours, and ${minutes} minutes** left to complete Shock on Trial.`
      )
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
    });
  },
};
