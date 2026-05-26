import * as jasaotp from '../../src/lib/ucpai-otp-service.js'
import config from '../../config.js'
import fs from 'fs'
import path from 'path'
const pluginConfig = {
    name: 'otp',
    alias: ['otpmenu', 'jasaotp'],
    category: 'otp',
    description: 'Layanan OTP otomatis — Terima kode verifikasi dari berbagai layanan',
    usage: '.otp',
    example: '.otp',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const { getDatabase } = await import('../../src/lib/ucpai-database.js')
    const db = getDatabase()
    const groupData = db.getGroup(m.chat) || {}

    if (groupData.botMode !== 'otp') {
        return m.reply(
            `⚠️ *ᴍᴏᴅᴇ ᴏᴛᴘ ᴛɪᴅᴀᴋ ᴀᴋᴛɪꜰ*\n\n` +
            `> Mode OTP belum diaktifkan di grup ini.\n\n` +
            `*ᴄᴀʀᴀ ᴀᴋᴛɪꜰᴋᴀɴ:*\n` +
            `> Admin ketik: \`${m.prefix}botmode otp\`\n\n` +
            `> Setelah aktif, kamu bisa menggunakan layanan OTP otomatis di grup ini.`
        )
    }

    if (!jasaotp.isEnabled()) {
        return m.reply(
            `⚠️ *ʟᴀʏᴀɴᴀɴ ᴏᴛᴘ ʙᴇʟᴜᴍ ᴅɪsᴇᴛᴜᴘ*\n\n` +
            `> API key JasaOTP belum dikonfigurasi.\n\n` +
            `*ᴜɴᴛᴜᴋ ᴀᴅᴍɪɴ:*\n` +
            `> 1. Buka \`config.js\`\n` +
            `> 2. Isi \`jasaotp.apiKey\` dengan API key dari jasaotp.id\n` +
            `> 3. Restart bot`
        )
    }

    m.react('📱')

    try {
        const countries = await jasaotp.getCountries()

        if (!countries || countries.length === 0) {
            return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> Tidak ada negara yang tersedia saat ini.\n> Silakan coba lagi nanti.`)
        }

        const popularIds = [6, 0, 1, 4, 22, 16, 73]
        const popular = countries.filter(c => popularIds.includes(c.id_negara))
        const others = countries.filter(c => !popularIds.includes(c.id_negara))

        const markup = jasaotp.getMarkup()

        let txt = `📱 *ʟᴀʏᴀɴᴀɴ ᴏᴛᴘ ᴏᴛᴏᴍᴀᴛɪs*\n\n`
        txt += `Halo *${m.pushName}*! 👋\n\n`
        txt += `Selamat datang di layanan OTP otomatis. Layanan ini memungkinkan kamu menerima kode verifikasi (OTP) dari berbagai platform seperti WhatsApp, Telegram, Facebook, dan lainnya.\n\n`
        txt += `╭┈┈⬡「 ✦ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ* 」\n`
        txt += `┃ 1️⃣ Pilih negara tujuan\n`
        txt += `┃ 2️⃣ Pilih layanan (WhatsApp, Telegram, dll)\n`
        txt += `┃ 3️⃣ Pilih operator\n`
        txt += `┃ 4️⃣ Bayar via QRIS/VA\n`
        txt += `┃ 5️⃣ Terima nomor HP\n`
        txt += `┃ 6️⃣ Kode OTP otomatis dikirim private chat!\n`
        txt += `╰┈┈⬡\n\n`
        txt += `> ✅ Proses 100% otomatis\n`
        txt += `> 💰 Bayar aman via (QRIS)\n`
        txt += `> ⏱️ Timeout: ${Math.ceil(jasaotp.getTimeout() / 60)} menit\n\n`
        txt += `> Pilih negara di bawah untuk mulai 👇`

        const popularRows = popular.map(c => ({
            header: '⭐ Populer',
            title: capitalizeCountry(c.nama_negara),
            description: `🌍 Klik untuk lihat layanan di ${capitalizeCountry(c.nama_negara)}`,
            id: `${m.prefix}otplayanan ${c.id_negara}`
        }))

        const otherRows = others.slice(0, 40).map(c => ({
            title: capitalizeCountry(c.nama_negara),
            description: `🌍 Klik untuk lihat layanan`,
            id: `${m.prefix}otplayanan ${c.id_negara}`
        }))

        const sections = []
        if (popularRows.length > 0) {
            sections.push({
                title: '⭐ Negara Populer',
                rows: popularRows
            })
        }
        if (otherRows.length > 0) {
            sections.push({
                title: '🌍 Negara Lainnya',
                rows: otherRows
            })
        }

        const otpImage = path.join(process.cwd(), 'assets', 'images', 'ucpai-otp.jpg')
        let imageBuffer = null
        if (fs.existsSync(otpImage)) {
            imageBuffer = fs.readFileSync(otpImage)
        }

        await sock.sendMessage(m.chat, {
            ...(imageBuffer ? { image: imageBuffer, caption: txt } : { text: txt }),
            footer: `© ${config.bot?.name || 'Ucpai-AI'} | OTP Service`,
            interactiveButtons: [
                {
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: '🌍 ᴘɪʟɪʜ ɴᴇɢᴀʀᴀ',
                        sections
                    })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🌌 ʀɪᴡᴀʏᴀᴛ ᴏᴛᴘ',
                        id: `${m.prefix}myotp`
                    })
                }
            ]
        }, { quoted: m })

        m.react('✅')
    } catch (err) {
        console.error('[OTP]', err)
        m.react('❌')
        m.reply(
            `❌ *ᴛᴇʀᴊᴀᴅɪ ᴋᴇsᴀʟᴀʜᴀɴ*\n\n` +
            `> ${err.message}\n\n` +
            `> Silakan coba lagi. Jika masalah berlanjut, hubungi admin.`
        )
    }
}

function capitalizeCountry(name) {
    return name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

export { pluginConfig as config, handler }