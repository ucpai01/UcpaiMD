import { getDatabase } from '../../src/lib/ucpai-database.js'
import fs from 'fs'
import path from 'path'
const pluginConfig = {
    name: 'addlist',
    alias: ['tambahlist', 'newlist'],
    category: 'store',
    description: 'Tambah list/command store baru (support gambar)',
    usage: '.addlist <nama> (reply pesan/gambar)',
    example: '.addlist freefire',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

const STORE_IMAGES_DIR = './assets/store'

async function handler(m, { sock }) {
    const db = getDatabase()
    const listName = m.args[0]?.toLowerCase().trim()
    
    if (!listName) {
        return m.reply(
            `📦 *ᴀᴅᴅ ʟɪsᴛ sᴛᴏʀᴇ*\n\n` +
            `> Reply pesan teks atau gambar+caption\n` +
            `> Lalu ketik: \`${m.prefix}addlist <nama>\`\n\n` +
            `\`Contoh: ${m.prefix}addlist freefire\`\n\n` +
            `> 📷 Support gambar! Reply gambar dengan caption untuk pricelist`
        )
    }
    
    if (!/^[a-z0-9]+$/.test(listName)) {
        return m.reply(`❌ Nama list hanya boleh huruf dan angka tanpa spasi!`)
    }
    
    if (listName.length < 2 || listName.length > 20) {
        return m.reply(`❌ Nama list minimal 2 karakter, maksimal 20 karakter!`)
    }
    
    const quoted = m.quoted
    if (!quoted) {
        return m.reply(`❌ Reply pesan yang berisi deskripsi/pricelist!\n\n> Bisa reply teks atau gambar+caption`)
    }
    
    let content = quoted.text || quoted.body || quoted.caption || ''
    let imageBuffer = null
    let imagePath = null
    
    const isQuotedImage = quoted.isImage || (quoted.message?.imageMessage)
    
    if (isQuotedImage && quoted.download) {
        try {
            imageBuffer = await quoted.download()
            
            if (!fs.existsSync(STORE_IMAGES_DIR)) {
                fs.mkdirSync(STORE_IMAGES_DIR, { recursive: true })
            }
            
            imagePath = path.join(STORE_IMAGES_DIR, `${listName}.jpg`)
            fs.writeFileSync(imagePath, imageBuffer)
            
            if (quoted.message?.imageMessage?.caption) {
                content = quoted.message.imageMessage.caption
            }
        } catch (e) {
            console.error('[AddList] Error downloading image:', e.message)
        }
    }
    
    if (!content || content.length < 5) {
        if (!imageBuffer) {
            return m.reply(`❌ Konten list terlalu pendek atau tidak ada!\n\n> Minimal 5 karakter untuk teks\n> Atau reply gambar dengan caption`)
        }
        content = `Lihat gambar untuk detail pricelist ${listName.toUpperCase()}`
    }
    
    const storeData = db.setting('storeList') || {}
    
    if (storeData[listName]) {
        if (storeData[listName].imagePath && fs.existsSync(storeData[listName].imagePath)) {
            fs.unlinkSync(storeData[listName].imagePath)
        }
    }
    
    storeData[listName] = {
        content: content,
        imagePath: imagePath,
        hasImage: !!imageBuffer,
        createdBy: m.sender,
        createdByName: m.pushName || 'Owner',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views: storeData[listName]?.views || 0
    }
    
    db.setting('storeList', storeData)
    
    m.react('✅')
    
    let replyText = `✅ *ʟɪsᴛ ᴅɪᴛᴀᴍʙᴀʜᴋᴀɴ*\n\n` +
        `╭┈┈⬡「 📋 *ᴅᴇᴛᴀɪʟ* 」\n` +
        `┃ 🏷️ ɴᴀᴍᴀ: \`${listName}\`\n` +
        `┃ 📝 ᴄᴏᴍᴍᴀɴᴅ: \`${m.prefix}${listName}\`\n` +
        `┃ 📷 ɢᴀᴍʙᴀʀ: \`${imageBuffer ? 'Ya ✅' : 'Tidak'}\`\n` +
        `╰┈┈⬡\n\n` +
        `> User bisa akses dengan \`${m.prefix}${listName}\``
    
    if (imageBuffer) {
        await sock.sendMessage(m.chat, {
            image: imageBuffer,
            caption: replyText
        }, { quoted: m })
    } else {
        await m.reply(replyText)
    }
}

export { pluginConfig as config, handler }