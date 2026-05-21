import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const LEVEL_ROLES = {
  1: '1412457998877720646',
  2: '1412458005416509480',
  3: '1412458004388909196'
};

async function runTotpromote(targetUser, level, guild, replyFn, ephemeralFn) {
  try {
    const member = await guild.members.fetch(targetUser.id);
    for (const [lvl, roleId] of Object.entries(LEVEL_ROLES)) {
      if (parseInt(lvl) !== level) {
        await member.roles.remove(roleId).catch(() => {});
      }
    }
    await member.roles.add(LEVEL_ROLES[level]);

    const levelColors = { 1: 0x57F287, 2: 0x3498DB, 3: 0xEB459E };

    const embed = new EmbedBuilder()
      .setColor(levelColors[level])
      .setTitle('⬆️ Shock on Trial — Promoted')
      .setDescription(`<@${targetUser.id}> has been promoted to **Level ${level}**.`)
      .setTimestamp();

    await replyFn(embed);
  } catch (err) {
    console.error('[totpromote error]', err);
    await ephemeralFn('Error running totpromote. Check bot permissions and role hierarchy.');
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('totpromote')
    .setDescription('Promote a user to a Shock on Trial level')
    .addUserOption(opt =>
      opt.setName('user').setDescription('The user to promote').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('level').setDescription('Level to promote to (1, 2, or 3)').setRequired(true)
        .addChoices(
          { name: 'Level 1', value: 1 },
          { name: 'Level 2', value: 2 },
          { name: 'Level 3', value: 3 }
        )
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const level = interaction.options.getInteger('level');
    await runTotpromote(
      user, level, interaction.guild,
      async (embed) => {
        await interaction.reply({ embeds: [embed] });
        setTimeout(async () => { try { await interaction.deleteReply(); } catch {} }, 3000);
      },
      async (msg) => interaction.reply({ content: msg, ephemeral: true })
    );
  },

  async prefixExecute(message, args) {
    const mention = args[0];
    const level = parseInt(args[1]);
    if (!mention || isNaN(level) || ![1, 2, 3].includes(level)) {
      return message.reply('Usage: `-totpromote @user <1|2|3>`');
    }
    const userId = mention.replace(/[<@!>]/g, '');
    let targetUser;
    try { targetUser = await message.client.users.fetch(userId); }
    catch { return message.reply('Could not find that user.'); }
    await runTotpromote(
      targetUser, level, message.guild,
      async (embed) => {
        const sent = await message.channel.send({ embeds: [embed] });
        setTimeout(() => sent.delete().catch(() => {}), 3000);
      },
      async (msg) => message.reply(msg)
    );
  }
};
