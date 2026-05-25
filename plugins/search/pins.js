import { pinterest } from 'btch-downloader'
import { generateWAMessage, generateWAMessageFromContent, jidNormalizedUser } from 'ucpai'
import axios from 'axios'
import crypto from 'crypto'
import te from '../../src/lib/ucpai-error.js'
import { f } from '../../src/lib/ucpai-http.js'
const pluginConfig = {
    name: 'pins',
    alias: ['pinsearch', 'pinterestsearch'],
    category: 'search',
    description: 'Cari gambar di Pinterest (album)',
    usage: '.pins <query>',
    example: '.pins Zhao Lusi',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock, config: botConfig }) {
    const query = m.text?.trim()
    if (!query) {
        return m.reply(
            `🔍 *ᴘɪɴᴛᴇʀᴇsᴛ sᴇᴀʀᴄʜ*\n\n` +
            `> Contoh:\n` +
            `\`${m.prefix}pins Zhao Lusi\``
        )
    }
    m.react('🕕')

    try {
        const data = await f(`https://api.siputzx.my.id/api/s/pinterest?query=${query}`)
        
        const results = data?.data?.slice(0, 10)
        if (!results || results.length === 0) {
            m.react('❌')
            return m.reply(`❌ Tidak ditemukan hasil untuk: ${query}`)
        }

        const mediaPromises = results.map(async (item, i) => {
            const imageUrl =
                item.image_url

            if (!imageUrl) return null

            try {
                return {
                    image: { url: imageUrl },
                }
            } catch (e) {
                console.log('[Pins] Image error:', e.message)
                return null
            }
        })

        const mediaList = (await Promise.all(mediaPromises)).filter(m => m !== null)

        if (mediaList.length === 0) {
            m.react('❌')
            return m.reply('❌ Gagal memuat gambar')
        }


        try {
            
            await sock.sendMessage(m.chat, {
                albumMessage: mediaList
            }, { quoted: m })
            m.react('✅')

        } catch (err) {
            console.log('[Pins] Album gagal, kirim satu-satu:', err.message)

            for (const content of mediaList) {
                await sock.sendMessage(
                    m.chat,
                    content,
                    { quoted: m }
                )
            }

            m.react('✅')
        }

    } catch (err) {
        console.error('[Pins] Error:', err.message)
        m.react('☢')
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }