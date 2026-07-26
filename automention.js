let handler = async (m, { conn }) => {
    if (m.mentionedJid && m.mentionedJid.length > 0) {
        
        let channel = 'https://whatsapp.com/channel/0029VaWUivQJENxtAGSOJv2N'
        let img = 'https://url.aswinsparky.qzz.io/kj1uWL.jpg'
        let audioUrl = 'https://raw.githubusercontent.com/AJEESH-SER/MEDIA/main/sound.mp3'

        let caption = `*Hey! You mentioned me!* 🍓\n\n📌 *Channel:* ${channel}\n📸 *Instagram:* https://instagram.com/your_profile`

        try {
            await conn.sendMessage(m.chat, { 
                image: { url: img }, 
                caption: caption 
            }, { quoted: m })

            await conn.sendMessage(m.chat, { 
                audio: { url: audioUrl }, 
                mimetype: 'audio/mp4', 
                ptt: true 
            }, { quoted: m })

        } catch (e) {
            console.log("Mention Error:", e)
        }
    }
}

handler.all = async function (m) {
    if (!m.isGroup) return
    if (m.mentionedJid && m.mentionedJid.includes(this.user.jid)) {
        handler(m, { conn: this })
    }
}

export default handler
