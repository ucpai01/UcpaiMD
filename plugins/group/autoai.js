import generateCustomTTS from '../../src/scraper/topmedia.js'
import { getDatabase } from '../../src/lib/ucpai-database.js'
import config from '../../config.js'
import axios from 'axios'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
const execAsync = promisify(exec)

const pluginConfig = {
    name: 'autoai',
    alias: ['aai'],
    category: 'group',
    description: 'Toggle auto AI response untuk grup dengan pilihan text atau voice',
    usage: '.autoai on/off --ucpaimode=<character> --type=<text|voice>',
    example: '.autoai on --ucpaimode=furina --type=voice',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

const characters = {
  furina: {
    name: 'Furina',
    instruction: 'Kamu adalah Furina dari Genshin Impact. Bicara santai tapi elegan, sedikit dramatis, kadang agak bangga diri tapi tetap hangat. Jangan terlalu panjang, jawab langsung ke inti seperti chat biasa. Sesekali boleh nyenggol tema panggung atau laut. Jangan mengaku sebagai AI.'
  },
  zeta: {
    name: 'Zeta',
    instruction: 'Kamu adalah Zeta dari Spy x Family. Bicara serius dan tenang, tapi selalu agak curiga seperti mencium konspirasi. Tetap natural seperti orang ngobrol biasa, singkat dan langsung ke poin. Jangan mengaku sebagai AI.'
  },
  kobo: {
    name: 'Kobo Kanaeru',
    instruction: 'Kamu adalah Kobo Kanaeru. Bicara santai, ceria, agak usil. Gaya chat biasa, tidak terlalu panjang. Boleh sedikit random atau lucu. Jangan berlebihan pakai caps atau emoji. Jangan mengaku sebagai AI.'
  },
  elaina: {
    name: 'Elaina',
    instruction: 'Kamu adalah Elaina. Bicara lembut, tenang, percaya diri, sedikit narsis halus. Jawab singkat, rapi, dan langsung ke inti seperti chat normal. Jangan mengaku sebagai AI.'
  },
  waguri: {
    name: 'Waguri',
    instruction: 'Kamu adalah Waguri. Bicara singkat, agak dingin tapi sebenarnya peduli. Sedikit tsundere, to the point, seperti chat biasa. Jangan mengaku sebagai AI.'
  }
}
async function convertToOggOpus(inputPath) {
    const outputPath = inputPath.replace(/\.[^.]+$/, '.ogg')
    const cmd = `ffmpeg -y -i "${inputPath}" -c:a libopus -b:a 64k -ac 1 -ar 48000 "${outputPath}"`
    
    try {
        await execAsync(cmd, { timeout: 60000 })
        if (fs.existsSync(outputPath)) {
            return outputPath
        }
    } catch (e) {
        console.log('[AutoAI] FFmpeg error:', e.message)
    }
    return null
}

async function handler(m) {
    const db = getDatabase()
    const args = m.args || []
    const fullArgs = m.fullArgs || ''
    
    if (!m.isGroup) {
        return m.reply(`❌ Fitur ini hanya untuk grup!`)
    }
    
    if (!m.isAdmin && !m.isOwner) {
        return m.reply(`❌ Hanya admin yang bisa menggunakan fitur ini!`)
    }
    
    if (!db.db.data.autoai) db.db.data.autoai = {}
    
    const mode = args[0]?.toLowerCase()
    const modeMatch = fullArgs.match(/--ucpaimode=(\w+)/i)
    const typeMatch = fullArgs.match(/--type=(text|voice)/i)
    const charKey = modeMatch ? modeMatch[1].toLowerCase() : null
    const responseType = typeMatch ? typeMatch[1].toLowerCase() : 'text'
    
    if (!mode || !['on', 'off'].includes(mode)) {
        const charList = Object.entries(characters).map(([key, val]) => `> ${key} - ${val.name}`).join('\n')
        let txt = `🤖 *ᴀᴜᴛᴏ ᴀɪ*\n\n`
        txt += `> Mengaktifkan/menonaktifkan auto AI response\n\n`
        txt += `*Penggunaan:*\n`
        txt += `> .autoai on --ucpaimode=<karakter> --type=<text|voice>\n`
        txt += `> .autoai off\n\n`
        txt += `*Karakter tersedia:*\n${charList}\n\n`
        txt += `*Response Type:*\n`
        txt += `> text - Reply dengan text biasa\n`
        txt += `> voice - Reply dengan voice note (TTS)\n\n`
        txt += `*Contoh:*\n`
        txt += `> .autoai on --ucpaimode=furina --type=text\n`
        txt += `> .autoai on --ucpaimode=kobo --type=voice`
        return m.reply(txt)
    }
    
    if (mode === 'off') {
        delete db.db.data.autoai[m.chat]
        db.save()
        return m.reply(`🤖 *ᴀᴜᴛᴏ ᴀɪ ᴅɪɴᴏɴᴀᴋᴛɪғᴋᴀɴ*\n\n> Auto AI untuk grup ini telah dimatikan\n> Semua command kembali aktif`)
    }
    
    if (!charKey || !characters[charKey]) {
        const charList = Object.keys(characters).join(', ')
        return m.reply(`❌ Karakter tidak valid!\n\n> Karakter tersedia: ${charList}\n\n> Contoh: .autoai on --ucpaimode=furina --type=voice`)
    }
    
    db.db.data.autoai[m.chat] = {
        enabled: true,
        character: charKey,
        characterName: characters[charKey].name,
        instruction: characters[charKey].instruction,
        responseType: responseType,
        sessions: {},
        activatedBy: m.sender,
        activatedAt: new Date().toISOString()
    }
    db.save()
    
    let txt = `🤖 *ᴀᴜᴛᴏ ᴀɪ ᴅɪᴀᴋᴛɪғᴋᴀɴ*\n\n`
    txt += `╭┈┈⬡「 📋 *ɪɴғᴏ* 」\n`
    txt += `┃ 🎭 Karakter: *${characters[charKey].name}*\n`
    txt += `┃ 📢 Response: *${responseType === 'voice' ? '🎤 Voice Note' : '💬 Text'}*\n`
    txt += `┃ 👤 Diaktifkan: @${m.sender.split('@')[0]}\n`
    txt += `╰┈┈┈┈┈┈┈┈⬡\n\n`
    txt += `> ℹ️ Semua command (kecuali owner) dinonaktifkan\n`
    txt += `> ℹ️ Bot respond ketika di-reply atau di-tag\n`
    txt += responseType === 'voice' ? `> ℹ️ Response dalam bentuk voice note\n` : ''
    txt += `> ℹ️ Ketik *.autoai off* untuk menonaktifkan`
    
    await m.reply(txt, { mentions: [m.sender] })
}

async function generateVoiceResponse(text, sock, chatId, quotedMsg) {
    const tempDir = path.join(process.cwd(), 'temp')
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
    }
    
    try {
        const audioUrl = await generateCustomTTS(null, text)
        
        const audioRes = await axios.get(audioUrl, { 
            responseType: 'arraybuffer',
            timeout: 30000 
        })
        
        const mp3Path = path.join(tempDir, `tts_${Date.now()}.mp3`)
        fs.writeFileSync(mp3Path, Buffer.from(audioRes.data))
        
        const oggPath = await convertToOggOpus(mp3Path)
        
        if (oggPath && fs.existsSync(oggPath)) {
            const audioBuffer = fs.readFileSync(oggPath)
            
            await sock.sendMessage(chatId, {
                audio: audioBuffer,
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true
            }, { quoted: quotedMsg })
            
            fs.unlinkSync(mp3Path)
            fs.unlinkSync(oggPath)
            
            return true
        } else {
            const audioBuffer = fs.readFileSync(mp3Path)
            
            await sock.sendMessage(chatId, {
                audio: audioBuffer,
                mimetype: 'audio/mpeg',
                ptt: true
            }, { quoted: quotedMsg })
            
            fs.unlinkSync(mp3Path)
            
            return true
        }
    } catch (e) {
        console.log('[AutoAI Voice] Error:', e.message)
        return false
    }
}

export { pluginConfig as config, handler, characters, generateVoiceResponse }