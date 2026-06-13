import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const ALLOWED_ROLES = ['1411740361113735400','1506828742335402154','1411743505780441128','1506828797037645935'];
const TRIAL_ROLES = ['1412457998877720646','1412458005416509480','1412458004388909196','1502069854839246921','1411741603693072466','1411740378511573114'];
const GRADUATE_ROLES = ['1411740378511573114','1411742967634591825','1411742533565943808','1467548035579121715'];
const LOG_CHANNEL_ID = '1507177727860412567';

function hasPermission(member) {
  if (member.permissions.has('Administrator')) return true;
  return ALLOWED_ROLES.some(id => member.roles.cache.has(id));
}

function trialKey(guildId, userId) {
  return `guild:${guildId}:trial:${userId}`;
}

async function sendLog(guild, executor, target) {
  try {
    const channel = await guild.channels.fetch(LOG_CHANNEL_ID);
    if (!channel) return;
    await channel.send({ embeds: [
      new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('📋 Command Log — sotgraduate')
        .addFields(
          { name: 'Executor', value: `<@${executor.id}> (${executor.tag})`, inline: true },
          { name: 'Target', value: `<@${target.id}> (${target.tag})`, inline: true },
          { name: 'Action', value: 'Graduated — trial roles removed, graduate roles assigned', inline: false },
          { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        )
        .setTimestamp()
    ]});
  } catch (err) {
    console.error('[sotgraduate log error]', err);
  }
}

async function run(targetUser, guild, client, executor, replyFn, ephemeralFn) {
  try {
    const entry = await client.db.get(trialKey(guild.id, targetUser.id), null);
    if (!entry) return ephemeralFn(`<@${targetUser.id}> is not currently on Shock on Trial.`);
    const member = await guild.members.fetch(targetUser.id);
    for (const id of TRIAL_ROLES) await member.roles.remove(id).catch(() => {});
    for (const id of GRADUATE_ROLES) await member.roles.add(id).catch(() => {});
    await client.db.delete(trialKey(guild.id, targetUser.id));
    await sendLog(guild, executor, targetUser);
    await replyFn(new EmbedBuilder()
      .setColor(0x57F287).setTitle('🎓 Shock on Trial — Graduated!')
      .setDescription(`<@${targetUser.id}> has successfully **graduated** from Shock on Trial!`)
      .setTimestamp());
  } catch (err) {
    console.error('[sotgraduate error]', err);
    await ephemeralFn('Error running sotgraduate. Check bot permissions and role hierarchy.');
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('sotgraduate')
    .setDescription('Graduate a user from Shock on Trial')
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)),

  async execute(interaction) {
    if (!hasPermission(interaction.member))
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    const user = interaction.options.getUser('user');
    await run(user, interaction.guild, interaction.client, interaction.user,
      async (embed) => { await interaction.reply({ embeds: [embed] }); setTimeout(async () => { try { await interaction.deleteReply(); } catch {} }, 3000); },
      async (msg) => interaction.reply({ content: msg, ephemeral: true })
    );
  },

  async prefixExecute(message, args) {
    const member = await message.guild.members.fetch(message.author.id);
    if (!hasPermission(member)) return message.reply('You do not have permission to use this command.');
    const mention = args[0];
    if (!mention) return message.reply('Usage: `-sotgraduate @user`');
    const userId = mention.replace(/[<@!>]/g, '');
    let targetUser;
    try { targetUser = await message.client.users.fetch(userId); } catch { return message.reply('Could not find that user.'); }
    await run(targetUser, message.guild, message.client, message.author,
      async (embed) => { const s = await message.channel.send({ embeds: [embed] }); setTimeout(() => s.delete().catch(() => {}), 3000); },
      async (msg) => message.reply(msg)
    );
  }
};
