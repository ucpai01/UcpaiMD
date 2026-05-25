import axios from 'axios'
import config from '../../config.js'
import { f } from '../../src/lib/ucpai-http.js'
import te from '../../src/lib/ucpai-error.js'
const pluginConfig = {
    name: 'ttp',
    alias: ['texttoimg'],
    category: 'sticker',
    description: 'Membuat sticker text static',
    usage: '.ttp <teks>',
    example: '.ttp Hello World',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    let text = m.text?.trim()
    
    if (!text && m.quoted?.text) {
        text = m.quoted.text.trim()
    }
    
    if (!text) {
        return m.reply(
            `🎨 *ᴛᴇxᴛ sᴛɪᴄᴋᴇʀ*\n\n` +
            `> Masukkan teks untuk sticker\n\n` +
            `> Contoh: \`${m.prefix}ttp Hello World\``
        )
    }
    
    if (text.length > 100) {
        return m.reply(`❌ Teks terlalu panjang! Maksimal 100 karakter.`)
    }
    
    const apikey = config.APIkey?.lolhuman
    if (!apikey) {
        return m.reply(`❌ API key lolhuman tidak dikonfigurasi!`)
    }
    
    m.react('🕕')
    
    try {
        const apiUrl = `https://api.lolhuman.xyz/api/ttp?apikey=${apikey}&text=${encodeURIComponent(text)}`
        await sock.sendImageAsSticker(m.chat, apiUrl, m, {
            packname: config.sticker?.packname || 'Ucpai-AI',
            author: config.sticker?.author || 'Bot'
        })
        m.react('✅')
    } catch (err) {
        m.react('☢')
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }