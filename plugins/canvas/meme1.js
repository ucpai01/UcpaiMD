import axios from 'axios'
import config from '../../config.js'
import te from '../../src/lib/ucpai-error.js'
const pluginConfig = {
    name: 'meme1',
    alias: ['drakememe'],
    category: 'canvas',
    description: 'Membuat meme drake format',
    usage: '.meme1 <text1>|<text2>',
    example: '.meme1 Tidur|Main HP',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const input = m.text?.trim() || ''
    const parts = input.split('|').map(s => s.trim())
    
    if (parts.length < 2 || !parts[0] || !parts[1]) {
        return m.reply(
            `🎭 *ᴍᴇᴍᴇ ᴅʀᴀᴋᴇ*\n\n` +
            `> Masukkan 2 teks dengan pemisah |\n\n` +
            `> Contoh: \`${m.prefix}meme1 Tidur|Main HP\``
        )
    }
    
    const text1 = parts[0]
    const text2 = parts[1]
    
    const apikey = config.APIkey?.lolhuman
    if (!apikey) {
        return m.reply(`❌ API key lolhuman tidak dikonfigurasi!`)
    }
    
    m.react('🕕')
    
    try {
        await sock.sendMedia(m.chat, `https://api.lolhuman.xyz/api/meme8?apikey=${apikey}&text1=${encodeURIComponent(text1)}&text2=${encodeURIComponent(text2)}`, null, m, {
            type: 'image',
        })
        
        m.react('✅')
        
    } catch (err) {
        m.react('☢')
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }