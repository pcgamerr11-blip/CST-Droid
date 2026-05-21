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

const GRADUATE_ROLES = [
  '1411740378511573114',
  '1411742967634591825',
  '1411742533565943808',
  '1467548035579121715'
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

async function runTotgraduate(targetUser, guild, replyFn, ephemeralFn) {
  try {
    const member = await guild.members.fetch(targetUser.id);

    // Remove all trial roles
    for (const roleId of TRIAL_ROLES) {
      await member.roles.remove(roleId).catch(() => {});
    }

    // Add graduate roles
    for (const roleId of GRADUATE_ROLES) {
      await member.roles.add(roleId).catch(() => {});
    }

    // Remove from trial data
    const data = readData();
    delete data[targetUser.id];
    writeData(data);

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('🎓 Shock on Trial — Graduated!')
      .setDescription(`<@${targetUser.id}> has successfully **graduated** from Shock on Trial! All trial roles have been removed and graduate roles have been assigned.`)
      .setTimestamp();

    await replyFn(embed);
  } catch (err) {
    console.error('[totgraduate error]', err);
    await ephemeralFn('Error running totgraduate. Check bot permissions and role hierarchy.');
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('totgraduate')
    .setDescription('Graduate a user from Shock on Trial')
    .addUserOption(opt =>
      opt.setName('user').setDescription('The user to graduate').setRequired(true)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    await runTotgraduate(
      user, interaction.guild,
      async (embed) => interaction.reply({ embeds: [embed] }),
      async (msg) => interaction.reply({ content: msg, ephemeral: true })
    );
  },

  async prefixExecute(message, args) {
    const mention = args[0];
    if (!mention) return message.reply('Usage: `-totgraduate @user`');
    const userId = mention.replace(/[<@!>]/g, '');
    let targetUser;
    try { targetUser = await message.client.users.fetch(userId); }
    catch { return message.reply('Could not find that user.'); }
    await runTotgraduate(
      targetUser, message.guild,
      async (embed) => message.channel.send({ embeds: [embed] }),
      async (msg) => message.reply(msg)
    );
  }
};
