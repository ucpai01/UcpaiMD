import * as otpPoller from '../../src/lib/ucpai-otp-poller.js'
import * as jasaotp from '../../src/lib/ucpai-otp-service.js'
import * as pakasir from '../../src/lib/ucpai-pakasir.js'
import config from '../../config.js'
import fs from 'fs'
import path from 'path'
const pluginConfig = {
    name: 'otpcancel',
    alias: ['otpbatal', 'batalOtp', 'cancelotp'],
    category: 'otp',
    description: 'Batalkan pesanan OTP dan dapatkan refund',
    usage: '.otpcancel <order_id>',
    example: '.otpcancel OTP1A2B3C',
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
        return m.reply(`⚠️ Mode OTP tidak aktif! Admin ketik: \`${m.prefix}botmode otp\``)
    }

    const orderId = m.text?.trim().toUpperCase()

    if (!orderId) {
        return m.reply(
            `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
            `> Masukkan Order ID yang ingin dibatalkan.\n\n` +
            `*ᴄᴏɴᴛᴏʜ:*\n` +
            `> \`${m.prefix}otpcancel OTP1A2B3C\`\n\n` +
            `> 💡 Lihat order kamu: \`${m.prefix}myotp\``
        )
    }

    const order = otpPoller.getOtpOrder(orderId)

    if (!order) {
        return m.reply(
            `❌ *ᴏʀᴅᴇʀ ᴛɪᴅᴀᴋ ᴅɪᴛᴇᴍᴜᴋᴀɴ*\n\n` +
            `> Order ID \`${orderId}\` tidak ditemukan.\n\n` +
            `> Pastikan Order ID benar.\n` +
            `> Lihat order: \`${m.prefix}myotp\``
        )
    }

    const isOrderOwner = order.buyerJid === m.sender
    const isAdmin = m.isAdmin || m.isOwner

    if (!isOrderOwner && !isAdmin) {
        return m.reply(`❌ *ᴀᴋsᴇs ᴅɪᴛᴏʟᴀᴋ*\n\n> Kamu hanya bisa membatalkan pesanan milikmu sendiri.`)
    }

    if (order.status === 'completed') {
        return m.reply(
            `❌ *ᴛɪᴅᴀᴋ ʙɪsᴀ ᴅɪʙᴀᴛᴀʟᴋᴀɴ*\n\n` +
            `> Pesanan ini sudah selesai dan kode OTP sudah diterima.\n` +
            `> Pesanan yang sudah selesai tidak bisa dibatalkan.`
        )
    }

    if (['cancelled', 'refunded', 'expired'].includes(order.status)) {
        return m.reply(
            `❌ *sᴜᴅᴀʜ ᴅɪʙᴀᴛᴀʟᴋᴀɴ*\n\n` +
            `> Pesanan ini sudah dibatalkan/direfund sebelumnya.\n` +
            `> Status: *${order.status}*`
        )
    }

    m.react('🕕')

    try {
        let jasaotpCancelled = false
        let pakasirCancelled = false

        if (order.jasaotpOrderId && ['waiting_otp', 'creating_otp'].includes(order.status)) {
            try {
                await jasaotp.cancelOrder(order.jasaotpOrderId)
                jasaotpCancelled = true
            } catch (e) {
                console.error('[OTPCancel] JasaOTP cancel failed:', e.message)
            }
        }

        if (pakasir.isEnabled() && order.pakasirOrderId) {
            try {
                await pakasir.cancelTransaction(order.pakasirOrderId, order.totalPayment)
                pakasirCancelled = true
            } catch (e) {
                console.error('[OTPCancel] Pakasir cancel failed:', e.message)
            }
        }

        otpPoller.updateOtpOrder(orderId, {
            status: 'cancelled',
            cancelledAt: new Date().toISOString(),
            cancelledBy: m.sender,
            refundSuccess: pakasirCancelled
        })

        m.react('✅')

        let txt = `🚫 *ᴘᴇsᴀɴᴀɴ ᴅɪʙᴀᴛᴀʟᴋᴀɴ*\n\n`
        txt += `╭┈┈⬡「 📋 *ᴅᴇᴛᴀɪʟ* 」\n`
        txt += `┃ 🆔 Order: \`${orderId}\`\n`
        txt += `┃ 📱 Layanan: *${order.serviceName || '-'}*\n`
        txt += `┃ 💰 Total: *Rp ${jasaotp.formatPrice(order.totalPayment || 0)}*\n`
        txt += `╰┈┈⬡\n\n`

        if (order.status === 'pending_payment') {
            txt += `> ℹ️ Pembayaran belum dilakukan, tidak ada yang perlu direfund.\n`
        } else if (pakasirCancelled) {
            txt += `> ✅ *Dana telah di-refund otomatis*\n`
            txt += `> Saldo pembayaran kamu akan dikembalikan.\n`
        } else {
            txt += `> ⚠️ *Refund otomatis gagal*\n`
            txt += `> Silakan hubungi admin untuk pengembalian dana.\n`
        }

        if (jasaotpCancelled) {
            txt += `> ✅ Order OTP berhasil dibatalkan di server\n`
        }

        txt += `\n> Terima kasih! Kamu bisa buat pesanan baru kapan saja.`

        const otpImage = path.join(process.cwd(), 'assets', 'images', 'ucpai-otp.jpg')
        let imageBuffer = null
        if (fs.existsSync(otpImage)) imageBuffer = fs.readFileSync(otpImage)

        await sock.sendMessage(m.chat, {
            ...(imageBuffer ? { image: imageBuffer, caption: txt } : { text: txt }),
            mentions: [order.buyerJid],
            footer: `© ${config.bot?.name || 'Ucpai-AI'} | OTP Service`,
            interactiveButtons: [
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📱 ᴏʀᴅᴇʀ ʙᴀʀᴜ',
                        id: `${m.prefix}otp`
                    })
                }
            ]
        }, { quoted: m })
    } catch (err) {
        console.error('[OTPCancel]', err)
        m.react('❌')
        m.reply(
            `❌ *ɢᴀɢᴀʟ ᴍᴇᴍʙᴀᴛᴀʟᴋᴀɴ*\n\n` +
            `> ${err.message}\n\n` +
            `> Silakan hubungi admin untuk bantuan.`
        )
    }
}

export { pluginConfig as config, handler }