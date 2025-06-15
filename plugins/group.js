const {
    getString
} = require('./utils/lang');
const Lang = getString('group');
const {delay} = require('baileys');
const {
    isAdmin,
    isNumeric,
    mentionjid
} = require('./utils');
const { ADMIN_ACCESS, HANDLERS } = require('../config');
const {
    Module
} = require('../main')

var handler = HANDLERS !== 'false' ? HANDLERS.split("")[0] : ""

Module({
    pattern: 'clear ?(.*)',
    fromMe: true,
    desc: "Clear chat",
    use: 'misc',
    usage: '.clear (clears the current chat)'
}, (async (message, match) => {
    await message.client.chatModify({
        delete: true,
        lastMessages: [{ key: message.data.key, messageTimestamp:message.data.messageTimestamp }]
      },message.jid)
    return  await message.send("_Chat cleared!_")  
}));
    Module({
    pattern: 'kick ?(.*)',
    fromMe: false,
    desc: Lang.KICK_DESC,
    use: 'group',
    usage: '.kick @mention or reply\n.kick all (removes everyone)\n.kick 91 (removes numbers starting with 91)'
}, (async (message, match) => {
    if (!message.isGroup) return await message.sendReply(Lang.GROUP_COMMAND)
    let adminAccesValidated = ADMIN_ACCESS ? await isAdmin(message,message.sender) : false;
    if (message.fromOwner || adminAccesValidated) {
    var {
        participants, subject
    } = await message.client.groupMetadata(message.jid)
    if (match[1]) {
        if (match[1] === 'all') {
            var admin = await isAdmin(message);
            if (!admin) return await message.sendReply(Lang.NOT_ADMIN)
            let users = participants.filter((member) => !member.admin)
            await message.send(`_❗❗ Kicking *every* members of ${subject}. Restart bot immediately to kill this process ❗❗_\n*You have 5 seconds left*`)
            await new Promise((r) => setTimeout(r, 5000))
            for (let member of users) {
                await new Promise((r) => setTimeout(r, 1000))
                await message.client.groupParticipantsUpdate(message.jid, [member.id], "remove")
            }
            return;
        }
        if (isNumeric(match[1])) {
            var admin = await isAdmin(message);
            if (!admin) return await message.sendReply(Lang.NOT_ADMIN)
            let users = participants.filter((member) => member.id.startsWith(match[1]) && !member.admin)
            await message.send(`_❗❗ Kicking *${users.length}* members starting with number *${match[1]}*. Restart bot immediately to kill this process ❗❗_\n*You have 5 seconds left*`)
            await new Promise((r) => setTimeout(r, 5000))
            for (let member of users) {
                await new Promise((r) => setTimeout(r, 1000))
                await message.client.groupParticipantsUpdate(message.jid, [member.id], "remove")
            }
            return;
        }
    }
    const user = message.mention[0] || message.reply_message.jid
    if (!user) return await message.sendReply(Lang.NEED_USER)
    var admin = await isAdmin(message);
    if (!admin) return await message.sendReply(Lang.NOT_ADMIN)
    await message.client.sendMessage(message.jid, {
        text: mentionjid(user) + Lang.KICKED,
        mentions: [user]
    })
    await message.client.groupParticipantsUpdate(message.jid, [user], "remove")
}
}))
Module({
    pattern: 'add ?(.*)',
    fromMe: true,
    desc: Lang.ADD_DESC,
    warn:"You number might get banned, use with caution",
    use: 'group',
    usage: '.add 919876543210'
}, (async (message, match) => {
    if (!message.isGroup) return await message.sendReply(Lang.GROUP_COMMAND)
    var init = match[1] || message.reply_message.jid.split("@")[0]
    if (!init) return await message.sendReply(Lang.NEED_USER)
    var admin = await isAdmin(message);
    if (!admin) return await message.sendReply(Lang.NOT_ADMIN)
    var initt = init.split(" ").join("")
    var user = initt.replace(/\+/g, '').replace(' ', '').replace(' ', '').replace(' ', '').replace(' ', '').replace(/\(/g, '').replace(/\)/g, '').replace(/-/g, '')
    await message.client.groupAdd(user,message)
}))
Module({
    pattern: 'promote ?(.*)',
    fromMe: false,
    use: 'group',
    desc: Lang.PROMOTE_DESC,
    usage: '.promote @mention or reply'
}, (async (message, match) => {
    let adminAccesValidated = ADMIN_ACCESS ? await isAdmin(message,message.sender) : false;
    if (message.fromOwner || adminAccesValidated) {
    const user = message.mention[0] || message.reply_message.jid
    if (!user) return await message.sendReply(Lang.NEED_USER)
    if (!message.isGroup) return await message.sendReply(Lang.GROUP_COMMAND)
    var admin = await isAdmin(message);
    if (!admin) return await message.sendReply(Lang.NOT_ADMIN)
    await message.client.sendMessage(message.jid, {
        text: mentionjid(user) + Lang.PROMOTED,
        mentions: [user]
    })
    await message.client.groupParticipantsUpdate(message.jid, [user], "promote")
}}))
Module({
    pattern: 'requests ?(.*)',
    fromMe: false,
    use: 'group',
    usage: '.requests approve all or reject all',
    desc: "Get list of pending join requests"
}, (async (message, match) => {
    if (!message.isGroup) return await message.sendReply(Lang.GROUP_COMMAND)
    let adminAccesValidated = ADMIN_ACCESS ? await isAdmin(message,message.sender) : false;
    if (message.fromOwner || adminAccesValidated) {
    var admin = await isAdmin(message);
    if (!admin) return await message.sendReply(Lang.NOT_ADMIN)
    let approvalList = await message.client.groupRequestParticipantsList(message.jid)
    if (!approvalList.length) return await message.sendReply("_No pending requests!_")
    let approvalJids = approvalList.map(x=>x.jid)
    if (match[1]){
        match = match[1].toLowerCase()
        switch(match){
            case 'approve all':{
                await message.sendReply(`_Approving ${approvalJids.length} participants._`)
                for (let x of approvalJids){
                    await message.client.groupRequestParticipantsUpdate(message.jid,[x],"approve")
                    await delay(900)
                }
                break;
            }
            case 'reject all':{
                await message.sendReply(`_Rejecting ${approvalJids.length} participants._`)
                for (let x of approvalJids){
                    await message.client.groupRequestParticipantsUpdate(message.jid,[x],"reject")
                    await delay(900)    
                }
                break;
            }
            default:{
                return await message.sendReply("_Invalid input_\n_Eg: .requests approve all_\n_.requests reject all_")
            }
        }  
        return;  
    }
    let msg = '*_Group join requests_*\n\n_(Use .requests approve|reject all)_\n\n'
    const requestType = (type_,requestor) => {
        switch(type_){
            case 'linked_group_join' : return 'community'
            case 'invite_link' : return 'invite link'
            case 'non_admin_add' : return `added by +${requestor.split("@")[0]}`
        }
    }
    for (let x in approvalList){
        msg+=`*_${(parseInt(x)+1)}. @${approvalList[x].jid.split("@")[0]}_*\n  _• via: ${requestType(approvalList[x].request_method,approvalList[x].requestor)}_\n  _• at: ${new Date(parseInt(approvalList[x].request_time)*1000).toLocaleString()}_\n\n`
    }
    return await message.client.sendMessage(message.jid,{text:msg,mentions:approvalJids},{quoted:message.data})
}}))
Module({
    pattern: 'leave',
    fromMe: true,
    desc: Lang.LEAVE_DESC,
    usage: '.leave (exits current group)',
    use: 'group'
}, (async (message, match) => {
    if (!message.isGroup) return await message.sendReply("_Leave from where? This is a group command bruh!_")
    return await message.client.groupLeave(message.jid);
}))
// QUOTED - COPYRIGHT: souravkl11/raganork
Module({
    pattern: 'quoted',
    fromMe: false,
    desc:"Sends replied message's replied message. Useful for recovering deleted messages.",
    usage: '.quoted (reply to a quoted message)',
    use: 'misc'
}, (async (message, match) => {
    let adminAccesValidated = ADMIN_ACCESS ? await isAdmin(message,message.sender) : false;
    if (message.fromOwner || adminAccesValidated) {
    try {
    var msg = await message.client.store.toJSON()?.messages[message.jid]?.toJSON().filter(e=>e.key.id===message.reply_message.id)
    var quoted = msg[0].message[Object.keys(msg[0].message)].contextInfo;
    var quoted2 = await message.client.store.toJSON()?.messages[message.jid]?.toJSON().filter(e=>e.key.id===quoted.stanzaId)
    if (quoted2.length) return await message.forwardMessage(message.jid,quoted2[0]);
    var obj = {key: {remoteJid: message.jid,fromMe: false,id: quoted.stanzaId,participant: quoted.participant},message: quoted.quotedMessage}
    return await message.forwardMessage(message.jid,obj);
    } catch { return await message.sendReply("_Failed to load message!_") }
}})) 
Module({
    pattern: 'msgs ?(.*)',
    fromMe: false,
    desc:"Shows number of messages sent by each member. (Only from when bot was set up)",
    usage: '.msgs (all members)\n.msgs @mention (specific member)',
    use: 'group'
}, (async (message, match) => {
    let adminAccesValidated = ADMIN_ACCESS ? await isAdmin(message,message.sender) : false;
    if (message.fromOwner || adminAccesValidated) {
    if (!message.isGroup) return await message.sendReply(Lang.GROUP_COMMAND)
    var m = message; var conn = message.client;
    let msgs = await conn.getMessages(m.jid);
    var users = (await conn.groupMetadata(m.jid)).participants.map(e=>e.id);
    if (message.mention[0]) users = message.mention;
    if (message.reply_message && !message.mention.length) users = message.reply_message.jid;
    function timeSince(date){var seconds=Math.floor((new Date()-date)/1000);var interval=seconds/31536000;if(interval>1){return Math.floor(interval)+" years ago"}
    interval=seconds/2592000;if(interval>1){return Math.floor(interval)+" months ago"}
    interval=seconds/86400;if(interval>1){return Math.floor(interval)+" days ago"}
    interval=seconds/3600;if(interval>1){return Math.floor(interval)+" hours ago"}
    interval=seconds/60;if(interval>1){return Math.floor(interval)+" minutes ago"}
    return Math.floor(seconds)+" seconds ago"};
    const flc = (x) => {
    if (x === "undefined") x = "others"
    try { return x.charAt(0).toUpperCase() + x.slice(1) } catch { return x }
    }
    let final_msg = "_Messages sent by each users_\n\n";
    for (let user of users){
    if (Object.keys(msgs).includes(user)){
    let count = msgs[user].total
    let name = msgs[user].name?.replace( /[\r\n]+/gm, "" )
    let lastMsg = timeSince(msgs[user].time)
    let types = msgs[user].type
    let types_msg = "\n"
    for (var type in types){
        types_msg+=`_${flc(type)}: *${types[type]}*_\n`
    } 
    final_msg+=`_Participant: *+${user.split("@")[0]}*_\n_Name: *${name}*_\n_Total msgs: *${count}*_\n_Last msg: *${lastMsg}*_${types_msg}\n\n`
}
}
return await m.sendReply(final_msg)
    }
}))
Module({
    pattern: 'demote ?(.*)',
    fromMe: false,
    use: 'group',
    desc: Lang.DEMOTE_DESC,
    usage: '.demote @mention or reply'
}, (async (message, match) => {
    if (!message.isGroup) return await message.sendReply(Lang.GROUP_COMMAND)
    let adminAccesValidated = ADMIN_ACCESS ? await isAdmin(message,message.sender) : false;
    if (message.fromOwner || adminAccesValidated) {
    const user = message.mention[0] || message.reply_message.jid
    if (!user) return await message.sendReply(Lang.NEED_USER)
    var admin = await isAdmin(message);
    if (!admin) return await message.sendReply(Lang.NOT_ADMIN)
    await message.client.sendMessage(message.jid, {
        text: mentionjid(user) + Lang.DEMOTED,
        mentions: [user]
    })
    await message.client.groupParticipantsUpdate(message.jid, [message.reply_message.jid], "demote")
}}))
Module({
    pattern: 'mute ?(.*)',
    use: 'group',
    fromMe: false,
    desc: Lang.MUTE_DESC,
    usage: '.mute (mutes group indefinitely)\n.mute 1h (mutes for 1 hour)\n.mute 5m (mutes for 5 minutes)'
}, (async (message, match) => {
    if (!message.isGroup) return await message.sendReply(Lang.GROUP_COMMAND)
    let adminAccesValidated = ADMIN_ACCESS ? await isAdmin(message,message.sender) : false;
    if (message.fromOwner || adminAccesValidated) {
    var admin = await isAdmin(message);
    if (!admin) return await message.sendReply(Lang.NOT_ADMIN)
    if (match[1]){
    const h2m = function(h){return (1000*60*60*h)}
    const m2m = function(m){return (1000*60*m)}
    let duration = match[1].endsWith("h") ? h2m(match[1].match(/\d+/)[0]) : m2m(match[1].match(/\d+/)[0])
    match = match[1].endsWith("h") ? match[1]+'ours' : match[1]+'mins'
    await message.client.groupSettingUpdate(message.jid, 'announcement')
    await message.send(`_Muted for ${match}_`)
    await require("timers/promises").setTimeout(duration);
    return await message.client.groupSettingUpdate(message.jid, 'not_announcement')
    await message.send(Lang.UNMUTED)    
}
    await message.client.groupSettingUpdate(message.jid, 'announcement')
    await message.send(Lang.MUTED)
}}))
Module({
    pattern: 'unmute',
    use: 'group',
    fromMe: false,
    desc: Lang.UNMUTE_DESC,
    usage: '.unmute (unmutes the group)'
}, (async (message, match) => {
    if (!message.isGroup) return await message.sendReply(Lang.GROUP_COMMAND)
    let adminAccesValidated = ADMIN_ACCESS ? await isAdmin(message,message.sender) : false;
    if (message.fromOwner || adminAccesValidated) {
    var admin = await isAdmin(message);
    if (!admin) return await message.sendReply(Lang.NOT_ADMIN)
    await message.client.groupSettingUpdate(message.jid, 'not_announcement')
    await message.send(Lang.UNMUTED)
}}))
Module({
    pattern: 'jid',
    use: 'group',
    fromMe: false,
    desc: Lang.JID_DESC,
    usage: '.jid (gets current chat jid)\n.jid (reply to get user jid)'
}, (async (message) => {
    if (message.isGroup){
    let adminAccesValidated = ADMIN_ACCESS && message.isGroup ? await isAdmin(message,message.sender) : false;
    if (message.fromOwner || adminAccesValidated) {
    var jid = message.reply_message.jid || message.jid
    await message.sendReply(jid)
    }
    } else {
        await message.sendReply(message.jid)
    }
}))
Module({
    pattern: 'invite',
    fromMe: false,
    use: 'group',
    desc: Lang.INVITE_DESC,
    usage: '.invite (generates group invite link)'
}, (async (message) => {
    if (!message.isGroup) return await message.sendReply(Lang.GROUP_COMMAND)
    let adminAccesValidated = ADMIN_ACCESS ? await isAdmin(message,message.sender) : false;
    if (message.fromOwner || adminAccesValidated) {
    var admin = await isAdmin(message);
    if (!admin) return await message.sendReply(Lang.NOT_ADMIN)
    var code = await message.client.groupInviteCode(message.jid)
    await message.client.sendMessage(message.jid, {
        text: "https://chat.whatsapp.com/" + code,detectLinks: true
    },{detectLinks: true})
}}))
Module({
    pattern: 'revoke',
    fromMe: false,
    use: 'group',
    desc: Lang.REVOKE_DESC,
    usage: '.revoke (revokes/resets group invite link)'
}, (async (message, match) => {
    if (!message.isGroup) return await message.sendReply(Lang.GROUP_COMMAND)
    let adminAccesValidated = ADMIN_ACCESS ? await isAdmin(message,message.sender) : false;
    if (message.fromOwner || adminAccesValidated) {
    var admin = await isAdmin(message);
    if (!admin) return await message.sendReply(Lang.NOT_ADMIN)
    await message.client.groupRevokeInvite(message.jid)
    await message.send(Lang.REVOKED)
}}))
Module({
    pattern: 'glock ?(.*)',
    fromMe: false,
    use: 'group',
    desc: "Change group settings to allow only admins to edit group's info!",
    usage: '.glock (locks group settings)'
}, (async (message, match) => {
    if (!message.isGroup) return await message.sendReply(Lang.GROUP_COMMAND)
    let adminAccesValidated = ADMIN_ACCESS ? await isAdmin(message,message.sender) : false;
    if (message.fromOwner || adminAccesValidated) {
    if (!(await isAdmin(message))) return await message.sendReply(Lang.NOT_ADMIN)
    return await message.client.groupSettingUpdate(message.jid,"locked")
}}))
Module({
    pattern: 'gunlock ?(.*)',
    fromMe: false,
    use: 'group',
    desc: "Change group settings to allow everyone to edit group's info!",
    usage: '.gunlock (unlocks group settings)'
}, (async (message, match) => {
    if (!message.isGroup) return await message.sendReply(Lang.GROUP_COMMAND)
    let adminAccesValidated = ADMIN_ACCESS ? await isAdmin(message,message.sender) : false;
    if (message.fromOwner || adminAccesValidated) {
    if (!(await isAdmin(message))) return await message.sendReply(Lang.NOT_ADMIN)
    return await message.client.groupSettingUpdate(message.jid,"unlocked")
}}))
Module({
    pattern: 'gname ?(.*)',
    fromMe: false,
    use: 'group',
    desc: "Change group subject",
    usage: '.gname New Group Name'
}, (async (message, match) => {
    if (!message.isGroup) return await message.sendReply(Lang.GROUP_COMMAND)
    let adminAccesValidated = ADMIN_ACCESS ? await isAdmin(message,message.sender) : false;
    if (message.fromOwner || adminAccesValidated) {
    let newName = match[1] || message.reply_message?.text
    if (!newName) return await message.sendReply("_Need text!_")
    var {restrict} = await message.client.groupMetadata(message.jid);
    if (restrict && !(await isAdmin(message))) return await message.sendReply(Lang.NOT_ADMIN)
    return await message.client.groupUpdateSubject(message.jid,(match[1] || message.reply_message?.text).slice(0,25))
}}))
Module({
    pattern: 'gdesc ?(.*)',
    fromMe: false,
    use: 'group',
    desc: "Change group description",
    usage: '.gdesc New group description here'
}, (async (message, match) => {
    if (!message.isGroup) return await message.sendReply(Lang.GROUP_COMMAND)
    let adminAccesValidated = ADMIN_ACCESS ? await isAdmin(message,message.sender) : false;
    if (message.fromOwner || adminAccesValidated) {
    let newName = match[1] || message.reply_message?.text
    if (!newName) return await message.sendReply("_Need text!_")
    var {restrict} = await message.client.groupMetadata(message.jid);
    if (restrict && !(await isAdmin(message))) return await message.sendReply(Lang.NOT_ADMIN)
    try { return await message.client.groupUpdateDescription(message.jid,(match[1] || message.reply_message?.text).slice(0,512)) } catch { return await message.sendReply("_Failed to change!_")}
}}))
Module({
    pattern: 'common ?(.*)',
    fromMe: false,
    use: 'group',
    desc: "Get common participants in two groups, and kick using .common kick jid",
    usage: '.common jid1,jid2\n.common kick group_jid'
}, (async (message, match) => {
    let adminAccesValidated = ADMIN_ACCESS ? await isAdmin(message,message.sender) : false;
    if (message.fromOwner || adminAccesValidated) {
    if (!match[1]) return await message.sendReply("*Need jids*\n*.common jid1,jid2*\n _OR_ \n*.common kick group_jid*")
if (match[1].includes("kick")) {
var co = match[1].split(" ")[1]
var g1 = (await message.client.groupMetadata(co))
var g2 = (await message.client.groupMetadata(message.jid)) 
var common = g1.participants.filter(({ id: id1 }) => g2.participants.some(({ id: id2 }) => id2 === id1));
var jids = [];
var msg = `Kicking common participants of:* ${g1.subject} & ${g2.subject} \n_count: ${common.length} \n`
common.map(e=>e.id).filter(e=>!e.includes(message.myjid)).map(async s => {
msg += "```@"+s.split("@")[0]+"```\n"
jids.push(s.split("@")[0]+"@s.whatsapp.net")
})    
await message.client.sendMessage(message.jid, {
        text: msg,
        mentions: jids
    })
for (let user of jids){
await new Promise((r) => setTimeout(r, 1000))
await message.client.groupParticipantsUpdate(message.jid, [user], "remove")
}
return;
}
var co = match[1].split(",")
var g1 = (await message.client.groupMetadata(co[0]))
var g2 = (await message.client.groupMetadata(co[1])) 
var common = g1.participants.filter(({ id: id1 }) => g2.participants.some(({ id: id2 }) => id2 === id1));
var msg = `*Common participants of:* ${g1.subject} & ${g2.subject}\n_count: ${common.length}_ \n`
var jids = [];
common.map(async s => {
msg += "```@"+s.id.split("@")[0]+"```\n"
jids.push(s.id.split("@")[0]+"@s.whatsapp.net")
})    
await message.client.sendMessage(message.jid, {
        text: msg,
        mentions: jids
    })
}}));
Module({
    pattern: 'diff ?(.*)',
    fromMe: false,
    use: 'utility',
    desc: "Get difference of participants in two groups",
    usage: '.diff jid1,jid2'
}, (async (message, match) => {
    let adminAccesValidated = ADMIN_ACCESS ? await isAdmin(message,message.sender) : false;
    if (message.fromOwner || adminAccesValidated) {
    if (!match[1]) return await message.sendReply("*Need jids*\n*.diff jid1,jid2*")
var co = match[1].split(",")
var g1 = (await message.client.groupMetadata(co[0])).participants
var g2 = (await message.client.groupMetadata(co[1])).participants 
var common = g1.filter(({ id: jid1 }) => !g2.some(({ id: jid2 }) => jid2 === jid1));
var msg = "*Difference of participants*\n_count: "+common.length+"_ \n"
common.map(async s => {
msg += "```"+s.id.split("@")[0]+"``` \n"
})    
return await message.sendReply(msg)
}}));

Module({
    pattern: 'tag(?:all|admin)?',
    fromMe: false,
    desc: Lang.TAGALL_DESC,
    use: 'group',
    usage: '.tag (reply to message)\n.tagall (tag everyone)\n.tagadmin (tag admins only)'
}, async (message, match) => {
  if (!message.isGroup) return await message.sendReply(Lang.GROUP_COMMAND);

  const adminAccessValidated = ADMIN_ACCESS ? await isAdmin(message, message.sender) : false;
  if (!(message.fromOwner || adminAccessValidated)) return;

  const { participants } = await message.client.groupMetadata(message.jid);
  const isTagAdmin = match[0]?.includes('admin');
  const isTagAll = match[0]?.includes('all');
  const isReply = !!message.reply_message;

  if (!isReply && !isTagAdmin && !isTagAll) {
    return await message.sendReply(`_Tag what?_\n\n${handler}tag \`admin\`\n${handler}tag \`all\`\n${handler}tag \`(reply)\``);
  }

  const targets = [];
  let msgText = '';

  for (let i = 0; i < participants.length; i++) {
    const p = participants[i];
    if (isTagAdmin && !p.admin) continue;
    targets.push(p.id.replace('c.us', 's.whatsapp.net'));
    msgText += `${targets.length}. @${p.id.split('@')[0]}\n`;
  }

  if (isReply) {
    await message.client.sendMessage(message.jid, {
      forward: message.quoted,
      mentions: targets
    });
  } else {
    await message.client.sendMessage(message.jid, {
      text: '```' + msgText + '```',
      mentions: targets
    });
  }
});


