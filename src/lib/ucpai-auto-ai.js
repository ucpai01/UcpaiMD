import geminiVision from '../scraper/geminiVision.js'
import { getDatabase } from './ucpai-database.js'
import { pinterest } from 'btch-downloader'
import config from '../../config.js'
import axios from 'axios'
import path from 'path'
import fs from 'fs'
const userCooldowns = new Map()
const COOLDOWN_MS = 3000

const ACTION_REGEX = /\[ACTION:(\w+)(?:\s+([^\]]*))?\]/gi

const SYSTEM_PROMPT_ACTIONS = `
Kamu memiliki kemampuan khusus untuk menjalankan AKSI di WhatsApp.
Jika user meminta sesuatu yang cocok dengan aksi di bawah, SERTAKAN tag aksi di akhir pesanmu.

FORMAT AKSI (taruh di akhir pesan, bisa lebih dari satu):
[ACTION:KICK target=628xxx@s.whatsapp.net]
[ACTION:ADD target=628xxx]
[ACTION:PROMOTE target=628xxx@s.whatsapp.net]
[ACTION:DEMOTE target=628xxx@s.whatsapp.net]
[ACTION:LEAVE]
[ACTION:OPEN]
[ACTION:CLOSE]
[ACTION:TAGALL]
[ACTION:HIDETAG message=pesan yang ingin dikirim]
[ACTION:SETNAME name=nama grup baru]
[ACTION:SETDESC desc=deskripsi grup baru]
[ACTION:DELETE]
[ACTION:WARN target=628xxx@s.whatsapp.net]
[ACTION:STICKER]
[ACTION:ANTILINK mode=on]
[ACTION:PINS query=kata kunci pencarian]

DAFTAR AKSI:
- KICK: Keluarkan member dari grup. Butuh target.
- ADD: Tambahkan member ke grup. Butuh nomor (628xxx).
- PROMOTE: Jadikan member sebagai admin. Butuh target.
- DEMOTE: Turunkan admin menjadi member biasa. Butuh target.
- LEAVE: Bot keluar dari grup ini. HANYA jika owner yang meminta.
- OPEN: Buka grup agar semua member bisa chat.
- CLOSE: Tutup grup agar hanya admin yang bisa chat.
- TAGALL: Tag/mention semua member grup secara visible.
- HIDETAG: Kirim pesan yang mention semua member tapi tag-nya tersembunyi. Butuh message.
- SETNAME: Ganti nama grup. Butuh name.
- SETDESC: Ganti deskripsi grup. Butuh desc.
- DELETE: Hapus pesan bot yang di-reply user.
- WARN: Beri warning ke member. Butuh target.
- STICKER: Konversi gambar yang dikirim/di-reply user menjadi sticker.
- ANTILINK: Toggle anti-link di grup (on/off). Butuh mode.
- PINS: Cari gambar di Pinterest. Butuh query pencarian.

ATURAN PENTING:
1. HANYA jalankan aksi jika user JELAS DAN EKSPLISIT memintanya.
2. Jangan pernah menjalankan aksi hanya berdasarkan asumsi.
3. Jika user mengirim gambar, analisis dan deskripsikan gambar tersebut secara detail dalam bahasa Indonesia.
4. Untuk KICK/PROMOTE/DEMOTE/WARN: gunakan nomor yang di-tag user. Jika user tag seseorang dengan @, ambil nomor tersebut.
5. Jangan sertakan tag aksi jika tidak diminta.
6. Tetap menjawab dengan natural dan sesuai karakter.
7. PINS: Jika user minta carikan/kirimkan gambar tentang sesuatu, gunakan aksi ini.
8. HIDETAG: Gunakan ini saat user minta announce/pengumuman ke semua member.
9. STICKER: Gunakan ini saat user minta jadikan gambar sebagai sticker.
10. Kamu boleh menggabungkan beberapa aksi sekaligus jika diminta.
`

const fallbackResponses = [
    'Hmm, aku sedang berpikir...',
    'Maaf, pikiranku sedang blank sebentar~',
    'Eh tunggu sebentar ya, aku loading dulu...',
    'Aduh, otakku lag nih, coba lagi ya!',
    'Hmm apa ya, bentar mikir dulu~'
]

function getFallbackResponse() {
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]
}

