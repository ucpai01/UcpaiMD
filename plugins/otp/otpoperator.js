import * as jasaotp from '../../src/lib/ucpai-otp-service.js'
import config from '../../config.js'
import fs from 'fs'
import path from 'path'
const pluginConfig = {
    name: 'otpoperator',
    alias: ['otpop'],
    category: 'otp',
    description: 'Pilih operator untuk layanan OTP',
    usage: '.otpoperator <id_negara> <kode_layanan>',
    example: '.otpoperator 6 wa',
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

    const args = m.text?.trim().split(/\s+/) || []
    const countryId = parseInt(args[0])
    const serviceCode = args[1]?.toLowerCase()

    if (isNaN(countryId) || !serviceCode) {
        return m.reply(
            `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
            `> Kamu belum memilih layanan dengan benar.\n\n` +
            `*ʟᴀɴɢᴋᴀʜ ʏᴀɴɢ ʙᴇɴᴀʀ:*\n` +
            `> 1. Ketik \`${m.prefix}otp\` untuk buka menu\n` +
            `> 2. Pilih negara\n` +
            `> 3. Pilih layanan dari daftar\n\n` +
            `> Atau ketik manual: \`${m.prefix}otpoperator 6 wa\``
        )
    }

    m.react('📡')

    try {
        const countries = await jasaotp.getCountries()
        const country = countries.find(c => c.id_negara === countryId)
        const countryName = country ? capitalizeCountry(country.nama_negara) : `ID ${countryId}`

        const services = await jasaotp.getServices(countryId)
        const serviceInfo = services[serviceCode]

        if (!serviceInfo) {
            return m.reply(
                `❌ *ʟᴀʏᴀɴᴀɴ ᴛɪᴅᴀᴋ ᴅɪᴛᴇᴍᴜᴋᴀɴ*\n\n` +
                `> Layanan \`${serviceCode}\` tidak tersedia di *${countryName}*.\n\n` +
                `> Kembali pilih layanan: \`${m.prefix}otplayanan ${countryId}\``
            )
        }

        const operators = await jasaotp.getOperators(countryId)
        const serviceName = capitalizeCountry(serviceInfo.layanan || serviceCode)
        const basePrice = serviceInfo.harga || 0
        const markup = jasaotp.getMarkup()
        const totalPrice = basePrice + markup

        let txt = `📡 *ᴘɪʟɪʜ ᴏᴘᴇʀᴀᴛᴏʀ*\n\n`
        txt += `Kamu akan memesan OTP untuk:\n\n`
        txt += `╭┈┈⬡「 📋 *ʀɪɴɢᴋᴀsᴀɴ* 」\n`
        txt += `┃ 🌍 Negara: *${countryName}*\n`
        txt += `┃ 📱 Layanan: *${serviceName}*\n`
        txt += `┃ 💰 Harga: *Rp ${jasaotp.formatPrice(totalPrice)}*\n`
        txt += `┃ 📦 Stok: *${serviceInfo.stok || 0}*\n`
        txt += `╰┈┈⬡\n\n`
        txt += `Sekarang pilih operator yang kamu inginkan.\n`
        txt += `> 💡 Pilih *Any* jika tidak ada preferensi operator.\n`
        txt += `> Operator tertentu mungkin punya tingkat keberhasilan yang berbeda.`

        if (!operators || operators.length === 0) {
            return m.reply(
                `❌ *ᴛɪᴅᴀᴋ ᴀᴅᴀ ᴏᴘᴇʀᴀᴛᴏʀ*\n\n` +
                `> Tidak ada operator tersedia untuk *${countryName}*.\n\n` +
                `> Coba negara lain: \`${m.prefix}otp\``
            )
        }

        const rows = operators.map(op => ({
            title: `📡 ${capitalizeCountry(op)}`,
            description: op === 'any'
                ? '🔄 Operator acak (direkomendasikan)'
                : `📡 Provider ${capitalizeCountry(op)}`,
            id: `${m.prefix}otpbeli ${countryId} ${serviceCode} ${op}`
        }))

        const otpImage = path.join(process.cwd(), 'assets', 'images', 'ucpai-otp.jpg')
        let imageBuffer = null
        if (fs.existsSync(otpImage)) imageBuffer = fs.readFileSync(otpImage)

        await sock.sendMessage(m.chat, {
            ...(imageBuffer ? { image: imageBuffer, caption: txt } : { text: txt }),
            footer: `© ${config.bot?.name || 'Ucpai-AI'} | ${serviceName}`,
            interactiveButtons: [
                {
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: '📡 ᴘɪʟɪʜ ᴏᴘᴇʀᴀᴛᴏʀ',
                        sections: [{
                            title: `Operator untuk ${serviceName}`,
                            rows
                        }]
                    })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🔙 ᴋᴇᴍʙᴀʟɪ',
                        id: `${m.prefix}otplayanan ${countryId}`
                    })
                }
            ]
        }, { quoted: m })

        m.react('✅')
    } catch (err) {
        console.error('[OTPOperator]', err)
        m.react('❌')
        m.reply(
            `❌ *ɢᴀɢᴀʟ ᴍᴇɴɢᴀᴍʙɪʟ ᴏᴘᴇʀᴀᴛᴏʀ*\n\n` +
            `> ${err.message}\n\n` +
            `> Coba lagi atau kembali ke menu: \`${m.prefix}otp\``
        )
    }
}

function capitalizeCountry(name) {
    return name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

export { pluginConfig as config, handler }