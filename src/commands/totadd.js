import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fs from 'fs';

const TRIAL_ROLE_ID = '1412457998877720646';
const REMOVE_ROLE_ID = '1411742536837627925';
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

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

async function runTotadd(targetUser, days, guild, replyFn, ephemeralFn) {
  try {
    const member = await guild.members.fetch(targetUser.id);

    await member.roles.add(TRIAL_ROLE_ID);
    await member.roles.remove(REMOVE_ROLE_ID).catch(() => {});

    const data = readData();
    data[targetUser.id] = {
      endTime: Date.now() + days * 86400000,
      startedAt: Date.now(),
      days
    };
    writeData(data);

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('⚠️ Shock on Trial — Started')
      .setDescription(`<@${targetUser.id}> has been placed on **Shock on Trial** for **${days} day${days !== 1 ? 's' : ''}**.`)
      .addFields({ name: 'Time Limit', value: `${days} day${days !== 1 ? 's' : ''}`, inline: true })
      .setTimestamp();

    await replyFn(embed);
  } catch (err) {
    console.error('[totadd error]', err);
    await ephemeralFn('Error running totadd. Make sure the bot has the Manage Roles permission and the role IDs are correct.');
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('totadd')
    .setDescription('Place a user on Shock on Trial')
    .addUserOption(opt =>
      opt.setName('user').setDescription('The user to put on trial').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('days').setDescription('Number of days for the trial').setRequired(true).setMinValue(1)
    ),

  // Slash command handler
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const days = interaction.options.getInteger('days');

    await runTotadd(
      user,
      days,
      interaction.guild,
      async (embed) => {
        await interaction.reply({ embeds: [embed] });
        setTimeout(async () => { try { await interaction.deleteReply(); } catch {} }, 5000);
      },
      async (msg) => {
        if (!interaction.replied) await interaction.reply({ content: msg, ephemeral: true });
      }
    );
  },

  // Prefix command handler (-totadd @user 7)
  async prefixExecute(message, args) {
    const mention = args[0];
    const days = parseInt(args[1]);

    if (!mention || isNaN(days) || days < 1) {
      return message.reply('Usage: `-totadd @user <days>`');
    }

    const userId = mention.replace(/[<@!>]/g, '');
    let targetUser;
    try {
      targetUser = await message.client.users.fetch(userId);
    } catch {
      return message.reply('Could not find that user.');
    }

    await runTotadd(
      targetUser,
      days,
      message.guild,
      async (embed) => {
        const sent = await message.channel.send({ embeds: [embed] });
        setTimeout(() => sent.delete().catch(() => {}), 5000);
      },
      async (msg) => {
        message.reply(msg);
      }
    );
  }
};
