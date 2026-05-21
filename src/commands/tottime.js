import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName("tottime")
    .setDescription("Check trial time"),

  async execute(interaction) {
    await interaction.reply("tottime works");
  }
};
