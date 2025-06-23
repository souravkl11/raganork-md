const config = require('./config');

const Commands = [];
let commandPrefix;
let handlerPrefix;

// Initialize command prefix based on HANDLERS config
if (config.HANDLERS === 'false') {
    commandPrefix = '^';  // Default prefix if handlers are disabled
} else {
    commandPrefix = config.HANDLERS;
}

// Initialize handler prefix based on commandPrefix
if (typeof commandPrefix === 'string') {
    if (commandPrefix.length > 1 && commandPrefix[0] === commandPrefix[1]) {
        // If prefix has repeated first character (like '##')
        handlerPrefix = commandPrefix;
    } else if (/[-!$%^&*()_+|~=`{}\[\]:";'<>?,./]/.test(commandPrefix) && commandPrefix !== '^') {
        // If prefix contains special characters (but not just '^')
        handlerPrefix = `^[${commandPrefix}]`;  // Create regex character class
    } else {
        // Default case
        handlerPrefix = commandPrefix;
    }
}

function Module(info, func) {
    const validEventTypes = ['photo', 'image', 'text', 'button', 'group-update', 'message', 'start'];
    
    const commandInfo = {
        fromMe: info.fromMe ?? true,  // Default to true if not specified
        desc: info.desc ?? '',
        usage: info.usage ?? '',
        excludeFromCommands: info.excludeFromCommands ?? false,
        warn: info.warn ?? '',
        use: info.use ?? '',
        function: func
    };

    // Handle event type and pattern matching
    if (info.on === undefined && info.pattern === undefined) {
        commandInfo.on = 'message';
        commandInfo.fromMe = false;
    } else if (info.on !== undefined && validEventTypes.includes(info.on)) {
        commandInfo.on = info.on;
        if (info.pattern !== undefined) {
            const prefix = (info.handler ?? true) ? handlerPrefix : '';
            commandInfo.pattern = new RegExp(`${prefix}${info.pattern}`, 's');
        }
    } else if (info.pattern !== undefined) {
        const prefix = (info.handler ?? true) ? handlerPrefix : '';
        commandInfo.pattern = new RegExp(`${prefix}${info.pattern}`, 's');
    }

    Commands.push(commandInfo);
    return commandInfo;
}

module.exports = {
    Module,
    commands: Commands
};