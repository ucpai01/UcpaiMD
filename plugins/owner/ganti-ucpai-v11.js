import fs from 'fs'
import path from 'path'
import te from '../../src/lib/ucpai-error.js'
const pluginConfig = {
    name: 'ganti-ucpai-v11.jpg',
    alias: ['gantiucpaiv11', 'setucpaiv11'],
    category: 'owner',
    description: 'Ganti gambar ucpai-v11.jpg',
    usage: '.ganti-ucpai-v11.jpg (reply/kirim gambar)',
    example: '.ganti-ucpai-v11.jpg',
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
    if (!isImage) return m.reply(`🖼️ *ɢᴀɴᴛɪ UCPAI-V11.JPG*\n\n> Kirim/reply gambar untuk mengganti\n> File: assets/images/ucpai-v11.jpg`)
    try {
        let buffer = m.quoted && m.quoted.isMedia ? await m.quoted.download() : await m.download()
        if (!buffer) return m.reply('❌ Gagal mendownload gambar')
        const targetPath = path.join(process.cwd(), 'assets', 'images', 'ucpai-v11.jpg')
        fs.writeFileSync(targetPath, buffer)
        m.reply(`✅ *ʙᴇʀʜᴀsɪʟ*\n\n> Gambar ucpai-v11.jpg telah diganti`)
    } catch (error) {
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }