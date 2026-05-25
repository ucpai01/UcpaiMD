import fs from 'fs'
import path from 'path'
import te from '../../src/lib/ucpai-error.js'
const pluginConfig = {
    name: 'ganti-ucpai-levelup.jpg',
    alias: ['gantiucpailevelup', 'setucpailevelup'],
    category: 'owner',
    description: 'Ganti gambar ucpai-levelup.jpg',
    usage: '.ganti-ucpai-levelup.jpg (reply/kirim gambar)',
    example: '.ganti-ucpai-levelup.jpg',
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
    if (!isImage) return m.reply(`🖼️ *ɢᴀɴᴛɪ UCPAI-LEVELUP.JPG*\n\n> Kirim/reply gambar untuk mengganti\n> File: assets/images/ucpai-levelup.jpg`)
    try {
        let buffer = m.quoted && m.quoted.isMedia ? await m.quoted.download() : await m.download()
        if (!buffer) return m.reply('❌ Gagal mendownload gambar')
        const targetPath = path.join(process.cwd(), 'assets', 'images', 'ucpai-levelup.jpg')
        fs.writeFileSync(targetPath, buffer)
        m.reply(`✅ *ʙᴇʀʜᴀsɪʟ*\n\n> Gambar ucpai-levelup.jpg telah diganti`)
    } catch (error) {
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }