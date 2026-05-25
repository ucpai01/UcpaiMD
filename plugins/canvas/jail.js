import axios from 'axios'
import config from '../../config.js'
import te from '../../src/lib/ucpai-error.js'
const pluginConfig = {
    name: 'jail',
    alias: ['penjara', 'prison'],
    category: 'canvas',
    description: 'Membuat efek penjara pada gambar',
    usage: '.jail (reply gambar)',
    example: '.jail',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function uploadToTmpfiles(buffer) {
    const { default: FormData } = await import('form-data')
    const formData = new FormData()
    formData.append('file', buffer, { filename: 'image.jpg' })
    
    const res = await axios.post('https://tmpfiles.org/api/v1/upload', formData, {
        headers: formData.getHeaders(),
        timeout: 60000
    })
    
    if (res.data?.data?.url) {
        return res.data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/')
    }
    throw new Error('Upload gagal')
}

async function handler(m, { sock }) {
    const isImage = m.isImage || (m.quoted && m.quoted.type === 'imageMessage')
    
    if (!isImage) {
        return m.reply(
            `🔒 *ᴊᴀɪʟ ᴇꜰꜰᴇᴄᴛ*\n\n` +
            `╭┈┈⬡「 📋 *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ* 」\n` +
            `┃ ◦ Reply gambar dengan \`${m.prefix}jail\`\n` +
            `┃ ◦ Kirim gambar dengan caption \`${m.prefix}jail\`\n` +
            `╰┈┈⬡`
        )
    }
    
    m.react('🕕')
    
    try {
        let buffer
        if (m.quoted && m.quoted.isMedia) {
            buffer = await m.quoted.download()
        } else if (m.isMedia) {
            buffer = await m.download()
        }
        
        if (!buffer || buffer.length === 0) {
            throw new Error('Gagal download gambar')
        }
        
        const imageUrl = await uploadToTmpfiles(buffer)
        const apiKey = config.APIkey?.lolhuman
        
        if (!apiKey) {
            throw new Error('API Key tidak ditemukan di config')
        }
        
        await sock.sendMedia(m.chat, `https://api.lolhuman.xyz/api/creator1/jail?apikey=${apiKey}&img=${encodeURIComponent(imageUrl)}`, null, m, {
            type: 'image',
        })
        
        m.react('✅')
        
    } catch (error) {
        m.react('☢')
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }