import config from '../../config.js'
import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
const pluginConfig = {
    name: 'payment',
    alias: ['bayar', 'pay', 'rekening', 'rek'],
    category: 'store',
    description: 'Tampilkan metode pembayaran dengan QRIS',
    usage: '.payment',
    example: '.payment',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const payments = config.store?.payment || []
    const qrisUrl = config.store?.qris || ''
    
    if (payments.length === 0) {
        return m.reply(
            `💳 *ᴍᴇᴛᴏᴅᴇ ᴘᴇᴍʙᴀʏᴀʀᴀɴ*\n\n` +
            `> Belum ada metode pembayaran yang dikonfigurasi\n\n` +
            `> Owner dapat menambahkan di \`config.js\`:\n` +
            `\`\`\`\nstore: {\n  payment: [\n    { name: 'Dana', number: '08xxx', holder: 'Nama' }\n  ],\n  qris: 'https://link/qris.jpg'\n}\n\`\`\``
        )
    }
    
    let txt = `💳 *ᴍᴇᴛᴏᴅᴇ ᴘᴇᴍʙᴀʏᴀʀᴀɴ*\n\n`
    txt += `╭─「 💰 *ᴘɪʟɪʜᴀɴ* 」\n`
    
    for (const pay of payments) {
        txt += `┃\n`
        txt += `┃ 🏦 *${pay.name}*\n`
        txt += `┃ └ 📱 ${pay.number}\n`
        txt += `┃ └ 👤 a/n ${pay.holder}\n`
    }
    
    txt += `┃\n`
    txt += `╰───────────────\n\n`
    txt += `> Setelah transfer, kirim bukti pembayaran\n`
    txt += `> Konfirmasi ke owner untuk proses order`
    
    m.react('💳')
    
    const copyButtons = payments.map(pay => ({
        name: 'cta_copy',
        buttonParamsJson: JSON.stringify({
            display_text: `✦ Copy No. ${pay.name}`,
            copy_code: pay.number
        })
    }))
    
    if (qrisUrl) {
        try {
            const response = await fetch(qrisUrl)
            const qrisBuffer = Buffer.from(await response.arrayBuffer())
            
            await sock.sendMessage(m.chat, {
                image: qrisBuffer,
                caption: txt,
                footer: config.bot?.name || 'Ucpai Store',
                interactiveButtons: copyButtons
            }, { quoted: m })
        } catch (e) {
            await sock.sendMessage(m.chat, {
                text: txt,
                footer: config.bot?.name || 'Ucpai Store',
                interactiveButtons: copyButtons
            }, { quoted: m })
        }
    } else {
        await sock.sendMessage(m.chat, {
            text: txt,
            footer: config.bot?.name || 'Ucpai Store',
            interactiveButtons: copyButtons
        }, { quoted: m })
    }
}

export { pluginConfig as config, handler }