import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('tottime')
    .setDescription('Test command'),

  async execute(interaction) {
    await interaction.reply('tottime is working');
  }
};
