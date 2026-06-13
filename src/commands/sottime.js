import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const LOG_CHANNEL_ID = '1507177727860412567';

function trialKey(guildId, userId) {
  return `guild:${guildId}:trial:${userId}`;
}

async function sendLog(guild, executor, target, result) {
  try {
    const channel = await guild.channels.fetch(LOG_CHANNEL_ID);
    if (!channel) return;
    await channel.send({ embeds: [
      new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle('📋 Command Log — sottime')
        .addFields(
          { name: 'Executor', value: `<@${executor.id}> (${executor.tag})`, inline: true },
          { name: 'Target', value: `<@${target.id}> (${target.tag})`, inline: true },
          { name: 'Result', value: result, inline: false },
          { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        )
        .setTimestamp()
    ]});
  } catch (err) {
    console.error('[sottime log error]', err);
  }
}

async function run(targetUser, guild, client, executor, replyFn, ephemeralFn) {
  const entry = await client.db.get(trialKey(guild.id, targetUser.id), null);
  if (!entry) {
    await sendLog(guild, executor, targetUser, 'Not on trial');
    return ephemeralFn(`<@${targetUser.id}> is not currently on Shock on Trial.`);
  }

  const remaining = entry.endTime - Date.now();
  if (remaining <= 0) {
    await sendLog(guild, executor, targetUser, 'Trial expired');
    return replyFn(new EmbedBuilder()
      .setColor(0xED4245).setTitle('⏰ Shock on Trial — Expired')
      .setDescription(`<@${targetUser.id}>'s trial period has **expired**.`).setTimestamp());
  }

  const d = Math.floor(remaining / 86400000);
  const h = Math.floor((remaining % 86400000) / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  await sendLog(guild, executor, targetUser, `${d}d ${h}h ${m}m remaining`);
  await replyFn(new EmbedBuilder()
    .setColor(0xFEE75C).setTitle('⏱️ Shock on Trial — Time Remaining')
    .setDescription(`<@${targetUser.id}> has **${d} day${d !== 1 ? 's' : ''}**, **${h} hour${h !== 1 ? 's' : ''}**, **${m} minute${m !== 1 ? 's' : ''}** left to complete Shock on Trial.`)
    .setTimestamp());
}

export default {
  data: new SlashCommandBuilder()
    .setName('sottime')
    .setDescription('Check how much time a user has left on Shock on Trial')
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    await run(user, interaction.guild, interaction.client, interaction.user,
      async (embed) => interaction.reply({ embeds: [embed] }),
      async (msg) => interaction.reply({ content: msg, ephemeral: true })
    );
  },

  async prefixExecute(message, args) {
    const mention = args[0];
    if (!mention) return message.reply('Usage: `-sottime @user`');
    const userId = mention.replace(/[<@!>]/g, '');
    let targetUser;
    try { targetUser = await message.client.users.fetch(userId); } catch { return message.reply('Could not find that user.'); }
    await run(targetUser, message.guild, message.client, message.author,
      async (embed) => message.channel.send({ embeds: [embed] }),
      async (msg) => message.reply(msg)
    );
  }
};
