import config from '../../config.js'
import { f } from './../../src/lib/ucpai-http.js'
import te from '../../src/lib/ucpai-error.js'
const pluginConfig = {
    name: 'mediafiredl',
    alias: ['mfdl', 'mediafire', 'mf'],
    category: 'download',
    description: 'Download file dari MediaFire',
    usage: '.mfdl <url>',
    example: '.mfdl https://www.mediafire.com/file/xxx',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 15,
    energi: 1,
    isEnabled: true
}


async function handler(m, { sock }) {
    const url = m.text?.trim()
    
    if (!url) {
        return m.reply(
            `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
            `> \`${m.prefix}mfdl <url>\`\n\n` +
            `> Contoh:\n` +
            `> \`${m.prefix}mfdl https://www.mediafire.com/file/xxx\``
        )
    }
    
    if (!url.match(/mediafire\.com/i)) {
        return m.reply(`❌ *URL tidak valid. Gunakan link MediaFire.*`)
    }
    await m.react('🕕')
    
    try {
        const { data } = await f(`https://api.neoxr.eu/api/mediafire?url=${encodeURIComponent(url)}&apikey=${config.APIkey.neoxr}`)
        await sock.sendMedia(m.chat, data.url, null, m, {
            type: 'document',
            fileName: data.title,
            mimetype: data.mime,
            fileSize: data.size,
            contextInfo: {
                forwardingScore: 99,
                isForwarded: true
            }
        })
        
    } catch (err) {
        return m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }