import axios from 'axios'
import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import { exec } from 'child_process'
import { promisify } from 'util'
import { zencf } from 'zencf'
import config from '../../config.js'
import { wrapper } from 'axios-cookiejar-support'
import { CookieJar } from 'tough-cookie'
import * as cheerio from 'cheerio'
import { f } from '../../src/lib/ucpai-http.js'
import te from '../../src/lib/ucpai-error.js'
const execAsync = promisify(exec)

const pluginConfig = {
    name: 'spotplay',
    alias: ['splay', 'sp'],
    category: 'search',
    description: 'Putar musik dari Spotify',
    usage: '.spotplay <query>',
    example: '.spotplay neffex grateful',
    cooldown: 20,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const query = m.text?.trim()
    if (!query)
        return m.reply(
            `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n> \`${m.prefix}spotplay <query>\``
        )

    m.react('🕕')

    try {
        const { data: s } = await axios.get(`https://api.neoxr.eu/api/spotify-search?q=${encodeURIComponent(query)}&apikey=${config.APIkey.neoxr}`)
        let p = await axios.get(`https://api.neoxr.eu/api/spotify?url=${encodeURIComponent(s.data[0].url)}&apikey=${config.APIkey.neoxr}`)
        const data = p.data.data
        await sock.sendMedia(m.chat, data?.url, null, m, {
                type: 'audio',                                                           
                mimetype: 'audio/mpeg',
                ptt: false,
                fileName: `${data?.title}.mp3`,
                contextInfo: {
                    externalAdReply: {
                        title: data?.title,
                        body: data?.artist + " | " + data?.duration,
                        thumbnailUrl: data?.thumbnail,
                        mediaType: 2,
                        sourceUrl: s.data[0].url,
                        mediaUrl: s.data[0].url,
                    }
                }
            })
    } catch (e) {
        console.log(e)
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }