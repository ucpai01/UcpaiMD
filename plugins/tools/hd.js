import config from '../../config.js'
import { default as axios } from 'axios'
import FormData from 'form-data'
import te from '../../src/lib/ucpai-error.js'

const pluginConfig = {
    name: 'remini',
    alias: ['hd', 'enhance', 'upscale'],
    category: 'tools',
    description: 'Enhance/upscale gambar menjadi HD',
    usage: '.remini (reply gambar)',
    example: '.remini',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 15,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const isImage = m.isImage || (m.quoted && m.quoted.type === 'imageMessage')

    if (!isImage) {
        return m.reply(`✨ *REMINI ENHANCE*\n\nKirim/reply gambar untuk di-enhance\n\n\`${m.prefix}remini\``)
    }

    m.react('🕕')

    try {
        let buffer
        if (m.quoted && m.quoted.isMedia) {
            buffer = await m.quoted.download()
        } else if (m.isMedia) {
            buffer = await m.download()
        }

        if (!buffer) {
            m.react('❌')
            return m.reply(`❌ Gagal mendownload gambar`)
        }

        const form = new FormData()
        form.append('image', buffer, {
            filename: 'image.jpg',
            contentType: 'image/jpeg'
        })

        const res = await axios.post('https://api.ootaizumi.web.id/tools/upscale', form, {
            headers: {
                ...form.getHeaders(),
                accept: '*/*'
            },
            timeout: 120000
        })

        if (!res.data?.status || !res.data?.result?.imageUrl) {
            m.react('❌')
            return m.reply(`❌ Gagal enhance gambar. Coba lagi nanti.`)
        }

        const imageUrl = res.data.result.imageUrl
        const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer' })
        const data = Buffer.from(imgRes.data)

        m.react('✅')

        await sock.sendMedia(m.chat, data, null, m, {
            type: 'image'
        })

    } catch (error) {
        m.react('☢')
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }