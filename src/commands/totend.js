import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fs from 'fs';

const DATA_FILE = './trialData.json';
const TRIAL_ROLES = [
  '1412457998877720646',
  '1412458005416509480',
  '1412458004388909196',
  '1502069854839246921',
  '1411741603693072466',
  '1411740378511573114'
];

function readData() {
  if (fs.existsSync(DATA_FILE)) {
    try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
    catch { return {}; }
  }
  return {};
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

async function runTotend(targetUser, guild, replyFn, ephemeralFn) {
  try {
    const member = await guild.members.fetch(targetUser.id);
    for (const roleId of TRIAL_ROLES) {
      await member.roles.remove(roleId).catch(() => {});
    }
    const data = readData();
    delete data[targetUser.id];
    writeData(data);

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('🛑 Shock on Trial — Ended')
      .setDescription(`<@${targetUser.id}>'s Shock on Trial has been **ended** and all trial roles have been removed.`)
      .setTimestamp();

    await replyFn(embed);
  } catch (err) {
    console.error('[totend error]', err);
    await ephemeralFn('Error running totend. Check bot permissions and role hierarchy.');
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('totend')
    .setDescription("End a user's Shock on Trial and remove all trial roles")
    .addUserOption(opt =>
      opt.setName('user').setDescription('The user to end trial for').setRequired(true)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    await runTotend(
      user, interaction.guild,
      async (embed) => {
        await interaction.reply({ embeds: [embed] });
        setTimeout(async () => { try { await interaction.deleteReply(); } catch {} }, 3000);
      },
      async (msg) => interaction.reply({ content: msg, ephemeral: true })
    );
  },

  async prefixExecute(message, args) {
    const mention = args[0];
    if (!mention) return message.reply('Usage: `-totend @user`');
    const userId = mention.replace(/[<@!>]/g, '');
    let targetUser;
    try { targetUser = await message.client.users.fetch(userId); }
    catch { return message.reply('Could not find that user.'); }
    await runTotend(
      targetUser, message.guild,
      async (embed) => {
        const sent = await message.channel.send({ embeds: [embed] });
        setTimeout(() => sent.delete().catch(() => {}), 3000);
      },
      async (msg) => message.reply(msg)
    );
  }
};
