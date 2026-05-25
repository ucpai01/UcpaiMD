import fs from 'fs'
import path from 'path'
import te from '../../src/lib/ucpai-error.js'
const pluginConfig = {
    name: 'ganti-ucpai3.jpg',
    alias: ['gantiucpai3', 'setucpai3'],
    category: 'owner',
    description: 'Ganti gambar ucpai3.jpg',
    usage: '.ganti-ucpai3.jpg (reply/kirim gambar)',
    example: '.ganti-ucpai3.jpg',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const isImage = m.isImage || (m.quoted && m.quoted.type === 'imageMessage')
    
    if (!isImage) {
        return m.reply(`🖼️ *ɢᴀɴᴛɪ ᴜᴄᴘᴀɪ3.ᴊᴘɢ*\n\n> Kirim/reply gambar untuk mengganti\n> File: assets/images/ucpai3.jpg`)
    }
    
    try {
        let buffer
        if (m.quoted && m.quoted.isMedia) {
            buffer = await m.quoted.download()
        } else if (m.isMedia) {
            buffer = await m.download()
        }
        
        if (!buffer) {
            return m.reply(`❌ Gagal mendownload gambar`)
        }
        
        const targetPath = path.join(process.cwd(), 'assets', 'images', 'ucpai3.jpg')
        
        const dir = path.dirname(targetPath)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
        
        fs.writeFileSync(targetPath, buffer)
        
        m.reply(`✅ *ʙᴇʀʜᴀsɪʟ*\n\n> Gambar ucpai3.jpg telah diganti`)
        
    } catch (error) {
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }