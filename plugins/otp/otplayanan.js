import * as jasaotp from '../../src/lib/ucpai-otp-service.js'
import config from '../../config.js'
import fs from 'fs'
import path from 'path'
const pluginConfig = {
    name: 'otplayanan',
    alias: ['otpservice', 'otpsvc'],
    category: 'otp',
    description: 'Pilih layanan OTP berdasarkan negara',
    usage: '.otplayanan <id_negara>',
    example: '.otplayanan 6',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const { getDatabase } = await import('../../src/lib/ucpai-database.js')
    const db = getDatabase()
    const groupData = db.getGroup(m.chat) || {}

    if (groupData.botMode !== 'otp') {
        return m.reply(`⚠️ Mode OTP tidak aktif! Admin ketik: \`${m.prefix}botmode otp\``)
    }

    const countryId = parseInt(m.text?.trim())

    if (isNaN(countryId)) {
        return m.reply(
            `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
            `> Kamu belum memilih negara.\n\n` +
            `*ʟᴀɴɢᴋᴀʜ ʏᴀɴɢ ʙᴇɴᴀʀ:*\n` +
            `> 1. Ketik \`${m.prefix}otp\` untuk membuka menu\n` +
            `> 2. Pilih negara dari daftar\n` +
            `> 3. Bot akan otomatis menampilkan layanan\n\n` +
            `> Atau ketik manual: \`${m.prefix}otplayanan 6\` (6 = Indonesia)`
        )
    }

    m.react('📋')

    try {
        const countries = await jasaotp.getCountries()
        const country = countries.find(c => c.id_negara === countryId)
        const countryName = country ? capitalizeCountry(country.nama_negara) : `ID ${countryId}`

        const services = await jasaotp.getServices(countryId)
        const markup = jasaotp.getMarkup()

        const serviceList = Object.entries(services)
        if (serviceList.length === 0) {
            return m.reply(
                `❌ *ᴛɪᴅᴀᴋ ᴀᴅᴀ ʟᴀʏᴀɴᴀɴ*\n\n` +
                `> Tidak ada layanan OTP tersedia untuk *${countryName}* saat ini.\n\n` +
                `> Coba pilih negara lain: \`${m.prefix}otp\``
            )
        }

        let rows = []
        for (const [id, data] of serviceList) {
            const price = parseInt(data.price || data.harga || 0) + markup
            const name = data.layanan || data.name || data.nama || id
            const displayName = capitalizeCountry(name) // Helper function helper exists but name is 'capitalizeCountry', reuse it
            const stock = data.stock || data.stok || '∞'
            const formattedPrice = jasaotp.formatPrice(price)
            
            rows.push({
                header: '',
                title: `${displayName}`,
                description: `Rp ${formattedPrice} | Stok: ${stock}`,
                id: `${m.prefix}otporder ${countryId} ${id} any`
            })
        }

        let txt = `📦 *ʟᴀʏᴀɴᴀɴ ᴏᴛᴘ — ${countryName}*\n\n`
        txt += `Harga sudah termasuk biaya layanan.\n\n`
        txt += `> 💡 Pilih layanan yang kamu butuhkan dari daftar di bawah.\n`
        txt += `> Harga bisa berubah sewaktu-waktu tergantung ketersediaan.`

        if (rows.length === 0) {
            return m.reply(
                `❌ *sᴛᴏᴋ ʜᴀʙɪs*\n\n` +
                `> Semua layanan di *${countryName}* sedang kehabisan stok.\n\n` +
                `> Coba lagi nanti atau pilih negara lain: \`${m.prefix}otp\``
            )
        }

        const otpImage = path.join(process.cwd(), 'assets', 'images', 'ucpai-otp.jpg')
        let imageBuffer = null
        if (fs.existsSync(otpImage)) imageBuffer = fs.readFileSync(otpImage)

        await sock.sendMessage(m.chat, {
            ...(imageBuffer ? { image: imageBuffer, caption: txt } : { text: txt }),
            footer: `© ${config.bot?.name || 'Ucpai-AI'} | ${countryName}`,
            interactiveButtons: [
                {
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: '📱 Pilih Layanan',
                        sections: [{
                            title: `Layanan di ${countryName}`,
                            rows
                        }]
                    })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🔙 Kembali',
                        id: `${m.prefix}otp`
                    })
                }
            ]
        }, { quoted: m })

        m.react('✅')
    } catch (err) {
        console.error('[OTPLayanan]', err)
        m.react('❌')
        m.reply(
            `❌ *ɢᴀɢᴀʟ ᴍᴇɴɢᴀᴍʙɪʟ ʟᴀʏᴀɴᴀɴ*\n\n` +
            `> ${err.message}\n\n` +
            `> Coba lagi atau kembali ke menu: \`${m.prefix}otp\``
        )
    }
}

function capitalizeCountry(name) {
    return name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

export { pluginConfig as config, handler }