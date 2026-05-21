import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fs from 'fs';

const DATA_FILE = './trialData.json';

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

async function runTotextend(targetUser, days, replyFn, ephemeralFn) {
  const data = readData();
  const entry = data[targetUser.id];

  if (!entry) {
    return ephemeralFn(`<@${targetUser.id}> is not currently on Shock on Trial.`);
  }

  const baseTime = Math.max(entry.endTime, Date.now());
  entry.endTime = baseTime + days * 86400000;
  data[targetUser.id] = entry;
  writeData(data);

  const remaining = entry.endTime - Date.now();
  const d = Math.floor(remaining / 86400000);
  const h = Math.floor((remaining % 86400000) / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);

  const embed = new EmbedBuilder()
    .setColor(0xFEE75C)
    .setTitle('⏳ Shock on Trial — Extended')
    .setDescription(`<@${targetUser.id}>'s trial has been extended by **${days} day${days !== 1 ? 's' : ''}**.`)
    .addFields({ name: 'New Time Remaining', value: `${d}d ${h}h ${m}m`, inline: true })
    .setTimestamp();

  await replyFn(embed);
}

export default {
  data: new SlashCommandBuilder()
    .setName('totextend')
    .setDescription("Extend a user's Shock on Trial time")
    .addUserOption(opt =>
      opt.setName('user').setDescription('The user to extend').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('days').setDescription('Days to add').setRequired(true).setMinValue(1)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const days = interaction.options.getInteger('days');
    await runTotextend(
      user, days,
      async (embed) => interaction.reply({ embeds: [embed] }),
      async (msg) => interaction.reply({ content: msg, ephemeral: true })
    );
  },

  async prefixExecute(message, args) {
    const mention = args[0];
    const days = parseInt(args[1]);
    if (!mention || isNaN(days) || days < 1) return message.reply('Usage: `-totextend @user <days>`');
    const userId = mention.replace(/[<@!>]/g, '');
    let targetUser;
    try { targetUser = await message.client.users.fetch(userId); }
    catch { return message.reply('Could not find that user.'); }
    await runTotextend(
      targetUser, days,
      async (embed) => message.channel.send({ embeds: [embed] }),
      async (msg) => message.reply(msg)
    );
  }
};
