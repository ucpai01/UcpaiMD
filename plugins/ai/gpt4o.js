import { f } from '../../src/lib/ucpai-http.js'
import te from '../../src/lib/ucpai-error.js'
import config from '../../config.js'
import axios from 'axios'
const pluginConfig = {
    name: 'gpt4o',
    alias: ['gpt4'],
    category: 'ai',
    description: 'Chat dengan GPT-4o',
    usage: '.gpt4o <pertanyaan>',
    example: '.gpt4o Hai apa kabar?',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const text = m.args.join(' ')
    if (!text) {
        return m.reply(`🧠 *ɢᴘᴛ-4ᴏ*\n\n> Masukkan pertanyaan\n\n\`Contoh: ${m.prefix}gpt4o Hai apa kabar?\``)
    }
    
    m.react('🕕')
    
    try {
        const { data }= await axios.get(`https://api.covenant.sbs/api/ai/gpt4?question=${encodeURIComponent(text)}`, {
            headers: {
                'x-api-key': config.APIkey.covenant
            }
        })
        
        m.react('✅')
        await m.reply(`${data.data.result}`)
    } catch (error) {
        console.log(error)
        m.react('☢')
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }