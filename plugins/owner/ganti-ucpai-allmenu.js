import fs from 'fs'
import path from 'path'
import te from '../../src/lib/ucpai-error.js'
const pluginConfig = {
    name: 'ganti-ucpai-allmenu.jpg',
    alias: ['gantiallemenu', 'setucpaiallmenu'],
    category: 'owner',
    description: 'Ganti gambar ucpai-allmenu.jpg (thumbnail allmenu)',
    usage: '.ganti-ucpai-allmenu.jpg (reply/kirim gambar)',
    example: '.ganti-ucpai-allmenu.jpg',
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
        return m.reply(`🖼️ *ɢᴀɴᴛɪ ᴜᴄᴘᴀɪ-ᴀʟʟᴍᴇɴᴜ.ᴊᴘɢ*\n\n> Kirim/reply gambar untuk mengganti\n> File: assets/images/ucpai-allmenu.jpg`)
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
        
        const targetPath = path.join(process.cwd(), 'assets', 'images', 'ucpai-allmenu.jpg')
        
        const dir = path.dirname(targetPath)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
        
        fs.writeFileSync(targetPath, buffer)
        
        m.reply(`✅ *ʙᴇʀʜᴀsɪʟ*\n\n> Gambar ucpai-allmenu.jpg telah diganti`)
        
    } catch (error) {
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }