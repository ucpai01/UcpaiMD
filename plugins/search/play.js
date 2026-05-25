/**
  * Nama Plugin: Play
  * Pembuat Code: mr.ucup
  * API/Scraper: api.nexray.web.id
  * Saluran: https://whatsapp.com/channel/0029Vb7g5Qt90x2yn7bOlM2U
*/

import yts from 'yt-search'
import axios from 'axios'
const pluginConfig = {
    name: "play",
    alias: ["playaudio"],
    category: "search",
    description: "Putar musik dari YouTube (Siputzx API)",
    usage: ".play <query>",
    example: ".play komang",
    cooldown: 15,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock, text }) {
    const query = m.text?.trim()
    if (!query) return m.reply(`🎵 *ᴘʟᴀʏ*\n\n> Contoh:\n\`${m.prefix}play komang\``)

    m.react("🕐")

    try {
        const search = await yts(query)
        if (!search.videos.length) throw "Video tidak ditemukan"
        
        const video = search.videos[0]
        
        const { data } = await axios.get(`https://api.ucpai.xyz/api/ytmp3?url=${video.url}`)
 
        await sock.sendMessage(m.chat, {
            audio: { url: data?.data.download },
            mimetype: 'audio/mpeg',
            ptt: false,
            fileName: video.title + '.mp3',
            contextInfo: {
                forwardingScore: 9,
                isForwarded: true,
                externalAdReply: {
                    title: video.title,
                    body: `${video.author.name} | ${video.duration} | ${video.ago}`,
                    mediaType: 2,
                    mediaUrl: video.url,
                    sourceUrl: video.url,
                    thumbnailUrl: video.thumbnail,
                    showAdAttribution: false,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: m })

        m.react("✅")

    } catch (err) {
        console.error('[Play]', err)
        m.react("😭")
        m.reply(`Wahhh, fitur putar musiknya lagi ada kendala kak, coba lagi nanti yak, jangan spam`)
    }
}

export { pluginConfig as config, handler }