import { EmbedBuilder, MessageFlags } from 'discord.js';
import { logger } from '../utils/logger.js';

const ALLOWED_KICK_ROLE_ID = '1411740361113735400';

export default {
  customId: 'sot_kick',

  async execute(interaction, client, args) {
    try {
      // customId format: sot_kick_<userId>
      const userId = interaction.customId.replace('sot_kick_', '');

      const member = interaction.member;
      const hasPermission =
        member.permissions.has('Administrator') ||
        member.roles.cache.has(ALLOWED_KICK_ROLE_ID);

      if (!hasPermission) {
        return interaction.reply({
          content: 'You do not have permission to use this button.',
          flags: MessageFlags.Ephemeral
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const targetMember = await interaction.guild.members.fetch(userId).catch(() => null);

      if (!targetMember) {
        return interaction.editReply({ content: 'That user is no longer in the server.' });
      }

      if (!targetMember.kickable) {
        return interaction.editReply({ content: 'I do not have permission to kick this user (role hierarchy or missing permissions).' });
      }

      await targetMember.kick(`SoT trial ended — kicked by ${interaction.user.tag}`);

      // Disable the button after use
      const originalEmbed = interaction.message.embeds[0];
      const updatedEmbed = EmbedBuilder.from(originalEmbed)
        .addFields({ name: 'Action Taken', value: `Kicked by <@${interaction.user.id}>`, inline: false });

      await interaction.message.edit({ embeds: [updatedEmbed], components: [] });

      await interaction.editReply({ content: `✅ Kicked <@${userId}>.` });
    } catch (error) {
      logger.error('Error in sot_kick button handler:', error);
      const reply = interaction.deferred
        ? interaction.editReply.bind(interaction)
        : interaction.reply.bind(interaction);
      await reply({ content: 'An error occurred while kicking the user.', flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  }
};
