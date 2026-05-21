import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fs from 'fs';

export default {
  data: new SlashCommandBuilder()
    .setName('tottime')
    .setDescription('Check trial time')
    .addUserOption(opt =>
      opt.setName('user').setDescription('User').setRequired(true)
    ),

  async execute(interaction) {
    try {
      const user = interaction.options.getUser('user');

      const data = fs.existsSync('./trialData.json')
        ? JSON.parse(fs.readFileSync('./trialData.json', 'utf8'))
        : {};

      if (!data[user.id]) {
        return interaction.reply({
          content: 'No trial found.',
          ephemeral: true
        });
      }

      const ms = data[user.id].endTime - Date.now();

      if (ms <= 0) {
        return interaction.reply(`${user.tag} trial is finished.`);
      }

      const days = Math.floor(ms / (1000 * 60 * 60 * 24));
      const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((ms / (1000 * 60)) % 60);

      const embed = new EmbedBuilder()
        .setColor('Blue')
        .setDescription(
          `${user.tag} has ${days} days, ${hours} hours, ${minutes} minutes left to complete Shock on Trial`
        );

      await interaction.reply({ embeds: [embed] });

    } catch (err) {
      console.error(err);
      if (!interaction.replied) {
        await interaction.reply({
          content: 'Error running tottime.',
          ephemeral: true
        });
      }
    }
  }
};
