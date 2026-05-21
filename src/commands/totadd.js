import fs from "fs";
import {
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";

const TRIAL_ROLE = "1412457998877720646";
const REMOVE_ROLE = "1411742536837627925";

export default {
  data: new SlashCommandBuilder()
    .setName("totadd")
    .setDescription("Add someone to Shock on Trial")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("User")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("days")
        .setDescription("Days until completion")
        .setRequired(true)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("user");
    const days = interaction.options.getInteger("days");

    const member = await interaction.guild.members.fetch(user.id);

    await member.roles.add(TRIAL_ROLE);

    if (member.roles.cache.has(REMOVE_ROLE)) {
      await member.roles.remove(REMOVE_ROLE);
    }

    const data = JSON.parse(
      fs.readFileSync("./trialData.json", "utf8")
    );

    const endTime =
      Date.now() + days * 24 * 60 * 60 * 1000;

    data[user.id] = {
      endTime,
    };

    fs.writeFileSync(
      "./trialData.json",
      JSON.stringify(data, null, 2)
    );

    const embed = new EmbedBuilder()
      .setColor("#57F287")
      .setTitle("Shock on Trial Added")
      .setDescription(
        `${user} has been added to Shock on Trial for **${days} days**.`
      )
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
    });
  },
};
