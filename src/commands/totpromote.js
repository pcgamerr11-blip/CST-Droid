import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const ALLOWED_ROLES = ['1411740361113735400','1506828742335402154','1411743505780441128','1506828797037645935'];
const LEVEL_ROLES = { 1: '1412457998877720646', 2: '1412458005416509480', 3: '1412458004388909196' };
const LOG_CHANNEL_ID = '1507177727860412567';

function hasPermission(member) {
  if (member.permissions.has('Administrator')) return true;
  return ALLOWED_ROLES.some(id => member.roles.cache.has(id));
}

function trialKey(guildId, userId) {
  return `guild:${guildId}:trial:${userId}`;
}

async function sendLog(guild, executor, target, level) {
  try {
    const channel = await guild.channels.fetch(LOG_CHANNEL_ID);
    if (!channel) return;
    await channel.send({ embeds: [
      new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('📋 Command Log — totpromote')
        .addFields(
          { name: 'Executor', value: `<@${executor.id}> (${executor.tag})`, inline: true },
          { name: 'Target', value: `<@${target.id}> (${target.tag})`, inline: true },
          { name: 'Action', value: `Promoted to **Level ${level}**`, inline: false },
          { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        )
        .setTimestamp()
    ]});
  } catch (err) {
    console.error('[totpromote log error]', err);
  }
}

async function run(targetUser, level, guild, client, executor, replyFn, ephemeralFn) {
  try {
    const entry = await client.db.get(trialKey(guild.id, targetUser.id), null);
    if (!entry) return ephemeralFn(`<@${targetUser.id}> is not currently on Shock on Trial.`);
    const member = await guild.members.fetch(targetUser.id);
    for (const [lvl, id] of Object.entries(LEVEL_ROLES)) {
      if (parseInt(lvl) !== level) await member.roles.remove(id).catch(() => {});
    }
    await member.roles.add(LEVEL_ROLES[level]);
    await sendLog(guild, executor, targetUser, level);
    const colors = { 1: 0x57F287, 2: 0x3498DB, 3: 0xEB459E };
    await replyFn(new EmbedBuilder()
      .setColor(colors[level]).setTitle('⬆️ Shock on Trial — Promoted')
      .setDescription(`<@${targetUser.id}> has been promoted to **Level ${level}**.`)
      .setTimestamp());
  } catch (err) {
    console.error('[totpromote error]', err);
    await ephemeralFn('Error running totpromote. Check bot permissions and role hierarchy.');
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('totpromote')
    .setDescription('Promote a user to a Shock on Trial level')
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
    .addIntegerOption(opt => opt.setName('level').setDescription('Level (1, 2, or 3)').setRequired(true)
      .addChoices({ name: 'Level 1', value: 1 }, { name: 'Level 2', value: 2 }, { name: 'Level 3', value: 3 })),

  async execute(interaction) {
    if (!hasPermission(interaction.member))
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    const user = interaction.options.getUser('user');
    const level = interaction.options.getInteger('level');
    await run(user, level, interaction.guild, interaction.client, interaction.user,
      async (embed) => { await interaction.reply({ embeds: [embed] }); setTimeout(async () => { try { await interaction.deleteReply(); } catch {} }, 3000); },
      async (msg) => interaction.reply({ content: msg, ephemeral: true })
    );
  },

  async prefixExecute(message, args) {
    const member = await message.guild.members.fetch(message.author.id);
    if (!hasPermission(member)) return message.reply('You do not have permission to use this command.');
    const mention = args[0]; const level = parseInt(args[1]);
    if (!mention || isNaN(level) || ![1,2,3].includes(level)) return message.reply('Usage: `-totpromote @user <1|2|3>`');
    const userId = mention.replace(/[<@!>]/g, '');
    let targetUser;
    try { targetUser = await message.client.users.fetch(userId); } catch { return message.reply('Could not find that user.'); }
    await run(targetUser, level, message.guild, message.client, message.author,
      async (embed) => { const s = await message.channel.send({ embeds: [embed] }); setTimeout(() => s.delete().catch(() => {}), 3000); },
      async (msg) => message.reply(msg)
    );
  }
};
