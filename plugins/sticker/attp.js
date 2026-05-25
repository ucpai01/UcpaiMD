import axios from 'axios'
import config from '../../config.js'
import { f } from '../../src/lib/ucpai-http.js'
import te from '../../src/lib/ucpai-error.js'
const NEOXR_APIKEY = config.APIkey?.neoxr || 'Milik-Bot-UcpaiMD'

const pluginConfig = {
    name: 'attp',
    alias: ['attp2', 'attp3'],
    category: 'sticker',
    description: 'Membuat sticker animated text',
    usage: '.attp <teks>',
    example: '.attp Hello World',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function getRandomColor() {
    const colors = ['FF5733', 'C70039', '900C3F', '581845', '2E86AB', 'A23B72', 'F18F01', 'C73E1D', '3A0CA3', '7209B7', '4361EE', '4CC9F0']
    return colors[Math.floor(Math.random() * colors.length)]
}

async function handler(m, { sock }) {
    let text = m.text?.trim()
    
    if (!text && m.quoted?.text) {
        text = m.quoted.text.trim()
    }
    
    if (!text) {
        return m.reply(
            `🎨 *ᴀɴɪᴍᴀᴛᴇᴅ ᴛᴇxᴛ sᴛɪᴄᴋᴇʀ*\n\n` +
            `> Masukkan teks untuk sticker\n\n` +
            `> Contoh: \`${m.prefix}attp Hello World\``
        )
    }
    
    if (text.length > 100) {
        return m.reply(`❌ Teks terlalu panjang! Maksimal 100 karakter.`)
    }
    
    m.react('🕕')
    
    try {
        const color = getRandomColor()
        const url = `https://api.neoxr.eu/api/attp3?text=${encodeURIComponent(text)}&color=${color}&apikey=${NEOXR_APIKEY}`
        
        const data = await f(url)
        
        if (!data?.status || !data?.data?.url) {
            throw new Error('API tidak mengembalikan data yang valid')
        }
        
        const stickerUrl = data.data.url
        
        const stickerRes = await f(stickerUrl, 'buffer')
        if (!stickerRes) throw new Error('Gagal mengunduh sticker dari server')
            
        const { addExifToWebp } = await import('../../src/lib/ucpai-exif.js')
        let finalSticker = stickerRes
        try {
            finalSticker = await addExifToWebp(stickerRes, {
                packname: config.sticker.packname,
                author: config.sticker.author
            })
        } catch (e) {
            console.log('Exif error:', e)
        }

        await sock.sendMessage(m.chat, { sticker: finalSticker }, { quoted: m })
        m.react('✅')
    } catch (err) {
        m.react('☢')
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }