const fs = require("fs");
const DataUtils = require("./DataUtils");
const modules = {
    "core.IrisModule": "../modules/IrisModule"
};

/**
 * @description Module utilities
*/
class ModuleUtils {
    /**
     * @description Registers all prototype modifications
     * @param {String} path The directory
    */
    static registerPrototypes(path = "./prototype") {
        const files = fs.readdirSync(path);
        for (const fileName of files) {
            if (fileName.endsWith(".js") || fileName.endsWith(".ts")) {
                require(`${path}/${fileName}`);
            } else {
                this.registerPrototypes(`${path}/${fileName}`);
            }
        }
    }

    /**
     * @description Gets a module with a name
     * @param {String} name The name of the module
     * @return {IrisModule} The module class
    */
    static getModule(name) {
        return name ? modules[name] ? require(modules[name]) : require(`../modules/${name.replace(/\./g, "/")}`) : modules;
    }

    /**
     * @description Registers all module files
     * @param {String} path The directory
    */
    static registerModules(path = "./modules") {
        const files = fs.readdirSync(path);
        for (const fileName of files) {
            if (fileName.endsWith(".js") || fileName.endsWith(".ts")) {
                const ModuleFile = require(`${path}/${fileName}`);
                const moduleClass = new ModuleFile();

                modules[moduleClass._name] = `${require("path").relative(__dirname, path).replace(/\\/g, "/")}/${fileName}`;
                // get relative path from absolute path

                console.log(`[REGISTER] Registered module ${moduleClass._name}`);
            } else {
                this.registerModules(`${path}/${fileName}`);
            }
        }
    }

    /**
     * @description Regsiters all application commands
     * @param {String} path The directory
    */
    static async registerCommands(path = "./commands") {
        const commands = [];

        ModuleUtils.registerTextCommands(`${path}/text`);

        commands.push(...ModuleUtils.registerSlashCommands(`${path}/slash`));
        commands.push(...ModuleUtils.registerMessageCommands(`${path}/message`));
        commands.push(...ModuleUtils.registerUserCommands(`${path}/user`));
        const guilds = await process.client.guilds.fetch();

        for (const guildId of guilds.keys()) {
            const guild = await process.client.guilds.fetch(guildId);
            await guild.commands.set(commands);
        }

        console.log("[REGISTER] Registered all client commands");
    }

    /**
     * @description Registers all text message commands
     * @param {String} path The directory
    */
    static registerTextCommands(path = "./commands/text") {
        const commands = [];

        const textCommands = fs.readdirSync(path);
        for (const textCommand of textCommands) {
            const CommandFile = require(`${path}/${textCommand}`);
            const commandClass = new CommandFile();

            console.log(`[REGISTER] Registered text command ${commandClass.getName()}`);

            commands.push({
                name: commandClass.getName(),
                aliases: commandClass.getAliases(),
                executor: commandClass.executor
            });
        }

        process.client.on("messageCreate", (message) => {
            if (!message.inGuild() || !message.channel || message.author.bot || message.author.system) return;

            const prefix = DataUtils.getConfig(message.guild).prefix;

            for (const command of commands) {
                const commandData = DataUtils.getConfig(message.guild).commands.text[command.name.toLowerCase()];
                if (!commandData || !commandData.enabled) continue;
                if (!(commandData.channels.includes(message.channel.id) ^ commandData["channel-blacklist"])) continue;

                let hasPermission = false;

                if (message.member.roles.cache.hasAny(commandData.roles)) hasPermission = true;
                if (commandData.users.includes(message.author.id)) hasPermission = true;
                if (commandData.default) hasPermission = !hasPermission;
                if (!hasPermission) continue;

                // eslint-disable-next-line max-len
                if (message.content.toLowerCase().startsWith(`${prefix}${command.name.toLowerCase()}`) || command.aliases.some((alias) => message.content.toLowerCase().startsWith(`${prefix}${alias.toLowerCase()}`))) {
                    const args = message.content.split(" ").slice(1);
                    command.executor(message, args);
                }
                if (message.content.startsWith("<@957409730958086254>")) {
                    const args = message.content.split(" ").slice(1);
                    command.executor(message, args);
                }
            }
        });
    }

    /**
     * @description Registers all slash commands
     * @param {String} path The directory
     * @return {Array} The commands
    */
    static registerSlashCommands(path = "./commands/slash") {
        const commands = [];

        const messageCommands = fs.readdirSync(path);
        for (const messageCommand of messageCommands) {
            const commandFile = require(`${path}/${messageCommand}`);

            console.log(`[REGISTER] Registered slash command ${commandFile.getName()}`);

            commands.push(commandFile.getBuilder().toJSON());

            process.client.on("interactionCreate", (interaction) => {
                if (!interaction.isCommand() || interaction.commandName !== commandFile.getName().toLowerCase()) {
                    return;
                }

                commandFile.run(interaction);
            });
        }

        return commands;
    }

    /**
     * @description Registers all message context menu commands
     * @param {String} path The directory
     * @return {Array} The commands
    */
    static registerMessageCommands(path = "./commands/message") {
        const commands = [];

        const messageCommands = fs.readdirSync(path);
        for (const messageCommand of messageCommands) {
            const commandFile = require(`${path}/${messageCommand}`);

            console.log(`[REGISTER] Registered message command ${commandFile.getName()}`);

            commands.push(commandFile.getBuilder());

            process.client.on("interactionCreate", (interaction) => {
                if (!interaction.isMessageContextMenu() || interaction.commandName !== commandFile.getName()) {
                    return;
                }

                commandFile.run(interaction);
            });
        }

        return commands;
    }

    /**
     * @description Registers all message context menu commands
     * @param {String} path The directory
     * @return {Array} The commands
    */
    static registerUserCommands(path = "./commands/user") {
        const commands = [];

        const userCommands = fs.readdirSync(path);
        for (const userCommand of userCommands) {
            const commandFile = require(`${path}/${userCommand}`);

            console.log(`[REGISTER] Registered user command ${commandFile.getName()}`);

            commands.push(commandFile.getBuilder());

            process.client.on("interactionCreate", (interaction) => {
                if (!interaction.isUserContextMenu() || interaction.commandName !== commandFile.getName()) {
                    return;
                }

                commandFile.run(interaction);
            });
        }

        return commands;
    }
}

module.exports = ModuleUtils;
