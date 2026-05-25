import fs from 'fs'
import path from 'path'
import { getDatabase } from '../../src/lib/ucpai-database.js'
import { getGroupMode } from '../group/botmode.js'
import te from '../../src/lib/ucpai-error.js'
const pluginConfig = {
    name: 'savekontak',
    alias: ['svkontak', 'savecontact'],
    category: 'pushkontak',
    description: 'Simpan semua kontak grup ke file VCF',
    usage: '.savekontak <namakontak>',
    example: '.savekontak CustomerList',
    isOwner: true,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 30,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const groupMode = getGroupMode(m.chat, db)
    
    if (groupMode !== 'pushkontak' && groupMode !== 'all') {
        return m.reply(`❌ *ᴍᴏᴅᴇ ᴛɪᴅᴀᴋ sᴇsᴜᴀɪ*\n\n> Aktifkan mode pushkontak terlebih dahulu\n\n\`${m.prefix}botmode pushkontak\``)
    }
    
    const namaKontak = m.text?.trim()
    if (!namaKontak) {
        return m.reply(`📥 *sᴀᴠᴇ ᴋᴏɴᴛᴀᴋ*\n\n> Masukkan nama untuk kontak\n\n\`Contoh: ${m.prefix}savekontak CustomerList\``)
    }
    
    m.react('📥')
    
    try {
        const metadata = m.groupMetadata
        const participants = metadata.participants
            .map(p => p.jid || p.id)
            .filter(id => id !== sock.user.id.split(':')[0] + '@s.whatsapp.net')
        
        if (participants.length === 0) {
            m.react('❌')
            return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> Tidak ada kontak untuk disimpan`)
        }
        
        const vcardContent = participants.map((contact, index) => {
            const phone = contact.split('@')[0]
            return [
                'BEGIN:VCARD',
                'VERSION:3.0',
                `FN:${namaKontak} - ${index + 1}`,
                `TEL;type=CELL;type=VOICE;waid=${phone}:+${phone}`,
                'END:VCARD',
                ''
            ].join('\n')
        }).join('')
        
        const tmpDir = path.join(process.cwd(), 'tmp')
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true })
        }
        
        const vcfPath = path.join(tmpDir, `${namaKontak}_${Date.now()}.vcf`)
        fs.writeFileSync(vcfPath, vcardContent, 'utf8')
        
        await sock.sendMessage(m.sender, {
            document: fs.readFileSync(vcfPath),
            fileName: `${namaKontak}_${participants.length}kontak.vcf`,
            mimetype: 'text/vcard',
            caption: `📥 *ᴋᴏɴᴛᴀᴋ ᴅɪsɪᴍᴘᴀɴ*\n\n> Nama: \`${namaKontak}\`\n> Total: \`${participants.length}\` kontak\n> Grup: \`${metadata.subject}\``
        }, { quoted: m })
        
        fs.unlinkSync(vcfPath)
        
        m.react('✅')
        
        if (m.chat !== m.sender) {
            await m.reply(`✅ *ᴋᴏɴᴛᴀᴋ ᴅɪsɪᴍᴘᴀɴ*\n\n> File VCF dikirim ke private chat\n> Total: \`${participants.length}\` kontak`)
        }
        
    } catch (error) {
        m.react('☢')
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }