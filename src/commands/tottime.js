import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fs from 'fs';

const DATA_FILE = './trialData.json';

function readData() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch {
      return {};
    }
  }
  return {};
}

function formatTimeRemaining(ms) {
  if (ms <= 0) return null;
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return { days, hours, minutes };
}

async function runTottime(targetUser, replyFn, ephemeralFn) {
  const data = readData();
  const entry = data[targetUser.id];

  if (!entry) {
    return ephemeralFn(`<@${targetUser.id}> is not currently on Shock on Trial.`);
  }

  const remaining = entry.endTime - Date.now();

  if (remaining <= 0) {
    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('⏰ Shock on Trial — Expired')
      .setDescription(`<@${targetUser.id}>'s trial period has **expired**.`)
      .setTimestamp();
    return replyFn(embed);
  }

  const { days, hours, minutes } = formatTimeRemaining(remaining);

  const embed = new EmbedBuilder()
    .setColor(0xFEE75C)
    .setTitle('⏱️ Shock on Trial — Time Remaining')
    .setDescription(
      `<@${targetUser.id}> has **${days} day${days !== 1 ? 's' : ''}**, **${hours} hour${hours !== 1 ? 's' : ''}**, **${minutes} minute${minutes !== 1 ? 's' : ''}** left to complete Shock on Trial.`
    )
    .setTimestamp();

  await replyFn(embed);
}

export default {
  data: new SlashCommandBuilder()
    .setName('tottime')
    .setDescription('Check how much time a user has left on Shock on Trial')
    .addUserOption(opt =>
      opt.setName('user').setDescription('The user to check').setRequired(true)
    ),

  // Slash command handler
  async execute(interaction) {
    const user = interaction.options.getUser('user');

    await runTottime(
      user,
      async (embed) => interaction.reply({ embeds: [embed] }),
      async (msg) => interaction.reply({ content: msg, ephemeral: true })
    );
  },

  // Prefix command handler (-tottime @user)
  async prefixExecute(message, args) {
    const mention = args[0];

    if (!mention) {
      return message.reply('Usage: `-tottime @user`');
    }

    const userId = mention.replace(/[<@!>]/g, '');
    let targetUser;
    try {
      targetUser = await message.client.users.fetch(userId);
    } catch {
      return message.reply('Could not find that user.');
    }

    await runTottime(
      targetUser,
      async (embed) => message.channel.send({ embeds: [embed] }),
      async (msg) => message.reply(msg)
    );
  }
};
