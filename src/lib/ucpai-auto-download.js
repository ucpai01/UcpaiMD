import axios from 'axios'
import config from '../../config.js'
import { getDatabase } from './ucpai-database.js'
import { logger } from './ucpai-logger.js'

const SUPPORTED_PLATFORMS = [
    'tiktok.com',
    'instagram.com',
    'fb.com',
    'facebook.com',
    'youtube.com',
    'youtu.be',
    'telegram.me',
    't.me',
    'discord.gg',
    'twitter.com',
    'x.com'
]

function containsSupportedLink(text) {
    if (!text) return false
    const lowerText = text.toLowerCase()
    return SUPPORTED_PLATFORMS.some(platform => lowerText.includes(platform))
}

async function downloadAndDetectType(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 })
    let buffer = Buffer.from(response.data)
    
    const { fileTypeFromBuffer } = await import('file-type')
    const fileInfo = await fileTypeFromBuffer(buffer)
    
    return { buffer, fileInfo }
}

async function handleAutoDownload(m, sock, text) {
    if (!m.isGroup) return
    
    const db = getDatabase()
    const groupData = db.getGroup(m.chat)
    
    if (!groupData?.autodl) return
    if (!containsSupportedLink(text)) return

    const urlMatch = text.match(/https?:\/\/[^\s]+/i)
    if (!urlMatch) return
    const extractedUrl = urlMatch[0]

    m.react('🕕')
    
    try {
        const apikey = config.APIkey?.neoxr

        if (!apikey) {
            logger.error('AutoDL', 'API Key neoxr belum disetting di config.js!')
            return
        }

        const apiUrl = `https://api.neoxr.eu/api/aio?url=${encodeURIComponent(extractedUrl)}&apikey=${apikey}`
        const { data: response } = await axios.get(apiUrl)
        
        if (!response.status || !response.data || response.data.length === 0) {
            return
        }
        
        for (const link of response.data.slice(0, 5)) {
            if (!link.url) continue
            
            try {
                // If it's direct media, download it and figure out what it is
                // Actually the API already tells us the type (mp4, jpg, etc) in link.type
                const type = link.type?.toLowerCase() || ''
                const isVideo = ['mp4', 'mov', 'webm', 'video'].some(t => type.includes(t))
                const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'image'].some(t => type.includes(t))

                // The neo API URLs might be huge or require headers depending on provider (e.g., twitter uses snapcdn)
                // Sending the URL via sock.sendMedia handles downloading internally in ucpai bot
                // Let's just use sock.sendMedia directly instead of full buffer buffer approach 
                // in case the payload is large (like 100MB videos).
                // Wait! the original handleAutoDownload downloaded the buffer and detected its type via file-type!
                // We can preserve the original behavior of `downloadAndDetectType` safely!

                const { buffer, fileInfo } = await downloadAndDetectType(link.url)
                
                if (!fileInfo) {
                    await sock.sendMedia(m.chat, buffer, null, m, { 
                        type: 'document', 
                        mimetype: 'application/octet-stream'
                    })
                    continue
                }
                
                const mime = fileInfo.mime
                
                if (mime.startsWith('video/')) {
                    await sock.sendMedia(m.chat, buffer, null, m, { 
                        type: 'video', 
                        mimetype: mime
                    })
                } else if (mime.startsWith('audio/')) {
                    await sock.sendMedia(m.chat, buffer, null, m, { 
                        type: 'audio',
                        mimetype: mime
                    })
                } else if (mime.startsWith('image/')) {
                    await sock.sendMedia(m.chat, buffer, null, m, { 
                        type: 'image',
                    })
                } else {
                    await sock.sendMedia(m.chat, buffer, null, m, {
                        type: 'document',
                        fileName: `media.${fileInfo.ext}`,
                        mimetype: mime
                    })
                }
                
                await new Promise(resolve => setTimeout(resolve, 2000))
                
            } catch (e) {
                logger.error('AutoDL', `Failed to process or send media: ${e.message}`)
            }
        }
        
        m.react('✅')
        
    } catch (err) {
        m.react('😳')
        logger.error('AutoDL', err.message)
    }
}

export { handleAutoDownload, containsSupportedLink, SUPPORTED_PLATFORMS }
