const fs = require('fs')
module.exports = async (jdgn, Client, client) =>{
try {
			const dataGc = JSON.parse(fs.readFileSync('./lib/json/dataGc.json'))
			from = jdgn.jid
			if (!dataGc[from] || !dataGc[from].welcome && !dataGc[from].leave) return
			const mdata = await client.groupMetadata(from)
			jdgn.participants.forEach(async num =>{
			if (num == client.user.jid) return
			if (jdgn.action == 'add') {
				stst = await client.getStatus(`${num.split('@')[0]}@c.us`)
				stst = stst.status == 401 ? '' : stst.status
				ppimg = await client.getProfilePicture(`${num.split('@')[0]}@c.us`).catch(() => ppimg = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png')
				teks = `*[ NEW MEMBER IN GROUP ${mdata.subject} ]*\n\n*――――――――――――――*\n⤔ *Name*: @${num.split('@')[0]}\n⤔ *Bio*: ${stst}\n*――――――――――――――*\n\nWelcome 🎊🎊🎉!`
				let pushname = client.contacts[num].vname || client.contacts[num].notify || num.split('@')[0] 
				Client.sendFileFromUrl(jdgn.jid, ppimg, 'user.jpg', teks, null, {contextInfo: {"mentionedJid": Client.getMentionedJidList(teks), "stanzaId":"xxxx","participant":"0@s.whatsapp.net","quotedMessage":{"groupInviteMessage":{"groupJid":from,"inviteCode":"OKOKLAH","inviteExpiration":"0","groupName":from,"caption":`Participant Added/Join ${pushname}`}},"remoteJid":num}})
			} else if (jdgn.action == 'remove') {
				stst = await client.getStatus(`${num.split('@')[0]}@c.us`)
				stst = stst.status == 401 ? '' : stst.status
				var ppimg;
				ppimg = await client.getProfilePicture(`${num.split('@')[0]}@c.us`).catch(() => ppimg = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png')
				teks = `*[ MEMBER LEAVE/REMOVED IN GROUP ${mdata.subject} ]*\n\n*――――――――――――――*\n⤔ *Name*: @${num.split('@')[0]}\n⤔ *Bio*: ${stst}\n*――――――――――――――*\n\nbye :(`
				let pushname = client.contacts[num].vname || client.contacts[num].notify || num.split('@')[0] 
				Client.sendFileFromUrl(jdgn.jid, ppimg, 'user.jpg', teks, null, {contextInfo: {"mentionedJid": Client.getMentionedJidList(teks), "stanzaId":"xxxx","participant":"0@s.whatsapp.net","quotedMessage":{"groupInviteMessage":{"groupJid":from,"inviteCode":"OKOKLAH","inviteExpiration":"0","groupName":from,"caption":`Participant Removed/Leave ${pushname}`}},"remoteJid":num}})
			}
			})
		} catch (e) {
			console.log(e)
		}
	}
