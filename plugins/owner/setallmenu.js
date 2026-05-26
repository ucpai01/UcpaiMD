import config from '../../config.js'
import { getDatabase } from '../../src/lib/ucpai-database.js'
import pkg from 'ucpai'
const { generateWAMessageFromContent, proto } = pkg
const pluginConfig = {
    name: 'setallmenu',
    alias: ['allmenuvariant', 'allmenustyle'],
    category: 'owner',
    description: 'Mengatur variant tampilan allmenu',
    usage: '.setallmenu <v1-v5>',
    example: '.setallmenu v2',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}

const VARIANTS = {
    v1: { id: 1, name: 'Simple Text', desc: 'Text biasa tanpa image/contextInfo', emoji: '📝' },
    v2: { id: 2, name: 'Image + Context', desc: 'Image + full contextInfo + forwardedNewsletter', emoji: '🖼️' },
    v3: { id: 3, name: 'Document', desc: 'Document + jpegThumbnail + contextInfo + verified quoted', emoji: '📄' },
    v4: { id: 4, name: 'Interactive Button', desc: 'Interactive message + single_select kategori + quick_reply', emoji: '🔘' },
    v5: { id: 5, name: 'NativeFlow', desc: 'NativeFlow + limited_time_offer + interactive buttons', emoji: '✨' }
}

async function handler(m, { sock, db }) {
    const args = m.args || []
    const variant = args[0]?.toLowerCase()

    if (variant) {
        const selected = VARIANTS[variant]
        if (!selected) {
            await m.reply(`❌ Variant tidak valid!\n\nGunakan: v1 s/d v5`)
            return
        }

        db.setting('allmenuVariant', selected.id)
        await db.save()

        await m.reply(
            `✅ *ᴀʟʟᴍᴇɴᴜ ᴠᴀʀɪᴀɴᴛ ᴅɪᴜʙᴀʜ*\n\n` +
            `> ${selected.emoji} *V${selected.id} — ${selected.name}*\n` +
            `> _${selected.desc}_`
        )
        return
    }

    const current = db.setting('allmenuVariant') || config.ui?.allmenuVariant || 2

    const rows = Object.entries(VARIANTS).map(([key, val]) => ({
        title: `${val.emoji} ${key.toUpperCase()}${val.id === current ? ' ✓' : ''} — ${val.name}`,
        description: val.desc,
        id: `${m.prefix}setallmenu ${key}`
    }))

    const bodyText =
        `🔮 *sᴇᴛ ᴀʟʟᴍᴇɴᴜ ᴠᴀʀɪᴀɴᴛ*\n\n` +
        `> Variant aktif: *V${current}*\n` +
        `> _${VARIANTS[`v${current}`]?.name || 'Unknown'}_\n\n` +
        `> Pilih variant dari daftar di bawah`

    try {
        const interactiveButtons = [
            {
                name: 'single_select',
                buttonParamsJson: JSON.stringify({
                    title: '🔮 ᴘɪʟɪʜ ᴠᴀʀɪᴀɴᴛ',
                    sections: [{
                        title: 'ᴅᴀꜰᴛᴀʀ ᴠᴀʀɪᴀɴᴛ ᴀʟʟᴍᴇɴᴜ',
                        rows
                    }]
                })
            }
        ]

        const msg = generateWAMessageFromContent(m.chat, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                        body: proto.Message.InteractiveMessage.Body.fromObject({
                            text: bodyText
                        }),
                        footer: proto.Message.InteractiveMessage.Footer.fromObject({
                            text: config.bot?.name || 'Ucpai-AI'
                        }),
                        header: proto.Message.InteractiveMessage.Header.fromObject({
                            title: '🔮 AllMenu Variant',
                            subtitle: `${Object.keys(VARIANTS).length} variant tersedia`,
                            hasMediaAttachment: false
                        }),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                            buttons: interactiveButtons
                        }),
                        contextInfo: {
                            mentionedJid: [m.sender],
                            forwardingScore: 9999,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: config.saluran?.id || '120363426403323903@newsletter',
                                newsletterName: config.saluran?.name || config.bot?.name || 'Ucpai-AI',
                                serverMessageId: 127
                            }
                        }
                    })
                }
            }
        }, { userJid: m.sender, quoted: m })

        await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
    } catch {
        let txt = `🔮 *sᴇᴛ ᴀʟʟᴍᴇɴᴜ ᴠᴀʀɪᴀɴᴛ*\n\n`
        txt += `> Variant saat ini: *V${current}*\n\n`
        for (const [key, val] of Object.entries(VARIANTS)) {
            const mark = val.id === current ? ' ✓' : ''
            txt += `> ${val.emoji} *${key.toUpperCase()}*${mark} — _${val.desc}_\n`
        }
        txt += `\n_Gunakan: \`.setallmenu v1\` s/d \`.setallmenu v5\`_`
        await m.reply(txt)
    }
}

export { pluginConfig as config, handler }
