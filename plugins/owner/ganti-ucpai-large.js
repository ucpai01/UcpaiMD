import fs from 'fs'
import path from 'path'
import te from '../../src/lib/ucpai-error.js'
const pluginConfig = {
    name: 'ucpai-large',
    alias: ['setucpailarge', 'gantiucpailarge'],
    category: 'owner',
    description: 'Preset: Ganti gambar ucpai.jpg, serta ucpai-v7 hingga ucpai-v11.jpg sekaligus',
    usage: '.ucpai-large (reply/kirim gambar)',
    example: '.ucpai-large',
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
        return m.reply(`🖼️ *ᴜᴄᴘᴀɪ ʟᴀʀɢᴇ ᴘʀᴇsᴇᴛ*\n\n> Kirim/reply gambar untuk mengganti kumpulan foto besar (ucpai.jpg, ucpai-v7.jpg s/d ucpai-v11.jpg) sekaligus.\n> Pastikan rasio gambar sesuai dengan yang diinginkan.`)
    }
    
    await m.react('🕕')
    
    try {
        let buffer
        if (m.quoted && m.quoted.isMedia) {
            buffer = await m.quoted.download()
        } else if (m.isMedia) {
            buffer = await m.download()
        }
        
        if (!buffer) {
            await m.react('❌')
            return m.reply(`❌ Gagal mendownload gambar`)
        }
        
        const targetImages = [
            'ucpai.jpg',
            'ucpai-v7.jpg',
            'ucpai-v8.jpg',
            'ucpai-v9.jpg',
            'ucpai-v10.jpg',
            'ucpai-v11.jpg'
        ]
        
        const assetsDir = path.join(process.cwd(), 'assets', 'images')
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true })
        }
        
        for (const imgName of targetImages) {
            const targetPath = path.join(assetsDir, imgName)
            fs.writeFileSync(targetPath, buffer)
        }
        
        await m.react('✅')
        m.reply(`✅ *ʙᴇʀʜᴀsɪʟ*\n\n> Gambar bundle *ucpai-large* berhasil diganti secara massal.\n> Mencakup: ${targetImages.join(', ')}\n> Restart bot jika gambar tidak langsung berubah.`)
        
    } catch (error) {
        await m.react('☢')
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }