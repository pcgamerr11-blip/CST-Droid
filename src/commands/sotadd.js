import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const ALLOWED_ROLES = ['1411740361113735400','1506828742335402154','1411743505780441128','1506828797037645935'];
const TRIAL_ROLE_ID = '1412457998877720646';
const REMOVE_ROLE_ID = '1411742536837627925';
const EXTRA_ROLES = ['1502069854839246921','1411741603693072466','1411740378511573114'];
const LOG_CHANNEL_ID = '1507177727860412567';

function hasPermission(member) {
  if (member.permissions.has('Administrator')) return true;
  return ALLOWED_ROLES.some(id => member.roles.cache.has(id));
}

function trialKey(guildId, userId) {
  return `guild:${guildId}:trial:${userId}`;
}

async function sendLog(guild, executor, target, days) {
  try {
    const channel = await guild.channels.fetch(LOG_CHANNEL_ID);
    if (!channel) return;
    await channel.send({ embeds: [
      new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('📋 Command Log — sotadd')
        .addFields(
          { name: 'Executor', value: `<@${executor.id}> (${executor.tag})`, inline: true },
          { name: 'Target', value: `<@${target.id}> (${target.tag})`, inline: true },
          { name: 'Action', value: `Placed on Shock on Trial for **${days} day${days !== 1 ? 's' : ''}**`, inline: false },
          { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        )
        .setTimestamp()
    ]});
  } catch (err) {
    console.error('[sotadd log error]', err);
  }
}

async function run(targetUser, days, guild, client, executor, replyFn, ephemeralFn) {
  try {
    const member = await guild.members.fetch(targetUser.id);
    await member.roles.add(TRIAL_ROLE_ID);
    for (const id of EXTRA_ROLES) await member.roles.add(id).catch(() => {});
    await member.roles.remove(REMOVE_ROLE_ID).catch(() => {});
    await client.db.set(trialKey(guild.id, targetUser.id), {
      endTime: Date.now() + days * 86400000,
      startedAt: Date.now(),
      days
    });
    await sendLog(guild, executor, targetUser, days);
    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('⚠️ Shock on Trial — Started')
      .setDescription(`<@${targetUser.id}> has been placed on **Shock on Trial** for **${days} day${days !== 1 ? 's' : ''}**.`)
      .addFields({ name: 'Time Limit', value: `${days} day${days !== 1 ? 's' : ''}`, inline: true })
      .setTimestamp();
    await replyFn(embed);
  } catch (err) {
    console.error('[sotadd error]', err);
    await ephemeralFn('Error running sotadd. Check bot permissions and role hierarchy.');
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('sotadd')
    .setDescription('Place a user on Shock on Trial')
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
    .addIntegerOption(opt => opt.setName('days').setDescription('Days').setRequired(true).setMinValue(1)),

  async execute(interaction) {
    if (!hasPermission(interaction.member))
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    const user = interaction.options.getUser('user');
    const days = interaction.options.getInteger('days');
    await run(user, days, interaction.guild, interaction.client, interaction.user,
      async (embed) => { await interaction.reply({ embeds: [embed] }); setTimeout(async () => { try { await interaction.deleteReply(); } catch {} }, 3000); },
      async (msg) => { if (!interaction.replied) await interaction.reply({ content: msg, ephemeral: true }); }
    );
  },

  async prefixExecute(message, args) {
    const member = await message.guild.members.fetch(message.author.id);
    if (!hasPermission(member)) return message.reply('You do not have permission to use this command.');
    const mention = args[0]; const days = parseInt(args[1]);
    if (!mention || isNaN(days) || days < 1) return message.reply('Usage: `-sotadd @user <days>`');
    const userId = mention.replace(/[<@!>]/g, '');
    let targetUser;
    try { targetUser = await message.client.users.fetch(userId); } catch { return message.reply('Could not find that user.'); }
    await run(targetUser, days, message.guild, message.client, message.author,
      async (embed) => { const s = await message.channel.send({ embeds: [embed] }); setTimeout(() => s.delete().catch(() => {}), 3000); },
      async (msg) => message.reply(msg)
    );
  }
};
