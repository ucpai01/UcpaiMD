import te from '../../src/lib/ucpai-error.js'
import config from '../../config.js'
const pluginConfig = {
    name: 'hdvid',
    alias: ['hdvideo', 'enhancevid', 'hdv'],
    category: 'tools',
    description: 'Meningkatkan kualitas video menjadi HD dengan AI',
    usage: '.hdvid (reply video)',
    example: '.hdvid',
    isOwner: false,
    isPremium: true,
    isGroup: false,
    isPrivate: false,
    cooldown: 120,
    energi: 3,
    isEnabled: true
}

async function handler(m, { sock }) {
   const isVideo = m.isVideo || (m.quoted && m.quoted.type === 'videoMessage')
    
    if (!isVideo) {
        return m.reply(
            `📹 *ʜᴅ ᴠɪᴅᴇᴏ ᴇɴʜᴀɴᴄᴇʀ*\n\n` +
            `╭┈┈⬡「 📋 *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ* 」\n` +
            `┃ ◦ Reply video dengan \`${m.prefix}hdvid\`\n` +
            `┃ ◦ Kirim video dengan caption \`${m.prefix}hdvid\`\n` +
            `╰┈┈⬡\n\n` +
            `> ⚠️ Proses membutuhkan waktu 30-60 detik\n` +
            `> 💎 Fitur premium`
        )
    }
    
    m.react('🕕')

    try {
        const videoBuffer = await m?.quoted?.download() || await m.download()
        
        if (!videoBuffer || videoBuffer.length === 0) {
            m.react('❌')
            return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> Gagal mengunduh video!`)
        }
        
        if (videoBuffer.length > 50 * 1024 * 1024) {
            m.react('❌')
            return m.reply(`❌ *ᴇʀʀᴏʀ*\n\n> Video terlalu besar! Maksimal 50MB.`)
        }

        const form = new FormData()
        form.append('file', new File([videoBuffer], 'video.mp4', { type: 'video/mp4' }))
        
        const res = await fetch('https://fgsi.dpdns.org/api/tools/wink', {
            method: 'POST',
            headers: { apikey: config.APIkey?.fgsi },
            body: form
        })

        let poll = (await res.json()).data.pollUrl

        while (true) {
            const r = await fetch(poll)
            const j = await r.json()
            if (j.data.status === 'Success') {
                await sock.sendMedia(m.chat, j.data.result.videoURL, null, m, {
                    type: 'video'
                })
                break
            }
            await new Promise(a => setTimeout(a, 2000))
        }
        
        m.react('✅')
        
    } catch (err) {
        console.log(err)
        m.react('☢')
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }