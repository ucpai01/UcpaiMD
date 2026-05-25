import gTTS from 'gtts'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { f } from '../../src/lib/ucpai-http.js'
import te from '../../src/lib/ucpai-error.js'
const pluginConfig = {
    name: 'tts',
    alias: ['say'],
    category: 'tts',
    description: 'Google Text To Speech',
    usage: '.tts <text>',
    example: '.tts halo semua',
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const text = m.text?.trim()

    if (!text) {
        return m.reply(`🎤 *Google TTS*\n\nGunakan:\n${m.prefix}tts halo dunia`)
    }

    m.react('🎤')

    async function textToSpeech2(text) {
  try {
    const response = await f(`https://api.nexray.web.id/ai/gemini-tts?text=${encodeURIComponent(text)}`)
    return response
  } catch (error) {
    return error
  }
}

    try {

        const t = await textToSpeech2(text)
        await sock.sendMessage(m.chat, {
            audio: { url: t.result },
            mimetype: 'audio/mpeg',
        }, { quoted: m })
        m.react('✅')

    } catch (err) {
        m.react('☢')
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }