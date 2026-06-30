import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { logger } from '../utils/logger.js';

const SOT_LOG_CHANNEL_ID = '1521336407900295309';
const SOT_KEY_PREFIX_SUFFIX = ':trial:';

function trialKeyPrefix(guildId) {
  return `guild:${guildId}:trial:`;
}

/**
 * Checks all guilds for expired Shock on Trial entries and posts a notification
 * in the sot-logs channel when one is found. Designed to be called on a cron schedule.
 * @param {Object} client - Discord client with db attached
 */
export async function checkExpiredTrials(client) {
  if (!client.db || typeof client.db.list !== 'function') {
    logger.warn('Database not available for checkExpiredTrials');
    return;
  }

  for (const [guildId, guild] of client.guilds.cache) {
    try {
      const prefix = trialKeyPrefix(guildId);
      let keys = await client.db.list(prefix);

      if (!Array.isArray(keys)) {
        if (typeof keys === 'object' && keys !== null) {
          keys = Object.keys(keys).filter(key => key.startsWith(prefix));
        } else {
          continue;
        }
      }

      if (keys.length === 0) continue;

      const now = Date.now();

      for (const key of keys) {
        try {
          const trialData = await client.db.get(key, null);
          if (!trialData) continue;

          if (now >= trialData.endTime) {
            const userId = key.replace(prefix, '');
            await handleExpiredTrial(client, guild, userId, trialData);
            await client.db.delete(key);
          }
        } catch (error) {
          logger.error(`Error processing trial key ${key}:`, error);
        }
      }
    } catch (error) {
      logger.error(`Error checking expired trials for guild ${guildId}:`, error);
    }
  }
}

async function handleExpiredTrial(client, guild, userId, trialData) {
  try {
    const channel = await guild.channels.fetch(SOT_LOG_CHANNEL_ID).catch(() => null);
    if (!channel) {
      logger.warn(`SoT log channel ${SOT_LOG_CHANNEL_ID} not found in guild ${guild.id}`);
      return;
    }

    const member = await guild.members.fetch(userId).catch(() => null);
    const userMention = member ? member.toString() : `<@${userId}>`;
    const userTag = member ? member.user.tag : userId;

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('⏰ Shock on Trial — Ended')
      .setDescription(`${userMention}'s SoT time has ended.`)
      .addFields(
        { name: 'User', value: `${userTag} (${userId})`, inline: true },
        { name: 'Trial Length', value: `${trialData.days} day${trialData.days !== 1 ? 's' : ''}`, inline: true }
      )
      .setTimestamp();

    const kickButton = new ButtonBuilder()
      .setCustomId(`sot_kick_${userId}`)
      .setLabel('Kick User')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('👢');

    const row = new ActionRowBuilder().addComponents(kickButton);

    await channel.send({ embeds: [embed], components: [row] });
    logger.info(`SoT trial expired for user ${userId} in guild ${guild.id}, notification sent`);
  } catch (error) {
    logger.error(`Error handling expired trial for user ${userId} in guild ${guild.id}:`, error);
  }
}
