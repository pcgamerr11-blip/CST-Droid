import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const ALLOWED_ROLES = ['1411740361113735400','1506828742335402154','1411743505780441128','1506828797037645935'];
const TRIAL_ROLES = ['1412457998877720646','1412458005416509480','1412458004388909196','1502069854839246921','1411741603693072466','1411740378511573114'];

function hasPermission(member) {
  if (member.permissions.has('Administrator')) return true;
  return ALLOWED_ROLES.some(id => member.roles.cache.has(id));
}

function trialKey(guildId, userId) {
  return `guild:${guildId}:trial:${userId}`;
}

async function run(targetUser, guild, client, replyFn, ephemeralFn) {
  try {
    const member = await guild.members.fetch(targetUser.id);
    for (const id of TRIAL_ROLES) await member.roles.remove(id).catch(() => {});
    await client.db.delete(trialKey(guild.id, targetUser.id));
    await replyFn(new EmbedBuilder()
      .setColor(0xED4245).setTitle('🛑 Shock on Trial — Ended')
      .setDescription(`<@${targetUser.id}>'s Shock on Trial has been **ended** and all trial roles removed.`)
      .setTimestamp());
  } catch (err) {
    console.error('[totend error]', err);
    await ephemeralFn('Error running totend. Check bot permissions and role hierarchy.');
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('totend')
    .setDescription("End a user's Shock on Trial")
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)),

  async execute(interaction) {
    if (!hasPermission(interaction.member))
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    const user = interaction.options.getUser('user');
    await run(user, interaction.guild, interaction.client,
      async (embed) => { await interaction.reply({ embeds: [embed] }); setTimeout(async () => { try { await interaction.deleteReply(); } catch {} }, 3000); },
      async (msg) => interaction.reply({ content: msg, ephemeral: true })
    );
  },

  async prefixExecute(message, args) {
    const member = await message.guild.members.fetch(message.author.id);
    if (!hasPermission(member)) return message.reply('You do not have permission to use this command.');
    const mention = args[0];
    if (!mention) return message.reply('Usage: `-totend @user`');
    const userId = mention.replace(/[<@!>]/g, '');
    let targetUser;
    try { targetUser = await message.client.users.fetch(userId); } catch { return message.reply('Could not find that user.'); }
    await run(targetUser, message.guild, message.client,
      async (embed) => { const s = await message.channel.send({ embeds: [embed] }); setTimeout(() => s.delete().catch(() => {}), 3000); },
      async (msg) => message.reply(msg)
    );
  }
};
