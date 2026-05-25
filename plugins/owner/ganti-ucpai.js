import fs from 'fs'
import path from 'path'
import te from '../../src/lib/ucpai-error.js'
const pluginConfig = {
    name: 'ganti-ucpai.jpg',
    alias: ['gantiucpai', 'setucpai'],
    category: 'owner',
    description: 'Ganti gambar ucpai.jpg (thumbnail menu)',
    usage: '.ganti-ucpai.jpg (reply/kirim gambar)',
    example: '.ganti-ucpai.jpg',
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
        return m.reply(`🖼️ *ɢᴀɴᴛɪ ᴜᴄᴘᴀɪ.ᴊᴘɢ*\n\n> Kirim/reply gambar untuk mengganti\n> File: assets/images/ucpai.jpg`)
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
        
        const targetPath = path.join(process.cwd(), 'assets', 'images', 'ucpai.jpg')
        
        const dir = path.dirname(targetPath)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
        
        fs.writeFileSync(targetPath, buffer)
        
        m.reply(`✅ *ʙᴇʀʜᴀsɪʟ*\n\n> Gambar ucpai.jpg telah diganti\n> Restart bot untuk melihat perubahan`)
        
    } catch (error) {
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }