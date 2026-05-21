import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Collection } from 'discord.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getAllFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name !== 'modules') {
        files = files.concat(await getAllFiles(fullPath));
      }
    } else if (entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

export async function loadCommands(client) {
  client.commands = new Collection();

  const commandsPath = path.join(__dirname, '../commands');
  const files = await getAllFiles(commandsPath);

  logger.info(`Loading ${files.length} command files...`);

  let loaded = 0;
  let failed = 0;

  for (const file of files) {
    try {
      const mod = await import(`file://${file}`);
      const command = mod.default;

      if (!command?.data?.name || !command?.execute) {
        logger.warn(`Invalid command format: ${file}`);
        failed++;
        continue;
      }

      const name = command.data.name;

      client.commands.set(name, {
        ...command,
        filePath: file,
      });

      logger.info(`Loaded command: ${name}`);
      loaded++;

    } catch (err) {
      failed++;
      logger.error(`Failed loading command ${file}:`, err);
    }
  }

  logger.info(`Commands loaded: ${loaded}, failed: ${failed}`);
  return client.commands;
}

export async function registerCommands(client, guildId) {
  try {
    const guild = await client.guilds.fetch(guildId);

    const commands = [];

    for (const cmd of client.commands.values()) {
      try {
        if (!cmd.data?.toJSON) continue;
        commands.push(cmd.data.toJSON());
      } catch (err) {
        logger.error(`Skipping bad command: ${cmd.data?.name}`, err);
      }
    }

    logger.info(`Registering ${commands.length} slash commands...`);

    await guild.commands.set(commands);

    logger.info(`Slash commands registered successfully`);
  } catch (err) {
    logger.error('Command registration failed:', err);
  }
}
