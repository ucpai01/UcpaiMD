import * as jasaotp from '../../src/lib/ucpai-otp-service.js'
import te from '../../src/lib/ucpai-error.js'
const pluginConfig = {
    name: 'otpbalance',
    alias: ['otpbal', 'otpsaldo', 'ceksaldootp'],
    category: 'otp',
    description: 'Cek saldo API JasaOTP (owner only)',
    usage: '.otpbalance',
    example: '.otpbalance',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m) {
    if (!jasaotp.isEnabled()) {
        return m.reply(
            `⚠️ *ᴊᴀsᴀᴏᴛᴘ ʙᴇʟᴜᴍ ᴅɪsᴇᴛᴜᴘ*\n\n` +
            `> API key belum dikonfigurasi di \`config.js\`\n` +
            `> Isi \`jasaotp.apiKey\` lalu restart bot.`
        )
    }

    m.react('💰')

    try {
        const balance = await jasaotp.getBalance()

        m.react('✅')
        m.reply(
            `💰 *sᴀʟᴅᴏ ᴊᴀsᴀᴏᴛᴘ*\n\n` +
            `╭┈┈⬡\n` +
            `┃ 💵 Saldo: *Rp ${jasaotp.formatPrice(balance)}*\n` +
            `┃ 💲 Markup: *Rp ${jasaotp.formatPrice(jasaotp.getMarkup())}* / order\n` +
            `┃ ⏱️ Timeout: *${Math.ceil(jasaotp.getTimeout() / 60)} menit*\n` +
            `╰┈┈⬡\n\n` +
            `> Top up saldo di: https://ditznesia.id`
        )
    } catch (err) {
        m.react('☢')
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }