import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const ALLOWED_ROLES = ['1411740361113735400','1506828742335402154','1411743505780441128','1506828797037645935'];

function hasPermission(member) {
  if (member.permissions.has('Administrator')) return true;
  return ALLOWED_ROLES.some(id => member.roles.cache.has(id));
}

function trialKey(guildId, userId) {
  return `guild:${guildId}:trial:${userId}`;
}

async function run(targetUser, days, guild, client, replyFn, ephemeralFn) {
  const entry = await client.db.get(trialKey(guild.id, targetUser.id), null);
  if (!entry) return ephemeralFn(`<@${targetUser.id}> is not currently on Shock on Trial.`);

  entry.endTime = Math.max(entry.endTime, Date.now()) + days * 86400000;
  await client.db.set(trialKey(guild.id, targetUser.id), entry);

  const remaining = entry.endTime - Date.now();
  const d = Math.floor(remaining / 86400000);
  const h = Math.floor((remaining % 86400000) / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);

  await replyFn(new EmbedBuilder()
    .setColor(0xFEE75C).setTitle('⏳ Shock on Trial — Extended')
    .setDescription(`<@${targetUser.id}>'s trial has been extended by **${days} day${days !== 1 ? 's' : ''}**.`)
    .addFields({ name: 'New Time Remaining', value: `${d}d ${h}h ${m}m`, inline: true })
    .setTimestamp());
}

export default {
  data: new SlashCommandBuilder()
    .setName('totextend')
    .setDescription("Extend a user's Shock on Trial time")
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
    .addIntegerOption(opt => opt.setName('days').setDescription('Days to add').setRequired(true).setMinValue(1)),

  async execute(interaction) {
    if (!hasPermission(interaction.member))
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    const user = interaction.options.getUser('user');
    const days = interaction.options.getInteger('days');
    await run(user, days, interaction.guild, interaction.client,
      async (embed) => { await interaction.reply({ embeds: [embed] }); setTimeout(async () => { try { await interaction.deleteReply(); } catch {} }, 3000); },
      async (msg) => interaction.reply({ content: msg, ephemeral: true })
    );
  },

  async prefixExecute(message, args) {
    const member = await message.guild.members.fetch(message.author.id);
    if (!hasPermission(member)) return message.reply('You do not have permission to use this command.');
    const mention = args[0]; const days = parseInt(args[1]);
    if (!mention || isNaN(days) || days < 1) return message.reply('Usage: `-totextend @user <days>`');
    const userId = mention.replace(/[<@!>]/g, '');
    let targetUser;
    try { targetUser = await message.client.users.fetch(userId); } catch { return message.reply('Could not find that user.'); }
    await run(targetUser, days, message.guild, message.client,
      async (embed) => { const s = await message.channel.send({ embeds: [embed] }); setTimeout(() => s.delete().catch(() => {}), 3000); },
      async (msg) => message.reply(msg)
    );
  }
};