function isOnCooldown(userId) {
    const lastTime = userCooldowns.get(userId)
    if (!lastTime) return false
    return Date.now() - lastTime < COOLDOWN_MS
}

function setCooldown(userId) {
    userCooldowns.set(userId, Date.now())
}

function saveToHistory(autoai, senderNumber, role, content) {
    if (!autoai.sessions) autoai.sessions = {}
    if (!autoai.sessions[senderNumber]) {
        autoai.sessions[senderNumber] = { history: [] }
    }
    const history = autoai.sessions[senderNumber].history
    history.push({ role, content: content.substring(0, 500), timestamp: Date.now() })
    if (history.length > 20) {
        autoai.sessions[senderNumber].history = history.slice(-20)
    }
}

function parseActions(text) {
    const actions = []
    let match
    const regex = new RegExp(ACTION_REGEX.source, ACTION_REGEX.flags)
    while ((match = regex.exec(text)) !== null) {
        const type = match[1].toUpperCase()
        const paramsStr = match[2] || ''
        const params = {}
        const paramRegex = /(\w+)=(.+?)(?=\s+\w+=|$)/g
        let pm
        while ((pm = paramRegex.exec(paramsStr)) !== null) {
            params[pm[1]] = pm[2].trim()
        }
        actions.push({ type, params })
    }
    return actions
}

function cleanActionTags(text) {
    return text.replace(ACTION_REGEX, '').trim()
}

function detectIntentFromMessage(msg, m) {
    const lower = msg.toLowerCase()
    const actions = []

    const phoneMatch = msg.match(/(?:\+?62|0)[\s\-]?8[\d\s\-]{7,13}/g)
    const extractPhone = () => {
        if (!phoneMatch) return null
        return phoneMatch[0].replace(/[\s\-\+]/g, '').replace(/^0/, '62')
    }

    if (/\b(add|tambah|invite|masuk(?:kan|in))\b.*\b(nomor|number|member|orang)\b/i.test(lower) ||
        /\b(nomor|number)\b.*\b(add|tambah|invite)\b/i.test(lower)) {
        const phone = extractPhone()
        if (phone) actions.push({ type: 'ADD', params: { target: phone } })
    }

    if (/\b(kick|keluarkan|tendang|usir|remove)\b/i.test(lower) && !actions.some(a => a.type === 'KICK')) {
        actions.push({ type: 'KICK', params: {} })
    }

    if (/\b(promote|jadikan?\s*admin|naikkan?)\b/i.test(lower) && !actions.some(a => a.type === 'PROMOTE')) {
        actions.push({ type: 'PROMOTE', params: {} })
    }

    if (/\b(demote|turunkan?|copot\s*admin)\b/i.test(lower) && !actions.some(a => a.type === 'DEMOTE')) {
        actions.push({ type: 'DEMOTE', params: {} })
    }

    if (/\b(leave|keluar|pergi)\b.*\b(grup|group)\b/i.test(lower) ||
        /\b(grup|group)\b.*\b(leave|keluar|pergi)\b/i.test(lower)) {
        actions.push({ type: 'LEAVE', params: {} })
    }

    if (/\b(buka|open)\b.*\b(grup|group)\b/i.test(lower) ||
        /\b(grup|group)\b.*\b(buka|open)\b/i.test(lower)) {
        actions.push({ type: 'OPEN', params: {} })
    }

    if (/\b(tutup|close|kunci|lock)\b.*\b(grup|group)\b/i.test(lower) ||
        /\b(grup|group)\b.*\b(tutup|close|kunci|lock)\b/i.test(lower)) {
        actions.push({ type: 'CLOSE', params: {} })
    }

    if (/\b(tag\s*all|tag\s*semua|mention\s*all|mention\s*semua)\b/i.test(lower)) {
        actions.push({ type: 'TAGALL', params: {} })
    }

    if (/\b(hidetag|hide\s*tag|announce|pengumuman|umumkan)\b/i.test(lower)) {
        const htMsg = msg.replace(/.*?(hidetag|hide\s*tag|announce|pengumuman|umumkan)\s*/i, '').trim()
        actions.push({ type: 'HIDETAG', params: { message: htMsg || msg } })
    }

    if (/\b(ganti|ubah|rename|set)\b.*\b(nama|name)\b.*\b(grup|group)\b/i.test(lower)) {
        const nameMatch = msg.match(/(?:jadi|ke|menjadi|:)\s*(.+)/i)
        if (nameMatch) actions.push({ type: 'SETNAME', params: { name: nameMatch[1].trim() } })
    }

    if (/\b(ganti|ubah|set)\b.*\b(desk|desc|deskripsi)\b/i.test(lower)) {
        const descMatch = msg.match(/(?:jadi|ke|menjadi|:)\s*(.+)/i)
        if (descMatch) actions.push({ type: 'SETDESC', params: { desc: descMatch[1].trim() } })
    }

    if (/\b(hapus|delete|remove)\b.*\b(pesan|chat|message)\b/i.test(lower)) {
        actions.push({ type: 'DELETE', params: {} })
    }

    if (/\b(warn|warning|peringatan|peringati)\b/i.test(lower)) {
        actions.push({ type: 'WARN', params: {} })
    }

    if (/\b(sticker|stiker|jadikan?\s*sticker|jadiin\s*sticker)\b/i.test(lower)) {
        actions.push({ type: 'STICKER', params: {} })
    }

    if (/\b(antilink)\b.*\b(on|aktif|nyala)\b/i.test(lower)) {
        actions.push({ type: 'ANTILINK', params: { mode: 'on' } })
    } else if (/\b(antilink)\b.*\b(off|mati|nonaktif)\b/i.test(lower)) {
        actions.push({ type: 'ANTILINK', params: { mode: 'off' } })
    }

    if (/\b(cari(?:kan|in)?|kirim(?:kan|in)?|kasih|tolong)\b.*\b(gambar|foto|image|pic|picture)\b/i.test(lower) ||
        /\b(gambar|foto)\b.*\b(tentang|dari|soal)\b/i.test(lower)) {
        const queryMatch = msg.match(/(?:gambar|foto|image|pic|picture)\s+(?:tentang\s+|dari\s+|soal\s+|yang\s+)?(.+)/i) ||
                           msg.match(/(?:cari(?:kan|in)?|kirim(?:kan|in)?)\s+(?:gambar|foto)\s+(.+)/i)
        if (queryMatch) {
            const query = queryMatch[1].replace(/\b(dong|ya|yuk|pls|please|nih)\b/gi, '').trim()
            if (query) actions.push({ type: 'PINS', params: { query } })
        }
    }

    return actions
}

function mergeActions(aiActions, intentActions) {
    const merged = [...aiActions]
    const existingTypes = new Set(aiActions.map(a => a.type))
    for (const action of intentActions) {
        if (!existingTypes.has(action.type)) {
            merged.push(action)
        }
    }
    return merged
}


async function executeAction(action, m, sock) {
    const results = []

    const resolveTarget = () => {
        const botNum = sock.user?.id?.split(':')[0]
        if (m.mentionedJid?.length > 0) {
            return m.mentionedJid.find(j => !j.includes(botNum))
        }
        const t = action.params.target
        if (t && /^628\d+/.test(t.replace('@s.whatsapp.net', ''))) {
            return t.includes('@') ? t : t + '@s.whatsapp.net'
        }
        return null
    }

    switch (action.type) {
        case 'KICK': {
            if (!m.isGroup) return [{ ok: false, msg: 'Bukan di grup' }]
            if (!m.isAdmin && !m.isOwner) return [{ ok: false, msg: 'Kamu bukan admin' }]
            if (!m.isBotAdmin) return [{ ok: false, msg: 'Bot bukan admin' }]
            const target = resolveTarget()
            if (!target) return [{ ok: false, msg: 'Tag orang yang mau di-kick' }]
            await sock.groupParticipantsUpdate(m.chat, [target], 'remove')
            results.push({ ok: true, msg: `Berhasil kick @${target.split('@')[0]}` })
            break
        }
        case 'PROMOTE': {
            if (!m.isGroup) return [{ ok: false, msg: 'Bukan di grup' }]
            if (!m.isAdmin && !m.isOwner) return [{ ok: false, msg: 'Kamu bukan admin' }]
            if (!m.isBotAdmin) return [{ ok: false, msg: 'Bot bukan admin' }]
            const target = resolveTarget()
            if (!target) return [{ ok: false, msg: 'Tag orang yang mau di-promote' }]
            await sock.groupParticipantsUpdate(m.chat, [target], 'promote')
            results.push({ ok: true, msg: `Berhasil promote @${target.split('@')[0]}` })
            break
        }
        case 'DEMOTE': {
            if (!m.isGroup) return [{ ok: false, msg: 'Bukan di grup' }]
            if (!m.isAdmin && !m.isOwner) return [{ ok: false, msg: 'Kamu bukan admin' }]
            if (!m.isBotAdmin) return [{ ok: false, msg: 'Bot bukan admin' }]
            const target = resolveTarget()
            if (!target) return [{ ok: false, msg: 'Tag orang yang mau di-demote' }]
            await sock.groupParticipantsUpdate(m.chat, [target], 'demote')
            results.push({ ok: true, msg: `Berhasil demote @${target.split('@')[0]}` })
            break
        }
        case 'LEAVE': {
            if (!m.isOwner) return [{ ok: false, msg: 'Hanya owner yang bisa perintah ini' }]
            if (!m.isGroup) return [{ ok: false, msg: 'Bukan di grup' }]
            await sock.groupLeave(m.chat)
            results.push({ ok: true, msg: 'Bot keluar dari grup' })
            break
        }
        case 'OPEN': {
            if (!m.isGroup) return [{ ok: false, msg: 'Bukan di grup' }]
            if (!m.isAdmin && !m.isOwner) return [{ ok: false, msg: 'Kamu bukan admin' }]
            if (!m.isBotAdmin) return [{ ok: false, msg: 'Bot bukan admin' }]
            await sock.groupSettingUpdate(m.chat, 'not_announcement')
            results.push({ ok: true, msg: 'Grup dibuka' })
            break
        }
        case 'CLOSE': {
            if (!m.isGroup) return [{ ok: false, msg: 'Bukan di grup' }]
            if (!m.isAdmin && !m.isOwner) return [{ ok: false, msg: 'Kamu bukan admin' }]
            if (!m.isBotAdmin) return [{ ok: false, msg: 'Bot bukan admin' }]
            await sock.groupSettingUpdate(m.chat, 'announcement')
            results.push({ ok: true, msg: 'Grup ditutup' })
            break
        }
        case 'TAGALL': {
            if (!m.isGroup) return [{ ok: false, msg: 'Bukan di grup' }]
            if (!m.isAdmin && !m.isOwner) return [{ ok: false, msg: 'Kamu bukan admin' }]
            const groupMeta = m.groupMetadata || await sock.groupMetadata(m.chat)
            const members = groupMeta.participants.map(p => p.id)
            const mentions = members.map(id => `@${id.split('@')[0]}`).join(' ')
            await sock.sendMessage(m.chat, {
                text: `📢 *TAG ALL*\n\n${mentions}`,
                mentions: members
            }, { quoted: m })
            results.push({ ok: true, msg: 'Semua member di-tag' })
            break
        }
        case 'PINS': {
            const query = action.params.query
            if (!query) return [{ ok: false, msg: 'Query pencarian tidak ditemukan' }]
            try {
                const data = await pinterest(query)
                const pinResults = data?.result?.result?.result?.slice(0, 5)
                if (!pinResults || pinResults.length === 0) {
                    return [{ ok: false, msg: `Tidak ditemukan gambar untuk: ${query}` }]
                }
                let imagenya = []
                for (const item of pinResults) {
                    const imageUrl = item.image_url || item.images?.orig?.url || item.images?.['736x']?.url
                    if (!imageUrl) continue
                    try {
                        imagenya.push({
                            image: { url: imageUrl },
                        })
                    } catch {}
                }
                await sock.sendMessage(m.chat, {
                    albumMessage: imagenya
                }, { quoted: m })
                results.push({ ok: true, msg: `Mengirim gambar Pinterest: ${query}` })
            } catch (e) {
                results.push({ ok: false, msg: `Gagal cari Pinterest: ${e.message}` })
            }
            break
        }
        case 'ADD': {
            if (!m.isGroup) return [{ ok: false, msg: 'Bukan di grup' }]
            if (!m.isAdmin && !m.isOwner) return [{ ok: false, msg: 'Kamu bukan admin' }]
            if (!m.isBotAdmin) return [{ ok: false, msg: 'Bot bukan admin' }]
            let num = action.params.target
            if (!num) return [{ ok: false, msg: 'Masukkan nomor yang ingin ditambahkan' }]
            num = num.replace(/[^0-9]/g, '')
            if (num.startsWith('0')) num = '62' + num.slice(1)
            if (num.length < 10) return [{ ok: false, msg: 'Nomor tidak valid' }]
            const jid = num + '@s.whatsapp.net'
            const addResult = await sock.groupParticipantsUpdate(m.chat, [jid], 'add')
            const status = addResult?.[0]?.status
            if (status === '200') {
                results.push({ ok: true, msg: `Berhasil menambahkan @${num}` })
            } else if (status === '408') {
                results.push({ ok: true, msg: `Undangan terkirim ke @${num}` })
            } else {
                results.push({ ok: false, msg: `Gagal menambahkan @${num} (${status})` })
            }
            break
        }
        case 'HIDETAG': {
            if (!m.isGroup) return [{ ok: false, msg: 'Bukan di grup' }]
            if (!m.isAdmin && !m.isOwner) return [{ ok: false, msg: 'Kamu bukan admin' }]
            const htMeta = m.groupMetadata || await sock.groupMetadata(m.chat)
            const htMembers = htMeta.participants.map(p => p.id)
            const htMsg = action.params.message || 'Pengumuman'
            await sock.sendMessage(m.chat, {
                text: htMsg,
                mentions: htMembers
            }, { quoted: m })
            results.push({ ok: true, msg: 'Hidetag terkirim' })
            break
        }
        case 'SETNAME': {
            if (!m.isGroup) return [{ ok: false, msg: 'Bukan di grup' }]
            if (!m.isAdmin && !m.isOwner) return [{ ok: false, msg: 'Kamu bukan admin' }]
            if (!m.isBotAdmin) return [{ ok: false, msg: 'Bot bukan admin' }]
            const newName = action.params.name
            if (!newName) return [{ ok: false, msg: 'Nama grup baru tidak ditemukan' }]
            await sock.groupUpdateSubject(m.chat, newName)
            results.push({ ok: true, msg: `Nama grup diubah ke: ${newName}` })
            break
        }
        case 'SETDESC': {
            if (!m.isGroup) return [{ ok: false, msg: 'Bukan di grup' }]
            if (!m.isAdmin && !m.isOwner) return [{ ok: false, msg: 'Kamu bukan admin' }]
            if (!m.isBotAdmin) return [{ ok: false, msg: 'Bot bukan admin' }]
            const newDesc = action.params.desc
            if (!newDesc) return [{ ok: false, msg: 'Deskripsi baru tidak ditemukan' }]
            await sock.groupUpdateDescription(m.chat, newDesc)
            results.push({ ok: true, msg: 'Deskripsi grup diubah' })
            break
        }
        case 'DELETE': {
            if (!m.quoted) return [{ ok: false, msg: 'Reply pesan bot yang ingin dihapus' }]
            if (!m.quoted.key?.fromMe) return [{ ok: false, msg: 'Hanya bisa hapus pesan bot' }]
            await sock.sendMessage(m.chat, { delete: m.quoted.key })
            results.push({ ok: true, msg: 'Pesan dihapus' })
            break
        }
        case 'WARN': {
            if (!m.isGroup) return [{ ok: false, msg: 'Bukan di grup' }]
            if (!m.isAdmin && !m.isOwner) return [{ ok: false, msg: 'Kamu bukan admin' }]
            const warnTarget = resolveTarget()
            if (!warnTarget) return [{ ok: false, msg: 'Tag orang yang mau di-warn' }]
            const db = getDatabase()
            const warns = db.getGroup(m.chat)?.warns || {}
            const targetNum = warnTarget.split('@')[0]
            warns[targetNum] = (warns[targetNum] || 0) + 1
            db.setGroup(m.chat, { warns })
            db.save()
            results.push({ ok: true, msg: `⚠️ Warning ${warns[targetNum]}/3 untuk @${targetNum}` })
            if (warns[targetNum] >= 3) {
                try {
                    await sock.groupParticipantsUpdate(m.chat, [warnTarget], 'remove')
                    warns[targetNum] = 0
                    db.setGroup(m.chat, { warns })
                    db.save()
                    results.push({ ok: true, msg: `@${targetNum} di-kick karena 3x warning` })
                } catch {}
            }
            break
        }
        case 'STICKER': {
            let stickerBuffer = null
            if (m.isImage && m.download) {
                stickerBuffer = await m.download()
            } else if (m.quoted?.isImage && m.quoted?.download) {
                stickerBuffer = await m.quoted.download()
            }
            if (!stickerBuffer) return [{ ok: false, msg: 'Kirim atau reply gambar untuk dijadikan sticker' }]
            await sock.sendMessage(m.chat, {
                sticker: stickerBuffer,
                packname: config.bot?.name || 'Ucpai',
                author: 'AutoAI'
            }, { quoted: m })
            results.push({ ok: true, msg: 'Sticker terkirim' })
            break
        }
        case 'ANTILINK': {
            if (!m.isGroup) return [{ ok: false, msg: 'Bukan di grup' }]
            if (!m.isAdmin && !m.isOwner) return [{ ok: false, msg: 'Kamu bukan admin' }]
            const alMode = (action.params.mode || '').toLowerCase()
            if (!['on', 'off'].includes(alMode)) return [{ ok: false, msg: 'Mode harus on atau off' }]
            const alDb = getDatabase()
            alDb.setGroup(m.chat, { antilink: alMode === 'on' })
            alDb.save()
            results.push({ ok: true, msg: `Antilink ${alMode === 'on' ? 'diaktifkan' : 'dinonaktifkan'}` })
            break
        }
    }

    return results
}

async function handleAutoAI(m, sock) {
    if (!m.isGroup) return false
    if (m.fromMe) return false

    const db = getDatabase()
    if (!db?.db?.data?.autoai) return false

    const autoai = db.db.data.autoai[m.chat]
    if (!autoai || !autoai.enabled) return false

    const botId = sock.user?.id?.split(':')[0] + '@s.whatsapp.net'
    const botLid = sock.user?.id

    if (m.isCommand && m.command === 'autoai') return false

    if (m.isCommand && !m.isOwner) {
        return true
    }

    const isMentioned = m.mentionedJid?.some(jid =>
        jid === botId || jid === botLid || jid.includes(sock.user?.id?.split(':')[0])
    )

    let isBotQuoted = false
    if (m.quoted) {
        const quotedSender = m.quoted.sender || m.quoted.key?.participant
        isBotQuoted = quotedSender === botId || m.quoted.key?.fromMe
    }

    if (!isBotQuoted && !isMentioned) return false

    const userMessage = m.body || ''
    const hasImage = m.isImage || (m.quoted && (m.quoted.isImage || m.quoted.type === 'imageMessage'))

    if (!userMessage && !hasImage) return false

    const senderNumber = m.sender.split('@')[0]

    if (isOnCooldown(senderNumber)) return false

    try {
        await sock.sendPresenceUpdate('composing', m.chat)
        setCooldown(senderNumber)

        let imageBuffer = null
        if (hasImage) {
            try {
                if (m.isImage && m.download) {
                    imageBuffer = await m.download()
                } else if (m.quoted?.download) {
                    imageBuffer = await m.quoted.download()
                }
            } catch (e) {
                console.log('[AutoAI] Image download failed:', e.message)
            }
        }

        if (!autoai.sessions) autoai.sessions = {}
        const userSession = autoai.sessions[senderNumber] || { history: [] }
        const history = userSession.history || []

        let contextParts = []
        if (m.pushName && m.pushName !== 'Unknown') {
            contextParts.push(`User: "${m.pushName}" (${senderNumber})`)
        }
        if (m.isOwner) contextParts.push('User ini adalah OWNER bot.')
        if (m.isAdmin) contextParts.push('User ini adalah ADMIN grup.')

        if (m.mentionedJid?.length > 0) {
            const mentionList = m.mentionedJid
                .filter(j => !j.includes(sock.user?.id?.split(':')[0]))
                .map(j => j)
                .join(', ')
            if (mentionList) contextParts.push(`User menyebut/tag: ${mentionList}`)
        }

        if (imageBuffer) {
            contextParts.push('User mengirimkan sebuah gambar. Analisis gambar tersebut.')
        }

        contextParts.push(userMessage || '(gambar tanpa teks)')

        const fullMessage = contextParts.join('\n')
        const fullInstruction = autoai.instruction + '\n\n' + SYSTEM_PROMPT_ACTIONS

        saveToHistory(autoai, senderNumber, 'user', userMessage || '[gambar]')

        let aiResponse = ''
        try {
            const result = await geminiVision.chat({
                message: fullMessage,
                instruction: fullInstruction,
                imageBuffer,
                history
            })
            aiResponse = result.text || getFallbackResponse()
        } catch (apiError) {
            console.error('[AutoAI API Error]', apiError.message)
            aiResponse = getFallbackResponse()
        }

        const aiActions = parseActions(aiResponse)
        const intentActions = detectIntentFromMessage(userMessage, m)
        const actions = mergeActions(aiActions, intentActions)
        const cleanResponse = cleanActionTags(aiResponse)

        saveToHistory(autoai, senderNumber, 'assistant', cleanResponse)
        db.save()

        await sock.sendPresenceUpdate('paused', m.chat)

        const typingDelay = Math.min(cleanResponse.length * 20, 2000)
        await new Promise(r => setTimeout(r, typingDelay))

        if (autoai.responseType === 'voice') {
            try {
                await sock.sendPresenceUpdate('recording', m.chat)
                const { default: generateCustomTTS } = await import('../../src/scraper/topmedia.js')
                const { exec } = await import('child_process')
                const { promisify } = await import('util')
                const execAsync = promisify(exec)

                const tempDir = path.join(process.cwd(), 'temp')
                if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

                const audioUrl = await generateCustomTTS(null, cleanResponse.substring(0, 500))
                const audioRes = await axios.get(audioUrl, { responseType: 'arraybuffer', timeout: 30000 })

                const mp3Path = path.join(tempDir, `autoai_${Date.now()}.mp3`)
                fs.writeFileSync(mp3Path, Buffer.from(audioRes.data))

                const oggPath = mp3Path.replace('.mp3', '.ogg')
                try {
                    await execAsync(`ffmpeg -y -i "${mp3Path}" -c:a libopus -b:a 64k -ac 1 -ar 48000 "${oggPath}"`, { timeout: 30000 })
                } catch {}

                let audioBuffer
                let mime = 'audio/mpeg'
                if (fs.existsSync(oggPath)) {
                    audioBuffer = fs.readFileSync(oggPath)
                    mime = 'audio/ogg; codecs=opus'
                    try { fs.unlinkSync(oggPath) } catch {}
                } else {
                    audioBuffer = fs.readFileSync(mp3Path)
                }
                try { fs.unlinkSync(mp3Path) } catch {}

                await sock.sendMessage(m.chat, {
                    audio: audioBuffer,
                    mimetype: mime,
                    ptt: true
                }, { quoted: m })

                await sock.sendPresenceUpdate('paused', m.chat)
            } catch {
                await m.reply(cleanResponse)
            }
        } else {
            if (cleanResponse) {
                await m.reply(cleanResponse)
            }
        }

        for (const action of actions) {
            try {
                const results = await executeAction(action, m, sock)
                for (const r of results) {
                    if (!r.ok) {
                        await m.reply(`⚠️ ${r.msg}`)
                    }
                }
            } catch (e) {
                console.error('[AutoAI Action Error]', action.type, e.message)
                await m.reply(`❌ Gagal menjalankan ${action.type}: ${e.message}`)
            }
        }

        return true
    } catch (error) {
        console.error('[AutoAI Error]', error.message)
        await sock.sendPresenceUpdate('paused', m.chat)
        try { await m.reply(getFallbackResponse()) } catch {}
        return true
    }
}

function isAutoAIEnabled(chatId) {
    const db = getDatabase()
    if (!db?.db?.data?.autoai) return false
    return db.db.data.autoai[chatId]?.enabled || false
}

function getAutoAICharacter(chatId) {
    const db = getDatabase()
    if (!db?.db?.data?.autoai) return null
    return db.db.data.autoai[chatId]?.characterName || null
}

function clearUserSession(chatId, senderNumber) {
    const db = getDatabase()
    if (!db?.db?.data?.autoai?.[chatId]?.sessions?.[senderNumber]) return false
    delete db.db.data.autoai[chatId].sessions[senderNumber]
    db.save()
    return true
}

export { handleAutoAI, isAutoAIEnabled, getAutoAICharacter, clearUserSession }