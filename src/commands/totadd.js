import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fs from 'fs';

export default {
  data: new SlashCommandBuilder()
    .setName('totadd')
    .setDescription('Put user on Shock on Trial')
    .addUserOption(opt =>
      opt.setName('user').setDescription('User').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('days').setDescription('Days').setRequired(true)
    ),

  async execute(interaction) {
    try {
      const user = interaction.options.getUser('user');
      const days = interaction.options.getInteger('days');

      const member = await interaction.guild.members.fetch(user.id);

      await member.roles.add('1412457998877720646');
      await member.roles.remove('1411742536837627925');

      const data = fs.existsSync('./trialData.json')
        ? JSON.parse(fs.readFileSync('./trialData.json', 'utf8'))
        : {};

      data[user.id] = {
        endTime: Date.now() + days * 86400000
      };

      fs.writeFileSync('./trialData.json', JSON.stringify(data, null, 2));

      const embed = new EmbedBuilder()
        .setColor('Green')
        .setTitle('Trial Added')
        .setDescription(`${user.tag} added for ${days} days`);

      await interaction.reply({ embeds: [embed] });

    } catch (err) {
      console.error(err);
      if (!interaction.replied) {
        await interaction.reply({
          content: 'Error running totadd.',
          ephemeral: true
        });
      }
    }
  }
};
