const {
    commands,
    Module
} = require("../main");
const {
    MODE,
    HANDLERS,
    ALIVE, 
    BOT_INFO,
    VERSION
} = require("../config");
const os = require('os'); 

const isPrivateMode = MODE === 'private';

const extractCommandName = (pattern) => {
    const match = pattern?.toString().match(/(\W*)([A-Za-z1234567890 ]*)/);
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
    if (commandDetails.usage) infoMessage += `• *Usage:* ${commandDetails.name} ${commandDetails.usage}\n`; 
    if (commandDetails.warn) infoMessage += `• *Warning:* ${commandDetails.warn}\n`;

    await message.sendReply(infoMessage);
});

Module({
    pattern: 'list ?(.*)',
    fromMe: isPrivateMode,
    excludeFromCommands: true
}, async (message, args) => {
    const availableCommands = commands.filter(cmd => !cmd.excludeFromCommands && cmd.pattern);
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
            if (cmd.usage) responseMessage += `  _Usage:_ ${cmd.usage}\n`;
            if (cmd.warn) responseMessage += `  _Warning:_ ${cmd.warn}\n`;
            responseMessage += '\n';
        });
    }
    await message.sendReply(responseMessage);
});

function bytesToSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; 
    }
    return array;
}

async function parseAlive(message, aliveMessage) {

    const defaultAliveMessage = "I'm alive!";
    await message.sendReply(aliveMessage || defaultAliveMessage);
}

const manage = {
    setVar: async (key, value, message) => {

        await message.sendReply(`_Attempted to set ${key} to ${value}. (Note: This is a placeholder and doesn't persist changes in this demo)_`);
    }
};

Module({
    pattern: 'alive',
    fromMe: isPrivateMode,
    desc: 'Checks if the bot is alive.'
}, (async (message, match) => {
    await parseAlive(message, ALIVE);
}));

Module({
    pattern: 'setalive ?(.*)',
    fromMe: true, 
    desc: 'Sets the alive message for the bot.',
    dontAddCommandList: true 
}, (async (message, match) => {
    if (match[1]) {

        return await manage.setVar("ALIVE", match[1], message);
    } else {
        return await message.sendReply("_Please provide a message to set as the alive message. Example: .setalive I am online!_");
    }
}));

Module({
    pattern: 'menu',
    fromMe: isPrivateMode,
    use: 'utility',
    desc: 'Displays the bot command menu.'
}, (async (message, match) => {
    const stars = ['✦', '✯', '✯', '✰', '◬'];
    const star = stars[Math.floor(Math.random() * stars.length)];

    let use_ = commands.map(e => e.use);
    const others = (use) => {
        return use === '' ? 'others' : use;
    };
    let types = [...new Set(commands
    .filter(e => e.pattern)
    .map(e => e.use || 'General'))];

    let cmd_obj = {};
    for (const command of commands) {
        let type_det = command.use || "General";
        if (!cmd_obj[type_det]?.length) cmd_obj[type_det] = [];
        let cmd_name = extractCommandName(command.pattern); 
        if (cmd_name) cmd_obj[type_det].push(cmd_name);
    }


    let final = '';
    let i = 0;
    const handlerPrefix = HANDLERS !== 'false' ? HANDLERS.split("")[0] : ""
    for (const n of types) {
        for (const x of cmd_obj[n]) {
            i = i + 1;
            const newn = n.charAt(0).toUpperCase() + n.slice(1); 
            final += `${final.includes(newn)?'':'\n\n╭════〘 *_'+newn+"_* 〙════⊷❍"}\n┃${star}│ _${i}. ${handlerPrefix}${x.trim()}_${cmd_obj[n]?.indexOf(x)===(cmd_obj[n]?.length-1) ?`\n┃${star}╰─────────────────❍\n╰══════════════════⊷❍`:''}`
        }
    }

    let cmdmenu = final.trim();

    const used = bytesToSize(os.freemem());
    const total = bytesToSize(os.totalmem());
    const botOwner = BOT_INFO.split(";")[1] || 'N/A';
    const botName = BOT_INFO.split(";")[0] || 'My Bot';
    const botVersion = VERSION; 
    const botImageLink = BOT_INFO.split(";")[3] || `https://i.ibb.co/B598wrtG/raganork-bot.png`

    const menu = `╭═══〘 ${botName} 〙═══⊷❍
┃${star}╭──────────────
┃${star}│
┃${star}│ _*Owner*_ : ${botOwner}
┃${star}│ _*User*_ : ${message.senderName.replace(/[\r\n]+/gm, "")}
┃${star}│ _*Mode*_ : ${MODE}
┃${star}│ _*Server*_ : ${os.platform() === 'linux' ? "Linux" : "Unknown OS"}
┃${star}│ _*Available RAM*_ : ${used} of ${total}
┃${star}│ _*Version*_ : ${botVersion}
┃${star}│
┃${star}│
┃${star}│  ▎▍▌▌▉▏▎▌▉▐▏▌▎
┃${star}│  ▎▍▌▌▉▏▎▌▉▐▏▌▎
┃${star}│   ${botName}
┃${star}│
┃${star}╰───────────────
╰═════════════════⊷

${cmdmenu}`;

    try {

        await message.client.sendMessage(message.jid, {
            image: {url: botImageLink},
            caption: menu
        });
    } catch (error) {
        console.error("Error sending menu:", error);
        await message.client.sendMessage(message.jid, {
            text: menu
        });
    }
}));
Module({
    pattern: "games ?(.*)",
    fromMe: isPrivateMode,
    desc: "Lists all available games"
}, async (message, args) => {
    const gameCommands = commands.filter(cmd => cmd.use === 'game' && cmd.pattern);
    if (!gameCommands.length) {
        return await message.sendReply("_No games are installed._");
    }
    const handlerPrefix = HANDLERS.match(/\[(\W*)\]/)?.[1]?.[0] || '.';
    let response = `*───「 Available Games 」───*\n\n`;
    gameCommands.forEach(cmd => {
        const name = extractCommandName(cmd.pattern);
        if (name) {
            response += `• *Command:* \`${handlerPrefix}${name}\`\n`;
            response += `• *Description:* ${cmd.desc || 'N/A'}\n`;
            if (cmd.use) response += `• *Type:* ${cmd.use}\n`;
            if (cmd.usage) response += `• *Usage:* ${cmd.usage}\n`;
            if (cmd.warn) response += `• *Warning:* ${cmd.warn}\n`;
            response += '\n';
        }
    });
    await message.sendReply(response);
});

module.exports = {
    getAvailableCommands: () => commands.filter(x => x.pattern).map(cmd => extractCommandName(cmd.pattern))
};