Module({
    pattern: 'block ?(.*)',
    fromMe: true,
    use: 'owner',
    desc: "Block a user",
    usage: '.block (reply to a message)\n.block @mention'
}, (async (message, match) => {
    var isGroup = message.jid.endsWith('@g.us')
    var user = message.jid
    if (isGroup) user = message.mention[0] || message.reply_message.jid
    await message.client.updateBlockStatus(user, "block");
}));
Module({
    pattern: 'join ?(.*)',
    fromMe: true,
    use: 'owner',
    desc: "Join a WhatsApp group using invite link",
    usage: '.join https://chat.whatsapp.com/abcdef123456'
}, (async (message, match) => {
    var rgx = /^(https?:\/\/)?chat\.whatsapp\.com\/(?:invite\/)?([a-zA-Z0-9_-]{22})$/
    if (!match[1] || !rgx.test(match[1])) return await message.sendReply("*Need group link*");
    await message.client.groupAcceptInvite(match[1].split("/")[3])
}));
Module({
    pattern: 'unblock ?(.*)',
    fromMe: true,
    use: 'owner',
    desc: "Unblock a user",
    usage: '.unblock (reply to a message)\n.unblock @mention'
}, (async (message) => {
    var isGroup = message.jid.endsWith('@g.us')
    if (!isGroup) return;
    var user = message.mention[0] || message.reply_message.jid
    await message.client.updateBlockStatus(user, "unblock");
}));

