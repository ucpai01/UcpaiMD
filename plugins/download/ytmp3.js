import config from '../../config.js'
import { f } from '../../src/lib/ucpai-http.js'
const pluginConfig = {
    name: 'ytmp3',
    alias: ['youtubemp3', 'ytaudio'],
    category: 'download',
    description: 'Download audio YouTube',
    usage: '.ytmp3 <url>',
    example: '.ytmp3 https://youtube.com/watch?v=xxx',
    cooldown: 20,
    energi: 2,
    isEnabled: true
}

async function handler(m, { sock }) {
    const url = m.text?.trim()
    if (!url) return m.reply(`Contoh: ${m.prefix}ytmp4 https://youtube.com/watch?v=xxx`)
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) return m.reply('❌ URL harus YouTube')

    m.react('🕕')

    try {
        const { data } = await f(`https://api.ucpai.xyz/api/ytmp3?url=${encodeURIComponent(url)}`)

        await sock.sendMedia(m.chat, data.download, null, m, {
            type: 'audio',
            mimetype: 'audio/mpeg',
            ptt: false,
            fileName: data?.title || 'audio.mp3',          
        })
        m.react('✅')

    } catch (err) {
        console.error('[YTMP4]', err)
        m.react('❌')
        m.reply('Gagal mengunduh video.')
    }
}

export { pluginConfig as config, handler }