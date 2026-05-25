import axios from 'axios'
import config from '../../config.js'
import te from '../../src/lib/ucpai-error.js'
const pluginConfig = {
    name: 'brat',
    alias: ['brattext'],
    category: 'sticker',
    description: 'Membuat sticker brat',
    usage: '.brat <text>',
    example: '.brat Hai semua',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const text = m.text
    if (!text) {
        return m.reply(`🖼️ *ʙʀᴀᴛ sᴛɪᴄᴋᴇʀ*\n\n> Masukkan teks\n\n\`Contoh: ${m.prefix}brat Hai semua\``)
    }
    
    m.react('🕕')
    
    try {
        const url = `https://api.yupra.my.id/api/image/brat?text=${encodeURIComponent(text)}`
        await sock.sendImageAsSticker(m.chat, url, m, {
            packname: config.sticker.packname,
            author: config.sticker.author
        })
        
        m.react('✅')
        
    } catch (error) {
        m.react('☢')
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }