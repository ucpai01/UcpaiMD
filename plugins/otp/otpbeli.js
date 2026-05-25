import * as jasaotp from '../../src/lib/ucpai-otp-service.js'
import * as pakasir from '../../src/lib/ucpai-pakasir.js'
import * as otpPoller from '../../src/lib/ucpai-otp-poller.js'
import config from '../../config.js'
import QRCode from 'qrcode'
import fs from 'fs'
import path from 'path'
const pluginConfig = {
    name: 'otpbeli',
    alias: ['otpbuy', 'otporder', 'beliopt'],
    category: 'otp',
    description: 'Konfirmasi dan bayar pesanan OTP',
    usage: '.otpbeli <id_negara> <kode_layanan> <operator>',
    example: '.otpbeli 6 wa any',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 15,
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
    const operator = args[2]?.toLowerCase()

    if (isNaN(countryId) || !serviceCode || !operator) {
        return m.reply(
            `⚠️ *ᴅᴀᴛᴀ ᴛɪᴅᴀᴋ ʟᴇɴɢᴋᴀᴘ*\n\n` +
            `> Pesanan OTP belum lengkap.\n\n` +
            `*ʟᴀɴɢᴋᴀʜ ʏᴀɴɢ ʙᴇɴᴀʀ:*\n` +
            `> 1. Ketik \`${m.prefix}otp\` untuk buka menu\n` +
            `> 2. Pilih negara → layanan → operator\n` +
            `> 3. Bot akan membuat pesanan otomatis\n\n` +
            `> Ikuti panduan dari awal supaya tidak ada yang terlewat 😊`
        )
    }

    if (!pakasir.isEnabled()) {
        return m.reply(
            `⚠️ *ᴘᴀᴋᴀsɪʀ ʙᴇʟᴜᴍ ᴅɪsᴇᴛᴜᴘ*\n\n` +
            `> Sistem pembayaran otomatis belum dikonfigurasi.\n\n` +
            `*ᴜɴᴛᴜᴋ ᴀᴅᴍɪɴ:*\n` +
            `> 1. Buka \`config.js\`\n` +
            `> 2. Isi \`pakasir.slug\` dan \`pakasir.apiKey\`\n` +
            `> 3. Restart bot`
        )
    }

    const existingOrders = otpPoller.getOtpOrdersByBuyer(m.sender)
    const activeOrder = existingOrders.find(o =>
        ['pending_payment', 'creating_otp', 'waiting_otp'].includes(o.status)
    )

    if (activeOrder) {
        return m.reply(
            `⚠️ *ᴍᴀsɪʜ ᴀᴅᴀ ᴘᴇsᴀɴᴀɴ ᴀᴋᴛɪꜰ*\n\n` +
            `> Kamu masih punya pesanan OTP yang belum selesai.\n\n` +
            `╭┈┈⬡\n` +
            `┃ 🆔 Order: \`${activeOrder.orderId}\`\n` +
            `┃ 📦 Status: \`${activeOrder.status}\`\n` +
            `╰┈┈⬡\n\n` +
            `> Selesaikan atau batalkan dulu:\n` +
            `> \`${m.prefix}otpcek ${activeOrder.orderId}\`\n` +
            `> \`${m.prefix}otpcancel ${activeOrder.orderId}\``
        )
    }

    m.react('💳')

    try {
        const countries = await jasaotp.getCountries()
        const country = countries.find(c => c.id_negara === countryId)
        const countryName = country ? capitalizeCountry(country.nama_negara) : `ID ${countryId}`

        const services = await jasaotp.getServices(countryId)
        const serviceInfo = services[serviceCode]

        if (!serviceInfo) {
            return m.reply(
                `❌ *ʟᴀʏᴀɴᴀɴ ᴛɪᴅᴀᴋ ᴅɪᴛᴇᴍᴜᴋᴀɴ*\n\n` +
                `> Layanan \`${serviceCode}\` tidak tersedia.\n\n` +
                `> Kembali ke: \`${m.prefix}otplayanan ${countryId}\``
            )
        }

        if ((serviceInfo.stok || 0) <= 0) {
            return m.reply(
                `❌ *sᴛᴏᴋ ʜᴀʙɪs*\n\n` +
                `> Layanan *${capitalizeCountry(serviceInfo.layanan || serviceCode)}* sedang kehabisan stok.\n\n` +
                `> Coba operator lain atau layanan lain: \`${m.prefix}otplayanan ${countryId}\``
            )
        }

        const serviceName = capitalizeCountry(serviceInfo.layanan || serviceCode)
        const basePrice = serviceInfo.harga || 0
        const markup = jasaotp.getMarkup()
        const totalPrice = basePrice + markup
        const orderId = `OTP${Date.now().toString(36).toUpperCase()}`

        let invoiceTxt = `💳 *ᴋᴏɴꜰɪʀᴍᴀsɪ ᴘᴇsᴀɴᴀɴ ᴏᴛᴘ*\n\n`
        invoiceTxt += `Halo *${m.pushName}*! Berikut detail pesanan kamu:\n\n`
        invoiceTxt += `╭┈┈⬡「 📋 *ᴅᴇᴛᴀɪʟ ᴘᴇsᴀɴᴀɴ* 」\n`
        invoiceTxt += `┃ 🆔 Order ID: \`${orderId}\`\n`
        invoiceTxt += `┃ 🌍 Negara: *${countryName}*\n`
        invoiceTxt += `┃ 📱 Layanan: *${serviceName}*\n`
        invoiceTxt += `┃ 📡 Operator: *${capitalizeCountry(operator)}*\n`
        invoiceTxt += `┃ 💰 Harga: *Rp ${jasaotp.formatPrice(totalPrice)}*\n`
        invoiceTxt += `╰┈┈⬡\n\n`

        await m.reply(`🕕 *ᴍᴇᴍʙᴜᴀᴛ ᴘᴇᴍʙᴀʏᴀʀᴀɴ...*\n\n> Mohon tunggu, bot sedang menyiapkan invoice pembayaran untuk kamu.`)

        const method = pakasir.getConfig().defaultMethod || 'qris'
        const payment = await pakasir.createTransaction(method, totalPrice, orderId)

        const orderData = {
            chatId: m.chat,
            buyerJid: m.sender,
            buyerName: m.pushName || m.sender.split('@')[0],
            countryId,
            countryName,
            service: serviceCode,
            serviceName,
            operator,
            basePrice,
            markup,
            totalPayment: payment.total_payment || totalPrice,
            fee: payment.fee || 0,
            pakasirOrderId: orderId,
            paymentMethod: payment.payment_method,
            paymentNumber: payment.payment_number,
            expiredAt: payment.expired_at,
            status: 'pending_payment',
            jasaotpOrderId: null,
            phoneNumber: null,
            otpCode: null
        }

        otpPoller.createOtpOrder(orderId, orderData)

        invoiceTxt += `━━━━━━━━━━━━━━━\n\n`
        invoiceTxt += `📱 *ᴍᴇᴛᴏᴅᴇ ᴘᴇᴍʙᴀʏᴀʀᴀɴ:* ${payment.payment_method?.toUpperCase() || 'QRIS'}\n`

        if (payment.fee) {
            invoiceTxt += `💳 *ꜰᴇᴇ:* Rp ${jasaotp.formatPrice(payment.fee)}\n`
            invoiceTxt += `💵 *ᴛᴏᴛᴀʟ ʙᴀʏᴀʀ:* Rp ${jasaotp.formatPrice(payment.total_payment || totalPrice)}\n`
        }

        invoiceTxt += `\n> ⏰ Bayar sebelum: ${formatDate(payment.expired_at)}\n\n`
        invoiceTxt += `╭┈┈⬡「 ℹ️ *ɪɴꜰᴏ ᴘᴇɴᴛɪɴɢ* 」\n`
        invoiceTxt += `┃ ✅ Setelah bayar, nomor HP otomatis dikirim\n`
        invoiceTxt += `┃ ✅ Kode OTP otomatis dikirim ke chat ini\n`
        invoiceTxt += `┃ ✅ Refund otomatis jika gagal\n`
        invoiceTxt += `┃ ⏱️ Timeout: ${Math.ceil(jasaotp.getTimeout() / 60)} menit\n`
        invoiceTxt += `╰┈┈⬡`

        if (payment.payment_method === 'qris' && payment.payment_number) {
            try {
                const qrBuffer = await QRCode.toBuffer(payment.payment_number, {
                    type: 'png',
                    width: 400,
                    margin: 2
                })

                await sock.sendMessage(m.chat, {
                    image: qrBuffer,
                    caption: invoiceTxt,
                    mentions: [m.sender],
                    footer: `© ${config.bot?.name || 'Ucpai-AI'} | OTP Service`,
                    interactiveButtons: [
                        {
                            name: 'quick_reply',
                            buttonParamsJson: JSON.stringify({
                                display_text: '📊 ᴄᴇᴋ sᴛᴀᴛᴜs',
                                id: `${m.prefix}otpcek ${orderId}`
                            })
                        },
                        {
                            name: 'quick_reply',
                            buttonParamsJson: JSON.stringify({
                                display_text: '❌ ʙᴀᴛᴀʟᴋᴀɴ',
                                id: `${m.prefix}otpcancel ${orderId}`
                            })
                        }
                    ]
                }, { quoted: m })
            } catch (qrErr) {
                invoiceTxt += `\n\n📝 *ᴋᴏᴅᴇ ǫʀ:*\n\`\`\`${payment.payment_number.substring(0, 100)}...\`\`\``
                await m.reply(invoiceTxt, { mentions: [m.sender] })
            }
        } else {
            invoiceTxt += `\n\n📝 *ɴᴏᴍᴏʀ ᴠᴀ:* \`${payment.payment_number}\``

            const otpImage = path.join(process.cwd(), 'assets', 'images', 'ucpai-otp.jpg')
            let imageBuffer = null
            if (fs.existsSync(otpImage)) imageBuffer = fs.readFileSync(otpImage)

            await sock.sendMessage(m.chat, {
                ...(imageBuffer ? { image: imageBuffer, caption: invoiceTxt } : { text: invoiceTxt }),
                mentions: [m.sender],
                footer: `© ${config.bot?.name || 'Ucpai-AI'} | OTP Service`,
                interactiveButtons: [
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: '📊 ᴄᴇᴋ sᴛᴀᴛᴜs',
                            id: `${m.prefix}otpcek ${orderId}`
                        })
                    },
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: '❌ ʙᴀᴛᴀʟᴋᴀɴ',
                            id: `${m.prefix}otpcancel ${orderId}`
                        })
                    }
                ]
            }, { quoted: m })
        }

        m.react('🛒')
    } catch (err) {
        console.error('[OTPBeli]', err)
        m.react('❌')
        m.reply(
            `❌ *ɢᴀɢᴀʟ ᴍᴇᴍʙᴜᴀᴛ ᴘᴇsᴀɴᴀɴ*\n\n` +
            `> ${err.message}\n\n` +
            `> Ini bisa terjadi karena:\n` +
            `> • Sistem pembayaran sedang gangguan\n` +
            `> • Stok OTP habis saat proses\n` +
            `> • Koneksi ke server bermasalah\n\n` +
            `> Silakan coba lagi: \`${m.prefix}otp\``
        )
    }
}

function capitalizeCountry(name) {
    return name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

function formatDate(dateStr) {
    if (!dateStr) return '-'
    try {
        const d = new Date(dateStr)
        return d.toLocaleString('id-ID', {
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        })
    } catch {
        return dateStr
    }
}

export { pluginConfig as config, handler }