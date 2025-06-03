const {
    commands,
    Module
} = require("../main");
const {
    MODE,
    HANDLERS
} = require("../config");

const isPrivateMode = MODE === 'private';

const extractCommandName = (pattern) => {
    const match = pattern.toString().match(/(\W*)([A-Za-zğüşıiöç1234567890 ]*)/);
    return match && match[2] ? match[2].trim() : '';
};

const retrieveCommandDetails = (commandName) => {
    const foundCommand = commands.find(cmd => extractCommandName(cmd.pattern) === commandName);
    if (!foundCommand) return null;
    return {
        name: commandName,
        ...foundCommand
    };
};

Module({
    pattern: "info ?(.*)",
    fromMe: isPrivateMode,
    desc: "Gives command information"
}, async (message, args) => {
    const commandName = args[1]?.trim();
    if (!commandName) {
        return await message.sendReply("_Please provide a command name. Example: .info insta_");
    }

    const commandDetails = retrieveCommandDetails(commandName);
    if (!commandDetails) {
        return await message.sendReply(`_Command '${commandName}' not found. Please check the spelling._`);
    }

    let infoMessage = `*───「 Command Details 」───*\n\n`;
    infoMessage += `• *Command:* \`${commandDetails.name}\`\n`;
    infoMessage += `• *Description:* ${commandDetails.desc || 'N/A'}\n`;
    infoMessage += `• *Owner Command:* ${commandDetails.fromMe ? 'Yes' : 'No'}\n`;
    if (commandDetails.use) infoMessage += `• *Type:* ${commandDetails.use}\n`;
    if (commandDetails.usage) infoMessage += `• *Usage:* ${commandDetails.usage}\n`;
    if (commandDetails.warn) infoMessage += `• *Warning:* ${commandDetails.warn}\n`;

    await message.sendReply(infoMessage);
});

Module({
    pattern: "list ?(.*)",
    fromMe: isPrivateMode,
    dontAddCommandList: true
}, async (message, args) => {
    const availableCommands = commands.filter(cmd => !cmd.dontAddCommandList && cmd.pattern);
    const totalCommandCount = availableCommands.length;

    const categorizedCommands = {};
    availableCommands.forEach(cmd => {
        const category = cmd.use || 'General';
        if (!categorizedCommands[category]) {
            categorizedCommands[category] = [];
        }
        const commandName = extractCommandName(cmd.pattern);
        if (commandName) {
            categorizedCommands[category].push({
                name: commandName,
                desc: cmd.desc,
                usage: cmd.usage,
                warn: cmd.warn
            });
        }
    });

    let responseMessage = `*Total Available Commands: ${totalCommandCount}*\n\n`;
    const handlerPrefix = HANDLERS.match(/\[(\W*)\]/)?.[1]?.[0] || '.';

    for (const category in categorizedCommands) {
        responseMessage += `*───「 ${category.toUpperCase()} 」───*\n\n`;
        categorizedCommands[category].forEach(cmd => {
            responseMessage += `• \`${handlerPrefix}${cmd.name}\`\n`;
            if (cmd.desc) responseMessage += `  _Description:_ ${cmd.desc}\n`;
            if (cmd.usage) responseMessage += `  _Usage:_ ${handlerPrefix}${cmd.name} ${cmd.usage}\n`;
            if (cmd.warn) responseMessage += `  _Warning:_ ${cmd.warn}\n`;
            responseMessage += '\n';
        });
    }
    await message.sendReply(responseMessage);
});

module.exports = {
    getAvailableCommands: () => commands.map(cmd => extractCommandName(cmd.pattern))
};
