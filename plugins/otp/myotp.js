import * as otpPoller from '../../src/lib/ucpai-otp-poller.js'
import * as jasaotp from '../../src/lib/ucpai-otp-service.js'
import config from '../../config.js'
import fs from 'fs'
import path from 'path'
const pluginConfig = {
    name: 'myotp',
    alias: ['otpku', 'otphistory', 'riwayatotp'],
    category: 'otp',
    description: 'Lihat riwayat pesanan OTP kamu',
    usage: '.myotp',
    example: '.myotp',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}

const STATUS_EMOJI = {
    pending_payment: '🕕',
    creating_otp: '⚙️',
    waiting_otp: '📱',
    completed: '✅',
    failed: '❌',
    timeout: '⏰',
    cancelled: '🚫',
    refunded: '💰',
    expired: '⏰'
}

async function handler(m, { sock }) {
    const { getDatabase } = await import('../../src/lib/ucpai-database.js')
    const db = getDatabase()
    const groupData = db.getGroup(m.chat) || {}

    if (groupData.botMode !== 'otp') {
        return m.reply(`⚠️ Mode OTP tidak aktif! Admin ketik: \`${m.prefix}botmode otp\``)
    }

    const orders = otpPoller.getOtpOrdersByBuyer(m.sender)

    if (orders.length === 0) {
        return m.reply(
            `🌌 *ʀɪᴡᴀʏᴀᴛ ᴏᴛᴘ*\n\n` +
            `> Kamu belum pernah memesan OTP.\n\n` +
            `> Mulai pesan: \`${m.prefix}otp\``
        )
    }

    const recent = orders.slice(0, 10)
    const activeOrders = recent.filter(o =>
        ['pending_payment', 'creating_otp', 'waiting_otp'].includes(o.status)
    )

    let txt = `🌌 *ʀɪᴡᴀʏᴀᴛ ᴏᴛᴘ*\n\n`
    txt += `> Total pesanan: *${orders.length}*\n`
    txt += `> Menampilkan ${recent.length} terbaru\n\n`

    if (activeOrders.length > 0) {
        txt += `╭┈┈⬡「 🔄 *ᴘᴇsᴀɴᴀɴ ᴀᴋᴛɪꜰ* 」\n`
        for (const o of activeOrders) {
            const emoji = STATUS_EMOJI[o.status] || '❓'
            txt += `┃ ${emoji} \`${o.orderId}\`\n`
            txt += `┃   📱 ${o.serviceName || '-'} (${o.countryName || '-'})\n`
            if (o.phoneNumber) txt += `┃   📞 \`${o.phoneNumber}\`\n`
            txt += `┃\n`
        }
        txt += `╰┈┈⬡\n\n`
    }

    txt += `╭┈┈⬡「 📜 *sᴇᴍᴜᴀ ᴘᴇsᴀɴᴀɴ* 」\n`
    for (const o of recent) {
        const emoji = STATUS_EMOJI[o.status] || '❓'
        txt += `┃ ${emoji} \`${o.orderId}\` — ${o.serviceName || '-'}\n`
        txt += `┃   💰 Rp ${jasaotp.formatPrice(o.totalPayment || 0)} | ${formatDate(o.createdAt)}\n`
        if (o.otpCode) txt += `┃   🔑 OTP: \`${o.otpCode}\`\n`
        txt += `┃\n`
    }
    txt += `╰┈┈⬡\n\n`
    txt += `> 💡 Cek detail: \`${m.prefix}otpcek <order_id>\`\n`
    txt += `> ❌ Batalkan: \`${m.prefix}otpcancel <order_id>\``

    const rows = activeOrders.map(o => ({
        title: `💫 ${o.orderId}`,
        description: `${o.serviceName || '-'} | ${o.status}`,
        id: `${m.prefix}otpcek ${o.orderId}`
    }))

    const buttons = []

    if (rows.length > 0) {
        buttons.push({
            name: 'single_select',
            buttonParamsJson: JSON.stringify({
                title: '💫 ᴄᴇᴋ ᴏʀᴅᴇʀ ᴀᴋᴛɪꜰ',
                sections: [{
                    title: 'Pesanan Aktif',
                    rows
                }]
            })
        })
    }

    buttons.push({
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
            display_text: '📱 ᴏʀᴅᴇʀ ʙᴀʀᴜ',
            id: `${m.prefix}otp`
        })
    })

    const otpImage = path.join(process.cwd(), 'assets', 'images', 'ucpai-otp.jpg')
    let imageBuffer = null
    if (fs.existsSync(otpImage)) imageBuffer = fs.readFileSync(otpImage)

    await sock.sendMessage(m.chat, {
        ...(imageBuffer ? { image: imageBuffer, caption: txt } : { text: txt }),
        footer: `© ${config.bot?.name || 'Ucpai-AI'} | OTP Service`,
        interactiveButtons: buttons
    }, { quoted: m })
}

function formatDate(dateStr) {
    if (!dateStr) return '-'
    try {
        return new Date(dateStr).toLocaleString('id-ID', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
        })
    } catch { return dateStr }
}

export { pluginConfig as config, handler }