Module({
    pattern: 'getjids ?(.*)', 
    desc: 'Get all groups\' jids',
    use: 'utility',
    usage: '.getjids (first 50 groups)\n.getjids fast (JIDs only, no names)\n.getjids >50 (groups 51-100)\n.getjids >100 (groups 101-150)',
    fromMe: true
}, (async (message, match) => {
    var groups = Object.keys(await message.client.groupFetchAllParticipating());
    if (!groups.length) return await message.sendReply("No group chats!");
    
    const skipNames = match[1]?.toLowerCase() === 'fast';
    const pageSize = 50;
    let pageNum = 0;
    
    if (match[1] && match[1].startsWith('>')) {
        const startIndex = parseInt(match[1].substring(1));
        if (!isNaN(startIndex)) {
            pageNum = Math.floor(startIndex / pageSize);
        }
    }
    
    const startIdx = pageNum * pageSize;
    const endIdx = Math.min(startIdx + pageSize, groups.length);
    const currentGroups = groups.slice(startIdx, endIdx);
    
    if (skipNames) {
        let _msg = `*Group JIDs (Fast Mode)*\nShowing ${startIdx + 1}-${endIdx} of ${groups.length} groups\n\n`;
        currentGroups.forEach((jid, index) => {
            _msg += `*${startIdx + index + 1}.* \`${jid}\`\n\n`;
        });
        
        if (endIdx < groups.length) {
            _msg += `\n_Use '.getjids >${endIdx}' to see the next batch_`;
        }
        
        return await message.sendReply(_msg);
    }
    
    let sent_msg = await message.sendReply(`*Group JIDs*\nFetching details for groups ${startIdx + 1}-${endIdx} of ${groups.length}...`);
    let _msg = `*Group JIDs with Names*\nPage ${pageNum + 1}\n\n`;
    
    for (let i = 0; i < currentGroups.length; i++) {
        const jid = currentGroups[i];
        const count = startIdx + i + 1;
        
        try {
            var g_name = (await message.client.groupMetadata(jid)).subject;
            _msg += `*${count}.* _Group:_ ${g_name}\n_JID:_ \`${jid}\`\n\n`;
        } catch (error) {
            _msg += `*${count}.* _Group:_ Can't load name (rate-limit)\n_JID:_ \`${jid}\`\n\n`;
        }
        
        if ((i + 1) % 10 === 0 || i === currentGroups.length - 1) {
            let progress = `${Math.min(startIdx + i + 1, endIdx)}/${groups.length} total groups`;
            let currentMsg = _msg + `\n_${progress}_`;
            
            if (endIdx < groups.length) {
                currentMsg += `\n_Use '.getjids >${endIdx}' for next page_`;
            }
            
            await message.edit(currentMsg, message.jid, sent_msg.key);
            
            if (i < currentGroups.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        if (i < currentGroups.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }
}));

Module({
    pattern: 'pp ?(.*)',
    fromMe: true,
    use: 'owner',
    desc: "Change/Get profile picture (full screen supported) with replied message",
    usage: '.pp (reply to image to set profile pic)\n.pp (reply to user to get their profile pic)'
}, (async (message, match) => {
    if (message.reply_message && message.reply_message.image) {
    var image = await message.reply_message.download()
    await message.client.setProfilePicture(message.client.user.id.split(":")[0]+"@s.whatsapp.net",{url: image});
    return await message.sendReply("*Updated profile pic ✅*")
}
if (message.reply_message && !message.reply_message.image) {
   try { var image = await message.client.profilePictureUrl(message.reply_message.jid,'image') } catch {return await message.sendReply("Profile pic not found!")}
   return await message.sendReply({url:image},"image")
}
}));
Module({
    pattern: 'gpp ?(.*)',
    fromMe: false,
    use: 'owner',
    desc: "Change/Get group icon (full screen supported) with replied message",
    usage: '.gpp (reply to image to set group icon)'
}, (async (message, match) => {
    let adminAccesValidated = ADMIN_ACCESS ? await isAdmin(message,message.sender) : false;
    if (message.fromOwner || adminAccesValidated) {
    if (message.reply_message && message.reply_message.image) {
    var image = await message.reply_message.download()
    await message.client.setProfilePicture(message.jid,{url: image});
    return await message.sendReply("*Group icon updated ✅*")
}
if (!message.reply_message.image) {
   try { var image = await message.client.profilePictureUrl(message.jid,'image') } catch {return await message.sendReply("Profile pic not found!")}
   return await message.sendReply({url:image},"image")
}
}}));